import React, { useEffect, useState, useCallback } from "react";
import { io } from "socket.io-client";
import { scoringApi } from "../services/api";
import AdminLayout from "../components/layout/AdminLayout";
import LiveMatch from "../components/competitions/LiveMatch";

const SOCKET_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000/api"
).replace("/api", "");

function athleteName(a) {
  if (!a) return "—";
  return (
    `${a.firstName || ""} ${a.lastName || ""}`.trim() || a.name || "Athlète"
  );
}

function formatTime(sec) {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  return `${String(m).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

const STATUS_LABELS = {
  waiting: "⏳ En attente",
  live: "▶ LIVE",
  paused: "⏸ PAUSE",
  doctor_time: "🩺 Médecin",
  waiting_time: "⏳ Attente",
  finished: "✓ Terminé",
  validated: "✅ Validé",
};

export default function AdminLiveScoring() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [scoringFight, setScoringFight] = useState(null);

  // ---- load sessions ----
  const loadSessions = useCallback(async () => {
    try {
      const data = await scoringApi.listSessions({ limit: 50 });
      const list = (Array.isArray(data) ? data : []).filter((s) =>
        ["waiting", "live", "paused"].includes(s.status),
      );
      setSessions(list);
      setError(null);
    } catch {
      setError("Impossible de charger les sessions");
    } finally {
      setLoading(false);
    }
  }, []);

  // ---- socket for list refreshes ----
  useEffect(() => {
    loadSessions();

    const sock = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    sock.on("scoring:sessionCreated", () => loadSessions());
    sock.on("scoring:update", (updated) => {
      setSessions((prev) =>
        prev.map((s) => (String(s._id) === String(updated._id) ? updated : s)),
      );
    });
    sock.on("scoring:validated", () => loadSessions());
    sock.on("dashboard:scoring:update", () => loadSessions());

    return () => {
      sock.removeAllListeners();
      if (sock.connected) sock.disconnect();
    };
  }, [loadSessions]);

  // ---- open scoring dialog ----
  const openScoring = (session) => {
    const fight = session.fight || {};
    setScoringFight({
      _id: fight._id,
      redAthlete: fight.redAthlete,
      blueAthlete: fight.blueAthlete,
      redScore: fight.redScore ?? session.red?.score ?? 0,
      blueScore: fight.blueScore ?? session.blue?.score ?? 0,
      timerSeconds: session.remainingSeconds ?? session.durationSeconds ?? 300,
      status:
        session.status === "live"
          ? "LIVE"
          : session.status === "paused"
            ? "PAUSED"
            : "SCHEDULED",
      category: session.category || fight.category || "",
      mat: session.mat || "Tatami 1",
      round: session.round || "",
      competition: session.competition?._id || session.competition,
    });
  };

  const closeScoring = () => {
    setScoringFight(null);
    loadSessions();
  };

  // ---- helpers ----
  const liveCount = sessions.filter((s) => s.status === "live").length;

  return (
    <AdminLayout>
      <div className="page-head">
        <h1>Arbitrage — Sessions en direct</h1>
        <p>
          {liveCount > 0
            ? `${liveCount} combat${liveCount > 1 ? "s" : ""} en cours — `
            : "Aucun combat en cours — "}
          Surveillez tous les tatamis et intervenez sur un combat en cliquant
          sur Arbitrer.
        </p>
      </div>

      {error && (
        <div className="notice" style={{ marginBottom: "1rem" }}>
          {error}
          <button className="notice-close" onClick={() => setError(null)}>
            ×
          </button>
        </div>
      )}

      {loading ? (
        <div className="card" style={{ textAlign: "center", padding: "3rem" }}>
          Chargement des sessions...
        </div>
      ) : sessions.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "3rem" }}>
          <p className="muted">Aucune session de scoring active.</p>
          <p
            className="muted"
            style={{ fontSize: "0.85rem", marginTop: "0.5rem" }}
          >
            Les sessions apparaîtront ici dès qu'un arbitre ouvre un combat
            depuis les opérations de compétition.
          </p>
        </div>
      ) : (
        <div className="card" style={{ overflow: "hidden", padding: 0 }}>
          {/* Table header */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "80px 90px 1fr 60px 1fr 70px 120px 110px",
              gap: "0.5rem",
              alignItems: "center",
              padding: "0.85rem 1.25rem",
              background: "var(--bg-elevated, #0f172a)",
              borderBottom: "2px solid var(--border, #475569)",
              fontSize: "0.75rem",
              fontWeight: 700,
              color: "var(--text-primary, #f1f5f9)",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            <span>Tatami</span>
            <span>Discipline</span>
            <span>🔴 Rouge</span>
            <span style={{ textAlign: "center" }}>Score</span>
            <span>🔵 Bleu</span>
            <span style={{ textAlign: "center" }}>Chrono</span>
            <span style={{ textAlign: "center" }}>Statut</span>
            <span style={{ textAlign: "center" }}>Action</span>
          </div>

          {/* Session rows */}
          <div style={{ maxHeight: "calc(100vh - 280px)", overflowY: "auto" }}>
            {sessions.map((session, index) => {
              const fight = session.fight || {};
              const isLive = session.status === "live";
              const isPaused = session.status === "paused";
              const timerLabel =
                STATUS_LABELS[session.timerState] || session.status;
              const timerDisplay = formatTime(
                session.remainingSeconds ?? session.durationSeconds ?? 300,
              );

              return (
                <div
                  key={session._id}
                  onMouseEnter={(e) => {
                    if (!isLive)
                      e.currentTarget.style.background =
                        index % 2 === 0
                          ? "rgba(148,163,184,0.06)"
                          : "rgba(148,163,184,0.10)";
                  }}
                  onMouseLeave={(e) => {
                    if (!isLive)
                      e.currentTarget.style.background =
                        index % 2 === 0
                          ? "rgba(148,163,184,0.04)"
                          : "transparent";
                  }}
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "80px 90px 1fr 60px 1fr 70px 120px 110px",
                    gap: "0.5rem",
                    alignItems: "center",
                    padding: "0.85rem 1.25rem",
                    borderBottom: "1px solid var(--border, #334155)",
                    borderLeft: isLive
                      ? "3px solid #ef4444"
                      : isPaused
                        ? "3px solid #eab308"
                        : "3px solid transparent",
                    background: isLive
                      ? "linear-gradient(90deg, rgba(239,68,68,0.12) 0%, rgba(239,68,68,0.04) 100%)"
                      : isPaused
                        ? "linear-gradient(90deg, rgba(234,179,8,0.08) 0%, transparent 100%)"
                        : index % 2 === 0
                          ? "rgba(148,163,184,0.04)"
                          : "transparent",
                    transition: "background 0.2s",
                    cursor: "default",
                  }}
                >
                  {/* Mat — with mat number badge */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.4rem",
                    }}
                  >
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: 28,
                        height: 28,
                        borderRadius: "8px",
                        background: "var(--bg-elevated, #0f172a)",
                        border: "1px solid var(--border, #475569)",
                        fontWeight: 700,
                        fontSize: "0.8rem",
                        color: "#e2e8f0",
                        flexShrink: 0,
                      }}
                    >
                      {(session.mat || "Tatami 1").replace(/\D/g, "") || "1"}
                    </span>
                    <span
                      style={{
                        fontSize: "0.7rem",
                        fontWeight: 500,
                        color: "var(--text-secondary, #94a3b8)",
                      }}
                    >
                      {(session.mat || "Tatami 1").replace(/\d/g, "").trim() ||
                        "Tatami"}
                    </span>
                  </div>

                  {/* Discipline */}
                  <span
                    style={{
                      display: "inline-block",
                      padding: "0.15rem 0.5rem",
                      borderRadius: "6px",
                      background: "rgba(99,102,241,0.25)",
                      border: "1px solid rgba(99,102,241,0.50)",
                      color: "black",
                      fontSize: "0.7rem",
                      fontWeight: 600,
                      textAlign: "center",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {session.discipline || "NEWAZA"}
                  </span>

                  {/* Red */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "0.85rem",
                        color: "#fca5a5",
                        fontWeight: 600,
                      }}
                    >
                      {athleteName(fight.redAthlete)}
                    </span>
                    {session.winnerSide === "red" &&
                      session.status === "finished" && (
                        <span style={{ color: "#4ade80", fontSize: "0.8rem" }}>
                          🏆
                        </span>
                      )}
                  </div>

                  {/* Score — with accent pill */}
                  <div
                    style={{
                      textAlign: "center",
                    }}
                  >
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "0.25rem",
                        padding: "0.15rem 0.6rem",
                        borderRadius: "8px",
                        background: isLive
                          ? "rgba(239,68,68,0.15)"
                          : "var(--bg-elevated, #0f172a)",
                        border: isLive
                          ? "1px solid rgba(239,68,68,0.3)"
                          : "1px solid var(--border, #334155)",
                        fontFamily: "monospace",
                        fontWeight: 800,
                        fontSize: "1rem",
                        color: isLive
                          ? "#f8fafc"
                          : "var(--text-primary, #e2e8f0)",
                        minWidth: "64px",
                      }}
                    >
                      <span style={{ color: "#fca5a5" }}>
                        {session.red?.score ?? 0}
                      </span>
                      <span style={{ color: "#64748b", fontSize: "0.8rem" }}>
                        —
                      </span>
                      <span style={{ color: "#93c5fd" }}>
                        {session.blue?.score ?? 0}
                      </span>
                    </span>
                  </div>

                  {/* Blue */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                    }}
                  >
                    {session.winnerSide === "blue" &&
                      session.status === "finished" && (
                        <span style={{ color: "#4ade80", fontSize: "0.8rem" }}>
                          🏆
                        </span>
                      )}
                    <span
                      style={{
                        fontSize: "0.85rem",
                        color: "#93c5fd",
                        fontWeight: 600,
                      }}
                    >
                      {athleteName(fight.blueAthlete)}
                    </span>
                  </div>

                  {/* Timer */}
                  <div style={{ textAlign: "center" }}>
                    <span
                      style={{
                        fontFamily: "monospace",
                        fontWeight: 700,
                        fontSize: "0.95rem",
                        color:
                          isLive && session.remainingSeconds <= 30
                            ? "#f87171"
                            : "black",
                      }}
                    >
                      {timerDisplay}
                    </span>
                  </div>

                  {/* Status */}
                  <div style={{ textAlign: "center" }}>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.3rem",
                        padding: "0.2rem 0.6rem",
                        borderRadius: "10px",
                        fontSize: "0.72rem",
                        fontWeight: 600,
                        background: isLive
                          ? "rgba(239,68,68,0.25)"
                          : isPaused
                            ? "rgba(234,179,8,0.25)"
                            : "rgba(148,163,184,0.18)",
                        border: isLive
                          ? "1px solid rgba(239,68,68,0.55)"
                          : isPaused
                            ? "1px solid rgba(234,179,8,0.55)"
                            : "1px solid rgba(148,163,184,0.40)",
                        color: isLive
                          ? "#fca5a5"
                          : isPaused
                            ? "#fde047"
                            : "#e2e8f0",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {isLive && (
                        <span
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: "50%",
                            background: "#ef4444",
                            animation: "pulse 1.5s infinite",
                          }}
                        />
                      )}
                      {timerLabel}
                    </span>
                  </div>

                  {/* Action */}
                  <div style={{ textAlign: "center" }}>
                    {session.status !== "validated" && fight._id && (
                      <button
                        onClick={() => openScoring(session)}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = "scale(1.05)";
                          e.currentTarget.style.boxShadow = isLive
                            ? "0 0 12px rgba(239,68,68,0.4)"
                            : "0 0 12px rgba(99,102,241,0.4)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = "scale(1)";
                          e.currentTarget.style.boxShadow = "none";
                        }}
                        style={{
                          padding: "0.4rem 1rem",
                          borderRadius: "8px",
                          border: "none",
                          background: isLive
                            ? "linear-gradient(135deg, #dc2626, #b91c1c)"
                            : "linear-gradient(135deg, #6366f1, #7c3aed)",
                          color: "#fff",
                          fontSize: "0.8rem",
                          fontWeight: 700,
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                          letterSpacing: "0.02em",
                        }}
                      >
                        {isLive ? "Arbitrer" : "Ouvrir"}
                      </button>
                    )}
                    {session.status === "validated" && (
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.25rem",
                          padding: "0.25rem 0.75rem",
                          borderRadius: "8px",
                          background: "rgba(74,222,128,0.12)",
                          border: "1px solid rgba(74,222,128,0.3)",
                          fontSize: "0.8rem",
                          fontWeight: 600,
                          color: "#4ade80",
                        }}
                      >
                        <span>✅</span> Validé
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Scoring dialog */}
      {scoringFight && (
        <LiveMatch
          fight={scoringFight}
          discipline={scoringFight.category || "NEWAZA"}
          onClose={closeScoring}
        />
      )}
    </AdminLayout>
  );
}
