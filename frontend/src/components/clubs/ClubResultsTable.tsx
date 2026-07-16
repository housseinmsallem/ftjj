import React from "react";
import type { ClubRef } from "../../types";

interface Props {
  club: ClubRef;
  results?: Array<{
    id: string;
    competition: string;
    date: string;
    athletes: number;
    medals?: { gold: number; silver: number; bronze: number };
  }>;
}

export default function ClubResultsTable({ club, results = [] }: Props) {
  return (
    <div className="card">
      <strong>ClubResultsTable</strong>
    </div>
  );
}
