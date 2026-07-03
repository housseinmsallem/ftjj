import React, { useEffect, useState } from "react";
import AdminLayout from "../../components/layout/AdminLayout";
import api from "../../services/api";

const STATUS_LABELS = {
  draft: "Brouillon",
  submitted: "Soumise",
  pending_validation: "En validation",
  approved: "Approuvée",
  rejected: "Rejetée",
  modified: "Modifiée",
};

const STATUS_COLORS = {
  draft: "#9ca3af",
  submitted: "#3b82f6",
  pending_validation: "#f59e0b",
  approved: "#10b981",
  rejected: "#ef4444",
  modified: "#8b5cf6",
};

const DISCIPLINE_LABELS = {
  NEWAZA: "Ne-Waza",
  FIGHTING: "Fighting",
  FULL_CONTACT: "Full Contact",
  DUO: "Duo",
};

function Badge({ label, color }) {
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 10px",
        borderRadius: "12px",
        fontSize: "0.8rem",
        fontWeight: 600,
        background: `${color}22`,
        color,
        border: `1px solid ${color}44`,
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  );
}

export default function AdminRegistrations() {
  const [registrations, setRegistrations] = useState([]);
  const [competitions, setCompetitions] = useState([]);
  const [filterStatus, setFilterStatus] = useState("");
  const [filterCompetition, setFilterCompetition] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [processingIds, setProcessingIds] = useState(new Set());

  async function load() {
    setLoading(true);
    try {
      const [regRes, compRes] = await Promise.all([
        api.get("/registrations"),
        api.get("/competitions"),
      ]);
      const regData = Array.isArray(regRes.data)
        ? regRes.data
        : regRes.data?.data || [];
      const compData = Array.isArray(compRes.data)
        ? compRes.data
        : compRes.data?.data || [];
      setRegistrations(regData);
      setCompetitions(compData);
    } catch {
      setMessage("Erreur de chargement des inscriptions.");
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleDecision(regId, action) {
    if (processingIds.has(regId)) return;

    let comment;
    if (action === "reject") {
      comment = prompt("Motif du rejet :");
      if (!comment || !comment.trim()) return;
    }

    setProcessingIds((prev) => new Set(prev).add(regId));
    setMessage("");

    try {
      const { data } = await api.patch(
        `/competitions/registrations/${regId}/${action}`,
        { comment: comment?.trim() }
      );
      setMessage(
        data.message ||
          `Inscription ${action === "approve" ? "approuvée" : "rejetée"}.`
      );
      await load();
    } catch (err) {
      setMessage(
        err.response?.data?.message || "Erreur lors de la décision."
      );
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(regId);
        return next;
      });
    }
  }

  const filtered = registrations.filter((r) => {
    if (filterStatus && r.status !== filterStatus) return false;
    if (filterCompetition && r.competitionId?._id !== filterCompetition)
      return false;
    return true;
  });

  const stats = {
    total: registrations.length,
    pending: registrations.filter((r) =>
      ["submitted", "pending_validation", "modified"].includes(r.status)
    ).length,
    approved: registrations.filter((r) => r.status === "approved").length,
    rejected: registrations.filter((r) => r.status === "rejected").length,
  };

  return (
    <AdminLayout>
      <div className="page-head">
        <h1>Inscriptions aux Compétitions</h1>
        <p>
          Validation des inscriptions des athlètes aux compétitions. Approuvez
          ou rejetez les inscriptions en attente.
        </p>
      </div>

      {message && (
        <div
          className="notice"
          style={{
            background: message.includes("approuvée")
              ? "#10b98122"
              : message.includes("rejetée")
                ? "#ef444422"
                : "#3b82f622",
            color: message.includes("approuvée")
              ? "#10b981"
              : message.includes("rejetée")
                ? "#ef4444"
                : "#3b82f6",
          }}
        >
          {message}
        </div>
      )}

      {/* Stats */}
      <section
        className="grid cards"
        style={{ gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))" }}
      >
        <div className="stat-card">
          <strong>{stats.total}</strong>
          <span>Total</span>
        </div>
        <div className="stat-card" style={{ borderTop: "3px solid #f59e0b" }}>
          <strong>{stats.pending}</strong>
          <span>En attente</span>
        </div>
        <div className="stat-card" style={{ borderTop: "3px solid #10b981" }}>
          <strong>{stats.approved}</strong>
          <span>Approuvées</span>
        </div>
        <div className="stat-card" style={{ borderTop: "3px solid #ef4444" }}>
          <strong>{stats.rejected}</strong>
          <span>Rejetées</span>
        </div>
      </section>

      {/* Filters */}
      <div
        style={{
          marginTop: "1.25rem",
          marginBottom: "1rem",
          display: "flex",
          gap: "1rem",
          flexWrap: "wrap",
        }}
      >
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          style={{ maxWidth: "220px" }}
        >
          <option value="">Tous les statuts</option>
          <option value="submitted">Soumise</option>
          <option value="pending_validation">En validation</option>
          <option value="approved">Approuvée</option>
          <option value="rejected">Rejetée</option>
          <option value="modified">Modifiée</option>
          <option value="draft">Brouillon</option>
        </select>

        <select
          value={filterCompetition}
          onChange={(e) => setFilterCompetition(e.target.value)}
          style={{ maxWidth: "300px" }}
        >
          <option value="">Toutes les compétitions</option>
          {competitions.map((c) => (
            <option key={c._id} value={c._id}>
              {c.name || c.title || c._id}
            </option>
          ))}
        </select>
      </div>

      {loading && <div className="notice">Chargement...</div>}

      {!loading && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Athlète</th>
                <th>Club</th>
                <th>Compétition</th>
                <th>Discipline</th>
                <th>Catégorie</th>
                <th>Statut</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    style={{ textAlign: "center", padding: "2rem" }}
                  >
                    Aucune inscription trouvée.
                  </td>
                </tr>
              ) : (
                filtered.map((r) => (
                  <tr key={r._id}>
                    <td>
                      <strong>
                        {r.athleteId
                          ? `${r.athleteId.firstName || ""} ${r.athleteId.lastName || ""}`.trim() ||
                            r.athleteId.fullName ||
                            r.athleteId.name ||
                            "—"
                          : r.firstName
                            ? `${r.firstName} ${r.lastName || ""}`.trim()
                            : "—"}
                      </strong>
                      {r.athleteId?.federalId && (
                        <div
                          style={{
                            fontSize: "0.75rem",
                            fontFamily: "monospace",
                            color: "#888",
                          }}
                        >
                          {r.athleteId.federalId}
                        </div>
                      )}
                    </td>
                    <td style={{ fontSize: "0.85rem" }}>
                      {r.clubId?.name || "—"}
                    </td>
                    <td style={{ fontSize: "0.85rem" }}>
                      {r.competitionId?.name ||
                        r.competitionId?.title ||
                        "—"}
                    </td>
                    <td>
                      {DISCIPLINE_LABELS[r.discipline] || r.discipline || "—"}
                    </td>
                    <td style={{ fontSize: "0.85rem" }}>
                      {r.ageCategory || "—"}
                      {r.weightCategory ? ` / ${r.weightCategory}` : ""}
                    </td>
                    <td>
                      <Badge
                        label={STATUS_LABELS[r.status] || r.status}
                        color={STATUS_COLORS[r.status] || "#6b7280"}
                      />
                      {r.federationComment && (
                        <div
                          style={{
                            fontSize: "0.7rem",
                            color: "#6b7280",
                            marginTop: "2px",
                            maxWidth: "150px",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {r.federationComment}
                        </div>
                      )}
                    </td>
                    <td>
                      {["submitted", "pending_validation", "modified"].includes(
                        r.status
                      ) && (
                        <div style={{ display: "flex", gap: "0.4rem" }}>
                          <button
                            className="primary"
                            style={{ fontSize: "0.75rem", padding: "4px 10px" }}
                            disabled={processingIds.has(r._id)}
                            onClick={() => handleDecision(r._id, "approve")}
                          >
                            {processingIds.has(r._id) ? "..." : "Approuver"}
                          </button>
                          <button
                            style={{
                              fontSize: "0.75rem",
                              padding: "4px 10px",
                              background: "#ef4444",
                              color: "#fff",
                              border: "none",
                              borderRadius: "6px",
                              cursor: "pointer",
                            }}
                            disabled={processingIds.has(r._id)}
                            onClick={() => handleDecision(r._id, "reject")}
                          >
                            Rejeter
                          </button>
                        </div>
                      )}
                      {r.status === "approved" && (
                        <span
                          style={{ color: "#10b981", fontSize: "0.8rem" }}
                        >
                          ✓ Validé
                        </span>
                      )}
                      {r.status === "rejected" && (
                        <span
                          style={{ color: "#ef4444", fontSize: "0.8rem" }}
                        >
                          ✗ Rejeté
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </AdminLayout>
  );
}
