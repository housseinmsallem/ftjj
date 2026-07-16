import React, { useState } from "react";
import { ScoringSession } from "../../types";

interface Props {
  onAddPoints?: (side: "red" | "blue", value: number) => void;
  onAddWarning?: (side: "red" | "blue", reason: string) => void;
  onAddDisqualification?: (side: "red" | "blue") => void;
  onUndo?: () => void;
  onFinish?: (winnerSide: string | null, winMethod: string) => void;
  onStart?: () => void;
  onPause?: () => void;
  onResume?: () => void;
  onDoctorTime?: () => void;
  onWaitingTime?: () => void;
  session?: ScoringSession | null;
  disabled?: boolean;
  locked?: boolean;
}

interface PointOption {
  value: number;
  label: string;
}

const POINT_OPTIONS: PointOption[] = [
  { value: 1, label: "+1" },
  { value: 2, label: "+2" },
  { value: 3, label: "+3" },
  { value: 4, label: "+4" },
];

const WARNING_REASONS = [
  "Comportement antisportif",
  "Non-respect des commandes",
  "Contact illégal",
  "Fuite du combat",
  "Saisie interdite",
  "Autre",
];

const WIN_METHODS = [
  { value: "points", label: "Points" },
  { value: "submission", label: "Soumission" },
  { value: "decision", label: "Décision arbitrale" },
  { value: "forfeit", label: "Forfait" },
  { value: "disqualification", label: "Disqualification" },
  { value: "draw", label: "Égalité" },
];

