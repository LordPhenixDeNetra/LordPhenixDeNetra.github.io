# LordPhenixDeNetra.github.io

Portfolio de **Moussa THIOR** — Ingénieur Systèmes d'Information Répartis, Dakar.

Un seul `index.html`, zéro build : Three.js (via CDN) anime un champ de ~15 000 particules qui se transforme au fil du scroll —
globe terrestre centré sur Dakar → nœud torique → galaxie → treillis → champ d'ondes → « THIOR ».

## Lancer en local

```sh
python -m http.server 8000   # puis http://localhost:8000
```

(Ouvrir le fichier directement en `file://` désactive le masque des continents : le navigateur bloque la lecture de l'image.)

## Déployer

Pousser ce dossier dans un dépôt nommé `LordPhenixDeNetra.github.io` → GitHub Pages le sert sur https://lordphenixdenetra.github.io/.

## Modifier le contenu

Projets, stack et rôles : constantes `PROJECTS`, `STACK`, `ROLES` en haut du `<script type="module">`.
Commandes du terminal : objet `CMDS`.

`assets/earth-water.png` provient de l'exemple de [three-globe](https://github.com/vasturiano/three-globe) (MIT).
