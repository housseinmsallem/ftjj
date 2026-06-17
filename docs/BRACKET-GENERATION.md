# Generation categories et brackets

`POST /api/competitions/:id/generate-categories` groupe les inscriptions validees par discipline, sexe, age, poids et belt selon `beltGroupingMode`: `separate`, `combined`, `open`, `custom`. `POST /api/competitions/:id/generate-brackets` cree des brackets single elimination et tente de repartir les athletes d'un meme club pour reduire les conflits au premier tour. Les conflits restants produisent un warning.
