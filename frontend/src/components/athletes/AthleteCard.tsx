import React from "react";
import type { Athlete } from "../../types";

interface Props {
  athlete: Athlete;
  onClick?: (athlete: Athlete) => void;
}

export default function AthleteCard({ athlete, onClick }: Props) {
  return (
    <div className="card">
      <strong>AthleteCard</strong>
    </div>
  );
}
