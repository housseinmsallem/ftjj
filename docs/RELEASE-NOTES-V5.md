# FTJJ v5 - Release exploitable Fédération

## Nouveautés clés
- Séparation claire site public / backoffice fédéral.
- API publique dédiée `/api/public/*` pour accueil, compétitions, rankings, live, clubs et athlètes.
- Paramètres fédération configurables depuis l'admin.
- Notifications fédérales par rôle.
- Exports CSV pour clubs, athlètes, compétitions et paiements.
- Documentation OVH complète avec Nginx, PM2 et SSL.
- UX renforcée : hero public premium, cartes, formulaires admin, états visuels.

## Modules prêts pour exploitation MVP
- Authentification JWT et rôles.
- Gestion clubs, athlètes, coachs, arbitres.
- Gestion compétitions et contenus publics.
- Licences, documents, paiements manuels.
- Workflows validation / refus.
- Live scoring prototype extensible.
- Audit logs.

## Points à brancher avec les comptes réels du client
- Domaine définitif.
- MongoDB Atlas ou MongoDB VPS.
- Identifiants paiement : Konnect, Stripe, PayPal ou virement.
- SMTP email transactionnel.
- URLs officielles YouTube/Facebook Live.
