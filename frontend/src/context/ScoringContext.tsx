import React, { createContext, useContext, useReducer, useRef, useEffect } from "react";

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
  remaining: number;
  active: boolean;
}

export interface ScoringAction {
  type: "point" | "advantage" | "penalty" | "stalling" | "time" | "ippon" | "wazaari" | "yuko" | "knockdown" | "foul" | "duo_score";
  side: "top" | "bottom";
  value: number;
  timestamp: number;
  label?: string;
}

export interface MatchState {
  top: Athlete;
  bottom: Athlete;
  clock: { total: number; remaining: number; running: boolean; timerMode: "countdown" | "countup"; elapsed: number };
  stallingTop: StallingTimer;
  stallingBottom: StallingTimer;
  status: "idle" | "running" | "paused" | "ended";
  winner: { side: "top" | "bottom" | null; method: string | null };
  undoStack: ScoringAction[];
  matNumber: string;
  division: string;
  discipline: string;
  // Per-discipline score breakdown
  ipponTop: number; wazaariTop: number; yukoTop: number;
  ipponBottom: number; wazaariBottom: number; yukoBottom: number;
  knockdownsTop: number; knockdownsBottom: number;
  foulsTop: string[]; foulsBottom: string[];
  // Duo System
  duoRound: number;
  // Osaekomi
  osaekomiSeconds: number;
  osaekomiRunning: boolean;
  // Standing count (Full Contact)
  standingCount: number;
  standingCountRunning: boolean;
}

type Action =
  | { type: "SET_ATHLETE"; side: "top" | "bottom"; field: keyof Athlete; value: string | number }
  | { type: "ADD_POINTS"; side: "top" | "bottom"; amount: number }
  | { type: "ADD_IPPON"; side: "top" | "bottom" }
  | { type: "ADD_WAZAARI"; side: "top" | "bottom" }
  | { type: "ADD_YUKO"; side: "top" | "bottom" }
  | { type: "ADD_ADVANTAGE"; side: "top" | "bottom"; amount: number }
  | { type: "ADD_PENALTY"; side: "top" | "bottom"; amount: number }
  | { type: "ADD_WARNING"; side: "top" | "bottom"; amount: number }
  | { type: "START_STALLING"; side: "top" | "bottom" }
  | { type: "STOP_STALLING"; side: "top" | "bottom" }
  | { type: "TICK_STALLING" }
  | { type: "TICK_CLOCK" }
  | { type: "TICK_OSAEKOMI" }
  | { type: "TICK_STANDING_COUNT" }
  | { type: "SET_CLOCK"; seconds: number }
  | { type: "ADD_TIME"; seconds: number }
  | { type: "PLAY" }
  | { type: "PAUSE" }
  | { type: "SWITCH_SIDES" }
  | { type: "END_MATCH"; side: "top" | "bottom" | null; method: string }
  | { type: "UNDO" }
  | { type: "RESET" }
  | { type: "SET_DISCIPLINE"; discipline: string }
  | { type: "KNOCKDOWN"; side: "top" | "bottom" }
  | { type: "KNOCKDOWN_COUNT_DONE" }
  | { type: "ADD_FOUL"; side: "top" | "bottom"; foul: string }
  | { type: "OSAEKOMI_START" }
  | { type: "OSAEKOMI_STOP" }
  | { type: "DUO_SET_ROUND"; round: number }
  | { type: "DUO_SCORE"; side: "top" | "bottom"; techniqueIndex: number; score: number }
  | { type: "LOAD_STATE"; state: MatchState };

