import React, { useEffect, useState } from "react";
import AdminLayout from "../../components/layout/AdminLayout";
import api from "../../services/api";

const STATUS_LABELS = {
  PENDING: "En attente",
  APPROVED: "Approuvé",
  REJECTED: "Rejeté",
};
const STATUS_COLORS = {
  PENDING: "#f59e0b",
  APPROVED: "#10b981",
  REJECTED: "#ef4444",
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

export default function AdminTransfers() {
  const [transfers, setTransfers] = useState([]);
  const [filter, setFilter] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [processingIds, setProcessingIds] = useState(new Set());

  async function load() {
    setLoading(true);
    try {
      // Fetch transfers from the API — the endpoint needs to return all transfers
      const { data } = await api.get("/federal-integration/transfers");
      setTransfers(Array.isArray(data) ? data : data?.transfers || []);
    } catch {
      setTransfers([]);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleDecide(transferId, decision) {
    if (processingIds.has(transferId)) return;

    let rejectionReason;
    if (decision === "REJECTED") {
      rejectionReason = prompt("Motif du rejet :");
      if (!rejectionReason || !rejectionReason.trim()) return;
    }

    setProcessingIds((prev) => new Set(prev).add(transferId));
    setMessage("");

    try {
      const { data } = await api.patch(
        `/federal-integration/transfers/${transferId}/decide`,
        { decision, rejectionReason: rejectionReason?.trim() },
      );
      setMessage(data.message || "Decision enregistree.");
      await load();
    } catch (err) {
      setMessage(err.response?.data?.message || "Erreur lors de la decision.");
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(transferId);
        return next;
      });
    }
  }

  const filtered = filter
    ? transfers.filter((t) => t.status === filter)
    : transfers;

  const stats = {
    total: transfers.length,
    pending: transfers.filter((t) => t.status === "PENDING").length,
    approved: transfers.filter((t) => t.status === "APPROVED").length,
    rejected: transfers.filter((t) => t.status === "REJECTED").length,
  };

  return (
    <AdminLayout>
      <div className="page-head">
        <h1>Transferts d'Association</h1>
        <p>Gestion des demandes de transfert d'athletes entre clubs.</p>
      </div>

      {message && (
        <div
          className="notice"
          style={{
            background: message.includes("succès")
              ? "#10b98122"
              : "#ef444422",
            color: message.includes("succès") ? "#10b981" : "#ef4444",
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
          <span>Approuvés</span>
        </div>
        <div className="stat-card" style={{ borderTop: "3px solid #ef4444" }}>
          <strong>{stats.rejected}</strong>
          <span>Rejetés</span>
        </div>
      </section>

      {/* Filter */}
      <div style={{ marginTop: "1.25rem", marginBottom: "1rem" }}>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={{ maxWidth: "220px" }}
        >
          <option value="">Tous les statuts</option>
          <option value="PENDING">En attente</option>
          <option value="APPROVED">Approuvé</option>
          <option value="REJECTED">Rejeté</option>
        </select>
      </div>

      {loading && <div className="notice">Chargement...</div>}

      {!loading && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Athlète</th>
                <th>Club d'origine</th>
                <th>Club de destination</th>
                <th>Demandé par</th>
                <th>Motif</th>
                <th>Statut</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: "2rem" }}>
                    Aucun transfert trouvé.
                  </td>
                </tr>
              ) : (
                filtered.map((t) => (
                  <tr key={t._id}>
                    <td>
                      <strong>
                        {t.athlete
                          ? `${t.athlete.firstName || ""} ${t.athlete.lastName || ""}`.trim()
                          : "—"}
                      </strong>
                      {t.athlete?.federalId && (
                        <div style={{ fontSize: "0.75rem", fontFamily: "monospace", color: "#888" }}>
                          {t.athlete.federalId}
                        </div>
                      )}
                    </td>
                    <td>{t.fromClub?.name || "—"}</td>
                    <td>{t.toClub?.name || "—"}</td>
                    <td style={{ fontSize: "0.85rem" }}>
                      {t.requestedBy
                        ? `${t.requestedBy.firstName || ""} ${t.requestedBy.lastName || ""}`
                        : "—"}
                    </td>
                    <td style={{ maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: "0.85rem" }}>
                      {t.reason || "—"}
                    </td>
                    <td>
                      <Badge
                        label={STATUS_LABELS[t.status] || t.status}
                        color={STATUS_COLORS[t.status] || "#6b7280"}
                      />
                      {t.status === "REJECTED" && t.rejectionReason && (
                        <div style={{ fontSize: "0.7rem", color: "#ef4444", marginTop: "2px" }}>
                          {t.rejectionReason}
                        </div>
                      )}
                    </td>
                    <td>
                      {t.status === "PENDING" && (
                        <div style={{ display: "flex", gap: "0.4rem" }}>
                          <button
                            className="primary"
                            style={{ fontSize: "0.75rem", padding: "4px 10px" }}
                            disabled={processingIds.has(t._id)}
                            onClick={() => handleDecide(t._id, "APPROVED")}
                          >
                            {processingIds.has(t._id) ? "..." : "Approuver"}
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
                            disabled={processingIds.has(t._id)}
                            onClick={() => handleDecide(t._id, "REJECTED")}
                          >
                            Rejeter
                          </button>
                        </div>
                      )}
                      {t.status === "APPROVED" && (
                        <span style={{ color: "#10b981", fontSize: "0.8rem" }}>✓ Validé</span>
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
