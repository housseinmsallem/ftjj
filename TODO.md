# TODO

## CMS duplicate key fix
- [ ] Patch `backend/src/routes/cms.routes.js` to remove client-sent `_id` (and likely `createdAt/updatedAt`) from `req.body` before `findOneAndUpdate(..., { upsert: true })`.
- [ ] Retest CMS endpoints (`PATCH /cms/homepage`, `PATCH /cms/platform-settings`) to ensure no more `E11000 duplicate key`.
- [ ] If still failing, inspect which field in payload triggers upsert conflict and add a more strict update query (e.g., `$set` only).

