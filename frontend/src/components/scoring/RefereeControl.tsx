import React, { useState, useRef, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useScoring, ScoringAction } from "../../context/ScoringContext";
import api from "../../services/api";
import PublicScoreboard from "./PublicScoreboard";

type Discipline = "NEWAZA" | "FIGHTING" | "DUO" | "FULL_CONTACT";

interface Ruleset {
  name: string;
  timerMode: "countdown" | "countup";
  timeMinutes: number;
  buttons: { type: string; label: string; value: number; key: string }[];
  advantages: boolean;
  penalties: boolean;
  warnings: boolean;
  fouls?: string[];
  standingCount?: number;
  winMethods: string[];
  drawMethods: string[];
}

const RULESETS: Record<Discipline, Ruleset> = {
  NEWAZA: {
    name: "Newaza",
    timerMode: "countdown", timeMinutes: 5,
    buttons: [
      { type: "point", label: "Pass. Garde", value: 3, key: "passGuard" },
      { type: "point", label: "Montée", value: 4, key: "mount" },
      { type: "point", label: "Prise de dos", value: 4, key: "backTake" },
      { type: "point", label: "Balayage", value: 2, key: "sweep" },
      { type: "point", label: "Genou/Ventre", value: 2, key: "kneeOnBelly" },
      { type: "point", label: "Soumission", value: 99, key: "submission" },
    ],
    advantages: true, penalties: true, warnings: false,
    winMethods: ["POINTS", "SUBMISSION", "DISQUALIFICATION", "WALKOVER", "NO SHOW", "DECISION"],
    drawMethods: ["DRAW", "DOUBLE WO/DQ", "DOUBLE NO SHOW"],
  },
  FIGHTING: {
    name: "Fighting",
    timerMode: "countdown", timeMinutes: 3,
    buttons: [
      { type: "ippon", label: "Ippon", value: 3, key: "ippon" },
      { type: "wazaari", label: "Waza-ari", value: 2, key: "wazaari" },
      { type: "yuko", label: "Yuko", value: 1, key: "yuko" },
    ],
    advantages: false, penalties: true, warnings: true,
    winMethods: ["FULL IPPON", "POINTS", "SUBMISSION", "HANSOKU (DQ)", "KIKEN (FORFEIT)", "HANTEI (DECISION)"],
    drawMethods: ["HIKIWAKE (DRAW)", "DOUBLE HANSOKU"],
  },
  DUO: {
    name: "Duo System",
    timerMode: "countup", timeMinutes: 3,
    buttons: [],
    advantages: false, penalties: false, warnings: false,
    winMethods: ["POINTS", "FORFEIT", "DISQUALIFICATION"],
    drawMethods: ["DRAW"],
  },
  FULL_CONTACT: {
    name: "Full Contact",
    timerMode: "countdown", timeMinutes: 3,
    buttons: [],
    advantages: false, penalties: true, warnings: true,
    standingCount: 8,
    fouls: ["headbutt", "groin", "bite", "eye", "back_of_head", "elbow_12_6", "holding"],
    winMethods: ["KO / TKO", "SUBMISSION", "POINTS", "DOCTOR STOPPAGE", "DISQUALIFICATION", "FORFEIT", "DECISION"],
    drawMethods: ["DRAW", "NO CONTEST", "DOUBLE KO"],
  },
};

