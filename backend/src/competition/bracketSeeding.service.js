function id(value) {
  if (value === null || value === undefined) return "";
  return String(value?._id || value);
}

function clubId(entry) {
  if (!entry) return "NO_CLUB";
  const c = entry.club || entry.clubId || entry.club?._id;
  return c ? String(c) : "NO_CLUB";
}

export function seedAthletesAvoidingSameClub(athletes = []) {
  if (!athletes.length) return [];

  const grouped = new Map();
  for (const athlete of athletes) {
    if (!athlete || !id(athlete)) continue;
    const key = clubId(athlete) || "NO_CLUB";
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(athlete);
  }

  const seeded = [];
  let hasItems = true;
  while (hasItems) {
    hasItems = false;
    // Sort groups by size descending — fill largest groups first
    const groups = [...grouped.entries()]
      .filter(([, items]) => items.length > 0)
      .sort((a, b) => b[1].length - a[1].length);

    if (groups.length === 0) break;

    for (const [, items] of groups) {
      if (items.length > 0) {
        seeded.push(items.shift());
        hasItems = true;
      }
    }
  }
  return seeded;
}

function nextPowerOfTwo(n) {
  let size = 1;
  while (size < n) size *= 2;
  return size;
}

export function generateSingleEliminationBracket(athletes = [], options = {}) {
  // Filter out invalid entries
  const valid = (athletes || []).filter((a) => a && (a._id || a));
  const count = valid.length;

  if (count === 0) {
    throw new Error("Cannot generate bracket: no athletes provided");
  }

  // Seed athletes avoiding same-club first-round matchups
  const seeded = seedAthletesAvoidingSameClub(valid);
  const size = nextPowerOfTwo(Math.max(2, seeded.length));

  // Build seed positions (pad with nulls to power of 2)
  const seeds = Array.from({ length: size }, (_, i) => ({
    position: i + 1,
    athlete: seeded[i] || null,
  }));

  // Build rounds
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
        winnerSeed: null,
      });
    }
    rounds.push({ round: roundNumber, matches });
    currentRoundSize = numMatches;
    roundNumber++;
  }

  // Populate Round 1 from seeds
  const r1Matches = rounds[0].matches;
  for (let i = 0; i < r1Matches.length; i++) {
    const redSeed = seeds[i * 2];
    const blueSeed = seeds[i * 2 + 1];
    const match = r1Matches[i];

    match.redSeed = i * 2 + 1;
    match.blueSeed = i * 2 + 2;
    match.redAthlete = redSeed?.athlete?._id || redSeed?.athlete || null;
    match.blueAthlete = blueSeed?.athlete?._id || blueSeed?.athlete || null;
  }

  // Advance byes: if a match has only one athlete, auto-qualify them
  for (let r = 0; r < rounds.length - 1; r++) {
    const currentMatches = rounds[r].matches;
    const nextMatches = rounds[r + 1].matches;

    for (const match of currentMatches) {
      // Already has a winner (pre-determined advancing)
      if (match.winnerSeed) continue;

      const nextIdx = Math.ceil(match.matchNumber / 2) - 1;
      const nextMatch = nextMatches[nextIdx];
      if (!nextMatch) continue;

      const isOdd = match.matchNumber % 2 !== 0;

      if (match.redAthlete && !match.blueAthlete) {
        // Red auto-advances
        match.winnerSeed = match.redSeed;
        if (isOdd) {
          nextMatch.redAthlete = match.redAthlete;
          nextMatch.redSeed = match.redSeed;
        } else {
          nextMatch.blueAthlete = match.redAthlete;
          nextMatch.blueSeed = match.redSeed;
        }
      } else if (match.blueAthlete && !match.redAthlete) {
        // Blue auto-advances
        match.winnerSeed = match.blueSeed;
        if (isOdd) {
          nextMatch.redAthlete = match.blueAthlete;
          nextMatch.redSeed = match.blueSeed;
        } else {
          nextMatch.blueAthlete = match.blueAthlete;
          nextMatch.blueSeed = match.blueSeed;
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
    ? [`${conflicts.length} first-round same-club conflict(s) detected. Manual review recommended.`]
    : [];
  bracket.totalAthletes = count;
  bracket.bracketSize = size;

  return bracket;
}

export function detectFirstRoundClubConflicts(bracket) {
  if (!bracket || !bracket.seeds || !bracket.rounds) return [];

  const seeds = bracket.seeds || [];
  const getSeed = (position) =>
    seeds.find((s) => s.position === position)?.athlete;

  const matches = bracket.rounds[0]?.matches || [];
  return matches.filter((match) => {
    const red = getSeed(match.redSeed);
    const blue = getSeed(match.blueSeed);
    if (!red || !blue) return false;
    const redClub = clubId(red);
    const blueClub = clubId(blue);
    return redClub && blueClub && redClub !== "NO_CLUB" && redClub === blueClub;
  });
}

export function optimizeBracketSeeding(bracket, athletes = []) {
  try {
    return generateSingleEliminationBracket(athletes, bracket?.options || {});
  } catch {
    return bracket;
  }
}

export function manualOverrideBracketPosition(bracket, athleteId, position) {
  if (!bracket || !bracket.seeds) return bracket;
  const seeds = bracket.seeds;
  const target = seeds.find((s) => s.position === Number(position));
  const current = seeds.find((s) => id(s.athlete) === id(athleteId));
  if (target && current) {
    const temp = current.athlete;
    current.athlete = target.athlete;
    target.athlete = temp;
  }
  return bracket;
}