export default function RefereeControlPanel({
  onAddPoints,
  onAddWarning,
  onAddDisqualification,
  onUndo,
  onFinish,
  onStart,
  onPause,
  onResume,
  onDoctorTime,
  onWaitingTime,
  session,
  disabled = false,
  locked = false,
}: Props) {
  const [showWarningModal, setShowWarningModal] = useState<"red" | "blue" | null>(null);
  const [warningReason, setWarningReason] = useState(WARNING_REASONS[0]);
  const [customReason, setCustomReason] = useState("");
  const [showFinishModal, setShowFinishModal] = useState(false);
  const [finishWinnerSide, setFinishWinnerSide] = useState<string | null>(null);
  const [winMethod, setWinMethod] = useState("points");

  const status = session?.status || "waiting";
  const isLive = status === "live";
  const isPaused = status === "paused";
  const isWaiting = status === "waiting" && session?.timerState === "idle";

  const handlePoints = (side: "red" | "blue", value: number) => {
    if (!locked && !disabled && onAddPoints && isLive) {
      onAddPoints(side, value);
    }
  };

  const openWarning = (side: "red" | "blue") => {
    setShowWarningModal(side);
    setWarningReason(WARNING_REASONS[0]);
    setCustomReason("");
  };

  const confirmWarning = () => {
    const reason = warningReason === "Autre" ? customReason : warningReason;
    if (showWarningModal && onAddWarning) {
      onAddWarning(showWarningModal, reason || "Comportement antisportif");
    }
    setShowWarningModal(null);
  };

  const handleFinish = () => {
    if (onFinish) {
      onFinish(finishWinnerSide, winMethod);
    }
    setShowFinishModal(false);
  };

  const showTimerControls = !locked && !disabled;

  return (
    <div className="referee-control-panel">
      {/* Timer bar */}
      {showTimerControls && (
        <div className="timer-bar">
          {isWaiting && (
            <button className="btn btn-success btn-lg" onClick={onStart}>
              ▶ Démarrer le combat
            </button>
          )}
          {isLive && (
            <>
              <button className="btn btn-warning" onClick={onPause}>
                ⏸ Pause
              </button>
              <button className="btn btn-outline" onClick={onDoctorTime}>
                🩺 Médecin
              </button>
              <button className="btn btn-outline" onClick={onWaitingTime}>
                ⏳ Attente
              </button>
            </>
          )}
          {isPaused && (
            <>
              <button className="btn btn-success" onClick={onResume}>
                ▶ Reprendre
              </button>
              <button
                className="btn btn-danger"
                onClick={() => setShowFinishModal(true)}
              >
                ⏹ Terminer
              </button>
            </>
          )}
          {isLive && (
            <button
              className="btn btn-danger"
              onClick={() => setShowFinishModal(true)}
            >
              ⏹ Terminer
            </button>
          )}
        </div>
      )}

      {/* Points grid */}
      <div className="card points-grid-card">
        <h3>Points</h3>
        {!isLive && !locked && (
          <p className="muted">Démarrez le combat pour attribuer des points</p>
        )}
        <div className="scoring-columns">
          <div className="scoring-col red-col">
            <h4 className="col-label red-label">🔴 Rouge</h4>
            <div className="points-grid">
              {POINT_OPTIONS.map((opt) => (
                <button
                  key={`pt-red-${opt.value}`}
                  className="btn btn-scoring btn-points btn-red"
                  onClick={() => handlePoints("red", opt.value)}
                  disabled={locked || disabled || !isLive}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div className="scoring-col blue-col">
            <h4 className="col-label blue-label">🔵 Bleu</h4>
            <div className="points-grid">
              {POINT_OPTIONS.map((opt) => (
                <button
                  key={`pt-blue-${opt.value}`}
                  className="btn btn-scoring btn-points btn-blue"
                  onClick={() => handlePoints("blue", opt.value)}
                  disabled={locked || disabled || !isLive}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Warnings & DQ */}
      <div className="card">
        <h3>Avertissements & Disqualifications</h3>
        <div className="scoring-columns">
          <div className="scoring-col red-col">
            <h4 className="col-label red-label">🔴 Rouge</h4>
            <button
              className="btn btn-scoring btn-warning btn-red"
              onClick={() => openWarning("red")}
              disabled={locked || disabled || !isLive}
            >
              ⚠ Avertissement
            </button>
            <button
              className="btn btn-scoring btn-dq btn-red"
              onClick={() =>
                onAddDisqualification && onAddDisqualification("red")
              }
              disabled={locked || disabled || !isLive}
            >
              🚫 Disqualification
            </button>
          </div>
          <div className="scoring-col blue-col">
            <h4 className="col-label blue-label">🔵 Bleu</h4>
            <button
              className="btn btn-scoring btn-warning btn-blue"
              onClick={() => openWarning("blue")}
              disabled={locked || disabled || !isLive}
            >
              ⚠ Avertissement
            </button>
            <button
              className="btn btn-scoring btn-dq btn-blue"
              onClick={() =>
                onAddDisqualification && onAddDisqualification("blue")
              }
              disabled={locked || disabled || !isLive}
            >
              🚫 Disqualification
            </button>
          </div>
        </div>
      </div>

      {/* Undo */}
      <div className="undo-bar">
        <button
          className="btn btn-outline btn-sm"
          onClick={onUndo}
          disabled={locked}
        >
          ↩ Annuler la dernière action
        </button>
      </div>

      {/* Warning Modal */}
      {showWarningModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowWarningModal(null)}
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>
              Avertissement —{" "}
              {showWarningModal === "red" ? "🔴 Rouge" : "🔵 Bleu"}
            </h3>
            <div className="form-group">
              <label>Motif</label>
              <select
                value={warningReason}
                onChange={(e) => setWarningReason(e.target.value)}
              >
                {WARNING_REASONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
            {warningReason === "Autre" && (
              <div className="form-group">
                <label>Précisez le motif</label>
                <input
                  type="text"
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  placeholder="Motif personnalisé..."
                />
              </div>
            )}
            <div className="modal-actions">
              <button
                className="btn btn-outline"
                onClick={() => setShowWarningModal(null)}
              >
                Annuler
              </button>
              <button className="btn btn-warning" onClick={confirmWarning}>
                Confirmer l'avertissement
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Finish Modal */}
      {showFinishModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowFinishModal(false)}
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Terminer le combat</h3>
            <p className="muted">
              Attribuez manuellement le vainqueur ou laissez le système décider
            </p>

            <div className="form-group">
              <label>Vainqueur</label>
              <div className="winner-choice-row">
                <button
                  className={`btn winner-choice ${finishWinnerSide === "red" ? "selected" : ""}`}
                  onClick={() => setFinishWinnerSide("red")}
                >
                  🔴 Rouge
                </button>
                <button
                  className={`btn winner-choice ${finishWinnerSide === "blue" ? "selected" : ""}`}
                  onClick={() => setFinishWinnerSide("blue")}
                >
                  🔵 Bleu
                </button>
                <button
                  className={`btn winner-choice ${finishWinnerSide === "draw" ? "selected" : ""}`}
                  onClick={() => setFinishWinnerSide("draw")}
                >
                  🤝 Égalité
                </button>
                <button
                  className={`btn winner-choice ${finishWinnerSide === null ? "selected" : ""}`}
                  onClick={() => setFinishWinnerSide(null)}
                >
                  Système
                </button>
              </div>
            </div>

            <div className="form-group">
              <label>Méthode de victoire</label>
              <select
                value={winMethod}
                onChange={(e) => setWinMethod(e.target.value)}
              >
                {WIN_METHODS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="modal-actions">
              <button
                className="btn btn-outline"
                onClick={() => setShowFinishModal(false)}
              >
                Annuler
              </button>
              <button className="btn btn-danger" onClick={handleFinish}>
                ⏹ Confirmer la fin du combat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
