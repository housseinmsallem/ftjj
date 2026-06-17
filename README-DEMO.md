# FTJJ DEMO

Structure du package :

- `backend/` : API Express, base MongoDB, seed, routes, controllers, models, fichiers `.env`
- `frontend/` : application React/Vite, pages publiques, dashboards, styles, fichiers `.env`
- `docs/` : documentation projet
- `deploy/` : fichiers de deploiement

Pour une demo locale :

1. Ouvrir le dossier `backend/`
2. Installer les dependances avec `npm install`
3. Lancer la base MongoDB locale si necessaire
4. Executer `npm run seed`
5. Executer `npm run dev`

Puis :

1. Ouvrir le dossier `frontend/`
2. Installer les dependances avec `npm install`
3. Executer `npm run dev`

Acces de demo :

- Admin : `admin@ftjj.tn` / `password123`
- Club : `club@ftjj.tn` / `password123`

Notes :

- Les dossiers `node_modules/` et `dist/` ne sont pas inclus pour garder l'archive legere.
- Les pages publiques ont ete ameliorees pour la demo, avec home premium, competitions refondues et annuaires plus presentables.
