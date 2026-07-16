import React from "react";

interface Registration {
  status?: string;
  [key: string]: unknown;
}

interface Props {
  registrations?: Registration[];
  statusFilter: string;
  onStatusFilterChange?: (value: string) => void;
  onValidateAll?: () => void;
  busy?: boolean;
}

const pendingStatuses = ["submitted", "pending_validation", "modified"];

export default function RegistrationValidationPanel({
  registrations = [],
  statusFilter,
  onStatusFilterChange,
  onValidateAll,
  busy = false,
}: Props) {
  const pending = registrations.filter((reg) =>
    pendingStatuses.includes(reg.status || ""),
  ).length;
  const approved = registrations.filter((reg) => reg.status === "approved").length;
  const rejected = registrations.filter((reg) => reg.status === "rejected").length;

  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <h2>Validation fédérale</h2>
          <small>
            {pending} en attente · {approved} approuvées · {rejected} refusées
          </small>
        </div>
        <div className="table-row-actions">
          <select
            value={statusFilter}
            onChange={(e) => onStatusFilterChange?.(e.target.value)}
          >
            <option value="all">Toutes</option>
            <option value="submitted">Soumises</option>
            <option value="pending_validation">En attente</option>
            <option value="modified">Modifiées</option>
            <option value="approved">Approuvées</option>
            <option value="rejected">Refusées</option>
          </select>
          <button
            type="button"
            className="primary"
            disabled={busy || pending === 0}
            onClick={onValidateAll}
          >
            Valider toutes les inscriptions
          </button>
        </div>
      </div>
      {pending > 0 && (
        <p className="notice">
          {pending} inscription(s) en attente de validation fédérale.
        </p>
      )}
    </section>
  );
}
