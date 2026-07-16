import React from "react";

interface StatusBadgeProps {
  status: string;
}

const statusStyles: Record<string, { bg: string; label: string }> = {
  PENDING: { bg: "#e4c32820", label: "En attente" },
  APPROVED: { bg: "#22c55e20", label: "Approuvé" },
  REJECTED: { bg: "#d5133220", label: "Refusé" },
  CONFIRMED: { bg: "#22c55e20", label: "Confirmé" },
  ACTIVE: { bg: "#22c55e20", label: "Actif" },
  INACTIVE: { bg: "#ffffff20", label: "Inactif" },
  UPCOMING: { bg: "#e4c32820", label: "À venir" },
  LIVE: { bg: "#d5133220", label: "En direct" },
  FINISHED: { bg: "#22c55e20", label: "Terminé" },
  EXPIRED: { bg: "#ffffff20", label: "Expiré" },
};

export default function StatusBadge({ status }: StatusBadgeProps) {
  const style = statusStyles[status] || { bg: "#ffffff20", label: status };
  return (
    <span
      className="badge"
      style={{
        background: style.bg,
        color: style.bg.includes("d51332") ? "#d51332" : style.bg.includes("e4c328") ? "#e4c328" : style.bg.includes("22c55e") ? "#22c55e" : "var(--text)",
        padding: "2px 10px",
        borderRadius: "12px",
        fontSize: "0.8rem",
        fontWeight: 600,
      }}
    >
      {style.label}
    </span>
  );
}
