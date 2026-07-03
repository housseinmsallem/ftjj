import React, { useState, useEffect, useRef, useCallback } from "react";
import { io } from "socket.io-client";
import {
  Plus,
  Minus,
  Play,
  Pause,
  Flag,
  Clock,
  AlertTriangle,
  Award,
  X,
} from "lucide-react";
import { scoringApi } from "../../services/api";

const SOCKET_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000/api"
).replace("/api", "");

const WARNING_REASONS = [
  "Comportement antisportif",
  "Non-respect des commandes",
  "Contact illegal",
  "Fuite du combat",
  "Saisie interdite",
  "Autre",
];

function formatTime(seconds) {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

function athleteName(athlete) {
  if (!athlete) return "Athlete";
  return (
    `${athlete.firstName || ""} ${athlete.lastName || ""}`.trim() ||
    athlete.name ||
    "Athlete"
  );
}

export default function LiveMatch({
  fight,
  discipline = "NEWAZA",
  onClose,
  onScoreUpdate,
}) {
  // ---- State: strictly split between timer (local) and scores (server-synced) ----
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessionId, setSessionId] = useState(null);

  // Scores — updated only from API responses / WebSocket score deltas
  const [redScore, setRedScore] = useState(0);
  const [blueScore, setBlueScore] = useState(0);
  const [redAdvantages, setRedAdvantages] = useState(0);
  const [blueAdvantages, setBlueAdvantages] = useState(0);
  const [redPenalties, setRedPenalties] = useState(0);
  const [bluePenalties, setBluePenalties] = useState(0);
  const [redWarnings, setRedWarnings] = useState(0);
  const [blueWarnings, setBlueWarnings] = useState(0);

  // Timer — fully local countdown, independent of server score-sync
  const [durationSeconds, setDurationSeconds] = useState(300);
  const [timer, setTimer] = useState(300);
  const [isRunning, setIsRunning] = useState(false);
  const [status, setStatus] = useState("waiting");
  const [timerState, setTimerState] = useState("idle");
  const [winnerSide, setWinnerSide] = useState(null);
  const [winMethod, setWinMethod] = useState(null);

  // Warning modal
  const [showWarningModal, setShowWarningModal] = useState(null);
  const [warningReason, setWarningReason] = useState(WARNING_REASONS[0]);
  const [customReason, setCustomReason] = useState("");

  // Refs to avoid stale closures
  const socketRef = useRef(null);
  const timerRef = useRef(null);
  const isRunningRef = useRef(false);
  const mountedRef = useRef(true);
  const sessionIdRef = useRef(null);

  const isLive = status === "live" || timerState === "running";
  const isPaused = status === "paused" || timerState === "paused";
  const isFinished = status === "finished" || timerState === "finished";
  const isWaiting = status === "waiting";
  const isLocked = status === "validated";

  // ---- Local timer tick (fully independent) ----
  const startLocalTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    isRunningRef.current = true;
    setIsRunning(true);
    timerRef.current = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          isRunningRef.current = false;
          setIsRunning(false);
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const pauseLocalTimer = useCallback(() => {
    isRunningRef.current = false;
    setIsRunning(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // ---- Apply score-only fields from server response (NEVER timer) ----
  const applyScoreFields = useCallback((s) => {
    setRedScore(s.red?.score ?? 0);
    setBlueScore(s.blue?.score ?? 0);
    setRedAdvantages(s.red?.advantages ?? 0);
    setBlueAdvantages(s.blue?.advantages ?? 0);
    setRedPenalties(s.red?.penalties ?? 0);
    setBluePenalties(s.blue?.penalties ?? 0);
    setRedWarnings(s.red?.warnings ?? 0);
    setBlueWarnings(s.blue?.warnings ?? 0);
  }, []);

  // ---- Apply timer-only fields from server (only on explicit timer events) ----
  const applyTimerFields = useCallback(
    (s) => {
      const dur = s.durationSeconds ?? 300;
      const rem = s.remainingSeconds ?? dur;
      const ts = s.timerState ?? "idle";
      const st = s.status ?? "waiting";
      setDurationSeconds(dur);
      setTimer(rem);
      setTimerState(ts);
      setStatus(st);
      setWinnerSide(s.winnerSide ?? null);
      setWinMethod(s.winMethod ?? null);

      // Sync local interval with server timer state
      if (ts === "running" && st === "live") {
        startLocalTimer();
      } else {
        pauseLocalTimer();
      }
    },
    [startLocalTimer, pauseLocalTimer],
  );

  // ---- Init: find/create session + WebSocket ----
  useEffect(() => {
    mountedRef.current = true;
    if (!fight?._id) return;

    let cancelled = false;

    async function init() {
      setLoading(true);
      setError(null);
      try {
        const sessions = await scoringApi.listSessions({});
        const existing = Array.isArray(sessions)
          ? sessions.find((s) => {
              const fId = s.fight?._id || s.fight;
              return (
                String(fId) === String(fight._id) && s.status !== "validated"
              );
            })
          : null;

        if (cancelled) return;

        if (existing) {
          setSessionId(existing._id);
          sessionIdRef.current = existing._id;
          applyScoreFields(existing);
          applyTimerFields(existing);
        } else {
          const newSession = await scoringApi.createSession({
            fightId: fight._id,
            discipline,
            mat: fight.mat || "Tatami 1",
            round: fight.round || "",
            category: fight.category || "",
          });
          if (cancelled) return;
          setSessionId(newSession._id);
          sessionIdRef.current = newSession._id;
          applyScoreFields(newSession);
          applyTimerFields(newSession);
        }
      } catch (err) {
        if (!cancelled)
          setError(err.response?.data?.message || "Erreur d'initialisation");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    init();

    // WebSocket — only disconnect on unmount (cancelled guard prevents race)
    const sock = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });
    socketRef.current = sock;

    sock.on("connect", () => {
      if (!cancelled) {
        setConnected(true);
        sock.emit("scoring:join", { fightId: fight._id });
      }
    });

    sock.on("disconnect", () => {
      if (!cancelled) setConnected(false);
    });

    sock.on("scoring:update", (updated) => {
      if (cancelled) return;
      const sId = sessionIdRef.current;
      if (!sId || String(updated._id) !== String(sId)) return;

      // Only update score fields; timer is local
      applyScoreFields(updated);

      // Propagate score to parent
      if (onScoreUpdate) {
        onScoreUpdate({
          fightId: fight._id,
          redScore: updated.red?.score ?? 0,
          blueScore: updated.blue?.score ?? 0,
        });
      }
    });

    sock.on("scoring:validated", (validated) => {
      if (cancelled) return;
      const sId = sessionIdRef.current;
      if (!sId || String(validated._id) !== String(sId)) return;
      applyScoreFields(validated);
      applyTimerFields(validated);
    });

    return () => {
      cancelled = true;
      mountedRef.current = false;
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      sock.removeAllListeners();
      // Only disconnect if already connected — avoids "closed before established" race
      if (sock.connected) {
        sock.emit("scoring:leave", { fightId: fight._id });
        sock.disconnect();
      }
    };
  }, [fight?._id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // ---- API Actions ----

  const callApi = async (apiFn) => {
    const id = sessionIdRef.current;
    if (!id) return null;
    try {
      setError(null);
      const result = await apiFn(id);
      return result;
    } catch (err) {
      setError(err.response?.data?.message || "Erreur");
      return null;
    }
  };

  const handleStart = async () => {
    const updated = await callApi(scoringApi.startSession);
    if (updated) {
      applyScoreFields(updated);
      // Trust server timer state for start
      setTimerState("running");
      setStatus("live");
      startLocalTimer();
    }
  };

  const handlePause = async () => {
    pauseLocalTimer();
    const updated = await callApi(scoringApi.pauseSession);
    if (updated) {
      applyScoreFields(updated);
      setTimerState("paused");
      setStatus("paused");
    }
  };

  const handleResume = async () => {
    const updated = await callApi(scoringApi.resumeSession);
    if (updated) {
      applyScoreFields(updated);
      setTimerState("running");
      setStatus("live");
      startLocalTimer();
    }
  };

  const handleToggleTimer = () => {
    if (timerState === "running") handlePause();
    else if (timerState === "paused") handleResume();
    else if (timerState === "idle") handleStart();
  };

  const addPoints = async (side, delta) => {
    const updated = await callApi((id) =>
      scoringApi.sendAction(id, { side, type: "points", value: delta }),
    );
    if (updated) {
      applyScoreFields(updated);
      if (onScoreUpdate) {
        onScoreUpdate({
          fightId: fight._id,
          redScore: updated.red?.score ?? 0,
          blueScore: updated.blue?.score ?? 0,
        });
      }
    }
  };

  const addAdvantage = async (side) => {
    const updated = await callApi((id) =>
      scoringApi.sendAction(id, { side, type: "advantage", value: 1 }),
    );
    if (updated) applyScoreFields(updated);
  };

  const addPenalty = async (side) => {
    const updated = await callApi((id) =>
      scoringApi.sendAction(id, { side, type: "penalty", value: 1 }),
    );
    if (updated) applyScoreFields(updated);
  };

  const openWarning = (side) => {
    setShowWarningModal(side);
    setWarningReason(WARNING_REASONS[0]);
    setCustomReason("");
  };

  const confirmWarning = async () => {
    if (!showWarningModal) return;
    const reason = warningReason === "Autre" ? customReason : warningReason;
    const updated = await callApi((id) =>
      scoringApi.sendAction(id, {
        side: showWarningModal,
        type: "warning",
        value: 1,
        reason: reason || "Comportement antisportif",
      }),
    );
    if (updated) applyScoreFields(updated);
    setShowWarningModal(null);
  };

  const handleEndMatch = async () => {
    pauseLocalTimer();
    const updated = await callApi((id) => scoringApi.finishSession(id, {}));
    if (updated) {
      applyScoreFields(updated);
      applyTimerFields(updated);
    }
  };

  // ---- Loading ----
  if (loading) {
    return (
      <div style={styles.overlay} onClick={onClose}>
        <div style={styles.dialog} onClick={(e) => e.stopPropagation()}>
          <p style={{ textAlign: "center", color: "#94a3b8" }}>
            Initialisation de la session...
          </p>
        </div>
      </div>
    );
  }

  if (!fight) return null;

  // ---- Render: original dialog design with inline styles ----
  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.dialog} onClick={(e) => e.stopPropagation()}>
        {/* Error banner */}
        {error && (
          <div style={styles.errorBar}>
            <span>{error}</span>
            <button style={styles.errorClose} onClick={() => setError(null)}>
              ×
            </button>
          </div>
        )}

        {/* Header */}
        <div style={styles.header}>
          <div>
            <h2 style={styles.title}>Match en Direct</h2>
            <p style={styles.subtitle}>
              {discipline} · {fight.category || "Catégorie"} ·{" "}
              {fight.mat || "Tatami 1"}
            </p>
          </div>
          <div style={styles.headerRight}>
            <div
              style={{
                ...styles.connBadge,
                background: connected
                  ? "rgba(34,197,94,0.2)"
                  : "rgba(239,68,68,0.2)",
                border: connected
                  ? "1px solid rgba(34,197,94,0.4)"
                  : "1px solid rgba(239,68,68,0.4)",
                color: connected ? "#22c55e" : "#ef4444",
              }}
            >
              <span
                style={{
                  ...styles.connDot,
                  background: connected ? "#22c55e" : "#ef4444",
                  animation: connected ? "pulse 2s infinite" : "none",
                }}
              />
              {connected ? "Connecté" : "Déconnecté"}
            </div>
            <button onClick={onClose} style={styles.closeBtn}>
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Timer */}
        <div style={styles.timerBar}>
          <div style={styles.timerBox}>
            <Clock size={28} style={{ color: "#e2e8f0" }} />
            <span
              style={{
                ...styles.timerValue,
                color:
                  timerState === "running" && timer <= 30
                    ? "#ef4444"
                    : "#e2e8f0",
              }}
            >
              {formatTime(timer)}
            </span>
            {!isFinished && !isLocked && (
              <button
                onClick={handleToggleTimer}
                style={{
                  ...styles.timerBtn,
                  background:
                    timerState === "running"
                      ? "linear-gradient(135deg, rgba(239,68,68,0.3), rgba(220,38,38,0.3))"
                      : "linear-gradient(135deg, rgba(34,197,94,0.3), rgba(22,163,74,0.3))",
                  border:
                    timerState === "running"
                      ? "1px solid rgba(239,68,68,0.5)"
                      : "1px solid rgba(34,197,94,0.5)",
                }}
              >
                {timerState === "running" ? (
                  <Pause size={18} />
                ) : (
                  <Play size={18} />
                )}
                {timerState === "running"
                  ? "Pause"
                  : timerState === "idle"
                    ? "Démarrer"
                    : "Reprendre"}
              </button>
            )}
          </div>
        </div>

        {/* Waiting prompt */}
        {isWaiting && !isLocked && (
          <div style={styles.waitingPrompt}>
            <p style={{ color: "#94a3b8", margin: 0 }}>
              Cliquez sur <strong>Démarrer</strong> pour lancer le chronomètre
              et le combat.
            </p>
          </div>
        )}

        {/* Scoreboard */}
        <div style={styles.scoreboard}>
          {/* Red */}
          <div
            style={{
              ...styles.athleteCard,
              background:
                "linear-gradient(135deg, rgba(239,68,68,0.15), rgba(220,38,38,0.1))",
              border: `2px solid ${winnerSide === "red" && isFinished ? "rgba(34,197,94,0.6)" : "rgba(239,68,68,0.3)"}`,
            }}
          >
            <div style={styles.avatar}>🔴</div>
            <h3 style={styles.athleteName}>{athleteName(fight.redAthlete)}</h3>
            <div style={styles.athleteScore}>{redScore}</div>

            {isLive && !isLocked && (
              <>
                <div style={styles.pointsRow}>
                  <button
                    style={styles.ptBtnMinus}
                    onClick={() => addPoints("red", -1)}
                    disabled={redScore <= 0}
                  >
                    <Minus size={16} />
                  </button>
                  <button
                    style={styles.ptBtnPlus}
                    onClick={() => addPoints("red", 1)}
                  >
                    <Plus size={16} />
                  </button>
                  <button
                    style={styles.ptBtnPlus}
                    onClick={() => addPoints("red", 2)}
                  >
                    +2
                  </button>
                  <button
                    style={styles.ptBtnPlus}
                    onClick={() => addPoints("red", 3)}
                  >
                    +3
                  </button>
                  <button
                    style={styles.ptBtnPlus}
                    onClick={() => addPoints("red", 4)}
                  >
                    +4
                  </button>
                </div>
                <div style={styles.extraRow}>
                  <button
                    style={styles.advBtn}
                    onClick={() => addAdvantage("red")}
                  >
                    <Award size={12} /> Avantage
                  </button>
                  <button
                    style={styles.penBtn}
                    onClick={() => addPenalty("red")}
                  >
                    Pénalité
                  </button>
                  <button
                    style={styles.warnBtn}
                    onClick={() => openWarning("red")}
                  >
                    <AlertTriangle size={12} /> Avert.
                  </button>
                </div>
              </>
            )}

            <div style={styles.statsRow}>
              <span style={styles.stat}>Av: {redAdvantages}</span>
              <span style={styles.stat}>Pén: {redPenalties}</span>
              {redWarnings > 0 && (
                <span style={{ ...styles.stat, color: "#f59e0b" }}>
                  ⚠ {redWarnings}
                </span>
              )}
            </div>
            {winnerSide === "red" && isFinished && (
              <div style={styles.winnerTag}>🏆 Vainqueur</div>
            )}
          </div>

          {/* VS */}
          <div style={styles.vs}>VS</div>

          {/* Blue */}
          <div
            style={{
              ...styles.athleteCard,
              background:
                "linear-gradient(135deg, rgba(59,130,246,0.15), rgba(37,99,235,0.1))",
              border: `2px solid ${winnerSide === "blue" && isFinished ? "rgba(34,197,94,0.6)" : "rgba(59,130,246,0.3)"}`,
            }}
          >
            <div style={styles.avatar}>🔵</div>
            <h3 style={styles.athleteName}>{athleteName(fight.blueAthlete)}</h3>
            <div style={styles.athleteScore}>{blueScore}</div>

            {isLive && !isLocked && (
              <>
                <div style={styles.pointsRow}>
                  <button
                    style={styles.ptBtnMinus}
                    onClick={() => addPoints("blue", -1)}
                    disabled={blueScore <= 0}
                  >
                    <Minus size={16} />
                  </button>
                  <button
                    style={styles.ptBtnPlus}
                    onClick={() => addPoints("blue", 1)}
                  >
                    <Plus size={16} />
                  </button>
                  <button
                    style={styles.ptBtnPlus}
                    onClick={() => addPoints("blue", 2)}
                  >
                    +2
                  </button>
                  <button
                    style={styles.ptBtnPlus}
                    onClick={() => addPoints("blue", 3)}
                  >
                    +3
                  </button>
                  <button
                    style={styles.ptBtnPlus}
                    onClick={() => addPoints("blue", 4)}
                  >
                    +4
                  </button>
                </div>
                <div style={styles.extraRow}>
                  <button
                    style={styles.advBtn}
                    onClick={() => addAdvantage("blue")}
                  >
                    <Award size={12} /> Avantage
                  </button>
                  <button
                    style={styles.penBtn}
                    onClick={() => addPenalty("blue")}
                  >
                    Pénalité
                  </button>
                  <button
                    style={styles.warnBtn}
                    onClick={() => openWarning("blue")}
                  >
                    <AlertTriangle size={12} /> Avert.
                  </button>
                </div>
              </>
            )}

            <div style={styles.statsRow}>
              <span style={styles.stat}>Av: {blueAdvantages}</span>
              <span style={styles.stat}>Pén: {bluePenalties}</span>
              {blueWarnings > 0 && (
                <span style={{ ...styles.stat, color: "#f59e0b" }}>
                  ⚠ {blueWarnings}
                </span>
              )}
            </div>
            {winnerSide === "blue" && isFinished && (
              <div style={styles.winnerTag}>🏆 Vainqueur</div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={styles.footer}>
          {(isLive || isPaused) && !isLocked && (
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button
                style={styles.footerBtn}
                onClick={handlePause}
                disabled={timerState !== "running"}
              >
                ⏸ Pause
              </button>
              <button
                style={styles.footerBtn}
                onClick={handleResume}
                disabled={timerState !== "paused"}
              >
                ▶ Reprendre
              </button>
            </div>
          )}
          <div style={{ flex: 1 }} />
          {!isFinished && !isWaiting && !isLocked && (
            <button style={styles.endBtn} onClick={handleEndMatch}>
              <Flag size={16} /> Terminer le match
            </button>
          )}
          {isFinished && !isLocked && (
            <span style={{ color: "#94a3b8", fontSize: "0.9rem" }}>
              Vainqueur :{" "}
              {winnerSide === "red"
                ? athleteName(fight.redAthlete)
                : winnerSide === "blue"
                  ? athleteName(fight.blueAthlete)
                  : "Égalité"}
              {winMethod ? ` (${winMethod})` : ""}
            </span>
          )}
          {isLocked && (
            <span style={{ color: "#4ade80" }}>✅ Combat validé</span>
          )}
        </div>
      </div>

      {/* Warning Modal */}
      {showWarningModal && (
        <div style={styles.overlay} onClick={() => setShowWarningModal(null)}>
          <div
            style={styles.warningDialog}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: "0 0 1rem", color: "#e2e8f0" }}>
              Avertissement —{" "}
              {showWarningModal === "red" ? "🔴 Rouge" : "🔵 Bleu"}
            </h3>
            <div style={{ marginBottom: "0.75rem" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "0.3rem",
                  color: "#94a3b8",
                  fontSize: "0.85rem",
                }}
              >
                Motif
              </label>
              <select
                value={warningReason}
                onChange={(e) => setWarningReason(e.target.value)}
                style={styles.select}
              >
                {WARNING_REASONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
            {warningReason === "Autre" && (
              <div style={{ marginBottom: "0.75rem" }}>
                <label
                  style={{
                    display: "block",
                    marginBottom: "0.3rem",
                    color: "#94a3b8",
                    fontSize: "0.85rem",
                  }}
                >
                  Précisez
                </label>
                <input
                  type="text"
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  placeholder="Motif personnalisé..."
                  style={styles.input}
                />
              </div>
            )}
            <div
              style={{
                display: "flex",
                gap: "0.75rem",
                justifyContent: "flex-end",
                marginTop: "1rem",
              }}
            >
              <button
                style={styles.modalCancelBtn}
                onClick={() => setShowWarningModal(null)}
              >
                Annuler
              </button>
              <button style={styles.modalConfirmBtn} onClick={confirmWarning}>
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}

// ---- Inline styles (original dialog design) ----
const styles = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.7)",
    backdropFilter: "blur(4px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2000,
  },
  dialog: {
    width: "90%",
    maxWidth: "800px",
    maxHeight: "90vh",
    background:
      "linear-gradient(135deg, rgba(30,30,40,0.98), rgba(20,20,30,0.98))",
    borderRadius: "20px",
    border: "1px solid rgba(255,255,255,0.1)",
    boxShadow: "0 25px 50px rgba(0,0,0,0.5)",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
  },
  errorBar: {
    padding: "0.75rem 1.5rem",
    background: "rgba(239,68,68,0.2)",
    borderBottom: "1px solid rgba(239,68,68,0.3)",
    color: "#fca5a5",
    fontSize: "0.9rem",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  errorClose: {
    background: "none",
    border: "none",
    color: "#fca5a5",
    cursor: "pointer",
    fontSize: "1.2rem",
    padding: 0,
    lineHeight: 1,
  },
  header: {
    padding: "1.5rem",
    background:
      "linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.2))",
    borderBottom: "1px solid rgba(255,255,255,0.1)",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  title: { margin: 0, fontSize: "1.5rem", fontWeight: 700, color: "#e2e8f0" },
  subtitle: { margin: "0.5rem 0 0", color: "#94a3b8", fontSize: "0.85rem" },
  headerRight: { display: "flex", alignItems: "center", gap: "0.75rem" },
  connBadge: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    padding: "0.4rem 0.9rem",
    borderRadius: "20px",
    fontSize: "0.75rem",
    fontWeight: 600,
  },
  connDot: { width: 8, height: 8, borderRadius: "50%" },
  closeBtn: {
    padding: "0.4rem",
    background: "rgba(239,68,68,0.2)",
    border: "1px solid rgba(239,68,68,0.4)",
    borderRadius: "8px",
    color: "#ef4444",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  timerBar: {
    padding: "1.5rem",
    textAlign: "center",
    background: "rgba(0,0,0,0.3)",
    borderBottom: "1px solid rgba(255,255,255,0.05)",
  },
  timerBox: {
    display: "inline-flex",
    alignItems: "center",
    gap: "1rem",
    padding: "0.75rem 1.5rem",
    background:
      "linear-gradient(135deg, rgba(99,102,241,0.3), rgba(139,92,246,0.3))",
    borderRadius: "16px",
    border: "2px solid rgba(99,102,241,0.5)",
  },
  timerValue: {
    fontSize: "2.5rem",
    fontWeight: 700,
    fontFamily: "monospace",
    minWidth: "110px",
    textAlign: "center",
  },
  timerBtn: {
    padding: "0.5rem 1rem",
    borderRadius: "10px",
    color: "#e2e8f0",
    fontSize: "0.9rem",
    fontWeight: 600,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "0.4rem",
    border: "none",
  },
  waitingPrompt: {
    padding: "0.75rem 2rem",
    textAlign: "center",
    background: "rgba(234,179,8,0.1)",
    borderBottom: "1px solid rgba(234,179,8,0.2)",
  },
  scoreboard: {
    flex: 1,
    padding: "1.5rem",
    display: "grid",
    gridTemplateColumns: "1fr auto 1fr",
    gap: "1.5rem",
    alignItems: "start",
    overflowY: "auto",
  },
  athleteCard: {
    padding: "1.5rem",
    borderRadius: "16px",
    textAlign: "center",
  },
  avatar: {
    width: 70,
    height: 70,
    margin: "0 auto 0.75rem",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "2rem",
  },
  athleteName: {
    margin: "0 0 0.5rem",
    fontSize: "1.1rem",
    fontWeight: 600,
    color: "#e2e8f0",
  },
  athleteScore: {
    fontSize: "3.5rem",
    fontWeight: 800,
    fontFamily: "monospace",
    color: "#e2e8f0",
    margin: "0.5rem 0",
  },
  pointsRow: {
    display: "flex",
    gap: "0.5rem",
    justifyContent: "center",
    marginBottom: "0.5rem",
  },
  ptBtnMinus: {
    width: 42,
    height: 42,
    borderRadius: 10,
    background: "rgba(239,68,68,0.2)",
    border: "1px solid rgba(239,68,68,0.4)",
    color: "#ef4444",
    fontSize: "1.2rem",
    fontWeight: 700,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  ptBtnPlus: {
    width: 42,
    height: 42,
    borderRadius: 10,
    background: "rgba(34,197,94,0.2)",
    border: "1px solid rgba(34,197,94,0.4)",
    color: "#22c55e",
    fontSize: "1.2rem",
    fontWeight: 700,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  extraRow: {
    display: "flex",
    gap: "0.35rem",
    justifyContent: "center",
    flexWrap: "wrap",
    marginTop: "0.25rem",
  },
  advBtn: {
    padding: "0.25rem 0.6rem",
    borderRadius: 8,
    fontSize: "0.75rem",
    fontWeight: 600,
    background: "rgba(34,197,94,0.15)",
    border: "1px solid rgba(34,197,94,0.4)",
    color: "#4ade80",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "0.25rem",
  },
  penBtn: {
    padding: "0.25rem 0.6rem",
    borderRadius: 8,
    fontSize: "0.75rem",
    fontWeight: 600,
    background: "rgba(239,68,68,0.15)",
    border: "1px solid rgba(239,68,68,0.4)",
    color: "#f87171",
    cursor: "pointer",
  },
  warnBtn: {
    padding: "0.25rem 0.6rem",
    borderRadius: 8,
    fontSize: "0.75rem",
    fontWeight: 600,
    background: "rgba(234,179,8,0.15)",
    border: "1px solid rgba(234,179,8,0.4)",
    color: "#facc15",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "0.25rem",
  },
  statsRow: {
    display: "flex",
    gap: "0.75rem",
    justifyContent: "center",
    marginTop: "0.75rem",
  },
  stat: { fontSize: "0.8rem", color: "#94a3b8" },
  winnerTag: {
    marginTop: "0.5rem",
    padding: "0.25rem 0.75rem",
    borderRadius: 10,
    background: "rgba(34,197,94,0.2)",
    border: "1px solid rgba(34,197,94,0.4)",
    color: "#4ade80",
    fontSize: "0.85rem",
    fontWeight: 700,
    display: "inline-block",
  },
  vs: {
    textAlign: "center",
    fontSize: "1.5rem",
    fontWeight: 800,
    color: "#475569",
    fontStyle: "italic",
    alignSelf: "center",
  },
  footer: {
    padding: "1rem 1.5rem",
    background: "rgba(0,0,0,0.3)",
    borderTop: "1px solid rgba(255,255,255,0.05)",
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
  },
  footerBtn: {
    padding: "0.4rem 1rem",
    borderRadius: 8,
    background: "rgba(148,163,184,0.15)",
    border: "1px solid rgba(148,163,184,0.3)",
    color: "#cbd5e1",
    fontSize: "0.85rem",
    cursor: "pointer",
  },
  endBtn: {
    padding: "0.6rem 1.2rem",
    borderRadius: 10,
    background:
      "linear-gradient(135deg, rgba(239,68,68,0.3), rgba(220,38,38,0.3))",
    border: "1px solid rgba(239,68,68,0.5)",
    color: "#fca5a5",
    fontSize: "0.9rem",
    fontWeight: 600,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "0.4rem",
  },
  warningDialog: {
    background:
      "linear-gradient(135deg, rgba(30,30,40,0.98), rgba(20,20,30,0.98))",
    borderRadius: "16px",
    border: "1px solid rgba(234,179,8,0.3)",
    padding: "1.5rem",
    minWidth: "320px",
    maxWidth: "420px",
    boxShadow: "0 25px 50px rgba(0,0,0,0.6)",
  },
  select: {
    width: "100%",
    padding: "0.5rem 0.75rem",
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.15)",
    borderRadius: "8px",
    color: "#e2e8f0",
    fontSize: "0.9rem",
  },
  input: {
    width: "100%",
    padding: "0.5rem 0.75rem",
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.15)",
    borderRadius: "8px",
    color: "#e2e8f0",
    fontSize: "0.9rem",
    outline: "none",
    boxSizing: "border-box",
  },
  modalCancelBtn: {
    padding: "0.5rem 1rem",
    borderRadius: 8,
    background: "rgba(148,163,184,0.15)",
    border: "1px solid rgba(148,163,184,0.3)",
    color: "#94a3b8",
    cursor: "pointer",
    fontSize: "0.85rem",
  },
  modalConfirmBtn: {
    padding: "0.5rem 1rem",
    borderRadius: 8,
    background: "rgba(234,179,8,0.3)",
    border: "1px solid rgba(234,179,8,0.5)",
    color: "#facc15",
    cursor: "pointer",
    fontSize: "0.85rem",
    fontWeight: 600,
  },
};
