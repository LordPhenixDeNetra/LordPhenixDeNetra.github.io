import * as THREE from 'three';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const mq = matchMedia('(prefers-reduced-motion: reduce)');
let reduce = mq.matches;
mq.addEventListener('change', e => { reduce = e.matches; document.body.classList.toggle('fx', !reduce); });
document.body.classList.toggle('fx', !reduce);
const fine = matchMedia('(hover:hover) and (pointer:fine)').matches;
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const md = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>'); // **gras** autorisé dans les textes du JSON
const get = (o, path) => path.split('.').reduce((v, k) => v?.[k], o);
const wait = ms => new Promise(r => setTimeout(r, ms));

/* ---------- data: data/portfolio.json ---------- */
let DATA;
try {
  const r = await fetch('data/portfolio.json');
  if (!r.ok) throw new Error('HTTP ' + r.status);
  DATA = await r.json();
} catch (e) {
  document.body.insertAdjacentHTML('afterbegin', '<p role="alert" style="position:fixed;inset:auto 16px 16px;z-index:300;background:#ff6b7d;color:#000;padding:12px 16px;border-radius:10px;font:600 .85rem monospace">Impossible de charger data/portfolio.json — servez le dossier via un serveur HTTP (voir README).</p>');
  throw e;
}
const { profile: P, links: L, projects: PROJECTS, stack: STACK, roles: ROLES } = DATA;
L.mailto = 'mailto:' + L.email;
const GH = L.github.replace(/\/?$/, '/');
const GH_USER = GH.split('/').filter(Boolean).pop();
const LANG = DATA.languageColors || {};
const repoUrl = r => /^https?:\/\//.test(r) ? r : GH + r;

/* ---------- render content ---------- */
$$('[data-bind]').forEach(el => { const v = get(DATA, el.dataset.bind); if (v != null) el.innerHTML = md(v); });
$$('[data-href]').forEach(el => { const v = get(DATA, el.dataset.href); if (v) el.href = v; });
$('h1').setAttribute('aria-label', `${P.firstName} ${P.lastName}`);
const [ln1, ln2] = $$('h1 .ln'); ln1.textContent = P.firstName; ln2.textContent = P.lastName;
$('#role').textContent = ROLES[0];

$('#stats').innerHTML = DATA.stats.map((s, i) => `
  <div class="stat reveal" style="--d:${i * .08}s"><strong${i ? '' : ' class="grad"'} data-count="${+s.value}"${s.live ? ` data-live="${esc(s.live)}"` : ''}>0</strong><span>${md(s.label)}</span></div>`).join('');
$('#timeline').innerHTML = DATA.timeline.map((t, i) => `
  <li class="reveal" style="--d:${i * .1}s"><small>${esc(t.tag)}</small><h3>${esc(t.title)}</h3><p>${md(t.text)}</p></li>`).join('');
$('#now').innerHTML = '<span><i class="dot"></i>En cours</span>' + DATA.now.map(n => n.repo
  ? `<a href="${esc(repoUrl(n.repo))}" target="_blank" rel="noopener">${esc(n.name)}</a>`
  : `<span>${esc(n.name)}</span>`).join('');

const arrow = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 17 17 7M8 7h9v9"/></svg>';
$('#grid').innerHTML = PROJECTS.map((p, i) => `
  <article class="card reveal${p.featured ? ' feat' : ''}" style="--d:${(i % 3) * .08}s">
    ${p.repo ? `<a class="go" href="${esc(repoUrl(p.repo))}" target="_blank" rel="noopener" aria-label="${esc(p.name)} sur GitHub"></a>` : ''}
    <div class="top"><span class="lang"><i style="--c:${esc(LANG[p.language] || '#9aa3b8')}"></i>${esc(p.language)}</span>${p.featured ? '<span class="badge">PHARE</span>' : `<span>${String(i + 1).padStart(2, '0')}</span>`}</div>
    <h3>${esc(p.name)}</h3><p>${md(p.description)}</p>
    <div class="tags">${(p.tags || []).map(t => `<span>${esc(t)}</span>`).join('')}</div>
    ${p.repo ? `<span class="arrow" aria-hidden="true">${arrow}</span>` : ''}
  </article>`).join('');
$('#stackgrid').innerHTML = STACK.map((s, i) => `
  <div class="box reveal" style="--d:${(i % 3) * .08}s"><h3><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${esc(s.icon)}"/></svg>${esc(s.title)}</h3>
  <ul>${s.items.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>`).join('');