const initialState: MatchState = {
  top: { name: "Athlète Rouge", academy: "Académie", points: 0, advantages: 0, penalties: 0, color: "red" },
  bottom: { name: "Athlète Bleu", academy: "Académie", points: 0, advantages: 0, penalties: 0, color: "blue" },
  clock: { total: 300, remaining: 300, running: false, timerMode: "countdown", elapsed: 0 },
  stallingTop: { athleteKey: "top", remaining: 20, active: false },
  stallingBottom: { athleteKey: "bottom", remaining: 20, active: false },
  status: "idle",
  winner: { side: null, method: null },
  undoStack: [],
  matNumber: "1",
  division: "SCOREBOARD / JIU JITSU",
  discipline: "NEWAZA",
  ipponTop: 0, wazaariTop: 0, yukoTop: 0,
  ipponBottom: 0, wazaariBottom: 0, yukoBottom: 0,
  knockdownsTop: 0, knockdownsBottom: 0,
  foulsTop: [], foulsBottom: [],
  duoRound: 1,
  osaekomiSeconds: 0,
  osaekomiRunning: false,
  standingCount: 0,
  standingCountRunning: false,
};

function pushUndo(state: MatchState, action: ScoringAction): ScoringAction[] {
  return [...state.undoStack.slice(-19), action];
}

