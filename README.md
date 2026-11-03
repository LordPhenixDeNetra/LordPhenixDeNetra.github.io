# LordPhenixDeNetra.github.io

Portfolio de **Moussa THIOR** — Ingénieur Systèmes d'Information Répartis, Dakar.

Site statique, zéro build : Three.js (via CDN) anime un champ de ~15 000 particules qui se transforme au fil du scroll —
globe terrestre centré sur Dakar → nœud torique → galaxie → treillis → champ d'ondes → votre nom.

```
index.html            structure de la page
css/style.css         styles
js/main.js            rendu du contenu, terminal, scène 3D
data/portfolio.json   tout le contenu éditable
assets/               masque terre/océan du globe
```

## Lancer en local

```sh
python -m http.server 8000   # puis http://localhost:8000
```

(Ouvrir le fichier directement en `file://` désactive le masque des continents : le navigateur bloque la lecture de l'image.)

## Déployer

Pousser ce dossier dans un dépôt nommé `LordPhenixDeNetra.github.io` → GitHub Pages le sert sur https://lordphenixdenetra.github.io/.

## Modifier le contenu

Tout se fait dans **`data/portfolio.json`**, sans toucher au code :

| Clé | Contenu |
|---|---|
| `profile` | nom (le nom de famille est aussi dessiné en particules), titre, salutation, sous-titre, fuseau horaire de l'horloge |
| `links` | e-mail, GitHub, LinkedIn, X |
| `roles` | phrases tapées en boucle sous le nom |
| `about` | paragraphes « À propos » (`**gras**` autorisé) |
| `stats` | compteurs ; `"live": "github_repos"` remplace la valeur par le nombre réel de dépôts |
| `timeline` | parcours |
| `now` | projets « en cours » (`repo` optionnel : nom de dépôt ou URL complète) |
| `projects` | cartes projets ; `"featured": true` pour la grande carte |
| `stack`, `marquee` | technologies (`icon` = tracé SVG 24×24) |
| `languageColors` | couleur de la pastille par langage |
| `terminal.commands` | commandes texte du terminal : `"commande": "réponse"` |

`assets/earth-water.png` provient de l'exemple de [three-globe](https://github.com/vasturiano/three-globe) (MIT).
