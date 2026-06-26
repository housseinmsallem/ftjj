function id(value) {
  return String(value?._id || value || "");
}
function clubId(entry) {
  return id(entry.club || entry.clubId || entry.club?._id);
}

export function seedAthletesAvoidingSameClub(athletes = []) {
  const grouped = new Map();
  for (const athlete of athletes) {
    const key = clubId(athlete) || "NO_CLUB";
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(athlete);
  }
  const seeded = [];
  while ([...grouped.values()].some((items) => items.length)) {
    const groups = [...grouped.entries()]
      .filter(([, items]) => items.length)
      .sort((a, b) => b[1].length - a[1].length);
    for (const [, items] of groups) seeded.push(items.shift());
  }
  return seeded;
}

function nextPowerOfTwo(n) {
  let size = 1;
  while (size < n) size *= 2;
  return size;
}

export function generateSingleEliminationBracket(athletes = [], options = {}) {
  const seeded = seedAthletesAvoidingSameClub(athletes);
  const size = nextPowerOfTwo(Math.max(2, seeded.length));
  
  const seeds = Array.from({ length: size }, (_, index) => ({
    position: index + 1,
    athlete: seeded[index] || null,
  }));

  const rounds = [];
  let currentRoundSize = size;
  let roundNumber = 1;

  while (currentRoundSize > 1) {
    const numMatches = currentRoundSize / 2;
    const matches = [];
    for (let i = 0; i < numMatches; i++) {
      matches.push({
        matchNumber: i + 1,
        redSeed: null,
        blueSeed: null,
        redAthlete: null,
        blueAthlete: null,
        fight: null,
        winnerSeed: null
      });
    }
    rounds.push({ round: roundNumber, matches });
    currentRoundSize = numMatches;
    roundNumber++;
  }

  // Populate Round 1 matches from the seeds
  const r1Matches = rounds[0].matches;
  for (let i = 0; i < r1Matches.length; i++) {
    const match = r1Matches[i];
    match.redSeed = i * 2 + 1;
    match.blueSeed = i * 2 + 2;
    match.redAthlete = seeds[i * 2].athlete?._id || seeds[i * 2].athlete || null;
    match.blueAthlete = seeds[i * 2 + 1].athlete?._id || seeds[i * 2 + 1].athlete || null;
  }

  // Iteratively advance byes
  for (let r = 0; r < rounds.length - 1; r++) {
    const currentRoundMatches = rounds[r].matches;
    const nextRoundMatches = rounds[r + 1].matches;

    for (const match of currentRoundMatches) {
      if (match.redAthlete && !match.blueAthlete) {
        const nextMatchIndex = Math.ceil(match.matchNumber / 2) - 1;
        const nextMatch = nextRoundMatches[nextMatchIndex];
        if (match.matchNumber % 2 !== 0) {
          nextMatch.redAthlete = match.redAthlete;
        } else {
          nextMatch.blueAthlete = match.redAthlete;
        }
      } else if (match.blueAthlete && !match.redAthlete) {
        const nextMatchIndex = Math.ceil(match.matchNumber / 2) - 1;
        const nextMatch = nextRoundMatches[nextMatchIndex];
        if (match.matchNumber % 2 !== 0) {
          nextMatch.redAthlete = match.blueAthlete;
        } else {
          nextMatch.blueAthlete = match.blueAthlete;
        }
      }
    }
  }

  const bracket = {
    type: "single_elimination",
    seeds,
    rounds,
    options,
  };
  const conflicts = detectFirstRoundClubConflicts(bracket);
  bracket.firstRoundClubConflicts = conflicts.length;
  bracket.warnings = conflicts.length
    ? [
        `${conflicts.length} first-round same-club conflicts detected. Manual review recommended.`,
      ]
    : [];
  return bracket;
}

export function detectFirstRoundClubConflicts(bracket) {
  const seeds = bracket.seeds || [];
  const getSeed = (position) =>
    seeds.find((seed) => seed.position === position)?.athlete;
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
