# Architecture FTJJ v7 Unified

## Espaces

1. **Site public** : accueil premium, événements/stages, actualités, compétitions, rankings, live scoring.
2. **Dashboard Fédération** : administration centrale, validations, contenus, compétitions, licences, documents, paiements, audit logs.
3. **Dashboards privés** : club, coach, arbitre, athlète.
4. **Super Admin SaaS** : préparation multi-fédération avec modèle `Federation`.

## Stack

- React + Vite
- Node.js + Express
- MongoDB / MongoDB Atlas
- Socket.IO
- Cloudinary / S3 / OVH Object Storage
- Nginx + PM2
- SMTP + SMS placeholder

## Flux contenu public

Admin Fédération -> Content Builder -> statut PUBLISHED -> slider/public home.

## Flux live scoring

Arbitre -> écran scoring -> Socket.IO -> public live screen.

## Flux documents

Upload -> stockage cloud/local -> preview -> validation fédérale -> statut document/licence.
