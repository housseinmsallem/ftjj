import Bracket from '../models/Bracket.js';
import Fight from '../models/Fight.js';

/**
 * Scans the bracket and advances any byes (matches with only one athlete and no winner yet).
 * Also automatically schedules Fights for any matches that have both athletes set but no fight created yet.
 */
export async function processBracketAdvancement(bracket) {
  let updated = false;

  // 1. Advance Byes
  for (let r = 0; r < bracket.rounds.length - 1; r++) {
    const currentRoundMatches = bracket.rounds[r].matches;
    const nextRoundMatches = bracket.rounds[r + 1].matches;

    for (const match of currentRoundMatches) {
      // If match has red athlete but no blue athlete, and hasn't been advanced yet
      if (match.redAthlete && !match.blueAthlete && !match.winnerSeed) {
        match.winnerSeed = match.redSeed;
        const nextMatchIndex = Math.ceil(match.matchNumber / 2) - 1;
        const nextMatch = nextRoundMatches[nextMatchIndex];
        if (match.matchNumber % 2 !== 0) {
          nextMatch.redAthlete = match.redAthlete;
          nextMatch.redSeed = match.redSeed;
        } else {
          nextMatch.blueAthlete = match.redAthlete;
          nextMatch.blueSeed = match.redSeed;
        }
        updated = true;
      }
      // If match has blue athlete but no red athlete, and hasn't been advanced yet
      else if (match.blueAthlete && !match.redAthlete && !match.winnerSeed) {
        match.winnerSeed = match.blueSeed;
        const nextMatchIndex = Math.ceil(match.matchNumber / 2) - 1;
        const nextMatch = nextRoundMatches[nextMatchIndex];
        if (match.matchNumber % 2 !== 0) {
          nextMatch.redAthlete = match.blueAthlete;
          nextMatch.redSeed = match.blueSeed;
        } else {
          nextMatch.blueAthlete = match.blueAthlete;
          nextMatch.blueSeed = match.blueSeed;
        }
        updated = true;
      }
    }
  }

  // 2. Schedule Fights for fully populated matches that don't have a fight scheduled
  for (let r = 0; r < bracket.rounds.length; r++) {
    const matches = bracket.rounds[r].matches;
    for (const match of matches) {
      if (match.redAthlete && match.blueAthlete && !match.fight) {
        const fight = await Fight.create({
          federation: bracket.federation,
          competition: bracket.competitionId,
          category: bracket.name,
          redAthlete: match.redAthlete,
          blueAthlete: match.blueAthlete,
          mat: 'Tatami 1',
          status: 'SCHEDULED'
        });
        match.fight = fight._id;
        updated = true;
      }
    }
  }

  if (updated) {
    await bracket.save();
  }
}

/**
 * Advances the winner of a validated fight to the next round in the bracket.
 * Called automatically when a Fight's scoring session is validated.
 */
export async function advanceWinnerInBracket(fightId, winnerId) {
  // Find the bracket that contains this fight
  const bracket = await Bracket.findOne({ "rounds.matches.fight": fightId });
  if (!bracket) {
    console.log(`[Bracket Advancement] No bracket found containing fight ${fightId}`);
    return;
  }

  // Locate the round and match of the fight
  let foundRoundIndex = -1;
  let foundMatchIndex = -1;

  for (let r = 0; r < bracket.rounds.length; r++) {
    const idx = bracket.rounds[r].matches.findIndex(m => String(m.fight) === String(fightId));
    if (idx !== -1) {
      foundRoundIndex = r;
      foundMatchIndex = idx;
      break;
    }
  }

  if (foundRoundIndex === -1) {
    console.log(`[Bracket Advancement] Fight ${fightId} not found in rounds of bracket ${bracket._id}`);
    return;
  }

  const match = bracket.rounds[foundRoundIndex].matches[foundMatchIndex];

  // Set the winner seed/info on the finished match
  if (String(match.redAthlete) === String(winnerId)) {
    match.winnerSeed = match.redSeed;
  } else if (String(match.blueAthlete) === String(winnerId)) {
    match.winnerSeed = match.blueSeed;
  }

  // Advance winner to the next round if there is one
  const nextRoundIndex = foundRoundIndex + 1;
  if (nextRoundIndex < bracket.rounds.length) {
    const nextMatchNumber = Math.ceil(match.matchNumber / 2);
    const nextRoundMatches = bracket.rounds[nextRoundIndex].matches;
    const nextMatch = nextRoundMatches.find(m => m.matchNumber === nextMatchNumber);

    if (nextMatch) {
      if (match.matchNumber % 2 !== 0) {
        nextMatch.redAthlete = winnerId;
        nextMatch.redSeed = match.winnerSeed;
      } else {
        nextMatch.blueAthlete = winnerId;
        nextMatch.blueSeed = match.winnerSeed;
      }
    }
  }

  await bracket.save();

  // Process any subsequent byes or new fight scheduling
  await processBracketAdvancement(bracket);
}
