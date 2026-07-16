import { useState, useEffect, useCallback, useRef, type Dispatch, type SetStateAction } from "react";
import { io, Socket } from "socket.io-client";
import { scoringApi } from "../services/api";
import type { ScoringSession, ScoreAction } from "../types";

const SOCKET_URL: string = (
  (import.meta.env.VITE_API_URL as string) || "http://localhost:5000/api"
).replace("/api", "");

export interface UseScoringReturn {
  session: ScoringSession | null;
  loading: boolean;
  error: string | null;
  loadSession: (id: string) => Promise<ScoringSession | null>;
  setSession: Dispatch<SetStateAction<ScoringSession | null>>;

  // Timer
  timerRunning: boolean;
  startLocalTimer: () => void;
  pauseLocalTimer: () => void;
  resetLocalTimer: () => void;

  // State checks
  isLive: boolean;
  isPaused: boolean;
  isFinished: boolean;
  isValidated: boolean;
  isControlledBy: (userId: string) => boolean;
  isWaiting: boolean;

  // Actions
  startSession: () => Promise<ScoringSession | undefined>;
  pauseSession: () => Promise<ScoringSession | undefined>;
  resumeSession: () => Promise<ScoringSession | undefined>;
  sendAction: (action: ScoreAction) => Promise<ScoringSession | undefined>;
  addPoints: (side: "red" | "blue", points: number) => Promise<ScoringSession | undefined>;
  addAdvantage: (side: "red" | "blue", value?: number) => Promise<ScoringSession | undefined>;
  addPenalty: (side: "red" | "blue", value?: number) => Promise<ScoringSession | undefined>;
  addStalling: (side: "red" | "blue", value?: number) => Promise<ScoringSession | undefined>;
  addWarning: (side: "red" | "blue", reason?: string) => Promise<ScoringSession | undefined>;
  addDisqualification: (side: "red" | "blue") => Promise<ScoringSession | undefined>;
  finishSession: (winnerSide?: string | null, winMethod?: string | null) => Promise<ScoringSession | undefined>;
  validateSession: () => Promise<ScoringSession | undefined>;
  undoLastAction: () => Promise<ScoringSession | undefined>;

  // Raw API
  api: typeof scoringApi;
}

