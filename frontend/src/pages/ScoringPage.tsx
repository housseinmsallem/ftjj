import React from "react";
import { ScoringProvider } from "../context/ScoringContext";
import RefereeControl from "../components/scoring/RefereeControl";

export default function ScoringPage(): React.ReactElement {
  return (
    <ScoringProvider>
      <RefereeControl />
    </ScoringProvider>
  );
}
