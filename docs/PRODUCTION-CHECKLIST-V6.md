# FTJJ v6 - Checklist production

## Modules implementes
- Upload production avec stockage `local`, `cloudinary`, `s3` ou `ovh`.
- Preview images et lien PDF/fichiers dans le dashboard documents.
- Limites fichiers via `UPLOAD_MAX_MB` et `UPLOAD_ALLOWED_MIMES`.
- Live scoring complet de base: WebSocket Socket.IO, scores rouge/bleu, timer, statut live, ecran arbitre et ecran public.
- Notifications SMTP avec fallback console en developpement.
- Placeholder SMS pour brancher fournisseur local.
- Refresh token, mot de passe oublie, verification email.
- Audit logs enrichis.
- Backups automatiques MongoDB via `mongodump` et `node-cron`.
- PM2 + Nginx + variables OVH documentes.

## A configurer avant mise en ligne
1. Domaine reel dans DNS OVH.
2. `CLIENT_URL` et `VITE_API_URL` avec HTTPS.
3. `MONGO_URI` MongoDB Atlas ou MongoDB VPS.
4. `JWT_SECRET` long et unique.
5. SMTP reel.
6. Stockage Cloudinary/S3/OVH.
7. `BACKUP_ENABLED=true` apres installation de `mongodb-database-tools`.
8. Certificat SSL Let's Encrypt.

## Tests effectues
- Verification syntaxe backend: `node --check`.
- Build frontend production: `npm run build`.
