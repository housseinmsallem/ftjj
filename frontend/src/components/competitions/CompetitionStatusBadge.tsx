import React from "react";

interface Props {
  status?: string;
}

const statusLabels: Record<string, string> = {
  draft: "Brouillon",
  submitted: "Soumise",
  pending_validation: "En attente",
  modified: "Modifiée",
  approved: "Approuvée",
  rejected: "Refusée",
  generated: "Généré",
  needs_review: "Revue requise",
  locked: "Verrouillé",
  published: "Publié",
  registration_open: "Inscriptions ouvertes",
  ready_for_brackets: "Prêt pour tableaux",
  brackets_generated: "Tableaux générés",
  live: "En direct",
  finished: "Terminée",
};

export default function CompetitionStatusBadge({ status }: Props) {
  if (!status) return null;
  const label = statusLabels[status] || status;
  const tone = ["approved", "published", "generated", "live"].includes(status)
    ? "success"
    : ["rejected", "needs_review"].includes(status)
      ? "warning"
      : ["locked", "pending_validation", "submitted"].includes(status)
        ? "info"
        : "neutral";
  return <span className={`status-badge status-${tone}`}>{label}</span>;
}