export default function useScoring(
  sessionId: string | null = null,
  fightId: string | null = null,
): UseScoringReturn {
  const [session, setSession] = useState<ScoringSession | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);

  // Load session from API
  const loadSession = useCallback(
    async (id: string): Promise<ScoringSession | null> => {
      if (!id) return null;
      setLoading(true);
      setError(null);
      try {
        const data: ScoringSession = await scoringApi.getSession(id);
        setSession(data);
        return data;
      } catch (err: unknown) {
        const message =
          (err as { response?: { data?: { message?: string } } })?.response?.data
            ?.message || "Failed to load session";
        setError(message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  // Connect to WebSocket for real-time updates
  useEffect(() => {
    const sock: Socket = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socketRef.current = sock;

    if (fightId) {
      sock.emit("scoring:join", { fightId });
    }

    sock.on("scoring:update", (updatedSession: ScoringSession) => {
      setSession((prev) => {
        if (prev && prev._id === updatedSession._id) {
          return { ...prev, ...updatedSession };
        }
        return prev;
      });
    });

    sock.on("scoring:validated", (validatedSession: ScoringSession) => {
      setSession((prev) => {
        if (prev && prev._id === validatedSession._id) {
          return { ...prev, ...validatedSession };
        }
        return prev;
      });
    });

    return () => {
      sock.removeAllListeners();
      if (sock.connected) {
        if (fightId) {
          sock.emit("scoring:leave", { fightId });
        }
        sock.disconnect();
      }
    };
  }, [fightId]);

  // Load initial session
  useEffect(() => {
    if (sessionId) {
      loadSession(sessionId);
    }
  }, [sessionId, loadSession]);

  // Timer management
  const [timerRunning, setTimerRunning] = useState<boolean>(false);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startLocalTimer = useCallback(() => {
    setTimerRunning(true);
  }, []);

  const pauseLocalTimer = useCallback(() => {
    setTimerRunning(false);
  }, []);

  const resetLocalTimer = useCallback(() => {
    setTimerRunning(false);
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  }, []);

  // Local timer tick
  useEffect(() => {
    if (
      timerRunning &&
      session &&
      session.timerState === "running" &&
      session.remainingSeconds > 0
    ) {
      timerIntervalRef.current = setInterval(() => {
        setSession((prev) => {
          if (!prev || prev.remainingSeconds <= 0) {
            setTimerRunning(false);
            return prev;
          }
          return { ...prev, remainingSeconds: prev.remainingSeconds - 1 };
        });
      }, 1000);
    } else {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    }

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [timerRunning, session?.timerState, session?.remainingSeconds]);

  // Cleanup on unmount
  useEffect(() => {
    return () => resetLocalTimer();
  }, [resetLocalTimer]);

  // Scoring actions
  const startSession = useCallback(async (): Promise<ScoringSession | undefined> => {
    if (!session?._id) return;
    try {
      setError(null);
      const updated: ScoringSession = await scoringApi.startSession(session._id);
      setSession(updated);
      startLocalTimer();
      return updated;
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Failed to start";
      setError(message);
    }
  }, [session?._id, startLocalTimer]);

  const pauseSession = useCallback(async (): Promise<ScoringSession | undefined> => {
    if (!session?._id) return;
    try {
      setError(null);
      const updated: ScoringSession = await scoringApi.pauseSession(session._id);
      setSession(updated);
      pauseLocalTimer();
      return updated;
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Failed to pause";
      setError(message);
    }
  }, [session?._id, pauseLocalTimer]);

  const resumeSession = useCallback(async (): Promise<ScoringSession | undefined> => {
    if (!session?._id) return;
    try {
      setError(null);
      const updated: ScoringSession = await scoringApi.resumeSession(session._id);
      setSession(updated);
      startLocalTimer();
      return updated;
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Failed to resume";
      setError(message);
    }
  }, [session?._id, startLocalTimer]);

  const sendAction = useCallback(
    async (action: ScoreAction): Promise<ScoringSession | undefined> => {
      if (!session?._id) return;
      try {
        setError(null);
        const updated: ScoringSession = await scoringApi.sendAction(session._id, action);
        setSession(updated);
        return updated;
      } catch (err: unknown) {
        const message =
          (err as { response?: { data?: { message?: string } } })?.response?.data
            ?.message || "Failed to send action";
        setError(message);
      }
    },
    [session?._id],
  );

  const addPoints = useCallback(
    async (side: "red" | "blue", points: number): Promise<ScoringSession | undefined> => {
      return sendAction({ side, type: "points", value: points });
    },
    [sendAction],
  );

  const addAdvantage = useCallback(
    async (side: "red" | "blue", value: number = 1): Promise<ScoringSession | undefined> => {
      return sendAction({ side, type: "advantage", value });
    },
    [sendAction],
  );

  const addPenalty = useCallback(
    async (side: "red" | "blue", value: number = 1): Promise<ScoringSession | undefined> => {
      return sendAction({ side, type: "penalty", value });
    },
    [sendAction],
  );

  const addStalling = useCallback(
    async (side: "red" | "blue", value: number = 1): Promise<ScoringSession | undefined> => {
      return sendAction({ side, type: "stalling", value });
    },
    [sendAction],
  );

  const addWarning = useCallback(
    async (side: "red" | "blue", reason: string = ""): Promise<ScoringSession | undefined> => {
      return sendAction({ side, type: "warning", value: 1, reason });
    },
    [sendAction],
  );

  const addDisqualification = useCallback(
    async (side: "red" | "blue"): Promise<ScoringSession | undefined> => {
      return sendAction({ side, type: "disqualification", value: 1 });
    },
    [sendAction],
  );

  const finishSession = useCallback(
    async (
      winnerSide: string | null = null,
      winMethod: string | null = null,
    ): Promise<ScoringSession | undefined> => {
      if (!session?._id) return;
      try {
        setError(null);
        const updated: ScoringSession = await scoringApi.finishSession(session._id, {
          winnerSide,
          winMethod,
        });
        setSession(updated);
        resetLocalTimer();
        return updated;
      } catch (err: unknown) {
        const message =
          (err as { response?: { data?: { message?: string } } })?.response?.data
            ?.message || "Failed to finish";
        setError(message);
      }
    },
    [session?._id, resetLocalTimer],
  );

  const validateSession = useCallback(async (): Promise<ScoringSession | undefined> => {
    if (!session?._id) return;
    try {
      setError(null);
      const updated: ScoringSession = await scoringApi.validateSession(session._id);
      setSession(updated);
      return updated;
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Failed to validate";
      setError(message);
    }
  }, [session?._id]);

  const undoLastAction = useCallback(async (): Promise<ScoringSession | undefined> => {
    if (!session?._id) return;
    try {
      setError(null);
      const updated: ScoringSession = await scoringApi.undoAction(session._id);
      setSession(updated);
      return updated;
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Failed to undo";
      setError(message);
    }
  }, [session?._id]);

  const isControlledBy = useCallback(
    (userId: string): boolean => {
      if (!session || !userId) return false;
      const controlledById =
        (session.controlledBy as { _id?: string })?._id || session.controlledBy;
      return String(controlledById) === String(userId);
    },
    [session],
  );

  const isLive: boolean =
    session?.status === "live" || session?.timerState === "running";
  const isPaused: boolean =
    session?.status === "paused" || session?.timerState === "paused";
  const isFinished: boolean =
    session?.status === "finished" || session?.timerState === "finished";
  const isValidated: boolean = session?.status === "validated";

  return {
    session,
    loading,
    error,
    loadSession,
    setSession,

    // Timer
    timerRunning,
    startLocalTimer,
    pauseLocalTimer,
    resetLocalTimer,

    // State checks
    isLive,
    isPaused,
    isFinished,
    isValidated,
    isControlledBy,

    // Wait state (before start)
    isWaiting:
      session?.status === "waiting" && session?.timerState === "idle",

    // Actions
    startSession,
    pauseSession,
    resumeSession,
    sendAction,
    addPoints,
    addAdvantage,
    addPenalty,
    addStalling,
    addWarning,
    addDisqualification,
    finishSession,
    validateSession,
    undoLastAction,

    // Raw API
    api: scoringApi,
  };
}
