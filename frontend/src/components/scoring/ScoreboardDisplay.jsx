import React from "react";

function athleteName(athlete) {
  if (!athlete) return "—";
  return (
    `${athlete.firstName || ""} ${athlete.lastName || ""}`.trim() ||
    athlete.name ||
    "Athlète"
  );
}

function clubName(club) {
  if (!club) return "";
  return typeof club === "string" ? club : club.name || club.shortName || "";
}

export default function ScoreboardDisplay({
  session,
  redAthlete,
  blueAthlete,
  showAdvantages = true,
  showPenalties = true,
  showWarnings = true,
  compact = false,
}) {
  if (!session) {
    return (
      <div className="scoreboard card">
        <p className="muted text-center">Aucune session active</p>
      </div>
    );
  }

  const red = session.red || {};
  const blue = session.blue || {};
  const fight = session.fight || {};

  const rName = athleteName(redAthlete || fight.redAthlete);
  const bName = athleteName(blueAthlete || fight.blueAthlete);
  const rClub = clubName(redAthlete?.club || fight.redAthlete?.club);
  const bClub = clubName(blueAthlete?.club || fight.blueAthlete?.club);

  const isRedWinner = session.winnerSide === "red";
  const isBlueWinner = session.winnerSide === "blue";
  const isDraw = session.winnerSide === "draw";
  const isFinished =
    session.status === "finished" || session.status === "validated";

  const winMethodLabels = {
    points: "Points",
    submission: "Soumission",
    decision: "Décision",
    forfeit: "Forfait",
    disqualification: "Disqualification",
    draw: "Égalité",
  };

  return (
    <div className={`scoreboard ${compact ? "compact" : ""}`}>
      {/* Red side */}
      <div
        className={`score-side red-side ${isRedWinner ? "winner" : ""} ${isFinished && !isRedWinner && !isDraw ? "loser" : ""}`}
      >
        <div className="athlete-info">
          <div className="athlete-photo-placeholder">🔴</div>
          <h3 className="athlete-name">{rName}</h3>
          {rClub && <span className="athlete-club">{rClub}</span>}
        </div>
        <div className="score-value">{red.score || 0}</div>
        {showAdvantages && (
          <div className="score-detail">
            <span className="detail-label">Avantages</span>
            <span className="detail-value">{red.advantages || 0}</span>
          </div>
        )}
        {showPenalties && (
          <div className="score-detail">
            <span className="detail-label">Pénalités</span>
            <span className="detail-value">{red.penalties || 0}</span>
          </div>
        )}
        {showWarnings && (red.warnings || 0) > 0 && (
          <div className="score-detail warning-detail">
            <span className="detail-label">Avertissements</span>
            <span className="detail-value">{red.warnings}</span>
          </div>
        )}
        {(red.disqualifications || 0) > 0 && (
          <div className="dq-badge">Disqualifié</div>
        )}
        {isRedWinner && isFinished && (
          <div className="winner-badge">
            🏆{" "}
            {winMethodLabels[session.winMethod] ||
              session.winMethod ||
              "Vainqueur"}
          </div>
        )}
      </div>

      {/* Center info */}
      <div className="score-center">
        <div className="score-vs">VS</div>
        <div className="score-mat">{session.mat || "Tatami"}</div>
        <div className="score-round">
          {session.category || fight.category || ""}
          {session.round ? ` — ${session.round}` : ""}
        </div>
        <div className="score-discipline">{session.discipline || ""}</div>
        {isDraw && isFinished && <div className="draw-badge">Égalité</div>}
      </div>

      {/* Blue side */}
      <div
        className={`score-side blue-side ${isBlueWinner ? "winner" : ""} ${isFinished && !isBlueWinner && !isDraw ? "loser" : ""}`}
      >
        <div className="athlete-info">
          <div className="athlete-photo-placeholder">🔵</div>
          <h3 className="athlete-name">{bName}</h3>
          {bClub && <span className="athlete-club">{bClub}</span>}
        </div>
        <div className="score-value">{blue.score || 0}</div>
        {showAdvantages && (
          <div className="score-detail">
            <span className="detail-label">Avantages</span>
            <span className="detail-value">{blue.advantages || 0}</span>
          </div>
        )}
        {showPenalties && (
          <div className="score-detail">
            <span className="detail-label">Pénalités</span>
            <span className="detail-value">{blue.penalties || 0}</span>
          </div>
        )}
        {showWarnings && (blue.warnings || 0) > 0 && (
          <div className="score-detail warning-detail">
            <span className="detail-label">Avertissements</span>
            <span className="detail-value">{blue.warnings}</span>
          </div>
        )}
        {(blue.disqualifications || 0) > 0 && (
          <div className="dq-badge">Disqualifié</div>
        )}
        {isBlueWinner && isFinished && (
          <div className="winner-badge">
            🏆{" "}
            {winMethodLabels[session.winMethod] ||
              session.winMethod ||
              "Vainqueur"}
          </div>
        )}
      </div>
    </div>
  );
}
