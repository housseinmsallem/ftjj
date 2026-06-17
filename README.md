# FTJJ Platform - Release Fédérale MERN

Plateforme officielle Fédération Tunisienne de Jiu-Jitsu : site public + backoffice fédéral + dashboards privés.

## Modules inclus
- Site public : accueil, slider animé, événements/stages/actualités, compétitions, rankings, live scoring.
- Backoffice Fédération : dashboard, constructeur contenu, clubs, athlètes, coachs, arbitres, compétitions, documents, licences, paiements, notifications, audit, paramètres.
- Backend Express/MongoDB : API REST sécurisée JWT/RBAC, workflows de validation, exports CSV, seed admin.
- Préparation production OVH : Nginx, PM2, SSL, documentation.

## Lancement local
```bash
npm install
npm run install:all
cp backend/.env.example backend/.env
npm run seed
npm run dev
```

Comptes seed :
- Admin : `admin@ftjj.tn` / `password123`
- Club : `club@ftjj.tn` / `password123`

## Production
Voir `docs/DEPLOIEMENT-OVH.md`.

## Notes
Les passerelles de paiement tunisiennes doivent être branchées avec les identifiants réels du client final. Les paiements manuels, reçus, statuts et historique sont déjà structurés.


---

# Version v7 Unified Verified

Cette version corrige la cohérence globale du produit afin de garder ensemble :

- la partie publique premium,
- les dashboards privés,
- les workflows fédéraux,
- le constructeur de contenu,
- le live scoring,
- les uploads cloud,
- les notifications,
- la sécurité avancée,
- le déploiement OVH,
- la préparation SaaS multi-fédération.

Le but de cette version est d'éviter une version « chamboulée » : les modules sont conservés, vérifiés et documentés dans une matrice de conformité.


## Mise à jour v8 - Portails et affiliation

Cette version ajoute explicitement les éléments demandés :

- Annuaire public Clubs / Associations avec filtres de recherche.
- Annuaire public Athlètes avec filtres catégorie, ceinture, licence.
- Annuaire public Entraîneurs / Coachs avec filtres.
- Annuaire public Arbitres avec filtres niveau et disponibilité.
- Page publique d’affiliation Club / Association : `/affiliation`.
- Création automatique d’un compte `CLUB_ADMIN` après demande d’affiliation.
- Espaces privés : Club, Athlète, Coach, Arbitre.
- Routes publiques backend : `/api/public/clubs`, `/api/public/athletes`, `/api/public/coaches`, `/api/public/referees`, `/api/public/affiliation`.

Voir aussi : `docs/RAPPORT-VERIFICATION-V8-PORTAILS.md`.


## v9 verified final

Cette archive inclut la correction finale des annuaires publics, fiches détaillées, formulaire affiliation Club / Association et espaces privés par rôle. Voir `docs/RAPPORT-VERIFICATION-V9-FINAL.md`.
