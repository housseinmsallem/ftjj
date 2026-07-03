import React, { useEffect, useState } from "react";
import api from "../../services/api";

const ACTION_LABELS = {
  start: "Démarrage",
  pause: "Pause",
  resume: "Reprise",
  doctor_time: "Temps médecin",
  waiting_time: "Temps d'attente",
  finish: "Fin du combat",
  points: "+ Points",
  advantage: "+ Avantage",
  penalty: "+ Pénalité",
  stalling: "+ Stalling",
  warning: "⚠ Avertissement",
  disqualification: "🚫 Disqualification",
};

const SIDE_LABELS = {
  red: "🔴 Rouge",
  blue: "🔵 Bleu",
  neutral: "⚪ Neutre",
};

function formatTime(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export default function ActionHistory({
  scoringSessionId,
  fightId,
  limit = 50,
  refreshTrigger = 0,
}) {
  const [actions, setActions] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!scoringSessionId && !fightId) return;

    setLoading(true);
    const params = {};
    if (scoringSessionId) params.scoringSessionId = scoringSessionId;
    if (fightId) params.fightId = fightId;

    api
      .get("/scoring-action-logs", { params: { sort: "-createdAt", limit } })
      .then(({ data }) => {
        const list = Array.isArray(data) ? data : [];
        // Filter client-side if needed
        const filtered = scoringSessionId
          ? list.filter(
              (a) =>
                String(a.scoringSessionId?._id || a.scoringSessionId) ===
                String(scoringSessionId),
            )
          : list;
        setActions(filtered.slice(0, limit));
      })
      .catch(() => setActions([]))
      .finally(() => setLoading(false));
  }, [scoringSessionId, fightId, limit, refreshTrigger]);

  if (loading && actions.length === 0) {
    return (
      <div className="action-history card">
        <h3>Historique des actions</h3>
        <p className="muted">Chargement...</p>
      </div>
    );
  }

  return (
    <div className="action-history card">
      <h3>Historique des actions</h3>

      {actions.length === 0 ? (
        <p className="muted">Aucune action enregistrée</p>
      ) : (
        <div className="action-list">
          {actions.map((action) => (
            <div key={action._id} className="action-item">
              <div className="action-header">
                <span
                  className={`action-type action-type-${action.actionType}`}
                >
                  {ACTION_LABELS[action.actionType] || action.actionType}
                </span>
                <span className={`action-side ${action.side}`}>
                  {SIDE_LABELS[action.side] || action.side}
                </span>
                {action.value != null && action.value !== 0 && (
                  <span className="action-value">
                    ({action.value > 0 ? "+" : ""}
                    {action.value})
                  </span>
                )}
              </div>
              {action.comment && (
                <div className="action-comment">{action.comment}</div>
              )}
              <div className="action-meta">
                <span className="action-time">
                  {formatTime(action.createdAt)}
                </span>
                {action.actorUserId && (
                  <span className="action-actor">
                    {action.actorUserId?.name || "Arbitre"}
                  </span>
                )}
                {action.remainingSeconds != null && (
                  <span className="action-timer">
                    {Math.floor(action.remainingSeconds / 60)}:
                    {String(Math.floor(action.remainingSeconds % 60)).padStart(
                      2,
                      "0",
                    )}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
