// Immersive portfolio for WebXR (Meta Quest VR + passthrough MR, Android AR) and a desktop preview (#xr-preview).
// Loaded on demand by main.js, which hands over its particle world and morph helpers through `ctx`.
import * as THREE from 'three';
import { XRControllerModelFactory } from 'three/addons/webxr/XRControllerModelFactory.js';
import { XRHandModelFactory } from 'three/addons/webxr/XRHandModelFactory.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const D2R = Math.PI / 180;
const LABELS = { globe: 'Accueil', knot: 'À propos', galaxy: 'Projets', lattice: 'Stack', wave: 'En ce moment', text: 'Contact' };
const XR_SCALE = { globe: .3, knot: .3, galaxy: .26, lattice: .3, wave: .28, text: .16 };
const PALETTE = ['#ff7a2f', '#3ee0ff', '#a78bfa', '#34d399', '#ffc24b', '#ff4d6d'];
const FONT = { t: s => `800 ${s}px Unbounded, sans-serif`, m: s => `500 ${s}px "JetBrains Mono", monospace`, b: s => `400 ${s}px "IBM Plex Sans", sans-serif` };
const ease = t => 1 - Math.pow(1 - t, 3);
const easeBack = t => 1 + 2.70158 * Math.pow(t - 1, 3) + 1.70158 * Math.pow(t - 1, 2);
const plain = s => String(s ?? '').replace(/\*\*/g, '');
const rgba = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${n >> 8 & 255},${n & 255},${a})`; };

/* ---------- canvas drawing ---------- */
function tex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d'), t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  t.redraw = (fn = draw) => { x.clearRect(0, 0, w, h); fn(x, w, h); t.needsUpdate = true; };
  t.redraw();
  return t;
}
function wrap(x, s, w) {
  if (!s) return [''];
  const out = []; let line = '';
  for (const word of String(s).split(' ')) { const t = line ? line + ' ' + word : word; if (line && x.measureText(t).width > w) { out.push(line); line = word; } else line = t; }
  return [...out, line];
}
function para(x, s, X, Y, font, color, w, lh, maxY = 1e9) {
  x.font = font; x.fillStyle = color;
  for (const l of wrap(x, s, w)) { if (Y > maxY) { x.fillText('…', X, Y); return Y + lh; } x.fillText(l, X, Y); Y += lh; }
  return Y;
}
function panelBg(x, W, H, color, a = .92) {
  x.beginPath(); x.roundRect(3, 3, W - 6, H - 6, Math.min(W, H) * .07);
  x.fillStyle = `rgba(9,11,22,${a})`; x.fill();
  const g = x.createLinearGradient(0, 0, W, H); g.addColorStop(0, rgba(color, .28)); g.addColorStop(.55, rgba(color, 0));
  x.fillStyle = g; x.fill();
  x.lineWidth = 4; x.strokeStyle = rgba(color, .9); x.stroke();
}
const grad = (x, X, W) => { const g = x.createLinearGradient(X, 0, X + W, 0); g.addColorStop(0, '#ffc24b'); g.addColorStop(.5, '#ff6b2c'); g.addColorStop(1, '#ff3d6e'); return g; };

/* ---------- 3D building blocks ---------- */
function slab(w, h, d, color, front, back) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, Math.min(w, h, d * 4) * .2),
    new THREE.MeshStandardMaterial({ color: 0x0c1020, metalness: .7, roughness: .3, emissive: new THREE.Color(color), emissiveIntensity: .08 }));
  g.add(body);
  const face = (map, z, rot) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w * .96, h * .94), new THREE.MeshBasicMaterial({ map, transparent: true }));
    m.position.z = z; m.rotation.y = rot; g.add(m); return m;
  };
  face(front, d / 2 + .0015, 0);
  if (back) face(back, -d / 2 - .0015, Math.PI);
  const edge = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(w * 1.01, h * 1.01, d * 1.05)),
    new THREE.LineBasicMaterial({ color, transparent: true, opacity: .45, blending: THREE.AdditiveBlending, depthWrite: false }));
  g.add(edge);
  g.userData.edge = edge; g.userData.hit = body;
  return g;
}
function label(text, color = '#eef2ff', width = .16, font = FONT.m(40)) {
  const t = tex(512, 128, (x, W, H) => {
    x.font = font; x.textAlign = 'center'; x.textBaseline = 'middle';
    const fit = (W - 24) / x.measureText(text).width;
    if (fit < 1) x.font = font.replace(/(\d+)px/, (_, n) => `${Math.floor(n * fit)}px`);
    x.shadowColor = 'rgba(0,0,0,.9)'; x.shadowBlur = 12; x.fillStyle = color; x.fillText(text, W / 2, H / 2);
  });
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false }));
  s.scale.set(width, width / 4, 1);
  return s;
}
// place on a circle around the user: deg 0 = straight ahead, positive = right
function polar(obj, r, deg, y) { const a = deg * D2R; obj.position.set(r * Math.sin(a), y, -r * Math.cos(a)); obj.rotation.set(0, -a, 0); return obj; }

/* ---------- entry point ---------- */
export async function startXR(mode, ctx) {
  const { renderer, scene, camera, world, U, setPair, keys, COLORS, LAYOUT, ry, lerp, updateHero, getTime, DATA } = ctx;
  const P = DATA.profile, L = DATA.links, preview = !mode;
  let session = null, floor = true;
  if (!preview) {
    session = await navigator.xr.requestSession(mode, { optionalFeatures: ['local-floor', 'hand-tracking'] });
    floor = !!session.enabledFeatures?.includes('local-floor');
    renderer.xr.setReferenceSpaceType(floor ? 'local-floor' : 'local');
    await renderer.xr.setSession(session);
    U.uPx.value = (session.renderState.baseLayer?.framebufferHeight || 2000) / 2; // point size in headset pixels
  }
  const ar = mode === 'immersive-ar';
  const added = []; // everything we add to the scene, removed on exit
  const add = (parent, o) => { parent.add(o); if (parent === scene) added.push(o); return o; };

  const root = add(scene, new THREE.Group());
  root.position.y = floor ? 0 : -1.6; // without local-floor the origin is the head
  add(scene, new THREE.HemisphereLight(0xdde6ff, 0x101828, 1.4));
  const sun = add(scene, new THREE.DirectionalLight(0xffe2c4, 2.2)); sun.position.set(1, 3, 2);

  /* ----- interaction registry ----- */
  const items = [];
  const interactive = (obj, o = {}) => {
    const ix = { hit: o.hit || obj.userData.hit, click: o.click, grab: !!o.grab, sec: o.sec, spin: o.spin || 0, base: 1, h: 0, vel: new THREE.Vector3(), free: 0, held: false, flip: false, focus: false };
    if (o.home) { ix.homePos = obj.position.clone(); ix.homeQuat = obj.quaternion.clone(); ix.homeQuatF = obj.quaternion.clone().multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI)); }
    ix.hit.userData.owner = obj; obj.userData.ix = ix; items.push(obj);
    return obj;
  };

  /* ----- environment ----- */
  if (floor) {
    const floorMat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uT: { value: 0 }, uA: { value: ar ? .45 : 1 } },
      vertexShader: 'varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }',
      fragmentShader: `uniform float uT,uA; varying vec2 vP;
        void main(){ float r = length(vP); vec2 g = abs(fract(vP*3.)-.5);
          float grid = smoothstep(.46,.5,max(g.x,g.y))*.35;
          float w = fract(r*.9 - uT*.3); float ring = smoothstep(0.,.02,w)*(1.-smoothstep(.02,.06,w));
          float fade = 1. - smoothstep(.4, 2.8, r);
          gl_FragColor = vec4((vec3(.24,.88,1.)*grid + vec3(1.,.45,.18)*ring*.8)*fade*uA, 1.); }`,
    });
    const fl = add(root, new THREE.Mesh(new THREE.PlaneGeometry(6, 6), floorMat)); fl.rotation.x = -Math.PI / 2; fl.position.y = .002;
    root.userData.floorMat = floorMat;
  }
  if (!ar) {
    const n = 2500, a = new Float32Array(n * 3), v = new THREE.Vector3();
    for (let i = 0; i < n; i++) { v.randomDirection().multiplyScalar(35 + Math.random() * 25); a.set([v.x, Math.abs(v.y) * .9 + 2, v.z], i * 3); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(a, 3));
    add(scene, new THREE.Points(g, new THREE.PointsMaterial({ color: 0xc9d6ff, size: 2, sizeAttenuation: false, transparent: true, opacity: .85 })));
  }

  /* ----- the particle world, now grabbable ----- */
  const HOME = new THREE.Vector3(0, 1.45, -1.5);
  const holder = add(root, new THREE.Group()); holder.position.copy(HOME);
  holder.add(world); world.position.set(0, 0, 0);
  const sprites = []; // PointsMaterial sizes are in world units and ignore the model scale
  world.traverse(o => { if (o.isPoints && o.material.isPointsMaterial) sprites.push([o.material, o.material.size]); });
  const sphereHit = new THREE.Mesh(new THREE.SphereGeometry(.6, 16, 12), new THREE.MeshBasicMaterial({ visible: false }));
  holder.add(sphereHit);
  interactive(holder, { hit: sphereHit, grab: true, click: () => step(1) });

  /* ----- sections: one group per particle shape ----- */
  const SEC = {};
  for (const k of keys) { const g = add(root, new THREE.Group()); g.position.y = 1.3; g.visible = false; g.userData.t = 0; SEC[k] = g; }
  const live = [];                                 // textures redrawn while their section is visible
  const put = (sec, obj, opts) => { SEC[sec].add(obj); return interactive(obj, { sec, home: true, ...opts }); };

  // 01 — hero: name slab + live Dakar clock
  const heroTex = tex(1024, 600, (x, W, H) => {
    panelBg(x, W, H, COLORS.globe);
    x.font = FONT.m(30); x.fillStyle = '#ffc24b'; x.fillText(`${P.greeting} ${P.greetingSub}`, 60, 80);
    x.font = FONT.t(104); x.fillStyle = '#eef2ff'; x.fillText(P.firstName, 56, 200);
    x.fillStyle = grad(x, 56, 520); x.fillText(P.lastName, 56, 310);
    x.font = FONT.m(32); x.fillStyle = '#eef2ff'; x.fillText(P.title, 60, 375);
    para(x, P.heroSub, 60, 430, FONT.b(28), '#b8c0d4', W - 120, 38, H - 40);
  });
  put('globe', polar(slab(.92, .54, .035, COLORS.globe, heroTex), 1.15, -48, .2), { grab: true });
  const clockFmt = new Intl.DateTimeFormat('fr-FR', { timeZone: P.timezone, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const clockTex = tex(512, 320, (x, W, H) => {
    panelBg(x, W, H, '#3ee0ff');
    x.font = FONT.t(44); x.fillStyle = '#eef2ff'; x.fillText(P.city, 40, 80);
    x.font = FONT.m(22); x.fillStyle = '#9aa3b8'; x.fillText(P.coords, 42, 118);
    x.font = FONT.t(78); x.fillStyle = '#3ee0ff'; x.fillText(clockFmt.format(new Date()), 38, 232);
    x.font = FONT.m(22); x.fillStyle = '#9aa3b8'; x.fillText('heure locale · en direct', 42, 280);
  });
  live.push(['globe', clockTex, 1]);
  put('globe', polar(slab(.42, .26, .03, '#3ee0ff', clockTex), 1.15, 50, .05), { grab: true });

  // 02 — about: lead slab, timeline monoliths (left), stat cubes (right)
  const leadTex = tex(1024, 360, (x, W, H) => {
    panelBg(x, W, H, COLORS.knot);
    x.font = FONT.t(54); x.fillStyle = '#eef2ff'; x.fillText('À propos', 50, 90);
    para(x, plain(DATA.about.lead), 52, 150, FONT.b(28), '#cfd5e6', W - 104, 38, H - 40);
  });
  const lead = slab(.86, .3, .03, COLORS.knot, leadTex); lead.position.set(0, .66, -1.3);
  put('knot', lead, { grab: true });
  DATA.timeline.forEach((t, i) => {
    const tt = tex(420, 680, (x, W, H) => {
      panelBg(x, W, H, PALETTE[i % PALETTE.length]);
      x.font = FONT.t(150); x.fillStyle = rgba(PALETTE[i % PALETTE.length], .25); x.fillText(String(i + 1).padStart(2, '0'), 24, 170);
      x.font = FONT.m(24); x.fillStyle = '#ffc24b'; x.fillText(t.tag.toUpperCase(), 34, 250);
      const y = para(x, t.title, 34, 310, FONT.t(34), '#eef2ff', W - 68, 44);
      para(x, plain(t.text), 34, y + 20, FONT.b(26), '#b8c0d4', W - 68, 36, H - 40);
    });
    put('knot', polar(slab(.27, .44, .05, PALETTE[i % PALETTE.length], tt), 1.2, -82 + i * 17, -.05), { grab: true });
  });
  const statEls = [...document.querySelectorAll('#stats strong')];
  DATA.stats.forEach((s, i) => {
    const value = () => statEls[i]?.dataset.count ?? s.value;
    const st = tex(320, 320, (x, W, H) => {
      x.fillStyle = '#0b0f1e'; x.fillRect(0, 0, W, H); x.strokeStyle = PALETTE[(i + 1) % 6]; x.lineWidth = 10; x.strokeRect(5, 5, W - 10, H - 10);
      x.textAlign = 'center'; x.font = FONT.t(110); x.fillStyle = grad(x, 40, W - 80); x.fillText(value(), W / 2, 170);
      x.font = FONT.m(22); x.fillStyle = '#cfd5e6'; wrap(x, plain(s.label), W - 40).slice(0, 3).forEach((l, k) => x.fillText(l, W / 2, 225 + k * 28));
    });
    const cube = new THREE.Mesh(new THREE.BoxGeometry(.15, .15, .15), new THREE.MeshStandardMaterial({ map: st, emissiveMap: st, emissive: 0xffffff, emissiveIntensity: .55, roughness: .4, metalness: .3 }));
    cube.userData.hit = cube;
    put('knot', polar(cube, 1.1, 32 + i * 16, -.1 + (i % 2) * .16), { grab: true, spin: .5 + i * .1 });
  });

  // 03 — projects: thick cards orbiting around you; select = fly to you and flip
  const ring = new THREE.Group(); SEC.galaxy.add(ring);
  const projects = DATA.projects, nP = projects.length;
  projects.forEach((p, i) => {
    const c = PALETTE[i % PALETTE.length], big = !!p.featured, W = big ? 760 : 640, H = big ? 480 : 420;
    const front = tex(W, H, (x) => {
      panelBg(x, W, H, c);
      x.font = FONT.m(24); x.fillStyle = DATA.languageColors?.[p.language] || '#9aa3b8'; x.beginPath(); x.arc(48, 54, 9, 0, 7); x.fill();
      x.fillStyle = '#9aa3b8'; x.fillText(p.language, 66, 62);
      if (big) { x.fillStyle = '#ffc24b'; x.fillRect(W - 168, 32, 128, 40); x.fillStyle = '#120804'; x.font = FONT.m(22); x.fillText('PHARE', W - 146, 60); }
      const y = para(x, p.name, 40, 150, FONT.t(big ? 70 : 54), '#eef2ff', W - 80, big ? 78 : 62);
      para(x, plain(p.description), 42, y + 4, FONT.b(26), '#cfd5e6', W - 84, 34, H - 90);
      x.font = FONT.m(20); x.fillStyle = '#9aa3b8'; x.fillText((p.tags || []).join('  ·  '), 42, H - 40);
    });
    const back = tex(W, H, (x) => {
      panelBg(x, W, H, c);
      x.font = FONT.t(40); x.fillStyle = '#eef2ff'; x.fillText(p.name, 40, 80);
      const y = para(x, plain(p.description), 42, 140, FONT.b(28), '#eef2ff', W - 84, 38, H - 130);
      x.font = FONT.m(22); x.fillStyle = c;
      if (p.repo) para(x, /^https?:/.test(p.repo) ? p.repo : L.github.replace(/\/?$/, '/') + p.repo, 42, Math.max(y + 20, H - 92), FONT.m(22), c, W - 84, 28);
      x.fillStyle = '#9aa3b8'; x.fillText('sélectionner à nouveau pour le renvoyer en orbite', 42, H - 30);
    });
    const card = slab(big ? .5 : .38, big ? .32 : .25, .02, c, front, back);
    polar(card, 1.25, -150 + i * (300 / Math.max(nP - 1, 1)), (i % 2) * .14 - .07);
    ring.add(card);
    interactive(card, { sec: 'galaxy', home: true, grab: true, click: () => {
      const was = card.userData.ix.focus;
      items.forEach(o => { o.userData.ix.focus = false; });
      card.userData.ix.focus = !was;
    } });
  });

  // 04 — stack: technologies as planets orbiting around you, one tilted orbit per category
  const orbits = DATA.stack.map((s, i) => {
    const c = PALETTE[i % PALETTE.length], r = .62 + i * .12, orbit = new THREE.Group();
    orbit.rotation.set((i - 2.5) * .16, i * .9, (i % 2 ? 1 : -1) * .12);
    SEC.lattice.add(orbit);
    const pts = []; for (let k = 0; k <= 96; k++) { const a = k / 96 * Math.PI * 2; pts.push(new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r)); }
    orbit.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: c, transparent: true, opacity: .3, blending: THREE.AdditiveBlending, depthWrite: false })));
    const title = label(s.title, c, .3, FONT.t(34)); title.position.set(r, .07, 0); orbit.add(title);
    s.items.forEach((name, k) => {
      const a = (k + .5) / s.items.length * Math.PI * 2;
      const planet = new THREE.Mesh(new THREE.IcosahedronGeometry(.032, 2), new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: .7, roughness: .3, metalness: .2 }));
      planet.position.set(Math.cos(a) * r, 0, Math.sin(a) * r);
      const tag = label(name, '#eef2ff', .16); tag.position.y = .06; planet.add(tag);
      planet.userData.hit = planet; orbit.add(planet);
      interactive(planet, { sec: 'lattice', home: true, grab: true, click: () => { planet.userData.ix.base = planet.userData.ix.base > 1 ? 1 : 1.8; } });
    });
    return [orbit, .05 + (i % 3) * .025 * (i % 2 ? -1 : 1)];
  });

  // 05 — now: curved holo screen with typing roles + grabbable chips
  const roles = DATA.roles; let roleI = 0, roleC = 0, roleHold = 0;
  const screenTex = tex(2048, 640, (x, W, H) => {
    x.fillStyle = 'rgba(4,10,18,.82)'; x.beginPath(); x.roundRect(4, 4, W - 8, H - 8, 40); x.fill();
    x.strokeStyle = 'rgba(62,224,255,.7)'; x.lineWidth = 5; x.stroke();
    x.font = FONT.m(40); x.fillStyle = '#22c55e'; x.fillText(`visiteur@${P.lastName.toLowerCase()}:~$ ./en_ce_moment`, 80, 110);
    x.font = FONT.t(96); x.fillStyle = '#eef2ff';
    const s = roles[roleI].slice(0, roleC); x.fillText(s, 80, 290);
    if ((getTime() * 2 | 0) % 2) { x.fillStyle = '#ff6b2c'; x.fillRect(90 + x.measureText(s).width, 210, 44, 96); }
    x.font = FONT.m(36); x.fillStyle = '#3ee0ff'; x.fillText('Projets en cours  →  ' + DATA.now.map(n => n.name).join('   ·   '), 80, 430);
    x.font = FONT.m(30); x.fillStyle = '#9aa3b8'; x.fillText(`${P.location}  ·  ${L.email}`, 80, 540);
  });
  screenTex.wrapS = THREE.RepeatWrapping; screenTex.repeat.x = -1; // seen from inside the cylinder
  const arc = 1.35;
  const screen = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, .64, 48, 1, true, Math.PI - arc / 2, arc), new THREE.MeshBasicMaterial({ map: screenTex, side: THREE.BackSide, transparent: true }));
  screen.position.y = .42; SEC.wave.add(screen);
  live.push(['wave', screenTex, .05]);
  DATA.now.forEach((n, i) => {
    const c = PALETTE[i % PALETTE.length];
    const t = tex(400, 140, (x, W, H) => { panelBg(x, W, H, c); x.font = FONT.t(40); x.fillStyle = '#eef2ff'; x.textAlign = 'center'; x.fillText(n.name, W / 2, 86); });
    put('wave', polar(slab(.26, .09, .03, c, t), .95, (i - (DATA.now.length - 1) / 2) * 17, -.32), { grab: true });
  });

  // 06 — contact: tiles that flip to reveal the address
  const contacts = [['@', 'E-mail', L.email], ['GH', 'GitHub', L.github], ['in', 'LinkedIn', L.linkedin], ['X', 'X', L.x]].filter(c => c[2]);
  contacts.forEach(([g, name, value], i) => {
    const c = PALETTE[i % PALETTE.length];
    const front = tex(320, 320, (x, W, H) => { panelBg(x, W, H, c); x.textAlign = 'center'; x.font = FONT.t(120); x.fillStyle = grad(x, 60, W - 120); x.fillText(g, W / 2, 190); x.font = FONT.m(30); x.fillStyle = '#eef2ff'; x.fillText(name, W / 2, 262); });
    const back = tex(320, 320, (x, W, H) => { panelBg(x, W, H, c); x.font = FONT.m(30); x.fillStyle = c; x.fillText(name, 30, 60); para(x, value.replace(/^https?:\/\/(www\.)?/, ''), 30, 120, FONT.m(26), '#eef2ff', W - 60, 34); });
    const tile = put('text', polar(slab(.2, .2, .03, c, front, back), .95, (i - (contacts.length - 1) / 2) * 15, -.3), { grab: true });
    tile.userData.ix.click = () => { tile.userData.ix.flip = !tile.userData.ix.flip; };
  });

  /* ----- dock: section orbs that follow you at waist height ----- */
  const dock = add(scene, new THREE.Group());
  const DOCK = [...keys.map((k, i) => ({ i, label: LABELS[k] || k, color: COLORS[k] })), { help: true, label: 'Aide', color: '#eef2ff' }, { exit: true, label: 'Quitter', color: '#ff4d6d' }];
  const orbs = DOCK.map((d, i) => {
    const x = (i - (DOCK.length - 1) / 2) * .12, orb = new THREE.Group();
    orb.position.set(x, 0, x * x * 1.2);
    const shell = new THREE.Mesh(new THREE.IcosahedronGeometry(.036, 1), new THREE.MeshBasicMaterial({ color: d.color, wireframe: true, transparent: true, opacity: .85 }));
    const core = new THREE.Mesh(new THREE.SphereGeometry(.016, 16, 12), new THREE.MeshBasicMaterial({ color: d.color }));
    const tag = label(d.label, '#eef2ff', .13); tag.position.y = -.065;
    orb.add(shell, core, tag); dock.add(orb);
    orb.userData.shell = shell; orb.userData.dock = d;
    return interactive(orb, { hit: shell, click: () => d.exit ? end() : d.help ? showGuide() : goTo(d.i) });
  });

  /* ----- help: illustrated guide panel + labels on the real controllers ----- */
  let helpUntil = Infinity, placeGuide = true;
  const art = new Image();
  const guideTex = tex(1400, 800, (x, W, H) => {
    panelBg(x, W, H, '#3ee0ff', .95);
    x.font = FONT.t(54); x.fillStyle = '#eef2ff'; x.fillText('Comment ça marche', 60, 96);
    x.font = FONT.m(26); x.fillStyle = '#9aa3b8'; x.fillText('Manettes Meta Quest ou mains nues', 62, 140);
    if (art.complete && art.naturalWidth) x.drawImage(art, 40, 170, W - 80, (W - 80) * art.naturalHeight / art.naturalWidth);
    x.font = FONT.m(26); x.fillStyle = '#ffc24b';
    x.fillText('Gâchette ou pincement sur ce panneau : fermer   ·   sphère « Aide » du dock : rouvrir', 62, H - 40);
  });
  const svg = document.getElementById('xr-guide-art');
  if (svg) {
    art.onload = () => guideTex.redraw();
    art.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(new XMLSerializer().serializeToString(svg));
  }
  const guide = add(scene, slab(.92, .526, .025, '#3ee0ff', guideTex)); // must sit in front of the globe (its front is ~.84 m away)
  interactive(guide, { click: () => { guide.visible = false; helpUntil = getTime() + 25; } });
  function showGuide() { guide.visible = true; placeGuide = true; helpUntil = Infinity; }
  const helpOn = () => getTime() < helpUntil;
  // callouts in grip space (approximate for Quest Touch controllers); side = outer side of the hand
  const calloutLines = new THREE.LineBasicMaterial({ color: 0x3ee0ff, transparent: true, opacity: .8, depthWrite: false });
  const controllerHelp = handedness => {
    const side = handedness === 'left' ? -1 : 1, g = new THREE.Group();
    [
      [handedness === 'left' ? 'Stick : pivoter de 30°' : 'Stick : tourner · rapprocher', '#3ee0ff', [0, .02, -.03], [0, .12, -.04]],
      ['Gâchette : sélectionner', '#ff6b2c', [0, -.015, -.07], [side * .09, -.06, -.12]],
      ['Grip : saisir · lancer', '#a78bfa', [-side * .02, -.02, -.01], [-side * .12, -.06, .02]],
    ].forEach(([text, color, a, b]) => {
      const l = label(text, color, .15); l.position.set(...b); g.add(l);
      g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(...a), new THREE.Vector3(...b)]), calloutLines));
      const dot = new THREE.Mesh(new THREE.SphereGeometry(.004, 8, 6), new THREE.MeshBasicMaterial({ color })); dot.position.set(...a); g.add(dot);
    });
    return g;
  };
  const pinchHelp = () => { const l = label('Pincer : sélectionner · maintenir : saisir', '#34d399', .2); l.position.set(0, .06, -.04); return l; };

  /* ----- pointers: XR controllers / hands, or the mouse in preview ----- */
  const pointers = [];
  const rc = new THREE.Raycaster();
  const makePointer = ray => {
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, 0, -1)]),
      new THREE.LineBasicMaterial({ color: 0x3ee0ff, transparent: true, opacity: .7, blending: THREE.AdditiveBlending, depthWrite: false }));
    const dot = new THREE.Mesh(new THREE.SphereGeometry(.008, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    ray.add(line, dot);
    const p = { ray, line, dot, source: null, active: preview, hit: null, grabbed: null, pressT: 0, pressTarget: null, last: new THREE.Vector3(), vel: new THREE.Vector3(), pos: new THREE.Vector3() };
    pointers.push(p);
    return p;
  };
  const pulse = (p, i, ms) => { try { p.source?.gamepad?.hapticActuators?.[0]?.pulse(i, ms); } catch {} };
  const grab = (p, obj) => {
    const ix = obj.userData.ix, other = pointers.find(q => q !== p && q.grabbed === obj);
    p.grabbed = obj; pulse(p, .7, 40);
    if (other) { ix.scaling = true; ix.s0 = ix.base; ix.d0 = p.pos.distanceTo(other.pos) || .1; return; }
    ix.parent0 = obj.parent; ix.held = true; ix.focus = false; p.ray.attach(obj);
  };
  const release = p => {
    const obj = p.grabbed; if (!obj) return;
    p.grabbed = null; pulse(p, .3, 20);
    const ix = obj.userData.ix, other = pointers.find(q => q.grabbed === obj);
    ix.scaling = false;
    if (other) { if (obj.parent === p.ray) other.ray.attach(obj); return; }
    ix.parent0.attach(obj); ix.held = false;
    ix.vel.copy(p.vel).clampLength(0, 4); ix.free = getTime() + (ix.homePos ? 2.2 : 0);
  };
  const onSelectStart = p => { p.pressT = getTime(); p.pressTarget = p.hit; };
  const onSelectEnd = p => {
    if (p.grabbed) release(p);
    else if (p.pressTarget && p.pressTarget === p.hit) { pulse(p, .4, 25); p.pressTarget.userData.ix.click?.(); }
    p.pressT = 0; p.pressTarget = null;
  };
  const onSqueezeStart = p => { if (p.hit?.userData.ix.grab) grab(p, p.hit); };
  const onSqueezeEnd = p => release(p);

  const cleanups = [];
  if (!preview) {
    const cmf = new XRControllerModelFactory(), hmf = new XRHandModelFactory();
    for (let k = 0; k < 2; k++) {
      const ray = add(scene, renderer.xr.getController(k)), p = makePointer(ray);
      const grip = add(scene, renderer.xr.getControllerGrip(k)); grip.add(cmf.createControllerModel(grip));
      const hand = add(scene, renderer.xr.getHand(k)); hand.add(hmf.createHandModel(hand, 'mesh'));
      const on = { connected: e => {
          p.source = e.data; p.active = true; p.line.material.opacity = e.data.hand ? .35 : .7;
          p.help?.removeFromParent();
          p.help = e.data.hand ? ray.add(pinchHelp()).children.at(-1) : grip.add(controllerHelp(e.data.handedness)).children.at(-1);
        },
        disconnected: () => { p.active = false; release(p); p.source = null; p.help?.removeFromParent(); p.help = null; },
        selectstart: () => onSelectStart(p), selectend: () => onSelectEnd(p), squeezestart: () => onSqueezeStart(p), squeezeend: () => onSqueezeEnd(p) };
      Object.entries(on).forEach(([e, f]) => { ray.addEventListener(e, f); cleanups.push(() => ray.removeEventListener(e, f)); });
      cleanups.push(() => { ray.remove(p.line, p.dot); });
    }
    session.addEventListener('end', () => cleanup());
  } else {
    // desktop preview: the mouse is a laser from the eyes, left = trigger, right = grip, arrows = turn
    document.body.classList.add('xr-preview');
    camera.position.set(0, 1.6, 0); camera.rotation.set(0, 0, 0); camera.fov = 70; camera.updateProjectionMatrix();
    const ray = add(scene, new THREE.Object3D()), p = makePointer(ray), ndc = new THREE.Vector2(), v = new THREE.Vector3();
    p.line.visible = false;
    p.update = () => { ray.position.copy(camera.position); v.set(ndc.x, ndc.y, .5).unproject(camera).sub(camera.position).normalize(); ray.lookAt(v.multiplyScalar(-1).add(camera.position)); };
    const cv = renderer.domElement, yaw = { v: 0 };
    const on = [
      [cv, 'pointermove', e => ndc.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1)],
      [cv, 'pointerdown', e => e.button === 2 ? onSqueezeStart(p) : onSelectStart(p)],
      [cv, 'pointerup', e => e.button === 2 ? onSqueezeEnd(p) : onSelectEnd(p)],
      [cv, 'contextmenu', e => e.preventDefault()],
      [window, 'keydown', e => { if (e.key === 'ArrowLeft') yaw.v += Math.PI / 6; if (e.key === 'ArrowRight') yaw.v -= Math.PI / 6; if (e.key === 'Escape') end(); camera.rotation.y = yaw.v; }],
    ];
    on.forEach(([t, e, f]) => { t.addEventListener(e, f); cleanups.push(() => t.removeEventListener(e, f)); });
    cleanups.push(() => document.body.classList.remove('xr-preview'));
  }

  /* ----- snap turn: spin everything around the head's vertical axis ----- */
  const UP = new THREE.Vector3(0, 1, 0), turnQ = new THREE.Quaternion(), pivot = new THREE.Vector3();
  const snapTurn = a => {
    turnQ.setFromAxisAngle(UP, -a); pivot.set(hp.x, 0, hp.z);
    for (const o of [root, guide]) { o.position.sub(pivot).applyQuaternion(turnQ).add(pivot); o.quaternion.premultiply(turnQ); }
  };

  /* ----- navigation between shapes ----- */
  let cur = 0, next = 0, mix = 0, busy = false, active = keys[0], first = true;
  setPair(0, 0);
  const goTo = j => {
    if (busy || j === cur) return;
    next = j; setPair(cur, j); mix = 0; busy = true; active = keys[j];
    items.forEach(o => { o.userData.ix.focus = false; o.userData.ix.flip = false; });
    if (active === 'globe') { holder.position.copy(HOME); holder.quaternion.identity(); holder.userData.ix.base = 1; holder.userData.ix.vel.set(0, 0, 0); }
  };
  const step = d => goTo((cur + d + keys.length) % keys.length);

  /* ----- per-frame ----- */
  const tv = new THREE.Vector3(), tq = new THREE.Quaternion(), hp = new THREE.Vector3(), hd = new THREE.Vector3(), dir = new THREE.Vector3(), dummy = new THREE.Object3D();
  const FAR = new THREE.Vector3(999, 999, 999);
  let lastLive = 0;
  const frame = dt => {
    const t = getTime(), head = renderer.xr.isPresenting ? renderer.xr.getCamera() : camera;
    head.getWorldPosition(hp); head.getWorldDirection(hd); hd.y = 0; hd.normalize();

    // morph
    if (busy && (mix = Math.min(mix + dt / 1.4, 1)) >= 1) { cur = next; setPair(cur, cur); mix = 0; busy = false; }
    const a = keys[cur], b = keys[busy ? next : cur], e = mix * mix * (3 - 2 * mix);
    U.uMix.value = mix; U.uTime.value = t; U.uMouse.value.set(9, 9); U.uAlpha.value = 1;
    world.scale.setScalar(lerp(XR_SCALE[a], XR_SCALE[b], e));
    world.rotation.set(.12, lerp(ry(LAYOUT[a]), ry(LAYOUT[b]), e) + Math.sin(t * .15) * .25, 0);
    U.uSize.value = .07 * world.scale.x * holder.scale.x; // point size ignores model scale
    sprites.forEach(([m, s]) => { m.size = s * world.scale.x * holder.scale.x; });
    updateHero(a === 'globe' ? 1 - Math.min(mix * 1.6, 1) : 0);
    if (root.userData.floorMat) root.userData.floorMat.uniforms.uT.value = t;

    // sections bloom out from around you
    for (const k of keys) {
      const g = SEC[k], on = k === active, u = g.userData;
      u.t = THREE.MathUtils.clamp(u.t + (on ? dt : -dt) * 2.2, 0, 1);
      g.visible = u.t > .001;
      g.scale.setScalar(Math.max(on ? easeBack(u.t) : ease(u.t), .001));
    }
    ring.rotation.y += dt * (items.some(o => o.userData.ix.focus) ? 0 : .035);
    orbits.forEach(([o, s]) => { o.rotation.y += s * dt; });
    if (t - lastLive > .05) { // ponytail: canvas redraws at 20 fps for visible live panels; fine for 2 textures
      lastLive = t;
      if (SEC.wave.visible) {
        if (roleC < roles[roleI].length) roleC++; else if ((roleHold += .05) > 2.2) { roleHold = 0; roleC = 0; roleI = (roleI + 1) % roles.length; }
      }
      live.forEach(([k, tx, every]) => { if (SEC[k].visible && (every < .5 || (t * 10 | 0) % 10 === 0)) tx.redraw(); });
    }

    if (guide.visible && placeGuide) {
      placeGuide = false;
      guide.position.copy(hp).addScaledVector(hd, .68); guide.position.y = hp.y - .06; guide.lookAt(hp);
    }

    // dock follows your gaze lazily, at waist height
    tv.copy(hp).addScaledVector(hd, .45); tv.y = hp.y - .42;
    if (first) { dock.position.copy(tv); first = false; } else dock.position.lerp(tv, .03);
    dock.lookAt(hp.x, hp.y - .1, hp.z);
    orbs.forEach(o => { const d = o.userData.dock, on = !d.exit && d.i === (busy ? next : cur); o.userData.ix.base = on ? 1.35 : 1; o.userData.shell.rotation.y += dt * (on ? 1.8 : .4); });

    // pointers: aim, hover, long-press grab, sticks, velocity
    const targets = items.filter(o => { const s = o.userData.ix.sec; return o.visible && (!s || SEC[s].visible); }).map(o => o.userData.ix.hit);
    pointers.forEach((p, k) => {
      if (!p.active) { p.line.visible = false; p.dot.visible = false; U[k ? 'uH1' : 'uH0'].value.copy(FAR); return; }
      p.update?.(); p.ray.updateMatrixWorld();
      p.pos.setFromMatrixPosition(p.ray.matrixWorld);
      dir.set(0, 0, -1).transformDirection(p.ray.matrixWorld);
      p.vel.lerp(tv.copy(p.pos).sub(p.last).divideScalar(Math.max(dt, 1e-3)), .5); p.last.copy(p.pos);
      rc.set(p.pos, dir); rc.far = 6;
      const h = rc.intersectObjects(targets, false)[0], obj = h?.object.userData.owner || null;
      if (!p.grabbed && obj !== p.hit) { p.hit = obj; if (obj) pulse(p, .12, 10); }
      if (!preview) p.line.visible = true;
      p.line.scale.z = h ? h.distance : 2.5; p.dot.visible = !!h; if (h) p.dot.position.set(0, 0, -h.distance);
      if (p.pressT && !p.grabbed && p.pressTarget?.userData.ix.grab && p.pressTarget === p.hit && t - p.pressT > .3) { grab(p, p.pressTarget); p.pressTarget = null; }
      const ax = p.source?.gamepad?.axes;
      if (ax?.length >= 4) {
        if (p.grabbed?.parent === p.ray) p.grabbed.position.z = Math.min(-.08, p.grabbed.position.z + ax[3] * dt * 1.6);
        if (p.source.handedness === 'left') {
          if (!p.snapLock && Math.abs(ax[2]) > .7) { snapTurn(-Math.sign(ax[2]) * Math.PI / 6); p.snapLock = true; pulse(p, .5, 30); }
          else if (Math.abs(ax[2]) < .3) p.snapLock = false;
        } else if (!p.grabbed) holder.rotation.y += ax[2] * dt * 1.8;
      }
      if (p.help) p.help.visible = helpOn();
      // particles flee from your hands (in the world's local space)
      U[k ? 'uH1' : 'uH0'].value.copy(world.worldToLocal(tv.copy(p.pos)));
    });
    for (let k = pointers.length; k < 2; k++) U[k ? 'uH1' : 'uH0'].value.copy(FAR);

    // items: hover, two-hand scale, throw inertia, spring home, focus
    for (const o of items) {
      const ix = o.userData.ix, hov = pointers.some(p => p.hit === o) ? 1 : 0;
      ix.h += (hov - ix.h) * .2;
      if (ix.scaling) {
        const [p1, p2] = pointers.filter(p => p.grabbed === o);
        if (p1 && p2) ix.base = THREE.MathUtils.clamp(ix.s0 * p1.pos.distanceTo(p2.pos) / ix.d0, .3, 4);
      }
      o.scale.setScalar(THREE.MathUtils.lerp(o.scale.x, ix.base * (1 + .08 * ix.h), .25));
      if (o.userData.edge) o.userData.edge.material.opacity = .4 + .55 * ix.h;
      if (ix.held) continue;
      if (ix.spin) o.rotation.y += ix.spin * dt;
      if (ix.focus) { // fly in front of the face, back side towards you
        tv.copy(hp).addScaledVector(hd, .5); tv.y -= .06;
        dummy.position.copy(tv); dummy.lookAt(hp); dummy.rotateY(Math.PI); dummy.updateMatrixWorld();
        o.position.lerp(o.parent.worldToLocal(tv.clone()), .14);
        o.quaternion.slerp(o.parent.getWorldQuaternion(tq).invert().multiply(dummy.quaternion), .14);
        continue;
      }
      if (ix.vel.lengthSq() > 1e-5) {
        o.getWorldPosition(tv).addScaledVector(ix.vel, dt);
        o.position.copy(o.parent.worldToLocal(tv)); ix.vel.multiplyScalar(.93);
      }
      if (ix.homePos && t > ix.free) {
        o.position.lerp(ix.homePos, .07);
        if (!ix.spin) o.quaternion.slerp(ix.flip ? ix.homeQuatF : ix.homeQuat, .12);
      }
    }
  };

  /* ----- exit ----- */
  let ended = false;
  function cleanup() {
    if (ended) return; ended = true;
    pointers.forEach(release);
    cleanups.forEach(f => f());
    scene.add(world);
    sprites.forEach(([m, s]) => { m.size = s; });
    added.forEach(o => scene.remove(o));
    U.uH0.value.copy(FAR); U.uH1.value.copy(FAR);
    ctx.onEnd();
  }
  function end() { if (session) session.end().catch(cleanup); else cleanup(); }

  return { frame, end, goTo, holder, get active() { return active; } };
}
