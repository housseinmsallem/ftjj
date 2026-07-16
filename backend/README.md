# Backend FTJJ - NestJS + PostgreSQL + Prisma

## Prérequis

- Node.js >= 18
- Bun (recommandé) ou npm
- Docker & Docker Compose (pour PostgreSQL)
- Une clé API Resend (pour les emails transactionnels)

## Installation

```bash
cd backend
bun install
```

## Configuration

1. Copier et adapter les variables d'environnement :

```bash
cp .env.example .env
# Modifier .env avec vos valeurs réelles
```

2. Variables importantes :
   - `DATABASE_URL` : URL de connexion PostgreSQL
   - `JWT_SECRET` / `JWT_REFRESH_SECRET` : Clés secrètes pour les tokens
   - `RESEND_API_KEY` : Clé API Resend pour les emails
   - `UPLOAD_DIR` : Dossier de stockage des fichiers uploadés

## Base de données

### Démarrer PostgreSQL avec Docker

```bash
# Depuis la racine du projet
docker compose up -d postgres
```

### Initialiser la base de données

```bash
# Générer le client Prisma
bun run prisma:generate

# Pousser le schéma (création des tables)
bun run prisma:push

# Peupler la base avec les données initiales
bun run prisma:seed
```

### Migrations (production)

```bash
bun run prisma:migrate
```

## Démarrage

```bash
# Développement (hot reload)
bun run dev

# Production
bun run build
bun run start:prod
```

Le serveur démarre sur `http://localhost:5000`.

## Documentation API

Swagger UI disponible sur : `http://localhost:5000/api/docs`

## Comptes de test (après seeding)

| Rôle        | Email                    | Mot de passe |
|-------------|--------------------------|--------------|
| Admin       | admin@example.com        | Admin123!    |
| Club Owner  | club@example.com         | Club123!     |
| En attente  | nouveau.club@example.com | Club123!     |

## Structure du projet

```
backend/
├── prisma/
│   ├── schema.prisma    # Schéma de base de données
│   └── seed.ts          # Script de seeding
├── src/
│   ├── main.ts          # Point d'entrée
│   ├── app.module.ts    # Module racine
│   ├── common/          # Guards, pipes, decorators, filters
│   └── modules/
│       ├── auth/        # Authentification JWT + rôles
│       ├── users/       # Gestion des utilisateurs
│       ├── clubs/       # Gestion des clubs
│       ├── persons/     # Athlètes, coachs, arbitres, techniciens
│       ├── licenses/    # Licences et validations
│       ├── registrations/ # Demandes d'inscription
│       ├── pricing/     # Tarifs et services
│       ├── competitions/ # Compétitions et inscriptions
│       ├── matches/     # Matchs (CRUD + scoring basique)
│       ├── scoring/     # Sessions de scoring en direct (WebSocket)
│       ├── uploads/     # Upload de fichiers
│       ├── email/       # Emails transactionnels (Resend)
│       ├── public/      # Endpoints publics
│       ├── dashboard/   # Statistiques et tableaux de bord
│       └── prisma/      # Service Prisma (global)
└── uploads/             # Fichiers uploadés (stockage disque)
```

## Modules principaux

### Authentification
- `POST /api/auth/login` — Connexion (JWT + refresh token)
- `POST /api/auth/register/club-owner` — Inscription propriétaire de club
- `POST /api/auth/refresh` — Rafraîchir le token
- `GET /api/auth/me` — Profil connecté
- `POST /api/auth/admin/approve-registration/:id` — Approuver un club
- `POST /api/auth/admin/reject-registration/:id` — Refuser un club

### Scoring en direct (WebSocket)
- `POST /api/scoring/sessions` — Créer une session
- `PATCH /api/scoring/sessions/:id/start` — Démarrer
- `PATCH /api/scoring/sessions/:id/action` — Ajouter des points/pénalités
- `PATCH /api/scoring/sessions/:id/finish` — Terminer
- WebSocket : événements `public:scoring:update`, `scoring:sessionCreated`
- `GET /api/scoring/public/sessions` — Sessions publiques

### Rôles
- **ADMIN** : Accès complet à toutes les fonctionnalités
- **CLUB_OWNER** : Gère son club, ses personnes, soumet des demandes

## Emails (Resend)

Tous les emails sont en français :
- Email de bienvenue (approbation de compte club)
- Email de refus (inscription rejetée)
- Notification d'approbation/refus de licence

## Validation

Les messages d'erreur de validation sont en français, ex :
- `"Le champ email doit être une adresse email valide"`
- `"Le champ mot de passe doit contenir au moins 8 caractères"`
