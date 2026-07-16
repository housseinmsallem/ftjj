import React, { createContext, useContext, useReducer, useCallback, useRef, useEffect } from "react";

// ── Types ──
export interface Athlete {
  name: string;
  academy: string;
  points: number;
  advantages: number;
  penalties: number;
  color: "red" | "blue";
}

export interface StallingTimer {
  athleteKey: "top" | "bottom";
  remaining: number; // seconds
  active: boolean;
}

export interface ScoringAction {
  type: "point" | "advantage" | "penalty" | "stalling" | "time";
  side: "top" | "bottom";
  value: number;
  timestamp: number;
}

export interface MatchState {
  top: Athlete;
  bottom: Athlete;
  clock: { total: number; remaining: number; running: boolean };
  stallingTop: StallingTimer;
  stallingBottom: StallingTimer;
  status: "idle" | "running" | "paused" | "ended";
  winner: { side: "top" | "bottom" | null; method: string | null };
  undoStack: ScoringAction[];
  matNumber: string;
  division: string;
}

type Action =
  | { type: "SET_ATHLETE"; side: "top" | "bottom"; field: keyof Athlete; value: string | number }
  | { type: "ADD_POINTS"; side: "top" | "bottom"; amount: number }
  | { type: "ADD_ADVANTAGE"; side: "top" | "bottom"; amount: number }
  | { type: "ADD_PENALTY"; side: "top" | "bottom"; amount: number }
  | { type: "START_STALLING"; side: "top" | "bottom" }
  | { type: "STOP_STALLING"; side: "top" | "bottom" }
  | { type: "TICK_STALLING" }
  | { type: "TICK_CLOCK" }
  | { type: "SET_CLOCK"; seconds: number }
  | { type: "ADD_TIME"; seconds: number }
  | { type: "PLAY" }
  | { type: "PAUSE" }
  | { type: "SWITCH_SIDES" }
  | { type: "END_MATCH"; side: "top" | "bottom" | null; method: string }
  | { type: "UNDO" }
  | { type: "RESET" }
  | { type: "LOAD_STATE"; state: MatchState };

const initialState: MatchState = {
  top: { name: "Athlète Rouge", academy: "Académie", points: 0, advantages: 0, penalties: 0, color: "red" },
  bottom: { name: "Athlète Bleu", academy: "Académie", points: 0, advantages: 0, penalties: 0, color: "blue" },
  clock: { total: 300, remaining: 300, running: false },
  stallingTop: { athleteKey: "top", remaining: 20, active: false },
  stallingBottom: { athleteKey: "bottom", remaining: 20, active: false },
  status: "idle",
  winner: { side: null, method: null },
  undoStack: [],
  matNumber: "1",
  division: "SCOREBOARD / JIU JITSU",
};

function pushUndo(state: MatchState, action: ScoringAction): ScoringAction[] {
  return [...state.undoStack.slice(-9), action];
}

