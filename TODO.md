# FTJJ Single-Federation Cleanup

## Admin Information Architecture

- [x] Remove duplicate/legacy admin settings surfaces from navigation.
- [x] Rename `/admin/platform-settings` to a clear "Identite federale" admin surface.
- [x] Rename the CMS homepage editor to "Page d'accueil" and use one canonical route.
- [x] Rename "Constructeur contenu" to clarify that it controls the homepage slider/announcements.
- [x] Redirect legacy admin routes (`/admin/settings`, `/admin/cms`, `/admin/site-builder`, `/admin/homepage-editor`) to the new canonical pages.
- [x] Replace generic admin module copy with field-specific admin guidance.

## Single-Federation Settings Architecture

- [x] Treat platform settings as a singleton record, not tenant-scoped settings.
- [x] Treat homepage settings as a singleton record, not tenant-scoped CMS settings.
- [ ] Merge useful legacy `FederationSettings` fields into the main federation identity/admin settings flow.
- [ ] Decide whether `FederationSettings` should be removed, kept as internal admin config, or migrated.
- [ ] Keep existing `federation` model fields for now, but stop exposing multi-federation concepts in the admin UX.

## Settings And Media

- [ ] `/admin/platform-settings`: Logo field needs to be an image field that handles file upload.
- [ ] `/admin/media-library`: Add a download button for media assets.
- [ ] `/admin/media-library`: Add backend download integration.

## Competition Operations

- [ ] `/admin/competitions/operations`: Rework from the ground up.
- [ ] Add an athlete picker for competition registrations instead of manual/raw fields.
- [ ] When athletes are selected for a competition, automatically derive/add their weight categories.
- [ ] Align bracket generation with the selected athletes and generated categories.

## Admin UX And Data Entry

- [ ] `/admin/documents`: Decide whether this page should be removed, renamed, or redefined.
- [ ] `/admin/payments`: Replace raw `Id Payeur` entry with a searchable payer selector.
- [ ] `/admin/live-scoring`: Search/select a competition, then choose the round/fight.
- [ ] `/admin/live-scoring`: Display athlete names on each side.
- [ ] `/admin/live-scoring`: Allow manual athlete names when no competition link is needed.
- [ ] Improve admin table/form layout consistency.

## Completed

- [x] Inspect existing export routes and License model.
- [x] Add endpoint `GET /api/exports/licenses/:id/pdf` in `backend/src/routes/export.routes.js`.
- [x] Implement dependency-free minimal PDF generation from License fields.
- [x] `/admin/dashboard`: Remove the `latestRegistrations` card that displayed entire objects.

## Later

- [ ] Improve exported license PDF formatting and populate owner details (club/athlete/coach/referee).
