import React from "react";
import SmartTable from "../ui/SmartTable";
import CompetitionStatusBadge from "./CompetitionStatusBadge";

interface Registration {
  _id?: string;
  athleteId?: {
    firstName?: string;
    lastName?: string;
  };
  firstName?: string;
  lastName?: string;
  clubId?:
    | {
        name?: string;
      }
    | string;
  discipline?: string;
  belt?: string;
  weightDeclared?: number;
  weightCategory?: string;
  ageCategory?: string;
  status?: string;
}

interface Props {
  registrations?: Registration[];
  statusFilter?: string;
  onApprove?: (row: Registration) => void;
  onReject?: (row: Registration) => void;
}

function athleteName(reg: Registration): string {
  if (reg.athleteId?.firstName) {
    return `${reg.athleteId.firstName} ${reg.athleteId.lastName}`;
  }
  if (reg.firstName) return `${reg.firstName} ${reg.lastName || ""}`.trim();
  return "—";
}

function clubName(reg: Registration): string {
  if (typeof reg.clubId === "object" && reg.clubId !== null) {
    return reg.clubId.name || "—";
  }
  return reg.clubId ? String(reg.clubId) : "—";
}

export default function RegistrationTable({
  registrations = [],
  statusFilter = "all",
  onApprove,
  onReject,
}: Props) {
  const filtered =
    statusFilter === "all"
      ? registrations
      : registrations.filter((reg) => reg.status === statusFilter);

  const columns = [
    {
      key: "athlete",
      label: "Athlète",
      render: (row: Registration) => athleteName(row),
    },
    {
      key: "club",
      label: "Club",
      render: (row: Registration) => clubName(row),
    },
    { key: "discipline", label: "Discipline" },
    { key: "belt", label: "Grade" },
    {
      key: "weight",
      label: "Poids",
      render: (row: Registration) =>
        row.weightDeclared ? `${row.weightDeclared} kg` : "—",
    },
    { key: "weightCategory", label: "Cat. poids" },
    { key: "ageCategory", label: "Cat. âge" },
    {
      key: "status",
      label: "Statut",
      render: (row: Registration) => (
        <CompetitionStatusBadge status={row.status} />
      ),
    },
    {
      key: "actions",
      label: "Actions",
      render: (row: Registration) =>
        ["submitted", "pending_validation", "modified"].includes(
          row.status || "",
        ) ? (
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
      rows={filtered as unknown as Record<string, unknown>[]}
      columns={columns}
    />
  );
}
