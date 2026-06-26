import React from "react";
import SmartTable from "../ui/SmartTable";
import CompetitionStatusBadge from "./CompetitionStatusBadge";

function athleteName(reg) {
  if (reg.athleteId?.firstName) {
    return `${reg.athleteId.firstName} ${reg.athleteId.lastName}`;
  }
  if (reg.firstName) return `${reg.firstName} ${reg.lastName || ""}`.trim();
  return "—";
}

function clubName(reg) {
  return reg.clubId?.name || reg.clubId || "—";
}

export default function RegistrationTable({
  registrations = [],
  statusFilter = "all",
  onApprove,
  onReject,
}) {
  const filtered =
    statusFilter === "all"
      ? registrations
      : registrations.filter((reg) => reg.status === statusFilter);

  const columns = [
    {
      key: "athlete",
      label: "Athlète",
      render: (row) => athleteName(row),
    },
    {
      key: "club",
      label: "Club",
      render: (row) => clubName(row),
    },
    { key: "discipline", label: "Discipline" },
    { key: "belt", label: "Grade" },
    {
      key: "weight",
      label: "Poids",
      render: (row) =>
        row.weightDeclared ? `${row.weightDeclared} kg` : "—",
    },
    { key: "weightCategory", label: "Cat. poids" },
    { key: "ageCategory", label: "Cat. âge" },
    {
      key: "status",
      label: "Statut",
      render: (row) => <CompetitionStatusBadge status={row.status} />,
    },
    {
      key: "actions",
      label: "Actions",
      render: (row) =>
        ["submitted", "pending_validation", "modified"].includes(row.status) ? (
          <div className="table-row-actions">
            <button
              type="button"
              className="primary"
              onClick={() => onApprove?.(row)}
            >
              Approuver
            </button>
            <button
              type="button"
              className="ghost danger"
              onClick={() => onReject?.(row)}
            >
              Refuser
            </button>
          </div>
        ) : (
          "—"
        ),
    },
  ];

  return (
    <SmartTable
      title="Inscriptions"
      rows={filtered}
      columns={columns}
    />
  );
}
