import React from "react";
import type { Athlete } from "../../types";

interface Props {
  athlete: Athlete;
  onEdit?: () => void;
}

export default function AthleteProfileHeader({ athlete, onEdit }: Props) {
  return (
    <div className="card">
      <strong>AthleteProfileHeader</strong>
    </div>
  );
}