function reducer(state: MatchState, action: Action): MatchState {
  switch (action.type) {
    case "SET_ATHLETE": {
      const athlete = { ...state[action.side], [action.field]: action.value };
      return { ...state, [action.side]: athlete };
    }
    case "ADD_POINTS": {
      const a = { ...state[action.side], points: Math.max(0, state[action.side].points + action.amount) };
      const undoAction: ScoringAction = { type: "point", side: action.side, value: action.amount, timestamp: Date.now() };
      return { ...state, [action.side]: a, undoStack: pushUndo(state, undoAction) };
    }
    case "ADD_ADVANTAGE": {
      const a = { ...state[action.side], advantages: Math.max(0, state[action.side].advantages + action.amount) };
      const undoAction: ScoringAction = { type: "advantage", side: action.side, value: action.amount, timestamp: Date.now() };
      return { ...state, [action.side]: a, undoStack: pushUndo(state, undoAction) };
    }
    case "ADD_PENALTY": {
      const a = { ...state[action.side], penalties: Math.max(0, state[action.side].penalties + action.amount) };
      const undoAction: ScoringAction = { type: "penalty", side: action.side, value: action.amount, timestamp: Date.now() };
      return { ...state, [action.side]: a, undoStack: pushUndo(state, undoAction) };
    }
    case "START_STALLING": {
      if (action.side === "top") return { ...state, stallingTop: { ...state.stallingTop, remaining: 20, active: true } };
      return { ...state, stallingBottom: { ...state.stallingBottom, remaining: 20, active: true } };
    }
    case "STOP_STALLING": {
      if (action.side === "top") return { ...state, stallingTop: { ...state.stallingTop, remaining: 20, active: false } };
      return { ...state, stallingBottom: { ...state.stallingBottom, remaining: 20, active: false } };
    }
    case "TICK_STALLING": {
      const t = state.stallingTop.active ? { ...state.stallingTop, remaining: Math.max(0, state.stallingTop.remaining - 1), active: state.stallingTop.remaining > 1 } : state.stallingTop;
      const b = state.stallingBottom.active ? { ...state.stallingBottom, remaining: Math.max(0, state.stallingBottom.remaining - 1), active: state.stallingBottom.remaining > 1 } : state.stallingBottom;
      return { ...state, stallingTop: t, stallingBottom: b };
    }
    case "TICK_CLOCK": {
      if (!state.clock.running || state.clock.remaining <= 0) return state;
      const remaining = state.clock.remaining - 1;
      return { ...state, clock: { ...state.clock, remaining, running: remaining > 0 } };
    }
    case "SET_CLOCK":
      return { ...state, clock: { total: action.seconds, remaining: action.seconds, running: false } };
    case "ADD_TIME":
      return { ...state, clock: { ...state.clock, remaining: state.clock.remaining + action.seconds, total: state.clock.total + action.seconds } };
    case "PLAY":
      return { ...state, clock: { ...state.clock, running: true }, status: "running" as const };
    case "PAUSE":
      return { ...state, clock: { ...state.clock, running: false }, status: "paused" as const };
    case "SWITCH_SIDES":
      return { ...state, top: state.bottom, bottom: state.top, stallingTop: state.stallingBottom, stallingBottom: state.stallingTop };
    case "END_MATCH":
      return { ...state, status: "ended", clock: { ...state.clock, running: false }, winner: { side: action.side, method: action.method } };
    case "UNDO": {
      if (state.undoStack.length === 0) return state;
      const last = state.undoStack[state.undoStack.length - 1];
      const newStack = state.undoStack.slice(0, -1);
      const side = last.side;
      const athlete = state[side];
      const rev = last.type === "point" ? { points: Math.max(0, athlete.points - last.value) }
        : last.type === "advantage" ? { advantages: Math.max(0, athlete.advantages - last.value) }
        : last.type === "penalty" ? { penalties: Math.max(0, athlete.penalties - last.value) }
        : {};
      return { ...state, [side]: { ...athlete, ...rev }, undoStack: newStack };
    }
    case "RESET":
      return { ...initialState, top: { ...initialState.top, name: state.top.name, academy: state.top.academy }, bottom: { ...initialState.bottom, name: state.bottom.name, academy: state.bottom.academy } };
    case "LOAD_STATE":
      return action.state;
    default:
      return state;
  }
}

// ── Context ──
interface ScoringContextType {
  state: MatchState;
  dispatch: React.Dispatch<Action>;
  formatTime: (s: number) => string;
}

const ScoringContext = createContext<ScoringContextType | null>(null);

export function formatTime(seconds: number): string {
  const m = Math.floor(Math.max(0, seconds) / 60);
  const s = Math.floor(Math.max(0, seconds) % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function ScoringProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const clockRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stallingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Main clock tick
  useEffect(() => {
    if (state.clock.running) {
      clockRef.current = setInterval(() => dispatch({ type: "TICK_CLOCK" }), 1000);
    }
    return () => { if (clockRef.current) clearInterval(clockRef.current); };
  }, [state.clock.running]);

  // Stalling tick
  useEffect(() => {
    const hasStalling = state.stallingTop.active || state.stallingBottom.active;
    if (hasStalling) {
      stallingRef.current = setInterval(() => dispatch({ type: "TICK_STALLING" }), 1000);
    }
    return () => { if (stallingRef.current) clearInterval(stallingRef.current); };
  }, [state.stallingTop.active, state.stallingBottom.active]);

  // Sync state to localStorage for spectator windows
  useEffect(() => {
    try { localStorage.setItem("scoring_state", JSON.stringify(state)); } catch {}
  }, [state]);

  return (
    <ScoringContext.Provider value={{ state, dispatch, formatTime }}>
      {children}
    </ScoringContext.Provider>
  );
}

export function useScoring(): ScoringContextType {
  const ctx = useContext(ScoringContext);
  if (!ctx) throw new Error("useScoring must be used inside ScoringProvider");
  return ctx;
}