const marq = (DATA.marquee || STACK[0].items).map(x => `<span>${esc(x)}</span>`).join('');
$('#marq').innerHTML = marq + marq;
$('#yr').textContent = new Date().getFullYear();

/* ---------- boot sequence ---------- */
const BOOT = ['<i>LPDN-BIOS v26.11</i> — Dakar, SN', '[ <b>OK</b> ] Initialisation du noyau', '[ <b>OK</b> ] Montage de /dev/rust — ownership vérifié', '[ <b>OK</b> ] Démarrage des agents Go', '[ <b>OK</b> ] Synchronisation du cluster Dakar ↔ monde', '[ <b>OK</b> ] Chargement des modèles IA', '[ <b>OK</b> ] Calibration des casques XR', '[ <b>OK</b> ] Pare-feu défensif actif', '', `<i>&gt;&gt; SYSTÈMES EN LIGNE.</i> ${esc(P.greeting)}.`];
const boot = $('#boot');
const ssGet = k => { try { return sessionStorage.getItem(k); } catch { return null; } };
const ssSet = (k, v) => { try { sessionStorage.setItem(k, v); } catch {} };
function endBoot() { boot.classList.add('done'); startUI(); }
if (reduce || ssGet('booted')) endBoot();
else {
  let k = 0;
  const step = () => {
    $('#bootlog').innerHTML += BOOT[k] + '\n';
    $('#bootbar').style.width = (++k / BOOT.length * 100) + '%';
    if (k < BOOT.length) setTimeout(step, 120 + Math.random() * 90);
    else { ssSet('booted', 1); setTimeout(endBoot, 450); }
  };
  step();
}

/* ---------- UI ---------- */
function startUI() {
  // hero letters
  $$('[data-split]').forEach(el => {
    el.setAttribute('aria-hidden', 'true');
    el.innerHTML = [...el.textContent].map((c, i) => `<span class="ch" style="--i:${i}">${esc(c)}</span>`).join('');
  });
  // reveals
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: .15 });
  $$('.reveal').forEach(el => io.observe(el));
  // count-up
  const cio = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return; cio.unobserve(e.target);
    const el = e.target, to = +el.dataset.count, t0 = performance.now();
    const f = now => { const p = reduce ? 1 : Math.min((now - t0) / 1400, 1); el.textContent = Math.round(to * (1 - Math.pow(1 - p, 3))); if (p < 1) requestAnimationFrame(f); };
    requestAnimationFrame(f);
  }), { threshold: .6 });
  $$('[data-count]').forEach(el => cio.observe(el));
  // typed roles
  let ri = 0;
  const roleEl = $('#role');
  const typeRole = async () => {
    if (reduce || ROLES.length < 2) return;
    const s = ROLES[ri = (ri + 1) % ROLES.length];
    for (let i = roleEl.textContent.length; i >= 0; i--) { roleEl.textContent = roleEl.textContent.slice(0, i); await wait(18); }
    for (let i = 1; i <= s.length; i++) { roleEl.textContent = s.slice(0, i); await wait(38); }
    setTimeout(typeRole, 2600);
  };
  setTimeout(typeRole, 2600);
}

// live GitHub repo count (falls back to the JSON value)
fetch('https://api.github.com/users/' + GH_USER).then(r => r.ok ? r.json() : null)
  .then(u => { if (u?.public_repos) $$('[data-live="github_repos"]').forEach(el => el.dataset.count = u.public_repos); }).catch(() => {});

// version picker: versions.json is generated at deploy time by .github/workflows/pages.yml
fetch('/versions.json').then(r => r.ok ? r.json() : []).then(vs => {
  if (!vs.length) return;
  const sel = $('#ver'), here = location.pathname.match(/^\/(v\d[^/]*)\//)?.[1] || '';
  sel.innerHTML = '<option value="">Dernière version</option>' + vs.map(v => `<option value="${esc(v.tag)}">${esc(v.tag)} · ${esc(v.date)}</option>`).join('');
  sel.value = here;
  sel.addEventListener('change', () => { location.href = '/' + (sel.value ? sel.value + '/' : ''); });
  sel.parentElement.hidden = false;
}).catch(() => {});

// local clock
const fmt = new Intl.DateTimeFormat('fr-FR', { timeZone: P.timezone, hour: '2-digit', minute: '2-digit', second: '2-digit' });
const tickClock = () => $('#clock').textContent = fmt.format(new Date());
tickClock(); setInterval(tickClock, 1000);

// header + nav active
const header = $('header');
addEventListener('scroll', () => header.classList.toggle('scrolled', scrollY > 30), { passive: true });
const sections = $$('[data-shape]');
const navIo = new IntersectionObserver(es => es.forEach(e => {
  if (!e.isIntersecting) return;
  $$(`nav a, .rail a`).forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + e.target.id));
}), { rootMargin: '-45% 0px -50% 0px' });
sections.forEach(s => navIo.observe(s));

