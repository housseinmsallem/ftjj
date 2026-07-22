import React, { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useScoring } from "../../context/ScoringContext";
import api from "../../services/api";
import PublicScoreboard from "./PublicScoreboard";

export default function RefereeControl() {
  const { state, dispatch } = useScoring();
  const [endModal, setEndModal] = useState<string | null>(null);
  const [searchParams] = useSearchParams();
  const matchId = searchParams.get("matchId") || "";
  const redName = searchParams.get("red") || "";
  const blueName = searchParams.get("blue") || "";
  const competitionId = searchParams.get("competitionId") || "";
  const modToken = searchParams.get("token") || "";

  // Pre-fill athlete names
  React.useEffect(() => {
    if (redName) dispatch({ type: "SET_ATHLETE", side: "top", field: "name", value: redName });
    if (blueName) dispatch({ type: "SET_ATHLETE", side: "bottom", field: "name", value: blueName });
  }, []);

  // Sync match status to backend
  const prevRunning = React.useRef(state.clock.running);
  React.useEffect(() => {
    if (!matchId) return;
    if (state.clock.running && !prevRunning.current) {
      // Match went LIVE
      if (competitionId && modToken) {
        api.patch(`/competitions/moderate/${competitionId}/matches/${matchId}?token=${modToken}`, { status: "LIVE" }).catch(() => {});
      } else {
        api.patch(`/matches/${matchId}`, { status: "LIVE" }).catch(() => {});
      }
    }
    prevRunning.current = state.clock.running;
  }, [state.clock.running, matchId]);

  // Create scoring session on mount
  React.useEffect(() => {
    if (!matchId) return;
    api.post('/scoring/public/sessions', { matchId }).catch(() => {});
  }, [matchId]);

  // Sync clock changes to scoring backend
  const prevClockRunningRef = React.useRef(state.clock.running);
  React.useEffect(() => {
    if (!matchId) return;
    const prev = prevClockRunningRef.current;
    if (state.clock.running && !prev) {
      api.patch(`/scoring/public/sessions/${matchId}/sync-timer`, {
        remainingSeconds: state.clock.remaining,
        running: true,
        stallingTop: state.stallingTop.active,
        stallingBottom: state.stallingBottom.active,
      }).catch(() => {});
    }
    if (!state.clock.running && prev) {
      api.patch(`/scoring/public/sessions/${matchId}/sync-timer`, {
        remainingSeconds: state.clock.remaining,
        running: false,
        stallingTop: state.stallingTop.active,
        stallingBottom: state.stallingBottom.active,
      }).catch(() => {});
    }
    prevClockRunningRef.current = state.clock.running;
  }, [state.clock.running, matchId]);

  // Periodic timer sync (every 3s) — uses refs to avoid interval reset on every tick
  const clockRemainingRef = React.useRef(state.clock.remaining);
  clockRemainingRef.current = state.clock.remaining;
  const stallingRef = React.useRef({ top: state.stallingTop.active, bottom: state.stallingBottom.active });
  stallingRef.current = { top: state.stallingTop.active, bottom: state.stallingBottom.active };

  React.useEffect(() => {
    if (!matchId || !state.clock.running) return;
    const interval = setInterval(() => {
      api.patch(`/scoring/public/sessions/${matchId}/sync-timer`, {
        remainingSeconds: clockRemainingRef.current,
        running: true,
        stallingTop: stallingRef.current.top,
        stallingBottom: stallingRef.current.bottom,
      }).catch(() => {});
    }, 3000);
    return () => clearInterval(interval);
  }, [matchId, state.clock.running]); // Only re-run when running changes

  // Sync on clock adjustments (set/add time)
  const prevRemainingRef = React.useRef(state.clock.remaining);
  React.useEffect(() => {
    if (!matchId || !state.clock.running) return;
    const prev = prevRemainingRef.current;
    if (Math.abs(state.clock.remaining - prev) > 1) {
      api.patch(`/scoring/public/sessions/${matchId}/sync-timer`, {
        remainingSeconds: state.clock.remaining,
        running: true,
        stallingTop: state.stallingTop.active,
        stallingBottom: state.stallingBottom.active,
      }).catch(() => {});
    }
    prevRemainingRef.current = state.clock.remaining;
  }, [state.clock.remaining, matchId]); // Keep this — it needs to detect changes

  // Sync score actions to scoring backend
  function syncScoreAction(side: 'top' | 'bottom', type: 'ADD_POINTS' | 'ADD_ADVANTAGE' | 'ADD_PENALTY', amount: number) {
    if (!matchId) return;
    const apiSide = side === 'top' ? 'red' : 'blue';
    const apiType = type === 'ADD_POINTS' ? 'point' : type === 'ADD_ADVANTAGE' ? 'advantage' : 'penalty';
    api.patch(`/scoring/public/sessions/${matchId}/action`, { side: apiSide, type: apiType, value: amount }).catch(() => {});
  }

  // Handle end match with backend sync
  async function handleEndMatch(side: string | null, method: string) {
    dispatch({ type: "END_MATCH", side: side as "top" | "bottom" | null, method });
    setEndModal(null);
    if (!matchId) return;
    try {
      const payload = {
        status: "FINISHED",
        redScore: state.top.points,
        blueScore: state.bottom.points,
        warningsRed: state.top.penalties,
        penaltiesRed: state.top.penalties,
        warningsBlue: state.bottom.penalties,
        penaltiesBlue: state.bottom.penalties,
        winMethod: method,
        winnerSide: side === "top" ? "red" : side === "bottom" ? "blue" : "draw",
      };

      if (competitionId && modToken) {
        await api.patch(`/competitions/moderate/${competitionId}/matches/${matchId}?token=${modToken}`, payload);
      } else {
        await api.patch(`/matches/${matchId}`, payload);
      }
      // Also finish the scoring session
      await api.patch(`/scoring/public/sessions/${matchId}/finish`, { winnerSide: side === "top" ? "red" : side === "bottom" ? "blue" : "draw", winMethod: method }).catch(() => {});
    } catch { /* silent */ }
  }

  const methods = ["POINTS", "SUBMISSION", "DISQUALIFICATION", "WALKOVER", "NO SHOW", "DECISION"];
  const drawMethods = ["DRAW", "DOUBLE WO/DQ", "DOUBLE NO SHOW"];

  function openSpectator() {
    window.open("/scoring/spectator", "_blank", "width=1200,height=800,menubar=no,toolbar=no,location=no,status=no");
  }

  function renderEditor(side: "top" | "bottom") {
    const a = state[side];
    return (
      <div style={{ marginBottom: 12, padding: 8, background: "#1a1a1a", borderRadius: 8 }}>
        <div style={{ display: "flex", gap: 8 }}>
          <input value={a.name} onChange={e => dispatch({ type: "SET_ATHLETE", side, field: "name", value: e.target.value })} placeholder="Nom" style={inputStyle} />
          <input value={a.academy} onChange={e => dispatch({ type: "SET_ATHLETE", side, field: "academy", value: e.target.value })} placeholder="Académie" style={inputStyle} />
        </div>
      </div>
    );
  }

  function renderScoreButtons(side: "top" | "bottom") {
    const stalling = side === "top" ? state.stallingTop : state.stallingBottom;
    return (
      <div style={{ marginTop: 8 }}>
        {/* Row 1: + buttons */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 4 }}>
          {[1, 2, 3, 4].map(v => (
            <Btn key={`+${v}`} label={`+${v}`} color="#22c55e" onClick={() => { dispatch({ type: "ADD_POINTS", side, amount: v }); syncScoreAction(side, 'ADD_POINTS', v); }} />
          ))}
          <Btn label="+A" color="#3b82f6" onClick={() => { dispatch({ type: "ADD_ADVANTAGE", side, amount: 1 }); syncScoreAction(side, 'ADD_ADVANTAGE', 1); }} />
          <Btn label="+P" color="#e4c328" onClick={() => { dispatch({ type: "ADD_PENALTY", side, amount: 1 }); syncScoreAction(side, 'ADD_PENALTY', 1); }} />
        </div>
        {/* Row 2: - buttons */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
          {[1, 2, 3, 4].map(v => (
            <Btn key={`-${v}`} label={`-${v}`} color="#d51332" onClick={() => { dispatch({ type: "ADD_POINTS", side, amount: -v }); syncScoreAction(side, 'ADD_POINTS', -v); }} />
          ))}
          <Btn label="-A" color="#d51332" onClick={() => { dispatch({ type: "ADD_ADVANTAGE", side, amount: -1 }); syncScoreAction(side, 'ADD_ADVANTAGE', -1); }} />
          <Btn label="-P" color="#d51332" onClick={() => { dispatch({ type: "ADD_PENALTY", side, amount: -1 }); syncScoreAction(side, 'ADD_PENALTY', -1); }} />
          <Btn
            label={stalling.active ? "⏹ Stop Stall" : "⏱ Stalling"}
            color={stalling.active ? "#d51332" : "#e4c328"}
            onClick={() => {
              const newActive = !stalling.active;
              dispatch({ type: newActive ? "START_STALLING" : "STOP_STALLING", side });
              // Immediately sync stalling state to backend
              if (matchId) {
                api.patch(`/scoring/public/sessions/${matchId}/sync-timer`, {
                  remainingSeconds: state.clock.remaining,
                  running: state.clock.running,
                  stallingTop: side === "top" ? newActive : state.stallingTop.active,
                  stallingBottom: side === "bottom" ? newActive : state.stallingBottom.active,
                }).catch(() => {});
              }
            }}
          />
        </div>
      </div>
    );
  }

  const clockRunning = state.clock.running;

  return (
    <div style={{ display: "flex", gap: 0, minHeight: "100vh", background: "#000" }}>
      {/* LEFT: Scoreboard preview */}
      <div style={{ flex: 3, borderRight: "2px solid #333" }}>
        <PublicScoreboard />
      </div>

      {/* RIGHT: Controls */}
      <div style={{ flex: 1, background: "#111", padding: 16, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ color: "#e4c328", margin: 0, fontSize: "0.9rem", textTransform: "uppercase", letterSpacing: "0.1em" }}>Contrôle Arbitre</h3>
          <Btn label="🖥️ Spectateur" color="#666" onClick={openSpectator} />
          <Btn label="← Retour" color="#666" onClick={() => window.close()} />
        </div>

        {/* ===== TOP ATHLETE SECTION ===== */}
        {renderEditor("top")}
        {renderScoreButtons("top")}

        <div style={{ height: 1, background: "#333", margin: "4px 0" }} />

        {/* Clock controls */}
        <div style={{ padding: 8, background: "#1a1a1a", borderRadius: 8 }}>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 6 }}>
            <Btn label={clockRunning ? "⏸ Pause" : "▶ Play"} color={clockRunning ? "#e4c328" : "#22c55e"} onClick={() => dispatch({ type: clockRunning ? "PAUSE" : "PLAY" })} />
            <Btn label="+1s" color="#666" onClick={() => dispatch({ type: "ADD_TIME", seconds: 1 })} />
            <Btn label="+5s" color="#666" onClick={() => dispatch({ type: "ADD_TIME", seconds: 5 })} />
            <Btn label="+30s" color="#666" onClick={() => dispatch({ type: "ADD_TIME", seconds: 30 })} />
          </div>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 8 }}>
            <Btn label="-1s" color="#d51332" onClick={() => dispatch({ type: "ADD_TIME", seconds: -1 })} />
            <Btn label="-5s" color="#d51332" onClick={() => dispatch({ type: "ADD_TIME", seconds: -5 })} />
            <Btn label="-30s" color="#d51332" onClick={() => dispatch({ type: "ADD_TIME", seconds: -30 })} />
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            {[60, 120, 180, 300, 600].map(s => (
              <Btn key={s} label={`${s / 60}min`} color="#444" onClick={() => dispatch({ type: "SET_CLOCK", seconds: s })} />
            ))}
          </div>
        </div>

        {/* Action bar */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <Btn label="↩ UNDO" color="#e4c328" onClick={() => { dispatch({ type: "UNDO" }); api.patch(`/scoring/public/sessions/${matchId}/undo`).catch(() => {}); }} fullWidth />
          <Btn label="⇄ SWITCH SIDES" color="#3b82f6" onClick={() => dispatch({ type: "SWITCH_SIDES" })} fullWidth />
          <Btn label="🔄 RESET" color="#666" onClick={() => dispatch({ type: "RESET" })} fullWidth />
        </div>

        {/* Spacer to push bottom controls down */}
        <div style={{ flex: 1 }} />

        {/* ===== BOTTOM ATHLETE SECTION ===== */}
        {renderEditor("bottom")}
        {renderScoreButtons("bottom")}

        {/* End match buttons */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
          <Btn label="🏆 END MATCH — TOP" color="#d51332" onClick={() => setEndModal("top")} fullWidth />
          <Btn label="🏆 END MATCH — BOTTOM" color="#2563eb" onClick={() => setEndModal("bottom")} fullWidth />
          <Btn label="⚖ END MATCH — DRAW" color="#888" onClick={() => setEndModal("draw")} fullWidth />
          <button
            onClick={async () => {
              if (!confirm("Réinitialiser le match ? Les scores et le chrono seront remis à zéro, le statut live sera arrêté.")) return;
              dispatch({ type: "RESET" });
              if (matchId) {
                await api.patch(`/scoring/public/sessions/${matchId}/reset`).catch(() => {});
                if (competitionId && modToken) {
                  await api.patch(`/competitions/moderate/${competitionId}/matches/${matchId}?token=${modToken}`, { status: "UPCOMING", redScore: 0, blueScore: 0, warningsRed: 0, penaltiesRed: 0, warningsBlue: 0, penaltiesBlue: 0, winnerSide: null, winMethod: null }).catch(() => {});
                }
              }
            }}
            style={{ padding: "8px 16px", background: "#dc2626", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 700, fontSize: "0.8rem" }}
          >
            🔄 RESET MATCH
          </button>
        </div>

        {/* End Match Modal */}
        {endModal && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }} onClick={() => setEndModal(null)}>
            <div style={{ background: "#1a1a1a", borderRadius: 16, padding: 24, maxWidth: 400, width: "90%", border: "1px solid #333" }} onClick={e => e.stopPropagation()}>
              <h3 style={{ color: "#e4c328", margin: "0 0 16px", textTransform: "uppercase" }}>
                {endModal === "draw" ? "Exception / Égalité" : `Gagnant: ${state[endModal as "top" | "bottom"].name}`}
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {(endModal === "draw" ? drawMethods : methods).map(m => (
                  <button key={m} style={{ padding: "12px", background: "#333", color: "#fff", border: "1px solid #555", borderRadius: 8, cursor: "pointer", fontWeight: 700, textTransform: "uppercase", fontSize: "0.9rem" }}
                    onClick={() => handleEndMatch(endModal === "draw" ? null : endModal as "top" | "bottom", m)}>
                    {m}
                  </button>
                ))}
              </div>
              <button style={{ marginTop: 12, padding: "8px", background: "transparent", color: "#888", border: "none", cursor: "pointer", width: "100%" }} onClick={() => setEndModal(null)}>Annuler</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  flex: 1, padding: "6px 10px", background: "#222", color: "#fff", border: "1px solid #444", borderRadius: 6, fontSize: "0.85rem",
};

function Btn({ label, color, onClick, fullWidth }: { label: string; color: string; onClick: () => void; fullWidth?: boolean }) {
  return (
    <button onClick={onClick}
      style={{
        padding: "6px 12px", background: color, color: "#fff", border: "none", borderRadius: 6, cursor: "pointer",
        fontWeight: 700, fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.05em",
        width: fullWidth ? "100%" : "auto", opacity: 0.9,
      }}>
      {label}
    </button>
  );
}
