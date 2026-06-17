function id(value) { return String(value?._id || value || ''); }
function clubId(entry) { return id(entry.club || entry.clubId || entry.club?._id); }

export function seedAthletesAvoidingSameClub(athletes = []) {
  const grouped = new Map();
  for (const athlete of athletes) {
    const key = clubId(athlete) || 'NO_CLUB';
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(athlete);
  }
  const seeded = [];
  while ([...grouped.values()].some((items) => items.length)) {
    const groups = [...grouped.entries()].filter(([, items]) => items.length).sort((a, b) => b[1].length - a[1].length);
    for (const [, items] of groups) seeded.push(items.shift());
  }
  return seeded;
}

function nextPowerOfTwo(n) { let size = 1; while (size < n) size *= 2; return size; }

export function generateSingleEliminationBracket(athletes = [], options = {}) {
  const seeded = seedAthletesAvoidingSameClub(athletes);
  const size = nextPowerOfTwo(Math.max(2, seeded.length));
  const seeds = Array.from({ length: size }, (_, index) => ({ position: index + 1, athlete: seeded[index] || null }));
  const matches = [];
  for (let i = 0; i < size; i += 2) {
    matches.push({ matchNumber: matches.length + 1, redSeed: i + 1, blueSeed: i + 2, redAthlete: seeds[i].athlete?._id || seeds[i].athlete || null, blueAthlete: seeds[i + 1].athlete?._id || seeds[i + 1].athlete || null });
  }
  const bracket = { type: 'single_elimination', seeds, rounds: [{ round: 1, matches }], options };
  const conflicts = detectFirstRoundClubConflicts(bracket);
  bracket.firstRoundClubConflicts = conflicts.length;
  bracket.warnings = conflicts.length ? [`${conflicts.length} first-round same-club conflicts detected. Manual review recommended.`] : [];
  return bracket;
}

export function detectFirstRoundClubConflicts(bracket) {
  const seeds = bracket.seeds || [];
  const getSeed = (position) => seeds.find((seed) => seed.position === position)?.athlete;
  const matches = bracket.rounds?.[0]?.matches || [];
  return matches.filter((match) => {
    const red = getSeed(match.redSeed);
    const blue = getSeed(match.blueSeed);
    return red && blue && clubId(red) && clubId(red) === clubId(blue);
  });
}

export function optimizeBracketSeeding(bracket, athletes = []) {
  return generateSingleEliminationBracket(athletes, bracket.options || {});
}

export function manualOverrideBracketPosition(bracket, athleteId, position) {
  const seeds = bracket.seeds || [];
  const target = seeds.find((seed) => seed.position === Number(position));
  const current = seeds.find((seed) => id(seed.athlete) === id(athleteId));
  if (current) current.athlete = target?.athlete || null;
  if (target) target.athlete = athleteId;
  return bracket;
}
