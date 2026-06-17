# Live scoring

Le module scoring officiel est cote backend: `ScoringSession`, `ScoringActionLog`, `scoringEngine`. Ecran controle: `/admin/live-scoring/:sessionId/control`. Ecran public: `/live/fight/:fightId/display`. Socket.io diffuse `scoring:update`, `scoring:validated` dans la room `fight:{fightId}`.
