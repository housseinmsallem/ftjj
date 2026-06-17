# Roles et permissions

Roles supportes: `SUPER_ADMIN`, `FEDERATION_ADMIN`, `COMPETITION_MANAGER`, `CLUB_ADMIN`, `COACH`, `ATHLETE`, `REFEREE`, `TABLE_OPERATOR`, `MEDIA_MANAGER`, `PUBLIC_VIEWER`. Les routes admin et scoring utilisent JWT + `allowRoles`. Les actions sensibles alimentent `AuditLog`.
