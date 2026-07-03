import React, { useMemo, useState } from "react";
import { ExportLicence } from "../licences/exportLicence";
import LicensePrintWrapper from "../licences/LicensePrintWrapper";
export default function SmartTable({
  columns,
  rows = [],
  title,
  actions,
  showExportLicence = false,
}) {
  const [q, setQ] = useState("");
  const filtered = useMemo(
    () =>
      rows.filter((r) =>
        JSON.stringify(r).toLowerCase().includes(q.toLowerCase()),
      ),
    [rows, q],
  );
  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <h2>{title}</h2>
          <small>{filtered.length} résultat(s)</small>
        </div>
        <div className="table-tools">
          <input
            placeholder="Recherche..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          {actions}
        </div>
      </div>
      <div className="table-wrap">
        <table className="smart-table">
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c.key}>{c.label}</th>
              ))}
              {showExportLicence && <th>Licence</th>}
            </tr>
          </thead>
          <tbody>
            {filtered.map((row, i) => (
              <tr key={row._id || i}>
                {columns.map((c) => (
                  <td key={c.key}>
                    {c.render ? c.render(row, i) : row[c.key]}
                  </td>
                ))}
                {showExportLicence && (
                  <td>
                    {row.licenseStatus === "ACTIVE" || row.ownerType ? (
                      row.ownerType ? (
                        <LicensePrintWrapper licenseRow={row} />
                      ) : (
                        <ExportLicence holderData={row} />
                      )
                    ) : (
                      <span style={{ color: "#9ca3af", fontSize: "0.75rem" }}>
                        —
                      </span>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
