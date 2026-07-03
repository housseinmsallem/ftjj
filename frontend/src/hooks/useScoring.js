import { useState, useEffect, useCallback, useRef } from "react";
import { io } from "socket.io-client";
import { scoringApi } from "../services/api";

const SOCKET_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000/api"
).replace("/api", "");

export default function useScoring(sessionId = null, fightId = null) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const socketRef = useRef(null);

  // Load session from API
  const loadSession = useCallback(async (id) => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await scoringApi.getSession(id);
      setSession(data);
      return data;
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load session");
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Connect to WebSocket for real-time updates
  useEffect(() => {
    const sock = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socketRef.current = sock;

    if (fightId) {
      sock.emit("scoring:join", { fightId });
    }

    sock.on("scoring:update", (updatedSession) => {
      setSession((prev) => {
        if (prev && prev._id === updatedSession._id) {
          return { ...prev, ...updatedSession };
        }
        return prev;
      });
    });

    sock.on("scoring:validated", (validatedSession) => {
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
  const [timerRunning, setTimerRunning] = useState(false);
  const timerIntervalRef = useRef(null);

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
  const startSession = useCallback(async () => {
    if (!session?._id) return;
    try {
      setError(null);
      const updated = await scoringApi.startSession(session._id);
      setSession(updated);
      startLocalTimer();
      return updated;
    } catch (err) {
      setError(err.response?.data?.message || "Failed to start");
    }
  }, [session?._id, startLocalTimer]);

  const pauseSession = useCallback(async () => {
    if (!session?._id) return;
    try {
      setError(null);
      const updated = await scoringApi.pauseSession(session._id);
      setSession(updated);
      pauseLocalTimer();
      return updated;
    } catch (err) {
      setError(err.response?.data?.message || "Failed to pause");
    }
  }, [session?._id, pauseLocalTimer]);

  const resumeSession = useCallback(async () => {
    if (!session?._id) return;
    try {
      setError(null);
      const updated = await scoringApi.resumeSession(session._id);
      setSession(updated);
      startLocalTimer();
      return updated;
    } catch (err) {
      setError(err.response?.data?.message || "Failed to resume");
    }
  }, [session?._id, startLocalTimer]);

  const sendAction = useCallback(
    async (action) => {
      if (!session?._id) return;
      try {
        setError(null);
        const updated = await scoringApi.sendAction(session._id, action);
        setSession(updated);
        return updated;
      } catch (err) {
        setError(err.response?.data?.message || "Failed to send action");
      }
    },
    [session?._id],
  );

  const addPoints = useCallback(
    async (side, points) => {
      return sendAction({ side, type: "points", value: points });
    },
    [sendAction],
  );

  const addAdvantage = useCallback(
    async (side, value = 1) => {
      return sendAction({ side, type: "advantage", value });
    },
    [sendAction],
  );

  const addPenalty = useCallback(
    async (side, value = 1) => {
      return sendAction({ side, type: "penalty", value });
    },
    [sendAction],
  );

  const addStalling = useCallback(
    async (side, value = 1) => {
      return sendAction({ side, type: "stalling", value });
    },
    [sendAction],
  );

  const addWarning = useCallback(
    async (side, reason = "") => {
      return sendAction({ side, type: "warning", value: 1, reason });
    },
    [sendAction],
  );

  const addDisqualification = useCallback(
    async (side) => {
      return sendAction({ side, type: "disqualification", value: 1 });
    },
    [sendAction],
  );

  const finishSession = useCallback(
    async (winnerSide = null, winMethod = null) => {
      if (!session?._id) return;
      try {
        setError(null);
        const updated = await scoringApi.finishSession(session._id, {
          winnerSide,
          winMethod,
        });
        setSession(updated);
        resetLocalTimer();
        return updated;
      } catch (err) {
        setError(err.response?.data?.message || "Failed to finish");
      }
    },
    [session?._id, resetLocalTimer],
  );

  const validateSession = useCallback(async () => {
    if (!session?._id) return;
    try {
      setError(null);
      const updated = await scoringApi.validateSession(session._id);
      setSession(updated);
      return updated;
    } catch (err) {
      setError(err.response?.data?.message || "Failed to validate");
    }
  }, [session?._id]);

  const undoLastAction = useCallback(async () => {
    if (!session?._id) return;
    try {
      setError(null);
      const updated = await scoringApi.undoAction(session._id);
      setSession(updated);
      return updated;
    } catch (err) {
      setError(err.response?.data?.message || "Failed to undo");
    }
  }, [session?._id]);

  const isControlledBy = useCallback(
    (userId) => {
      if (!session || !userId) return false;
      const controlledById = session.controlledBy?._id || session.controlledBy;
      return String(controlledById) === String(userId);
    },
    [session],
  );

  const isLive =
    session?.status === "live" || session?.timerState === "running";
  const isPaused =
    session?.status === "paused" || session?.timerState === "paused";
  const isFinished =
    session?.status === "finished" || session?.timerState === "finished";
  const isValidated = session?.status === "validated";

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
    isWaiting: session?.status === "waiting" && session?.timerState === "idle",

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
