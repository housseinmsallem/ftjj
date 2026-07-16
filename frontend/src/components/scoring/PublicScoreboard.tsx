import React from "react";
import { useScoring, formatTime, MatchState } from "../../context/ScoringContext";

// Accept optional external state for spectator mode
interface Props {
  externalState?: MatchState | null;
}

export default function PublicScoreboard({ externalState }: Props) {
  const sc = useScoring();
  const state = externalState || sc.state;

  const top = state.top;
  const bottom = state.bottom;
  const isDoubleStalling = state.stallingTop.active && state.stallingBottom.active;

  return (
    <div style={{ background: "#0a0a0a", color: "#fff", fontFamily: "'Inter', 'Roboto', sans-serif", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Top Athlete Row */}
      <AthleteRow athlete={top} isTop stalling={state.stallingTop} isDoubleStalling={isDoubleStalling} isWinner={state.winner.side === "top"} winMethod={state.winner.method} />

      {/* Divider */}
      <div style={{ height: 2, background: "#333" }} />

      {/* Bottom Athlete Row */}
      <AthleteRow athlete={bottom} isTop={false} stalling={state.stallingBottom} isDoubleStalling={isDoubleStalling} isWinner={state.winner.side === "bottom"} winMethod={state.winner.method} />

      {/* Status Bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 24px", background: "#111", borderTop: "2px solid #333", marginTop: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ background: "#fff", color: "#000", fontWeight: 900, fontSize: "1.2rem", padding: "8px 16px", borderRadius: 4 }}>{state.matNumber}</div>
          <span style={{ color: "#aaa", fontSize: "0.9rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>{state.division}</span>
        </div>
        <div style={{ fontSize: "4rem", fontWeight: 900, color: "#e4c328", fontFamily: "monospace", letterSpacing: "0.05em" }}>
          {formatTime(state.clock.remaining)}
        </div>
      </div>
    </div>
  );
}

function AthleteRow({ athlete, isTop, stalling, isDoubleStalling, isWinner, winMethod }: {
  athlete: { name: string; academy: string; points: number; advantages: number; penalties: number; color: string };
  isTop: boolean; stalling: { remaining: number; active: boolean }; isDoubleStalling: boolean; isWinner: boolean; winMethod: string | null;
}) {
  const bg = isTop ? "#1a1a0a" : "#0a0a1a";
  const borderColor = athlete.color === "red" ? "#d51332" : "#2563eb";
  const scoreBg = isTop ? "#e4c328" : "#111";
  const scoreColor = isTop ? "#1a5c1a" : "#fff";

  return (
    <div style={{ flex: 1, display: "flex", background: bg, borderLeft: `4px solid ${borderColor}`, padding: "16px 24px", position: "relative" }}>
      {isWinner && winMethod && (
        <div style={{ position: "absolute", top: 0, left: 0, background: "#e4c328", color: "#000", fontWeight: 900, padding: "4px 16px", fontSize: "0.8rem", textTransform: "uppercase", zIndex: 2 }}>
          GAGNANT PAR {winMethod}
        </div>
      )}

      {/* Name + Academy */}
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: "1.6rem", fontWeight: 900, textTransform: "uppercase", color: "#fff" }}>{athlete.name}</div>
        <div style={{ fontSize: "0.9rem", color: "#888", marginTop: 2 }}>{athlete.academy}</div>
      </div>

      {/* Advantages + Penalties */}
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: 16, marginRight: 24, minWidth: 80 }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "0.7rem", color: "#22c55e", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.08em" }}>Avantage</div>
          <div style={{ fontSize: "1.6rem", fontWeight: 900, color: "#22c55e" }}>{athlete.advantages}</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "0.7rem", color: "#d51332", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.08em" }}>Pénalité</div>
          <div style={{ fontSize: "1.6rem", fontWeight: 900, color: "#d51332" }}>{athlete.penalties}</div>
        </div>
      </div>

      {/* Stalling */}
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", marginRight: 24, minWidth: 60 }}>
        {stalling.active && (
          <div style={{ background: "#e4c328", color: "#000", padding: "8px 12px", borderRadius: 8, textAlign: "center" }}>
            <div style={{ fontSize: "0.6rem", fontWeight: 700, textTransform: "uppercase" }}>Stalling</div>
            <div style={{ fontSize: "1.4rem", fontWeight: 900, fontFamily: "monospace" }}>00:{String(stalling.remaining).padStart(2, "0")}</div>
          </div>
        )}
      </div>

      {/* Points */}
      <div style={{ width: 120, height: 100, background: scoreBg, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", border: `2px solid ${isTop ? "#c49b18" : "#333"}` }}>
        <span style={{ fontSize: "3.5rem", fontWeight: 900, color: scoreColor, fontFamily: "monospace" }}>{athlete.points}</span>
      </div>

      {isDoubleStalling && (
        <div style={{ position: "absolute", bottom: 8, left: "50%", transform: "translateX(-50%)", background: "#d51332", color: "#fff", padding: "2px 12px", borderRadius: 4, fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase" }}>
          DOUBLE STALLING
        </div>
      )}
    </div>
  );
}
