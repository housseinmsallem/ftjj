import React from "react";
import type { Athlete } from "../../types";

interface Props {
  athlete: Athlete;
  results?: Array<{
    id: string;
    competition: string;
    date: string;
    result: string;
    position?: number;
  }>;
}

export default function AthleteResultsTable({ athlete, results = [] }: Props) {
  return (
    <div className="card">
      <strong>AthleteResultsTable</strong>
    </div>
  );
}
