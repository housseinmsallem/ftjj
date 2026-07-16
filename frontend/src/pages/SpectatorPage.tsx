import React, { useEffect, useState } from "react";
import { ScoringProvider, useScoring, MatchState } from "../context/ScoringContext";
import PublicScoreboard from "../components/scoring/PublicScoreboard";
import { io, Socket } from "socket.io-client";

// Read-only spectator that syncs via localStorage polling (for same-origin windows)
function SpectatorContent() {
  const { dispatch } = useScoring();
  const [extState, setExtState] = useState<MatchState | null>(null);

  // Poll localStorage for state updates from the referee window
  useEffect(() => {
    const interval = setInterval(() => {
      try {
        const stored = localStorage.getItem("scoring_state");
        if (stored) {
          const parsed = JSON.parse(stored) as MatchState;
          setExtState(parsed);
          dispatch({ type: "LOAD_STATE", state: parsed });
        }
      } catch {}
    }, 500);
    return () => clearInterval(interval);
  }, [dispatch]);

  return <PublicScoreboard />;
}

export default function SpectatorPage(): React.ReactElement {
  return (
    <ScoringProvider>
      <SpectatorContent />
    </ScoringProvider>
  );
}
