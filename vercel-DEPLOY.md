# Déploiement Vercel (front statique) — Audrey Humbert

## 1) Principe
- Ton site actuel utilise un backend Express (`server.js`) pour l’API `/api/*` et les médias (`/uploads/*`).
- Comme tu as choisi la stratégie **2** : *front sur Vercel, backend ailleurs*.
- Donc Vercel héberge **uniquement** : HTML/CSS/JS/images.
- Ton backend Express doit être déployé ailleurs et exposer :
  - `GET /api/posts`
  - `POST /api/posts` (+ upload)
  - `PUT /api/posts/:id`
  - `DELETE /api/posts/:id`
  - `POST /api/auth/login`
  - `POST /api/contact`

## 2) Config côté front
Le front s’attend à une variable globale `window.APP_CONFIG.API_BASE`.

Dans `scripts/config.js` :
- Remplace `http://localhost:3000` par **l’URL complète** de ton backend, ex :
  - `https://api-audrey-exemple.com`

Ex :
```js
window.APP_CONFIG.API_BASE = "https://api-audrey-exemple.com";
```

## 3) Fichiers modifiés
- Ajout de `scripts/config.js`.
- `index.html` inclut `scripts/config.js` avant `main.js` et `contact.js`.
- `blog.html` inclut `scripts/config.js` avant `main.js`, `blog.js`, `admin.js`.
- `scripts/blog.js`, `scripts/contact.js`, `scripts/admin.js` utilisent `window.APP_CONFIG.API_BASE`.

## 4) Déploiement sur Vercel
1. Pousser le code sur GitHub.
2. Vercel → New Project → importer le repo.
3. Framework Preset (si demandé) : None (ou Static), car c’est du HTML.
4. Build command : **vide**
5. Output directory : **(vide)** ou laisse par défaut (Vercel détecte les fichiers statiques).
6. Deployment.

## 5) Test après déploiement
- Ouvrir `https://<ton-vercel-domain>/blog.html`
  - vérifier que les posts se chargent.
- Tester le formulaire contact (index.html)
- Tester l’admin (blog.html) : login + création/suppression posts

## 6) Notes important (CORS / Auth)
- Ton backend Express doit autoriser les origines Vercel (ou au minimum la production).
- Si le backend utilise `helmet`/`cors`/`rate-limit`, il faut que l’URL de ton front soit acceptée.
- Les uploads `/uploads/*` doivent être accessibles publiquement depuis le backend.

