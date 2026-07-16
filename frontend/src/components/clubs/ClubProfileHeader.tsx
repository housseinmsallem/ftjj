import React from "react";
import type { ClubRef } from "../../types";

interface Props {
  club: ClubRef;
  onEdit?: () => void;
}

export default function ClubProfileHeader({ club, onEdit }: Props) {
  return (
    <div className="card">
      <strong>ClubProfileHeader</strong>
    </div>
  );
}
