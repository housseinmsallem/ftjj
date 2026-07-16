import React from "react";
import type { Athlete } from "../../types";

interface Props {
  athletes: Athlete[];
  onAthleteClick?: (athlete: Athlete) => void;
}

export default function ClubAthletesTable({ athletes, onAthleteClick }: Props) {
  return (
    <div className="card">
      <strong>ClubAthletesTable</strong>
    </div>
  );
}
