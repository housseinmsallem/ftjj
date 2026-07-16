import React from "react";
import type { ClubRef } from "../../types";

interface Props {
  club: ClubRef;
  onClick?: (club: ClubRef) => void;
}

export default function ClubCard({ club, onClick }: Props) {
  return (
    <div className="card">
      <strong>ClubCard</strong>
    </div>
  );
}
