# Idées pour la suite du portfolio

Classées de la plus utile à la plus spectaculaire.

| # | Idée | Effort | Impact |
|---|------|--------|--------|
| 1 | Version anglaise (FR/EN) | Faible | Fort |
| 2 | Carte de partage personnalisée | Faible | Fort |
| 3 | Projets en direct depuis GitHub | Moyen | Moyen |
| 4 | Vidéo de lancement de 30 s | Faible | Moyen |
| 5 | Assistant IA dans le terminal | Moyen | Fort |
| 6 | VR multijoueur | Élevé | Très fort |

À faire en premier : **1** et **2**, rapides et avec un vrai impact sur la visibilité.

---

## 1. Version anglaise (FR/EN)

- Un bouton de langue dans l'en-tête.
- Un fichier `data/portfolio.en.json` à côté de `portfolio.json`.
- La langue choisie est mémorisée, et la langue du navigateur sert de valeur par défaut.
- Presque gratuit grâce au JSON, puisque tout le contenu y est déjà.
- Ouvre le portfolio aux recruteurs internationaux. Le wolof pourrait suivre.

## 2. Carte de partage personnalisée

- Une image générée à partir d'une capture du globe, avec le nom et le titre.
- Elle s'affiche quand le lien est partagé sur LinkedIn, X ou WhatsApp. Aujourd'hui, l'aperçu est vide.
- Il suffit d'une image `assets/og.png` et de quelques balises `og:image` / `twitter:card`.

## 3. Projets en direct depuis GitHub

- Étoiles, dernier commit et langage récupérés automatiquement via l'API GitHub.
- La mention « mis à jour il y a 2 j » sur chaque carte projet.
- Montre que les projets sont vivants.
- Attention : l'API GitHub sans authentification est limitée à 60 requêtes par heure et par visiteur. Il faut prévoir un cache local.

## 4. Vidéo de lancement de 30 s

- Une courte vidéo du portfolio : globe, morphing des particules, extrait de la VR.
- Réalisable avec le skill `/brag`.
- Pour annoncer le portfolio sur LinkedIn et X.

## 5. Assistant IA dans le terminal

- Une commande `ask <question>` répond aux questions sur le parcours à partir de `portfolio.json`.
- Cohérent avec le projet aNtaerus.
- Il faut un petit backend (fonction serverless) pour protéger la clé d'API, puisque GitHub Pages ne sert que des fichiers statiques.

## 6. VR multijoueur

- Un recruteur et Moussa dans la même scène immersive, chacun avec son casque, pour une démo d'entretien en réalité mixte.
- Il faut un serveur de signalisation WebRTC et la synchronisation des positions (têtes, mains, objets saisis).
- Ambitieux, mais ce serait du jamais vu dans un portfolio.