function reducer(state: MatchState, action: Action): MatchState {
  switch (action.type) {
    case "SET_ATHLETE": {
      const a2 = { ...state[action.side], [action.field]: action.value };
      return { ...state, [action.side]: a2 };
    }
    case "ADD_POINTS": {
      const a = { ...state[action.side], points: Math.max(0, state[action.side].points + action.amount) };
      const ua: ScoringAction = { type: "point", side: action.side, value: action.amount, timestamp: Date.now() };
      return { ...state, [action.side]: a, undoStack: pushUndo(state, ua) };
    }
    case "ADD_IPPON": {
      const key = action.side === "top" ? "ipponTop" : "ipponBottom";
      const a = { ...state[action.side], points: state[action.side].points + 3 };
      const ua: ScoringAction = { type: "ippon", side: action.side, value: 3, timestamp: Date.now() };
      return { ...state, [action.side]: a, [key]: (state[key] as number) + 1, undoStack: pushUndo(state, ua) };
    }
    case "ADD_WAZAARI": {
      const key = action.side === "top" ? "wazaariTop" : "wazaariBottom";
      const a = { ...state[action.side], points: state[action.side].points + 2 };
      const ua: ScoringAction = { type: "wazaari", side: action.side, value: 2, timestamp: Date.now() };
      return { ...state, [action.side]: a, [key]: (state[key] as number) + 1, undoStack: pushUndo(state, ua) };
    }
    case "ADD_YUKO": {
      const key = action.side === "top" ? "yukoTop" : "yukoBottom";
      const a = { ...state[action.side], points: state[action.side].points + 1 };
      const ua: ScoringAction = { type: "yuko", side: action.side, value: 1, timestamp: Date.now() };
      return { ...state, [action.side]: a, [key]: (state[key] as number) + 1, undoStack: pushUndo(state, ua) };
    }
    case "ADD_ADVANTAGE": {
      const a = { ...state[action.side], advantages: Math.max(0, state[action.side].advantages + action.amount) };
      const ua: ScoringAction = { type: "advantage", side: action.side, value: action.amount, timestamp: Date.now() };
      return { ...state, [action.side]: a, undoStack: pushUndo(state, ua) };
    }
    case "ADD_PENALTY": {
      const a = { ...state[action.side], penalties: Math.max(0, state[action.side].penalties + action.amount) };
      const ua: ScoringAction = { type: "penalty", side: action.side, value: action.amount, timestamp: Date.now() };
      return { ...state, [action.side]: a, undoStack: pushUndo(state, ua) };
    }
    case "ADD_WARNING": {
      const a = { ...state[action.side], penalties: Math.max(0, state[action.side].penalties + action.amount) };
      const ua: ScoringAction = { type: "penalty", side: action.side, value: action.amount, timestamp: Date.now() };
      return { ...state, [action.side]: a, undoStack: pushUndo(state, ua) };
    }
    case "START_STALLING":
      return action.side === "top"
        ? { ...state, stallingTop: { ...state.stallingTop, remaining: 20, active: true } }
        : { ...state, stallingBottom: { ...state.stallingBottom, remaining: 20, active: true } };
    case "STOP_STALLING":
      return action.side === "top"
        ? { ...state, stallingTop: { ...state.stallingTop, remaining: 20, active: false } }
        : { ...state, stallingBottom: { ...state.stallingBottom, remaining: 20, active: false } };
    case "TICK_STALLING": {
      const t = state.stallingTop.active ? { ...state.stallingTop, remaining: Math.max(0, state.stallingTop.remaining - 1), active: state.stallingTop.remaining > 1 } : state.stallingTop;
      const b = state.stallingBottom.active ? { ...state.stallingBottom, remaining: Math.max(0, state.stallingBottom.remaining - 1), active: state.stallingBottom.remaining > 1 } : state.stallingBottom;
      return { ...state, stallingTop: t, stallingBottom: b };
    }
    case "TICK_CLOCK": {
      if (!state.clock.running) return state;
      if (state.clock.timerMode === "countup") {
        const elapsed = state.clock.elapsed + 1;
        const done = elapsed >= state.clock.total;
        return { ...state, clock: { ...state.clock, elapsed, remaining: state.clock.total - elapsed, running: !done }, status: done ? "ended" : state.status };
      }
      if (state.clock.remaining <= 0) return { ...state, clock: { ...state.clock, running: false }, status: "ended" };
      const remaining = state.clock.remaining - 1;
      return { ...state, clock: { ...state.clock, remaining, running: remaining > 0 }, status: remaining > 0 ? state.status : "ended" };
    }
    case "TICK_OSAEKOMI":
      return state.osaekomiRunning ? { ...state, osaekomiSeconds: state.osaekomiSeconds + 1 } : state;
    case "TICK_STANDING_COUNT":
      if (!state.standingCountRunning) return state;
      if (state.standingCount <= 1) return { ...state, standingCount: 0, standingCountRunning: false };
      return { ...state, standingCount: state.standingCount - 1 };
    case "SET_CLOCK":
      return { ...state, clock: { total: action.seconds, remaining: action.seconds, running: false, timerMode: state.clock.timerMode, elapsed: 0 } };
    case "ADD_TIME":
      return { ...state, clock: { ...state.clock, remaining: state.clock.remaining + action.seconds, total: state.clock.total + action.seconds } };
    case "PLAY":
      return { ...state, clock: { ...state.clock, running: true }, status: "running" };
    case "PAUSE":
      return { ...state, clock: { ...state.clock, running: false }, status: "paused" };
    case "SWITCH_SIDES":
      return {
        ...state, top: state.bottom, bottom: state.top,
        stallingTop: state.stallingBottom, stallingBottom: state.stallingTop,
        ipponTop: state.ipponBottom, wazaariTop: state.wazaariBottom, yukoTop: state.yukoBottom,
        ipponBottom: state.ipponTop, wazaariBottom: state.wazaariTop, yukoBottom: state.yukoTop,
        knockdownsTop: state.knockdownsBottom, knockdownsBottom: state.knockdownsTop,
        foulsTop: state.foulsBottom, foulsBottom: state.foulsTop,
      };
    case "END_MATCH":
      return { ...state, status: "ended", clock: { ...state.clock, running: false }, winner: { side: action.side, method: action.method } };
    case "UNDO": {
      if (state.undoStack.length === 0) return state;
      const last = state.undoStack[state.undoStack.length - 1];
      const newStack = state.undoStack.slice(0, -1);
      const side = last.side;
      const athlete = state[side];
      let updates: Partial<MatchState> = { undoStack: newStack };
      if (last.type === "point") {
        updates[side] = { ...athlete, points: Math.max(0, athlete.points - last.value) };
      } else if (last.type === "advantage") {
        updates[side] = { ...athlete, advantages: Math.max(0, athlete.advantages - last.value) };
      } else if (last.type === "penalty") {
        updates[side] = { ...athlete, penalties: Math.max(0, athlete.penalties - last.value) };
      } else if (last.type === "ippon") {
        const key = side === "top" ? "ipponTop" : "ipponBottom";
        updates[side] = { ...athlete, points: Math.max(0, athlete.points - 3) };
        updates[key] = Math.max(0, (state[key] as number) - 1);
      } else if (last.type === "wazaari") {
        const key = side === "top" ? "wazaariTop" : "wazaariBottom";
        updates[side] = { ...athlete, points: Math.max(0, athlete.points - 2) };
        updates[key] = Math.max(0, (state[key] as number) - 1);
      } else if (last.type === "yuko") {
        const key = side === "top" ? "yukoTop" : "yukoBottom";
        updates[side] = { ...athlete, points: Math.max(0, athlete.points - 1) };
        updates[key] = Math.max(0, (state[key] as number) - 1);
      } else if (last.type === "knockdown") {
        const key = side === "top" ? "knockdownsTop" : "knockdownsBottom";
        updates[key] = Math.max(0, (state[key] as number) - 1);
      } else if (last.type === "foul") {
        const fKey = side === "top" ? "foulsTop" : "foulsBottom";
        updates[fKey] = (state[fKey] as string[]).slice(0, -1);
        updates[side] = { ...athlete, penalties: Math.max(0, athlete.penalties - 1) };
      } else if (last.type === "duo_score") {
        updates[side] = { ...athlete, points: Math.max(0, athlete.points - last.value) };
      }
      return { ...state, ...updates };
    }
    case "RESET":
      return {
        ...initialState,
        discipline: state.discipline,
        top: { ...initialState.top, name: state.top.name, academy: state.top.academy },
        bottom: { ...initialState.bottom, name: state.bottom.name, academy: state.bottom.academy },
      };
    case "SET_DISCIPLINE":
      return { ...state, discipline: action.discipline };
    case "KNOCKDOWN": {
      const key = action.side === "top" ? "knockdownsTop" : "knockdownsBottom";
      const ua: ScoringAction = { type: "knockdown", side: action.side, value: 1, timestamp: Date.now() };
      return { ...state, [key]: (state[key] as number) + 1, standingCount: 8, standingCountRunning: true, undoStack: pushUndo(state, ua) };
    }
    case "KNOCKDOWN_COUNT_DONE":
      return { ...state, standingCountRunning: false, standingCount: 0 };
    case "ADD_FOUL": {
      const fKey = action.side === "top" ? "foulsTop" : "foulsBottom";
      const a = { ...state[action.side], penalties: state[action.side].penalties + 1 };
      const ua: ScoringAction = { type: "foul", side: action.side, value: 1, timestamp: Date.now(), label: action.foul };
      return { ...state, [action.side]: a, [fKey]: [...(state[fKey] as string[]), action.foul], undoStack: pushUndo(state, ua) };
    }
    case "OSAEKOMI_START":
      return { ...state, osaekomiSeconds: 0, osaekomiRunning: true };
    case "OSAEKOMI_STOP":
      return { ...state, osaekomiRunning: false };
    case "DUO_SET_ROUND":
      return { ...state, duoRound: action.round };
    case "DUO_SCORE": {
      const a = { ...state[action.side], points: state[action.side].points + action.score };
      const ua: ScoringAction = { type: "duo_score", side: action.side, value: action.score, timestamp: Date.now() };
      return { ...state, [action.side]: a, undoStack: pushUndo(state, ua) };
    }
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
  const osaekomiRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const standingRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  // Osaekomi tick
  useEffect(() => {
    if (state.osaekomiRunning) {
      osaekomiRef.current = setInterval(() => dispatch({ type: "TICK_OSAEKOMI" }), 1000);
    }
    return () => { if (osaekomiRef.current) clearInterval(osaekomiRef.current); };
  }, [state.osaekomiRunning]);

  // Standing count tick
  useEffect(() => {
    if (state.standingCountRunning) {
      standingRef.current = setInterval(() => dispatch({ type: "TICK_STANDING_COUNT" }), 1000);
    }
    return () => { if (standingRef.current) clearInterval(standingRef.current); };
  }, [state.standingCountRunning]);

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
