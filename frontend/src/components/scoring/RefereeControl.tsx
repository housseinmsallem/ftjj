import React, { useState } from "react";
import { useScoring } from "../../context/ScoringContext";
import PublicScoreboard from "./PublicScoreboard";

export default function RefereeControl() {
  const { state, dispatch } = useScoring();
  const [endModal, setEndModal] = useState<string | null>(null);

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
            <Btn key={`+${v}`} label={`+${v}`} color="#22c55e" onClick={() => dispatch({ type: "ADD_POINTS", side, amount: v })} />
          ))}
          <Btn label="+A" color="#3b82f6" onClick={() => dispatch({ type: "ADD_ADVANTAGE", side, amount: 1 })} />
          <Btn label="+P" color="#e4c328" onClick={() => dispatch({ type: "ADD_PENALTY", side, amount: 1 })} />
        </div>
        {/* Row 2: - buttons */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
          {[1, 2, 3, 4].map(v => (
            <Btn key={`-${v}`} label={`-${v}`} color="#d51332" onClick={() => dispatch({ type: "ADD_POINTS", side, amount: -v })} />
          ))}
          <Btn label="-A" color="#d51332" onClick={() => dispatch({ type: "ADD_ADVANTAGE", side, amount: -1 })} />
          <Btn label="-P" color="#d51332" onClick={() => dispatch({ type: "ADD_PENALTY", side, amount: -1 })} />
          <Btn
            label={stalling.active ? "⏹ Stop Stall" : "⏱ Stalling"}
            color={stalling.active ? "#d51332" : "#e4c328"}
            onClick={() => dispatch({ type: stalling.active ? "STOP_STALLING" : "START_STALLING", side })}
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
        </div>

        {/* Athlete editors */}
        {renderEditor("top")}
        {renderEditor("bottom")}

        {/* Score buttons */}
        {renderScoreButtons("top")}
        <div style={{ height: 1, background: "#333", margin: "4px 0" }} />
        {renderScoreButtons("bottom")}

        {/* Clock controls */}
        <div style={{ marginTop: 12, padding: 8, background: "#1a1a1a", borderRadius: 8 }}>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 8 }}>
            <Btn label={clockRunning ? "⏸ Pause" : "▶ Play"} color={clockRunning ? "#e4c328" : "#22c55e"} onClick={() => dispatch({ type: clockRunning ? "PAUSE" : "PLAY" })} />
            <Btn label="+1s" color="#666" onClick={() => dispatch({ type: "ADD_TIME", seconds: 1 })} />
            <Btn label="+5s" color="#666" onClick={() => dispatch({ type: "ADD_TIME", seconds: 5 })} />
            <Btn label="+30s" color="#666" onClick={() => dispatch({ type: "ADD_TIME", seconds: 30 })} />
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            {[60, 120, 180, 300, 600].map(s => (
              <Btn key={s} label={`${s / 60}min`} color="#444" onClick={() => dispatch({ type: "SET_CLOCK", seconds: s })} />
            ))}
          </div>
        </div>

        {/* Action bar */}
        <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
          <Btn label="↩ UNDO" color="#e4c328" onClick={() => dispatch({ type: "UNDO" })} fullWidth />
          <Btn label="⇄ SWITCH SIDES" color="#3b82f6" onClick={() => dispatch({ type: "SWITCH_SIDES" })} fullWidth />
          <Btn label="🔄 RESET" color="#666" onClick={() => dispatch({ type: "RESET" })} fullWidth />
          <Btn label="🏆 END MATCH — TOP" color="#d51332" onClick={() => setEndModal("top")} fullWidth />
          <Btn label="🏆 END MATCH — BOTTOM" color="#2563eb" onClick={() => setEndModal("bottom")} fullWidth />
          <Btn label="⚖ END MATCH — DRAW" color="#888" onClick={() => setEndModal("draw")} fullWidth />
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
                    onClick={() => { dispatch({ type: "END_MATCH", side: endModal === "draw" ? null : (endModal as "top" | "bottom"), method: m }); setEndModal(null); }}>
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
