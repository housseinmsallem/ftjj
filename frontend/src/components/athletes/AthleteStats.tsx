import React from "react";
import type { Athlete } from "../../types";

interface Props {
  athlete: Athlete;
}

export default function AthleteStats({ athlete }: Props) {
  return (
    <div className="card">
      <strong>AthleteStats</strong>
    </div>
  );
}
