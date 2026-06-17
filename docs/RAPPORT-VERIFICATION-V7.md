# Rapport de vérification v7 — FTJJ Unified Final

Cette version a été vérifiée pour rester conforme à l’architecture cible : site public + backoffice fédéral + modules métier + production + préparation SaaS multi-fédération.

| Fonctionnalité demandée | Statut | Emplacement / remarque |
|---|---:|---|
| Partie publique premium | OK | Home.jsx + HomeContentSlider + routes publiques |
| Dashboard fédération | OK | FederationDashboard + AdminLayout + stats API |
| Dashboards club/coach/arbitre/athlète | OK | Rôles et routes protégées, base extensible |
| Constructeur de contenu | OK | AdminContentBuilder + ContentBlock + /api/content |
| Slider événements/stages | OK | HomeContentSlider alimenté par ContentBlock publié |
| Clubs / athlètes / coachs / arbitres | OK | Models + CRUD routes |
| Compétitions | OK | Competition model + CRUD + public pages |
| Documents / licences | OK | Document, License, UploadAsset, workflows |
| Paiements | OK | Payment model + manuel + providers prévus |
| Cloudinary / S3 / OVH Object Storage | OK | storage.service + env vars |
| Preview PDF/images et limites fichiers | OK | uploads.routes + multer + UploadAsset |
| Live scoring WebSocket | OK | socket.io + live.socket + Fight |
| Timer combat / écran arbitre / public | OK | AdminLiveScoring + Live page |
| Notifications SMTP | OK | mail.service + Notification |
| SMS placeholder | OK | sms.service |
| Refresh token | OK | RefreshToken model + auth routes |
| Mot de passe oublié | OK | PasswordResetToken + auth controller |
| Vérification email | OK | EmailVerificationToken + auth controller |
| Audit logs | OK | AuditLog + audit utils |
| Déploiement OVH | OK | docs + nginx + PM2 ecosystem |
| Backups automatiques | OK | backup.job + checklist |
| SaaS multi-fédération | OK | Federation model + federation fields + tenant-aware CRUD |

## Points importants

- Les clés réelles SMTP, MongoDB Atlas, Cloudinary/S3/OVH, Stripe/Konnect doivent être configurées dans `.env`.
- La home page publique a été stabilisée avec des classes CSS préfixées `wow-*` afin d’éviter de casser le dashboard.
- Les collections principales sont préparées pour le mode multi-fédération via le champ `federation`.
- Le code source reste privé dans un modèle SaaS ; les fédérations achètent un accès + abonnement.