export default function RefereeControl() {
  const { state, dispatch } = useScoring();
  const [endModal, setEndModal] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [actionLogExpanded, setActionLogExpanded] = useState(false);
  const [searchParams] = useSearchParams();
  const matchId = searchParams.get("matchId") || "";
  const redName = searchParams.get("red") || "";
  const blueName = searchParams.get("blue") || "";
  const competitionId = searchParams.get("competitionId") || "";
  const modToken = searchParams.get("token") || "";

  const ruleset = RULESETS[state.discipline as Discipline] || RULESETS.NEWAZA;

  // Pre-fill athlete names
  useEffect(() => {
    if (redName) dispatch({ type: "SET_ATHLETE", side: "top", field: "name", value: redName });
    if (blueName) dispatch({ type: "SET_ATHLETE", side: "bottom", field: "name", value: blueName });
  }, []);

  // Create scoring session on mount
  useEffect(() => {
    if (!matchId) return;
    api.post("/scoring/public/sessions", { matchId, discipline: state.discipline }).catch(() => {});
  }, [matchId]);

  // Sync clock to backend (LIVE status)
  const prevRunning = useRef(state.clock.running);
  useEffect(() => {
    if (!matchId) return;
    if (state.clock.running && !prevRunning.current) {
      if (competitionId && modToken) {
        api.patch(`/competitions/moderate/${competitionId}/matches/${matchId}?token=${modToken}`, { status: "LIVE" }).catch(() => {});
      } else {
        api.patch(`/matches/${matchId}`, { status: "LIVE" }).catch(() => {});
      }
    }
    prevRunning.current = state.clock.running;
  }, [state.clock.running, matchId]);

  // ── Auto-end on timer expiry ──
  const prevRemaining = useRef(state.clock.remaining);
  useEffect(() => {
    const timedOut =
      (state.clock.timerMode === "countdown" && state.clock.remaining <= 0 && prevRemaining.current > 0) ||
      (state.clock.timerMode === "countup" && state.clock.elapsed >= state.clock.total && prevRemaining.current < state.clock.total);
    prevRemaining.current = state.clock.remaining;
    if (timedOut && state.status === "running") {
      dispatch({ type: "PAUSE" });
      setEndModal("time");
    }
  }, [state.clock.remaining, state.clock.elapsed]);

  // ── Auto-end conditions (ruleset-specific) ──
  // Submission (+99) → auto-end for top/bottom
  const prevTopPoints = useRef(state.top.points);
  const prevBottomPoints = useRef(state.bottom.points);
  useEffect(() => {
    if (state.status !== "running") return;
    if (state.top.points >= prevTopPoints.current + 99) {
      handleEndMatch("top", ruleset.winMethods.includes("SUBMISSION") ? "SUBMISSION" : ruleset.winMethods[0]);
      return;
    }
    if (state.bottom.points >= prevBottomPoints.current + 99) {
      handleEndMatch("bottom", ruleset.winMethods.includes("SUBMISSION") ? "SUBMISSION" : ruleset.winMethods[0]);
      return;
    }
    prevTopPoints.current = state.top.points;
    prevBottomPoints.current = state.bottom.points;
  }, [state.top.points, state.bottom.points]);

  // 3 warnings → auto-DQ prompt (Fighting & Full Contact)
  const prevTopWarnings = useRef(state.top.penalties);
  const prevBottomWarnings = useRef(state.bottom.penalties);
  useEffect(() => {
    if (state.status !== "running") return;
    if (ruleset.warnings && state.top.penalties >= 4 && prevTopWarnings.current < 4) {
      dispatch({ type: "PAUSE" });
      setEndModal("dq_bottom"); // top got 4 warnings, so bottom wins by DQ
      return;
    }
    if (ruleset.warnings && state.bottom.penalties >= 4 && prevBottomWarnings.current < 4) {
      dispatch({ type: "PAUSE" });
      setEndModal("dq_top");
      return;
    }
    prevTopWarnings.current = state.top.penalties;
    prevBottomWarnings.current = state.bottom.penalties;
  }, [state.top.penalties, state.bottom.penalties]);

  // 3 knockdowns in one round → auto-TKO (Full Contact)
  const prevTopKDs = useRef(state.knockdownsTop);
  const prevBottomKDs = useRef(state.knockdownsBottom);
  useEffect(() => {
    if (state.status !== "running") return;
    if (state.discipline === "FULL_CONTACT") {
      if (state.knockdownsTop >= 3 && prevTopKDs.current < 3) {
        dispatch({ type: "PAUSE" });
        setEndModal("tko_bottom");
        return;
      }
      if (state.knockdownsBottom >= 3 && prevBottomKDs.current < 3) {
        dispatch({ type: "PAUSE" });
        setEndModal("tko_top");
        return;
      }
    }
    prevTopKDs.current = state.knockdownsTop;
    prevBottomKDs.current = state.knockdownsBottom;
  }, [state.knockdownsTop, state.knockdownsBottom]);

  // ── Sound effects ──
  const prevSoundPoints = useRef<{ top: number; bottom: number }>({ top: 0, bottom: 0 });
  useEffect(() => {
    if (!soundEnabled) return;
    const totalNow = state.top.points + state.bottom.points;
    const totalPrev = prevSoundPoints.current.top + prevSoundPoints.current.bottom;
    if (totalNow > totalPrev) playBeep("point");
    prevSoundPoints.current = { top: state.top.points, bottom: state.bottom.points };
  }, [state.top.points, state.bottom.points, soundEnabled]);

  // Last 10 seconds beep
  const prevClockRemaining = useRef(state.clock.remaining);
  useEffect(() => {
    if (!soundEnabled || !state.clock.running || state.clock.timerMode !== "countdown") return;
    if (state.clock.remaining <= 10 && state.clock.remaining > 0 && prevClockRemaining.current > state.clock.remaining) {
      playBeep("tick");
    }
    prevClockRemaining.current = state.clock.remaining;
  }, [state.clock.remaining, soundEnabled, state.clock.running]);

  // Periodic timer sync
  const clockRemainingRef = useRef(state.clock.remaining);
  clockRemainingRef.current = state.clock.remaining;
  useEffect(() => {
    if (!matchId || !state.clock.running) return;
    const interval = setInterval(() => {
      api.patch(`/scoring/public/sessions/${matchId}/sync-timer`, {
        remainingSeconds: clockRemainingRef.current,
        running: true,
      }).catch(() => {});
    }, 3000);
    return () => clearInterval(interval);
  }, [matchId, state.clock.running]);

  // Sync score action to backend
  function syncAction(side: "top" | "bottom", type: string, value: number) {
    if (!matchId) return;
    const apiSide = side === "top" ? "red" : "blue";
    const apiType = type === "ADD_POINTS" ? "point" : type === "ADD_ADVANTAGE" ? "advantage" : type === "ADD_PENALTY" ? "penalty" : type === "ADD_IPPON" ? "ippon" : type === "ADD_WAZAARI" ? "wazaari" : type === "ADD_YUKO" ? "yuko" : type;
    api.patch(`/scoring/public/sessions/${matchId}/action`, { side: apiSide, type: apiType, value }).catch(() => {});
  }

  // End match
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
      await api.patch(`/scoring/public/sessions/${matchId}/finish`, {
        winnerSide: side === "top" ? "red" : side === "bottom" ? "blue" : "draw",
        winMethod: method,
      }).catch(() => {});
    } catch {}
  }

  function openSpectator() {
    window.open("/scoring/spectator", "_blank", "width=1200,height=800");
  }

  // ── Discipline-aware score buttons ──
  function renderScoreButtons(side: "top" | "bottom") {
    const stalling = side === "top" ? state.stallingTop : state.stallingBottom;
    const kd = side === "top" ? state.knockdownsTop : state.knockdownsBottom;

    return (
      <div style={{ marginTop: 8 }}>
        {ruleset.buttons.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 2 }}>
            {ruleset.buttons.map((b) => (
              <Btn key={b.key} label={`+${b.value} ${b.label}`}
                color="#22c55e"
                onClick={() => {
                  if (b.type === "point") { dispatch({ type: "ADD_POINTS", side, amount: b.value }); syncAction(side, "ADD_POINTS", b.value); }
                  else if (b.type === "ippon") { dispatch({ type: "ADD_IPPON", side }); syncAction(side, "ADD_IPPON", 3); }
                  else if (b.type === "wazaari") { dispatch({ type: "ADD_WAZAARI", side }); syncAction(side, "ADD_WAZAARI", 2); }
                  else if (b.type === "yuko") { dispatch({ type: "ADD_YUKO", side }); syncAction(side, "ADD_YUKO", 1); }
                }} />
            ))}
          </div>
        )}
        {/* − Point buttons */}
        {ruleset.buttons.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 4 }}>
            {ruleset.buttons.map((b) => (
              <Btn key={'sub-' + b.key} label={'−' + b.value + ' ' + b.label}
                color="#d51332"
                onClick={() => { dispatch({ type: "ADD_POINTS", side, amount: -b.value }); syncAction(side, "ADD_POINTS", -b.value); }} />
            ))}
          </div>
        )}

        {ruleset.advantages && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 4 }}>
            <Btn label="+A" color="#3b82f6" onClick={() => { dispatch({ type: "ADD_ADVANTAGE", side, amount: 1 }); syncAction(side, "ADD_ADVANTAGE", 1); }} />
            <Btn label="−A" color="#d51332" onClick={() => { dispatch({ type: "ADD_ADVANTAGE", side, amount: -1 }); syncAction(side, "ADD_ADVANTAGE", -1); }} />
          </div>
        )}

        {(ruleset.penalties || ruleset.warnings) && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 4 }}>
            {ruleset.warnings && (
              <>
                <Btn label="+⚠" color="#e4c328" onClick={() => { dispatch({ type: "ADD_WARNING", side, amount: 1 }); syncAction(side, "ADD_PENALTY", 1); }} />
                <Btn label="−⚠" color="#d51332" onClick={() => { dispatch({ type: "ADD_WARNING", side, amount: -1 }); syncAction(side, "ADD_PENALTY", -1); }} />
              </>
            )}
            {ruleset.penalties && (
              <>
                <Btn label="+1 P" color="#e4c328" onClick={() => { dispatch({ type: "ADD_PENALTY", side, amount: 1 }); syncAction(side, "ADD_PENALTY", 1); }} />
                <Btn label="−1 P" color="#d51332" onClick={() => { dispatch({ type: "ADD_PENALTY", side, amount: -1 }); syncAction(side, "ADD_PENALTY", -1); }} />
              </>
            )}
            <Btn label={stalling.active ? "⏹ Stop Stall" : "⏱ Stalling"}
              color={stalling.active ? "#d51332" : "#e4c328"}
              onClick={() => dispatch({ type: stalling.active ? "STOP_STALLING" : "START_STALLING", side })} />
          </div>
        )}

        {state.discipline === "FULL_CONTACT" && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 4 }}>
            <Btn label={`💥 KD (${kd})`} color="#ff6b35" onClick={() => { dispatch({ type: "KNOCKDOWN", side }); api.patch(`/scoring/public/sessions/${matchId}/knockdown/${side === "top" ? "red" : "blue"}`).catch(() => {}); }} />
            {ruleset.fouls?.map((f) => (
              <Btn key={f} label={`🚫 ${f}`} color="#991b1b" onClick={() => { dispatch({ type: "ADD_FOUL", side, foul: f }); api.patch(`/scoring/public/sessions/${matchId}/foul/${side === "top" ? "red" : "blue"}`, { foulType: f }).catch(() => {}); }} />
            ))}
          </div>
        )}

        {state.discipline === "DUO" && (
          <div style={{ marginTop: 8, padding: 8, background: "#1a1a1a", borderRadius: 8 }}>
            <div style={{ color: "#e4c328", fontSize: "0.8rem", marginBottom: 4 }}>Round {state.duoRound} / 3</div>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 4 }}>
              {[1, 2, 3].map((r) => (
                <Btn key={r} label={`R${r}`} color={state.duoRound === r ? "#e4c328" : "#444"}
                  onClick={() => { dispatch({ type: "DUO_SET_ROUND", round: r }); api.patch(`/scoring/public/sessions/${matchId}/duo/round`, { round: r }).catch(() => {}); }} />
              ))}
            </div>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 2 }}>
              {[5, 6, 7, 8, 9, 10].map((s) => (
                <Btn key={s} label={`+${s}`} color="#22c55e" onClick={() => { dispatch({ type: "DUO_SCORE", side, techniqueIndex: 0, score: s }); }} />
              ))}
            </div>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              {[5, 6, 7, 8, 9, 10].map((s) => (
                <Btn key={`sub-${s}`} label={`−${s}`} color="#d51332" onClick={() => { dispatch({ type: "DUO_SCORE", side, techniqueIndex: 0, score: -s }); }} />
              ))}
            </div>
          </div>
        )}

        {state.discipline === "NEWAZA" && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 4 }}>
            <Btn label={state.osaekomiRunning ? `⏱ Osaekomi ${state.osaekomiSeconds}s` : "▶ Osaekomi"}
              color={state.osaekomiRunning ? "#d51332" : "#22c55e"}
              onClick={() => {
                if (state.osaekomiRunning) {
                  dispatch({ type: "OSAEKOMI_STOP" });
                  api.patch(`/scoring/public/sessions/${matchId}/osaekomi/stop`).catch(() => {});
                } else {
                  dispatch({ type: "OSAEKOMI_START" });
                  api.patch(`/scoring/public/sessions/${matchId}/osaekomi/start`).catch(() => {});
                }
              }} />
          </div>
        )}
      </div>
    );
  }

  // ── Action log ──
  function renderActionLog() {
    const actions = state.undoStack.slice(-20).reverse();
    if (actions.length === 0) return null;
    return (
      <div style={{ padding: 8, background: "#1a1a1a", borderRadius: 8, maxHeight: actionLogExpanded ? 300 : 120, overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <span style={{ color: "#888", fontSize: "0.7rem", textTransform: "uppercase" }}>Historique</span>
          <button onClick={() => setActionLogExpanded(!actionLogExpanded)}
            style={{ background: "none", border: "none", color: "#e4c328", cursor: "pointer", fontSize: "0.7rem" }}>
            {actionLogExpanded ? "Réduire" : "Plus"}
          </button>
        </div>
        {actions.map((a, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, padding: "2px 0", fontSize: "0.7rem" }}>
            <span style={{ color: a.side === "top" ? "#d51332" : "#2563eb", fontWeight: 700, minWidth: 28 }}>
              {a.side === "top" ? "RED" : "BLU"}
            </span>
            <span style={{ color: "#ccc" }}>{a.type}{a.value > 1 ? ` +${a.value}` : ""}{a.label ? ` (${a.label})` : ""}</span>
            <span style={{ color: "#555", marginLeft: "auto", fontSize: "0.6rem" }}>
              {new Date(a.timestamp).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </span>
          </div>
        ))}
      </div>
    );
  }

  // ── Render ──
  const clockRunning = state.clock.running;
  const displayTime = state.clock.timerMode === "countup" ? state.clock.elapsed : state.clock.remaining;

  return (
    <div style={{ display: "flex", gap: 0, minHeight: "100vh", background: "#000" }}>
      {/* LEFT: Scoreboard */}
      <div style={{ flex: 3, borderRight: "2px solid #333" }}>
        <PublicScoreboard />
      </div>

      {/* RIGHT: Controls */}
      <div style={{ flex: 1, background: "#111", padding: 16, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 4 }}>
          <h3 style={{ color: "#e4c328", margin: 0, fontSize: "0.9rem", textTransform: "uppercase" }}>{ruleset.name}</h3>
          <div style={{ display: "flex", gap: 4 }}>
            {(["NEWAZA", "FIGHTING", "DUO", "FULL_CONTACT"] as Discipline[]).map((d) => (
              <button key={d}
                onClick={() => dispatch({ type: "SET_DISCIPLINE", discipline: d })}
                style={{ padding: "3px 8px", fontSize: "0.65rem", borderRadius: 4, border: "none", cursor: "pointer", background: state.discipline === d ? "#e4c328" : "#333", color: state.discipline === d ? "#000" : "#888", fontWeight: 700, textTransform: "uppercase" }}>
                {d === "FULL_CONTACT" ? "FC" : d.slice(0, 4)}
              </button>
            ))}
          </div>
          <Btn label="🖥️" color="#666" onClick={openSpectator} />
          <Btn label="←" color="#666" onClick={() => window.close()} />
          <Btn label={soundEnabled ? "🔊" : "🔇"} color={soundEnabled ? "#22c55e" : "#444"} onClick={() => setSoundEnabled(!soundEnabled)} />
        </div>

        {/* Standing Count overlay */}
        {state.standingCountRunning && (
          <div style={{ padding: 8, background: "#ff6b35", borderRadius: 8, textAlign: "center", fontWeight: 900, fontSize: "1.5rem", color: "#fff" }}>
            STANDING COUNT: {state.standingCount}
          </div>
        )}

        {/* Action Log */}
        {renderActionLog()}

        {/* TOP Athlete */}
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
            {[60, 120, 180, 300, 600].map((s) => (
              <Btn key={s} label={`${s / 60}min`} color="#444" onClick={() => dispatch({ type: "SET_CLOCK", seconds: s })} />
            ))}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <Btn label="↩ UNDO" color="#e4c328" onClick={() => { dispatch({ type: "UNDO" }); api.patch(`/scoring/public/sessions/${matchId}/undo`).catch(() => {}); }} fullWidth />
          <Btn label="⇄ SWITCH SIDES" color="#3b82f6" onClick={() => dispatch({ type: "SWITCH_SIDES" })} fullWidth />
          <Btn label="🔄 RESET" color="#666" onClick={() => dispatch({ type: "RESET" })} fullWidth />
        </div>

        <div style={{ flex: 1 }} />

        {/* BOTTOM Athlete */}
        {renderScoreButtons("bottom")}

        {/* End match buttons */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
          <Btn label="🏆 END — TOP" color="#d51332" onClick={() => setEndModal("top")} fullWidth />
          <Btn label="🏆 END — BOTTOM" color="#2563eb" onClick={() => setEndModal("bottom")} fullWidth />
          <Btn label="⚖ END — DRAW" color="#888" onClick={() => setEndModal("draw")} fullWidth />
          <button onClick={async () => {
            if (!confirm("Réinitialiser le match ?")) return;
            dispatch({ type: "RESET" });
            if (matchId) {
              await api.patch(`/scoring/public/sessions/${matchId}/reset`).catch(() => {});
              if (competitionId && modToken) {
                await api.patch(`/competitions/moderate/${competitionId}/matches/${matchId}?token=${modToken}`, {
                  status: "UPCOMING", redScore: 0, blueScore: 0, warningsRed: 0, penaltiesRed: 0, warningsBlue: 0, penaltiesBlue: 0, winnerSide: null, winMethod: null,
                }).catch(() => {});
              }
            }
          }}
            style={{ padding: "8px 16px", background: "#dc2626", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 700, fontSize: "0.8rem" }}>
            🔄 RESET MATCH
          </button>
        </div>

        {/* End Match Modal */}
        {endModal && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }} onClick={() => setEndModal(null)}>
            <div style={{ background: "#1a1a1a", borderRadius: 16, padding: 24, maxWidth: 420, width: "90%", border: "1px solid #333", maxHeight: "80vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
              {/* Auto DQ / TKO headers */}
              {endModal === "dq_top" || endModal === "dq_bottom" ? (
                <h3 style={{ color: "#d51332", margin: "0 0 4px", textTransform: "uppercase", fontSize: "0.95rem" }}>
                  🚫 {endModal === "dq_top" ? state.top.name : state.bottom.name} — DISQUALIFICATION
                </h3>
              ) : endModal === "tko_top" || endModal === "tko_bottom" ? (
                <h3 style={{ color: "#ff6b35", margin: "0 0 4px", textTransform: "uppercase", fontSize: "0.95rem" }}>
                  💥 {endModal === "tko_top" ? state.top.name : state.bottom.name} — TKO (3 Knockdowns)
                </h3>
              ) : endModal === "time" ? (
                <>
                  <h3 style={{ color: "#e4c328", margin: "0 0 4px", textTransform: "uppercase", fontSize: "0.95rem" }}>
                    ⏰ Temps écoulé — Sélectionnez le vainqueur
                  </h3>
                  <p style={{ color: "#888", fontSize: "0.75rem", margin: "0 0 12px" }}>
                    Le chronomètre est arrivé à zéro.
                  </p>
                </>
              ) : (
                <h3 style={{ color: "#e4c328", margin: "0 0 4px", textTransform: "uppercase", fontSize: "0.95rem" }}>
                  {endModal === "draw" ? "⚖ Exception / Égalité" : `🏆 Gagnant: ${state[endModal as "top" | "bottom"].name}`}
                </h3>
              )}

              {/* Auto-DQ: auto-confirm */}
              {(endModal === "dq_top" || endModal === "dq_bottom") ? (
                <>
                  <p style={{ color: "#888", fontSize: "0.8rem", margin: "8px 0" }}>
                    4 avertissements atteints — disqualification automatique.
                  </p>
                  <button style={modalBtn("#d51332")}
                    onClick={() => handleEndMatch(endModal === "dq_top" ? "top" : "bottom", "HANSOKU (DQ)")}>
                    Confirmer — {endModal === "dq_top" ? state.top.name : state.bottom.name} gagne par DQ
                  </button>
                </>
              ) : (endModal === "tko_top" || endModal === "tko_bottom") ? (
                <>
                  <p style={{ color: "#888", fontSize: "0.8rem", margin: "8px 0" }}>
                    3 knockdowns — TKO automatique.
                  </p>
                  <button style={modalBtn("#ff6b35")}
                    onClick={() => handleEndMatch(endModal === "tko_top" ? "top" : "bottom", "KO / TKO")}>
                    Confirmer — {endModal === "tko_top" ? state.top.name : state.bottom.name} gagne par TKO
                  </button>
                </>
              ) : endModal === "time" ? (
                /* Timer expired: quick-pick + all methods */
                <>
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ color: "#aaa", fontSize: "0.7rem", textTransform: "uppercase", marginBottom: 4 }}>Vainqueur</div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button style={modalBtn("#d51332")} onClick={() => handleEndMatch("top", ruleset.winMethods[0])}>
                        🔴 {state.top.name}
                      </button>
                      <button style={modalBtn("#2563eb")} onClick={() => handleEndMatch("bottom", ruleset.winMethods[0])}>
                        🔵 {state.bottom.name}
                      </button>
                    </div>
                  </div>
                  <div style={{ color: "#aaa", fontSize: "0.7rem", textTransform: "uppercase", marginBottom: 4 }}>Méthode de victoire</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 8 }}>
                    {ruleset.winMethods.map((m) => (
                      <button key={m} style={modalBtn("#333")}
                        onClick={() => {
                          const topWins = state.top.points > state.bottom.points;
                          handleEndMatch(topWins ? "top" : "bottom", m);
                        }}>
                        🏆 {m}
                      </button>
                    ))}
                  </div>
                  <div style={{ color: "#aaa", fontSize: "0.7rem", textTransform: "uppercase", marginBottom: 4 }}>Égalité</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {ruleset.drawMethods.map((m) => (
                      <button key={m} style={modalBtn("#555")} onClick={() => handleEndMatch(null, m)}>
                        ⚖ {m}
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                /* Manual end: discipline-specific method list */
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {(endModal === "draw" ? ruleset.drawMethods : ruleset.winMethods).map((m) => (
                    <button key={m} style={modalBtn("#333")}
                      onClick={() => handleEndMatch(endModal === "draw" ? null : endModal as "top" | "bottom", m)}>
                      {m}
                    </button>
                  ))}
                </div>
              )}
              <button style={{ marginTop: 12, padding: "8px", background: "transparent", color: "#888", border: "none", cursor: "pointer", width: "100%" }} onClick={() => setEndModal(null)}>
                Annuler
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function modalBtn(bg: string): React.CSSProperties {
  return { padding: "10px 14px", background: bg, color: "#fff", border: "1px solid #555", borderRadius: 8, cursor: "pointer", fontWeight: 700, textTransform: "uppercase", fontSize: "0.8rem", textAlign: "left" as const };
}

function playBeep(type: "point" | "tick") {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = "square";
    gain.gain.value = 0.08;
    if (type === "point") { osc.frequency.value = 880; gain.gain.value = 0.12; }
    else { osc.frequency.value = 440; }
    osc.start(); osc.stop(ctx.currentTime + (type === "point" ? 0.15 : 0.08));
  } catch {}
}

function Btn({ label, color, onClick, fullWidth }: { label: string; color: string; onClick: () => void; fullWidth?: boolean }) {
  return (
    <button onClick={onClick}
      style={{ padding: "6px 12px", background: color, color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 700, fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.05em", width: fullWidth ? "100%" : "auto", opacity: 0.9 }}>
      {label}
    </button>
  );
}