// tilt + spotlight cards
if (fine) $$('.card').forEach(c => {
  c.addEventListener('pointermove', e => {
    const r = c.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
    c.style.setProperty('--mx', x * 100 + '%'); c.style.setProperty('--my', y * 100 + '%');
    if (reduce) return;
    c.classList.add('tilting');
    c.style.setProperty('--rx', (0.5 - y) * 10 + 'deg'); c.style.setProperty('--ry', (x - 0.5) * 12 + 'deg');
  });
  c.addEventListener('pointerleave', () => { c.classList.remove('tilting'); c.style.setProperty('--rx', '0deg'); c.style.setProperty('--ry', '0deg'); });
});

// magnetic buttons
if (fine) $$('.magnet').forEach(b => {
  b.addEventListener('pointermove', e => { if (reduce) return; const r = b.getBoundingClientRect(); b.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * .25}px,${(e.clientY - r.top - r.height / 2) * .35}px)`; });
  b.addEventListener('pointerleave', () => b.style.transform = '');
});

// custom cursor
const cur = $('.cur'), ring = $('.cur-ring');
let cx = -100, cy = -100, rx = -100, ry = -100;
addEventListener('pointermove', e => { cx = e.clientX; cy = e.clientY; ring.classList.toggle('hover', !!e.target.closest('a,button,input,.card')); }, { passive: true });
(function loop() { rx += (cx - rx) * .18; ry += (cy - ry) * .18; cur.style.transform = `translate(${cx}px,${cy}px) translate(-50%,-50%)`; ring.style.transform = `translate(${rx}px,${ry}px) translate(-50%,-50%)`; requestAnimationFrame(loop); })();

// copy email
const toast = msg => { const t = $('#toast'); t.textContent = msg; t.classList.add('on'); setTimeout(() => t.classList.remove('on'), 2000); };
$('#copy').addEventListener('click', () => navigator.clipboard?.writeText(L.email).then(() => toast('Adresse copiée ✓'), () => toast(L.email)));

/* ---------- terminal ---------- */
const tout = $('#tout'), tin = $('#tin'), tbody = $('#tbody');
const link = (u, t) => `<a href="${esc(u)}" target="_blank" rel="noopener">${esc(t)}</a>`;
const CMDS = {
  help: () => `Commandes disponibles :
  <span class="c">whoami</span>      qui suis-je
  <span class="c">neofetch</span>    fiche système
  <span class="c">projets</span>     projets phares
  <span class="c">stack</span>       technologies
  <span class="c">contact</span>     me joindre
  <span class="c">github</span>      ouvrir mon GitHub
  <span class="c">date</span> · <span class="c">clear</span> · <span class="g">sudo hire-moussa</span>${Object.keys(DATA.terminal?.commands || {}).map(k => ` · <span class="c">${esc(k)}</span>`).join('')}`,
  whoami: () => `${esc(P.name)} (alias <span class="g">${esc(P.alias)}</span>)
${esc(P.title)} — ${esc(P.location)}.
${STACK[0].items.slice(0, 5).map(esc).join(' · ')}.`,
  neofetch: () => `<span class="g">   ▄▄▄▄▄▄▄▄▄   </span>  <span class="c">${esc(P.firstName.toLowerCase())}</span>@<span class="c">${esc(P.lastName.toLowerCase())}</span>
<span class="g">  ███▀▀▀▀▀███  </span>  ─────────────────
<span class="g"> ███  ▄▄▄  ███ </span>  <span class="c">OS</span>      LPDN/Linux x86_64
<span class="g"> ███ █████ ███ </span>  <span class="c">Host</span>    ${esc(P.location)}
<span class="g"> ███  ▀▀▀  ███ </span>  <span class="c">Kernel</span>  ${STACK[0].items.slice(0, 2).map(esc).join(' · ')}
<span class="g">  ███▄▄▄▄▄███  </span>  <span class="c">Shell</span>   polyglotte (${STACK[0].items.length} langages)
<span class="g">   ▀▀▀▀▀▀▀▀▀   </span>  <span class="c">Projets</span> ${PROJECTS.length} phares · ${DATA.now.length} en cours
                 <span class="c">Uptime</span>  curieux depuis toujours`,
  projets: () => PROJECTS.map(p => `  ${p.repo ? link(repoUrl(p.repo), p.name.padEnd(17)) : esc(p.name.padEnd(17))} ${esc(p.language.padEnd(11))} ${esc(p.description.split(':')[0].split('.')[0])}`).join('\n'),
  stack: () => STACK.map(s => `<span class="g">${esc(s.title.padEnd(22))}</span> ${s.items.map(esc).join(' · ')}`).join('\n'),
  contact: () => `E-mail    ${link(L.mailto, L.email)}
LinkedIn  ${link(L.linkedin, 'LinkedIn')}
GitHub    ${link(GH, GH_USER)}
X         ${link(L.x, '@' + L.x.split('/').pop())}`,
  github: () => { open(GH, '_blank', 'noopener'); return `Ouverture de ${esc(GH)}…`; },
  date: () => new Date().toLocaleString('fr-FR', { timeZone: P.timezone, dateStyle: 'full', timeStyle: 'medium' }),
  'sudo hire-moussa': () => { setTimeout(() => location.href = L.mailto + '?subject=Collaboration', 1400); return `[sudo] mot de passe pour visiteur : ********
<span class="p">Accès accordé.</span> Ouverture du canal de recrutement…`; },
  clear: () => { tout.innerHTML = ''; return null; },
};
// plain-text commands from the JSON
Object.entries(DATA.terminal?.commands || {}).forEach(([k, v]) => { CMDS[k.toLowerCase()] = () => esc(v); });
CMDS.projects = CMDS.projets; CMDS.hire = CMDS['sudo hire-moussa'];
const hist = []; let hi = 0;
const print = html => { const d = document.createElement('div'); d.className = 'o'; d.innerHTML = html; tout.append(d); tbody.scrollTop = tbody.scrollHeight; };
print(`Bienvenue sur <span class="g">thior-os</span>. Tapez <span class="c">help</span> pour commencer.`);
tin.addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    const v = tin.value.trim(); tin.value = '';
    print(`<span class="p">visiteur@thior:~$</span> ${esc(v)}`);
    if (!v) return;
    hist.push(v); hi = hist.length;
    const fn = CMDS[v.toLowerCase()];
    const out = fn ? fn() : `<span class="e">commande introuvable :</span> ${esc(v)} — tapez <span class="c">help</span>`;
    if (out) print(out);
  } else if (e.key === 'ArrowUp' && hi > 0) { tin.value = hist[--hi]; e.preventDefault(); }
  else if (e.key === 'ArrowDown') { tin.value = hist[++hi] ?? ''; hi = Math.min(hi, hist.length); e.preventDefault(); }
  else if (e.key === 'Tab') { const m = Object.keys(CMDS).find(k => tin.value && k.startsWith(tin.value.toLowerCase())); if (m) tin.value = m; e.preventDefault(); }
});
tbody.addEventListener('click', () => { if (!getSelection().toString()) tin.focus({ preventScroll: true }); });

/* ---------- 3D: one particle field that morphs between shapes ---------- */
initGL().catch(err => { console.warn('WebGL désactivé :', err); $('#gl').remove(); });

async function initGL() {
  const canvas = $('#gl');
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, .1, 100);
  const world = new THREE.Group(); scene.add(world);
  let xr = null; // active immersive session handle (js/xr.js)

  const mobile = innerWidth < 760;
  const N = mobile ? 6500 : 15000;
  const R = 2.2, D2R = Math.PI / 180, rnd = Math.random;
  const gauss = () => (rnd() + rnd() + rnd() - 1.5) / 1.5;
  const ll = (lat, lon, r) => { const p = (90 - lat) * D2R, t = (lon + 180) * D2R; return [-r * Math.sin(p) * Math.cos(t), r * Math.cos(p), r * Math.sin(p) * Math.sin(t)]; };
  const fill = f => { const a = new Float32Array(N * 3); for (let k = 0; k < N; k++) a.set(f(k), k * 3); return a; };
  const rotXY = (v, ax, ay) => { let [x, y, z] = v; [y, z] = [y * Math.cos(ax) - z * Math.sin(ax), y * Math.sin(ax) + z * Math.cos(ax)]; [x, z] = [x * Math.cos(ay) + z * Math.sin(ay), -x * Math.sin(ay) + z * Math.cos(ay)]; return [x, y, z]; };

  // land mask from earth-water.png (water = white). Falls back to a plain sphere.
  let land = null;
  try {
    const img = new Image(); img.src = 'assets/earth-water.png'; await img.decode();
    const c = document.createElement('canvas'); c.width = 400; c.height = 200;
    const x = c.getContext('2d'); x.drawImage(img, 0, 0, 400, 200);
    const d = x.getImageData(0, 0, 400, 200).data;
    land = (lat, lon) => d[(Math.min(199, (90 - lat) / 180 * 200 | 0) * 400 + Math.min(399, (lon + 180) / 360 * 400 | 0)) * 4] < 128;
  } catch (e) { console.warn('masque terre indisponible', e); }

  const globe = (() => {
    const pts = [], M = 60000, g = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < M; i++) { const lat = Math.asin(1 - 2 * (i + .5) / M) / D2R, lon = ((i * g / D2R) % 360) - 180; if (!land || land(lat, lon)) pts.push([lat, lon]); }
    const nLand = land ? N * .94 : N;
    return fill(k => {
      if (k < nLand) { const [a, b] = pts[rnd() * pts.length | 0]; return ll(a + gauss() * .2, b + gauss() * .2, R); }
      return ll(Math.asin(rnd() * 2 - 1) / D2R, rnd() * 360 - 180, R * .985);
    });
  })();
  const knot = fill(() => {
    const t = rnd() * Math.PI * 2, r = Math.cos(3 * t) + 2, s = .62, o = .32 * Math.sqrt(rnd());
    const v = new THREE.Vector3().randomDirection().multiplyScalar(o);
    return [r * Math.cos(2 * t) * s + v.x, r * Math.sin(2 * t) * s + v.y, -Math.sin(3 * t) * s + v.z];
  });
  const galaxy = fill(k => {
    if (rnd() < .14) return rotXY([gauss() * .5, gauss() * .3, gauss() * .5], 1.05, 0);
    const r = Math.pow(rnd(), 1.5) * 4.4, a = (k % 3) / 3 * Math.PI * 2 + r * 1.15 + gauss() * .35 / (r + .5);
    return rotXY([Math.cos(a) * r, gauss() * .22 * Math.exp(-r * .35), Math.sin(a) * r], 1.05, 0);
  });
  const lattice = fill(k => {
    const s = .8, n = () => (Math.floor(rnd() * 5) - 2) * s, u = rnd() < .25 ? n() : (rnd() * 4 - 2) * s;
    const v = [[u, n(), n()], [n(), u, n()], [n(), n(), u]][k % 3];
    return rotXY(v, .62, .785);
  });
  const wave = fill(() => {
    const r = 5.4 * Math.sqrt(rnd()), a = rnd() * Math.PI * 2;
    return [Math.cos(a) * r, .32 * Math.sin(r * 2.3) * Math.exp(-r * .1) - 1.9, Math.sin(a) * r];
  });
  const text = await (async () => {
    try { await Promise.race([document.fonts.load('800 200px Unbounded'), wait(2500)]); } catch {}
    const W = 1200, H = 300, c = document.createElement('canvas'); c.width = W; c.height = H;
    const x = c.getContext('2d'); let fs = 240;
    x.font = `800 ${fs}px Unbounded, sans-serif`;
    fs *= Math.min(1, W * .94 / x.measureText(P.lastName).width);
    x.font = `800 ${fs}px Unbounded, sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = '#fff'; x.fillText(P.lastName, W / 2, H / 2);
    const d = x.getImageData(0, 0, W, H).data, px = [];
    for (let y = 0; y < H; y += 2) for (let i = 0; i < W; i += 2) if (d[(y * W + i) * 4 + 3] > 128) px.push([i, y]);
    return fill(() => { const [i, y] = px[rnd() * px.length | 0]; return [(i / W - .5) * 9.6, -(y / H - .5) * 2.4, gauss() * .12]; });
  })();

  const SHAPES = { globe, knot, galaxy, lattice, wave, text };
  const COLORS = { globe: '#ff7a2f', knot: '#3ee0ff', galaxy: '#a78bfa', lattice: '#34d399', wave: '#3ee0ff', text: '#ffb347' };
  // per-section layout: x, y, scale, alpha (desktop / mobile), then rotation offset and spin weight
  const LAYOUT = {
    globe:   [...(mobile ? [.9, 2.1, .55, .55] : [2.4, 0, .86, 1]), 0, 0],
    knot:    [...(mobile ? [0, 0, .7, .45]     : [2.8, 0, .95, .75]), 1, 1],
    galaxy:  [...(mobile ? [0, 0, .7, .4]      : [0, 0, 1.15, .5]), 2, 1],
    lattice: [...(mobile ? [0, 0, .7, .4]      : [2.9, .2, .95, .7]), 2.8, 1],
    wave:    [...(mobile ? [0, 0, .8, .6]      : [0, 0, 1, .8]), 3.5, 1],
    text:    [...(mobile ? [0, 1.7, .36, .9]   : [0, 1.95, .7, .95]), null, 0], // null = face the camera
  };
  const keys = sections.map(s => s.dataset.shape);

  const rand = new Float32Array(N * 4); for (let i = 0; i < rand.length; i++) rand[i] = rnd();
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(globe.slice(), 3)); // bounds only
  geo.setAttribute('aA', new THREE.BufferAttribute(globe.slice(), 3));
  geo.setAttribute('aB', new THREE.BufferAttribute(globe.slice(), 3));
  geo.setAttribute('aR', new THREE.BufferAttribute(rand, 4));
  const U = {
    uMix: { value: 0 }, uTime: { value: 0 }, uSize: { value: mobile ? .085 : .07 }, uPx: { value: 1 }, uAspect: { value: 1 },
    uMouse: { value: new THREE.Vector2(9, 9) }, uCA: { value: new THREE.Color() }, uCB: { value: new THREE.Color() }, uAlpha: { value: 1 },
    uH0: { value: new THREE.Vector3(999, 999, 999) }, uH1: { value: new THREE.Vector3(999, 999, 999) },
  };
  const mat = new THREE.ShaderMaterial({
    uniforms: U, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `
      attribute vec3 aA; attribute vec3 aB; attribute vec4 aR;
      uniform float uMix,uTime,uSize,uPx,uAspect; uniform vec2 uMouse; uniform vec3 uCA,uCB,uH0,uH1;
      varying vec3 vC; varying float vA;
      void main(){
        float m = clamp(uMix*1.4 - aR.x*.4, 0., 1.); m = m*m*(3.-2.*m);
        vec3 p = mix(aA, aB, m);
        p += normalize(aR.yzw - .5 + 1e-4) * sin(m*3.14159) * (.6 + aR.w*1.4);
        p += .035*vec3(sin(uTime*.9+aR.y*40.), cos(uTime*.7+aR.z*40.), sin(uTime*.8+aR.x*40.));
        vec3 h0 = p - uH0, h1 = p - uH1; // XR hands / controllers
        p += normalize(h0 + 1e-4) * exp(-dot(h0,h0)*2.2) * .9 + normalize(h1 + 1e-4) * exp(-dot(h1,h1)*2.2) * .9;
        vec4 mv = modelViewMatrix*vec4(p,1.);
        vec4 cl = projectionMatrix*mv;
        vec2 nd = cl.xy/cl.w - uMouse; nd.x *= uAspect;
        float f = 1. - smoothstep(0., .24, length(nd));
        mv.xy += normalize(nd + 1e-5) * f * .55;
        gl_Position = projectionMatrix*mv;
        gl_PointSize = max(uSize*(.55 + aR.w*aR.w*1.4)*uPx / -mv.z, 1.5);
        vC = mix(mix(uCA, uCB, m), vec3(1.), pow(aR.w, 8.)*.85 + f*.45);
        float dz = mv.z - (modelViewMatrix*vec4(0.,0.,0.,1.)).z;
        vA = mix(.22, 1., smoothstep(-1.4, .9, dz));
        vA *= aR.w > .93 ? .55 + .45*sin(uTime*2.5 + aR.y*30.) : 1.;
      }`,
    fragmentShader: `
      uniform float uAlpha; varying vec3 vC; varying float vA;
      void main(){ float d = length(gl_PointCoord-.5); float a = 1. - smoothstep(0., .5, d); a = pow(a, 1.6); gl_FragColor = vec4(vC, a*uAlpha*vA); }`,
  });
  const points = new THREE.Points(geo, mat); points.frustumCulled = false; world.add(points);

  // Dakar beacon + data arcs to the world (hero only)
  const DAKAR = [14.6928, -17.4467];
  const CITIES = [[48.86, 2.35], [40.71, -74.0], [-23.55, -46.63], [35.68, 139.69], [-33.92, 18.42], [45.5, -73.57], [25.2, 55.27], [6.52, 3.38], [1.35, 103.82], [51.5, -.12], [37.77, -122.42], [30.04, 31.24]];
  const hero = new THREE.Group(); world.add(hero);
  const heroMats = [];
  const dk = new THREE.Vector3(...ll(...DAKAR, R));
  const curves = CITIES.map(c => {
    const end = new THREE.Vector3(...ll(...c, R));
    const mid = dk.clone().add(end).normalize().multiplyScalar(R * (1 + dk.distanceTo(end) * .22));
    const cv = new THREE.QuadraticBezierCurve3(dk, mid, end);
    const m = new THREE.LineBasicMaterial({ color: 0xffa04a, transparent: true, opacity: .45, blending: THREE.AdditiveBlending, depthWrite: false });
    heroMats.push([m, .45]);
    hero.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(cv.getPoints(80)), m));
    return cv;
  });
  const dotTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'); const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, '#fff'); g.addColorStop(.25, 'rgba(255,200,120,.9)'); g.addColorStop(1, 'rgba(255,120,40,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();
  const PK = curves.length * 2;
  const pkGeo = new THREE.BufferGeometry(); pkGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array((PK + CITIES.length) * 3), 3));
  CITIES.forEach((c, i) => pkGeo.attributes.position.array.set(ll(...c, R), (PK + i) * 3));
  const pkMat = new THREE.PointsMaterial({ size: .16, map: dotTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
  heroMats.push([pkMat, 1]);
  hero.add(new THREE.Points(pkGeo, pkMat));
  const core = new THREE.Mesh(new THREE.SphereGeometry(.05, 16, 16), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true }));
  core.position.copy(dk); hero.add(core); heroMats.push([core.material, 1]);
  const rings = [0, .5].map(() => {
    const m = new THREE.MeshBasicMaterial({ color: 0xff6b2c, transparent: true, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending });
    const r = new THREE.Mesh(new THREE.RingGeometry(.07, .09, 48), m);
    r.position.copy(dk).multiplyScalar(1.003); r.lookAt(dk.clone().multiplyScalar(2)); hero.add(r); return r;
  });
  // depth-only sphere: opaque pass renders first, so it hides the far hemisphere of the additive points
  const occ = new THREE.Mesh(new THREE.SphereGeometry(R * .975, 48, 48), new THREE.MeshBasicMaterial({ colorWrite: false }));
  world.add(occ);
  // face Africa (Dakar is its westernmost tip, centring on it would show mostly ocean)
  const face = ll(6, 8, R), baseY = -Math.atan2(face[0], face[2]);

  // sizing + section offsets
  let vh = innerHeight, tops = [];
  const measure = () => {
    if (renderer.xr.isPresenting || xr) return; // the headset (or the preview) owns the camera
    vh = innerHeight;
    renderer.setSize(innerWidth, innerHeight, false);
    camera.aspect = innerWidth / innerHeight;
    camera.position.z = camera.aspect < .8 ? 9.5 : 7.6;
    camera.updateProjectionMatrix();
    U.uPx.value = innerHeight * renderer.getPixelRatio() / 2; U.uAspect.value = camera.aspect;
    tops = sections.map(s => s.getBoundingClientRect().top + scrollY);
  };
  measure();
  addEventListener('resize', measure);
  new ResizeObserver(measure).observe(document.body);

  const mouse = new THREE.Vector2(9, 9), mouseS = new THREE.Vector2(0, 0), mT = new THREE.Vector2(9, 9);
  if (fine) {
    addEventListener('pointermove', e => mT.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1), { passive: true });
    document.addEventListener('pointerleave', () => mT.set(9, 9));
  }

  let cur = -1, smoothY = scrollY, time = 0, last = performance.now();
  const setPair = (i, j = Math.min(i + 1, keys.length - 1)) => {
    const a = keys[i], b = keys[j];
    geo.attributes.aA.array.set(SHAPES[a]); geo.attributes.aA.needsUpdate = true;
    geo.attributes.aB.array.set(SHAPES[b]); geo.attributes.aB.needsUpdate = true;
    U.uCA.value.set(COLORS[a]); U.uCB.value.set(COLORS[b]);
    cur = i;
  };
  const lerp = (a, b, t) => a + (b - a) * t;
  // ponytail: spin wraps at 2π, a mid-transition wrap can pop slightly; track unwrapped angle if it shows
  const ry = L => L[4] === null ? 0 : baseY + L[4] + L[5] * (time * .12 % (Math.PI * 2));
  const updateHero = hw => {
    hero.visible = hw > .01; occ.visible = hw > .3;
    if (!hero.visible) return;
    heroMats.forEach(([m, o]) => m.opacity = o * hw);
    const arr = pkGeo.attributes.position.array, v = new THREE.Vector3();
    curves.forEach((cv, k) => { for (let j = 0; j < 2; j++) { cv.getPoint((time * (.18 + k % 4 * .04) + k * .13 + j * .5) % 1, v); arr.set([v.x, v.y, v.z], (k * 2 + j) * 3); } });
    pkGeo.attributes.position.needsUpdate = true;
    rings.forEach((r, k) => { const p = (time * .6 + k * .5) % 1; r.scale.setScalar(1 + p * 4); r.material.opacity = (1 - p) * hw; });
  };

  /* ---------- WebXR: the immersive scene lives in js/xr.js, loaded on demand ---------- */
  renderer.xr.enabled = true;
  const xrCtx = {
    renderer, scene, camera, world, U, setPair, keys, COLORS, LAYOUT, ry, lerp, updateHero, DATA,
    getTime: () => time,
    onEnd: () => { xr = null; if (location.hash === '#xr-preview') history.replaceState(null, '', location.pathname + location.search); cur = -1; U.uSize.value = mobile ? .085 : .07; camera.fov = 45; camera.rotation.set(0, 0, 0); camera.position.set(0, 0, 0); measure(); },
  };
  const enterXR = async mode => {
    if (xr) return;
    try { const { startXR } = await import('./xr.js'); xr = await startXR(mode, xrCtx); if (!mode) window.__xr = xr; }
    catch (err) { console.error(err); toast('Session XR impossible : ' + err.message); }
  };
  // "Mode immersif 3D" opens the illustrated guide, which offers VR / MR / desktop preview
  const guide = $('#xr-guide');
  $('#xr-open').hidden = false;
  $('#xr-open').addEventListener('click', () => { guide.showModal(); import('./xr.js').catch(() => {}); }); // warm the module so the headset session starts within the click
  for (const [mode, btn] of [['immersive-vr', $('#xr-vr')], ['immersive-ar', $('#xr-ar')]]) {
    navigator.xr?.isSessionSupported(mode).then(ok => { if (ok) { btn.hidden = false; $('#xr-novr').hidden = true; } }).catch(() => {});
    btn.addEventListener('click', () => { guide.close(); enterXR(mode); });
  }
  $('#xr-pv').addEventListener('click', () => { guide.close(); enterXR(null); });
  $('#xr-exit').addEventListener('click', () => xr?.end());
  const fromHash = () => { if (location.hash === '#xr-preview') enterXR(null); };
  fromHash(); addEventListener('hashchange', fromHash);

  renderer.setAnimationLoop(now => {
    const dt = Math.min((now - last) / 1000, .05); last = now;
    if (!reduce) time += dt;
    if (xr) { xr.frame(dt); renderer.render(scene, camera); return; }
    smoothY += (scrollY - smoothY) * (reduce ? 1 : .085);
    const center = smoothY + vh * .5;
    let i = 0; while (i < keys.length - 1 && tops[i + 1] <= center) i++;
    const mix = i < keys.length - 1 ? 1 - Math.min((tops[i + 1] - center) / (vh * .5), 1) : 0;
    if (i !== cur) setPair(i);
    U.uMix.value = mix; U.uTime.value = time;

    const La = LAYOUT[keys[i]], Lb = LAYOUT[keys[Math.min(i + 1, keys.length - 1)]];
    const e = mix * mix * (3 - 2 * mix);
    world.position.set(lerp(La[0], Lb[0], e), lerp(La[1], Lb[1], e), 0);
    world.scale.setScalar(lerp(La[2], Lb[2], e));
    U.uAlpha.value = lerp(La[3], Lb[3], e);

    // mouse: the shader repel uses the raw position, the rotation uses a smoothed one
    mouse.lerp(mT, .12);
    U.uMouse.value.copy(mouse);
    mouseS.lerp(mT.x > 5 ? new THREE.Vector2(0, 0) : mT, .04);
    world.rotation.y = lerp(ry(La), ry(Lb), e) + Math.sin(time * .15) * .25 + mouseS.x * .3;
    world.rotation.x = .12 - mouseS.y * .15;

    // hero layer fades out as the globe morphs away
    const hw = i === 0 ? 1 - Math.min(mix * 1.6, 1) : 0;
    updateHero(hw);
    renderer.render(scene, camera);
  });
}
