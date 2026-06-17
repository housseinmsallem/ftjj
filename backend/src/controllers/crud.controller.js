function sameId(a, b) {
  return String(a || '') === String(b || '');
}

function buildScope(Model, req, payload = null) {
  const query = {};

  if (req.user?.federation && req.user.role !== 'SUPER_ADMIN') query.federation = req.user.federation;
  if (payload && req.user?.federation && req.user.role !== 'SUPER_ADMIN') payload.federation = req.user.federation;

  if (req.user?.role === 'CLUB_ADMIN' && req.user.club) {
    if (Model.schema.path('club')) {
      query.club = req.user.club;
      if (payload) payload.club = req.user.club;
    }

    if (Model.schema.path('ownerType') && Model.schema.path('ownerId')) {
      query.ownerType = 'CLUB';
      query.ownerId = req.user.club;
      if (payload) {
        payload.ownerType = 'CLUB';
        payload.ownerId = req.user.club;
      }
    }

    if (Model.schema.path('payerType') && Model.schema.path('payerId')) {
      query.payerType = 'CLUB';
      query.payerId = req.user.club;
      if (payload) {
        payload.payerType = 'CLUB';
        payload.payerId = req.user.club;
      }
    }
  }

  return query;
}

function isOwnedByUser(item, req) {
  if (req.user?.role !== 'CLUB_ADMIN' || !req.user.club) return true;
  if (item.club) return sameId(item.club, req.user.club);
  if (item.ownerType && item.ownerId) return item.ownerType === 'CLUB' && sameId(item.ownerId, req.user.club);
  if (item.payerType && item.payerId) return item.payerType === 'CLUB' && sameId(item.payerId, req.user.club);
  return true;
}

export function crudController(Model, options = {}) {
  return {
    async list(req, res) {
      const query = buildScope(Model, req);
      if (req.query.status) query[options.statusField || 'status'] = req.query.status;
      if (req.query.club && !query.club) query.club = req.query.club;
      if (req.query.search && options.search) query.$text = { $search: req.query.search };
      const data = await Model.find(query).populate(options.populate || '').sort({ createdAt: -1 });
      res.json(data);
    },
    async get(req, res) {
      const item = await Model.findById(req.params.id).populate(options.populate || '');
      if (!item) return res.status(404).json({ message: 'Ressource introuvable' });
      if (!isOwnedByUser(item, req)) return res.status(403).json({ message: 'Acces non autorise' });
      res.json(item);
    },
    async create(req, res) {
      const payload = { ...req.body };
      buildScope(Model, req, payload);
      const item = await Model.create(payload);
      res.status(201).json(item);
    },
    async update(req, res) {
      const current = await Model.findById(req.params.id);
      if (!current) return res.status(404).json({ message: 'Ressource introuvable' });
      if (!isOwnedByUser(current, req)) return res.status(403).json({ message: 'Acces non autorise' });
      const payload = { ...req.body };
      buildScope(Model, req, payload);
      const item = await Model.findByIdAndUpdate(req.params.id, payload, { new: true, runValidators: true });
      if (!item) return res.status(404).json({ message: 'Ressource introuvable' });
      res.json(item);
    },
    async remove(req, res) {
      const current = await Model.findById(req.params.id);
      if (!current) return res.status(404).json({ message: 'Ressource introuvable' });
      if (!isOwnedByUser(current, req)) return res.status(403).json({ message: 'Acces non autorise' });
      const item = await Model.findByIdAndDelete(req.params.id);
      if (!item) return res.status(404).json({ message: 'Ressource introuvable' });
      res.json({ message: 'Supprime avec succes' });
    }
  };
}
