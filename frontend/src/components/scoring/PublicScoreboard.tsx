import React from "react";
import { useScoring, formatTime, MatchState } from "../../context/ScoringContext";

interface Props {
  externalState?: MatchState | null;
}

export default function PublicScoreboard({ externalState }: Props) {
  const sc = useScoring();
  const state = externalState || sc.state;

  const top = state.top;
  const bottom = state.bottom;
  const isDoubleStalling = state.stallingTop.active && state.stallingBottom.active;
  const displayTime = state.clock.timerMode === "countup" ? state.clock.elapsed : state.clock.remaining;

  return (
    <div style={{ background: "#0a0a0a", color: "#fff", fontFamily: "'Inter', 'Roboto', sans-serif", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Standing Count Overlay */}
      {state.standingCountRunning && (
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", background: "#ff6b35", color: "#fff", fontSize: "6rem", fontWeight: 900, padding: "20px 60px", borderRadius: 20, zIndex: 10, fontFamily: "monospace" }}>
          {state.standingCount}
        </div>
      )}

      {/* Top Athlete */}
      <AthleteRow
        athlete={top} isTop
        ippon={state.ipponTop} wazaari={state.wazaariTop} yuko={state.yukoTop}
        knockdowns={state.knockdownsTop} fouls={state.foulsTop}
        stalling={state.stallingTop} isDoubleStalling={isDoubleStalling}
        isWinner={state.winner?.side === "top"} winMethod={state.winner?.method}
        discipline={state.discipline}
      />

      <div style={{ height: 2, background: "#333" }} />

      {/* Bottom Athlete */}
      <AthleteRow
        athlete={bottom} isTop={false}
        ippon={state.ipponBottom} wazaari={state.wazaariBottom} yuko={state.yukoBottom}
        knockdowns={state.knockdownsBottom} fouls={state.foulsBottom}
        stalling={state.stallingBottom} isDoubleStalling={isDoubleStalling}
        isWinner={state.winner?.side === "bottom"} winMethod={state.winner?.method}
        discipline={state.discipline}
      />

      {/* Status Bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 24px", background: "#111", borderTop: "2px solid #333", marginTop: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ background: "#fff", color: "#000", fontWeight: 900, fontSize: "1.2rem", padding: "8px 16px", borderRadius: 4 }}>{state.matNumber}</div>
          <div>
            <span style={{ color: "#aaa", fontSize: "0.9rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>{state.division}</span>
            <span style={{ color: "#666", fontSize: "0.7rem", marginLeft: 8 }}>— {state.discipline}</span>
            {state.discipline === "DUO" && <span style={{ color: "#e4c328", fontSize: "0.7rem", marginLeft: 8 }}>R{state.duoRound}/3</span>}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          {state.osaekomiRunning && (
            <div style={{ background: "#e4c328", color: "#000", padding: "6px 14px", borderRadius: 8, fontWeight: 900, fontFamily: "monospace", fontSize: "1.5rem" }}>
              OSAEKOMI {formatTime(state.osaekomiSeconds)}
            </div>
          )}
          <div style={{ fontSize: "4rem", fontWeight: 900, color: "#e4c328", fontFamily: "monospace", letterSpacing: "0.05em" }}>
            {formatTime(displayTime)}
          </div>
        </div>
      </div>
    </div>
  );
}

function AthleteRow({
  athlete, isTop, ippon, wazaari, yuko, knockdowns, fouls,
  stalling, isDoubleStalling, isWinner, winMethod, discipline,
}: {
  athlete: { name: string; academy: string; points: number; advantages: number; penalties: number; color: string };
  isTop: boolean; ippon: number; wazaari: number; yuko: number;
  knockdowns: number; fouls: string[];
  stalling: { remaining: number; active: boolean }; isDoubleStalling: boolean;
  isWinner: boolean; winMethod: string | null; discipline: string;
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

      {/* Fighting: Ippon / Waza-ari / Yuko dots */}
      {(discipline === "FIGHTING" || discipline === "KUMITE") && (
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: 6, marginRight: 24 }}>
          <DotRow label="Ippon" count={ippon} color="#e4c328" />
          <DotRow label="Waza-ari" count={wazaari} color="#f59e0b" />
          <DotRow label="Yuko" count={yuko} color="#3b82f6" />
        </div>
      )}

      {/* Full Contact: KDs & Fouls */}
      {discipline === "FULL_CONTACT" && (
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: 8, marginRight: 24, minWidth: 100 }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "0.7rem", color: "#ff6b35", textTransform: "uppercase", fontWeight: 700 }}>KD</div>
            <div style={{ fontSize: "1.6rem", fontWeight: 900, color: "#ff6b35" }}>{knockdowns}</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "0.7rem", color: "#d51332", textTransform: "uppercase", fontWeight: 700 }}>Fouls</div>
            <div style={{ fontSize: "1.2rem", fontWeight: 900, color: "#d51332" }}>{fouls.length}</div>
          </div>
        </div>
      )}

      {/* Newaza: Advantages + Penalties */}
      {(discipline === "NEWAZA") && (
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: 16, marginRight: 24, minWidth: 80 }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "0.7rem", color: "#22c55e", textTransform: "uppercase", fontWeight: 700 }}>Avantage</div>
            <div style={{ fontSize: "1.6rem", fontWeight: 900, color: "#22c55e" }}>{athlete.advantages}</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "0.7rem", color: "#d51332", textTransform: "uppercase", fontWeight: 700 }}>Pénalité</div>
            <div style={{ fontSize: "1.6rem", fontWeight: 900, color: "#d51332" }}>{athlete.penalties}</div>
          </div>
        </div>
      )}

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

function DotRow({ label, count, color }: { label: string; count: number; color: string }) {
  const max = 4;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ fontSize: "0.65rem", color: "#888", width: 60, textTransform: "uppercase", fontWeight: 700 }}>{label}</span>
      <div style={{ display: "flex", gap: 4 }}>
        {Array.from({ length: max }).map((_, i) => (
          <div key={i} style={{
            width: 14, height: 14, borderRadius: "50%",
            background: i < count ? color : "#333",
            border: `1px solid ${i < count ? color : "#555"}`,
          }} />
        ))}
      </div>
    </div>
  );
}
