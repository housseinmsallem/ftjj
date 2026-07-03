import React, { useEffect, useState } from "react";
import AdminLayout from "../../components/layout/AdminLayout";
import api from "../../services/api";

const STATUS_LABELS = {
  PENDING: "En attente",
  APPROVED: "Approuvé",
  REJECTED: "Rejeté",
  SUSPENDED: "Suspendu",
};

const DOC_STATUS_LABELS = {
  INCOMPLETE: "Incomplet",
  PENDING_REVIEW: "En révision",
  VALIDATED: "Validé",
  REJECTED: "Rejeté",
};

const STATUS_COLORS = {
  PENDING: "#f59e0b",
  APPROVED: "#10b981",
  REJECTED: "#ef4444",
  SUSPENDED: "#6b7280",
};

const DOC_STATUS_COLORS = {
  INCOMPLETE: "#9ca3af",
  PENDING_REVIEW: "#3b82f6",
  VALIDATED: "#10b981",
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
        color: color,
        border: `1px solid ${color}44`,
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  );
}

export default function AdminAffiliationRequests() {
  const [clubs, setClubs] = useState([]);
  const [assets, setAssets] = useState({}); // clubId -> assets[]
  const [filter, setFilter] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [processingIds, setProcessingIds] = useState(new Set());
  const [expandedClub, setExpandedClub] = useState(null);

  async function loadClubs() {
    setLoading(true);
    try {
      const { data } = await api.get("/clubs");
      setClubs(data || []);
    } catch (err) {
      setMessage(err.response?.data?.message || "Erreur de chargement");
    }
    setLoading(false);
  }

  async function loadAssets(clubId) {
    if (assets[clubId]) return assets[clubId];
    try {
      const { data } = await api.get("/uploads");
      const clubAssets = (data || []).filter(
        (a) =>
          a.ownerType === "Club" &&
          (String(a.owner) === clubId || String(a.owner?._id) === clubId),
      );
      setAssets((prev) => ({ ...prev, [clubId]: clubAssets }));
      return clubAssets;
    } catch {
      return [];
    }
  }

  useEffect(() => {
    loadClubs();
  }, []);

  async function handleToggleExpand(clubId) {
    if (expandedClub === clubId) {
      setExpandedClub(null);
      return;
    }
    setExpandedClub(clubId);
    await loadAssets(clubId);
  }

  async function handleApproveAffiliation(clubId) {
    if (processingIds.has(clubId)) return;
    setProcessingIds((prev) => new Set(prev).add(clubId));
    setMessage("");

    try {
      const { data } = await api.patch(
        `/workflow/clubs/${clubId}/approve-affiliation`,
      );
      setMessage(data.message || "Affiliation approuvée avec succès.");
      await loadClubs();
    } catch (err) {
      setMessage(
        err.response?.data?.message || "Erreur lors de l'approbation.",
      );
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(clubId);
        return next;
      });
    }
  }

  async function handleRejectAffiliation(clubId) {
    const reason = prompt("Motif du rejet :");
    if (!reason) return;

    if (processingIds.has(clubId)) return;
    setProcessingIds((prev) => new Set(prev).add(clubId));
    setMessage("");

    try {
      await api.put(`/clubs/${clubId}`, {
        affiliationStatus: "REJECTED",
        rejectionReason: reason,
        affiliationDocumentsStatus: "REJECTED",
      });
      setMessage("Affiliation rejetée.");
      await loadClubs();
    } catch (err) {
      setMessage(err.response?.data?.message || "Erreur lors du rejet.");
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(clubId);
        return next;
      });
    }
  }

  const filteredClubs = filter
    ? clubs.filter((c) => c.affiliationStatus === filter)
    : clubs;

  const stats = {
    total: clubs.length,
    pending: clubs.filter((c) => c.affiliationStatus === "PENDING").length,
    approved: clubs.filter((c) => c.affiliationStatus === "APPROVED").length,
    rejected: clubs.filter((c) => c.affiliationStatus === "REJECTED").length,
  };

  const clubAssets = expandedClub ? assets[expandedClub] || [] : [];

  return (
    <AdminLayout>
      <div className="page-head">
        <h1>Demandes d'Affiliation</h1>
        <p>Validation des clubs et création des accès au portail fédéral.</p>
      </div>

      {message && (
        <div
          className="notice"
          style={{
            background: message.includes("succès")
              ? "#10b98122"
              : message.includes("Erreur")
                ? "#ef444422"
                : undefined,
            color: message.includes("succès")
              ? "#10b981"
              : message.includes("Erreur")
                ? "#ef4444"
                : undefined,
          }}
        >
          {message}
        </div>
      )}

      {/* Stats */}
      <section
        className="grid cards"
        style={{ gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))" }}
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
      <section className="panel" style={{ marginTop: "1.25rem" }}>
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          <label style={{ fontWeight: 600, whiteSpace: "nowrap" }}>
            Filtrer par statut :
          </label>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            style={{ maxWidth: "220px" }}
          >
            <option value="">Tous</option>
            <option value="PENDING">En attente</option>
            <option value="APPROVED">Approuvé</option>
            <option value="REJECTED">Rejeté</option>
            <option value="SUSPENDED">Suspendu</option>
          </select>
        </div>
      </section>

      {/* Loading */}
      {loading && <div className="notice">Chargement...</div>}

      {/* Clubs Table */}
      {!loading && (
        <div className="table-wrap" style={{ marginTop: "1.25rem" }}>
          <table>
            <thead>
              <tr>
                <th>Club</th>
                <th>Governorat</th>
                <th>Email</th>
                <th>ID Fédéral</th>
                <th>Statut Affiliation</th>
                <th>Documents</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredClubs.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    style={{ textAlign: "center", padding: "2rem" }}
                  >
                    Aucun club trouvé.
                  </td>
                </tr>
              ) : (
                filteredClubs.map((club) => (
                  <React.Fragment key={club._id}>
                    <tr>
                      <td>
                        <strong>{club.name}</strong>
                        {club.legalRepresentative && (
                          <div
                            style={{
                              fontSize: "0.8rem",
                              color: "var(--text-secondary, #888)",
                            }}
                          >
                            Repr. : {club.legalRepresentative}
                          </div>
                        )}
                      </td>
                      <td>{club.governorate || "—"}</td>
                      <td style={{ fontSize: "0.85rem" }}>
                        {club.email || "—"}
                      </td>
                      <td
                        style={{ fontFamily: "monospace", fontSize: "0.85rem" }}
                      >
                        {club.federalId || (
                          <span style={{ color: "#9ca3af" }}>Non attribué</span>
                        )}
                      </td>
                      <td>
                        <Badge
                          label={
                            STATUS_LABELS[club.affiliationStatus] ||
                            club.affiliationStatus
                          }
                          color={
                            STATUS_COLORS[club.affiliationStatus] || "#6b7280"
                          }
                        />
                      </td>
                      <td>
                        <Badge
                          label={
                            DOC_STATUS_LABELS[
                              club.affiliationDocumentsStatus
                            ] ||
                            club.affiliationDocumentsStatus ||
                            "Incomplet"
                          }
                          color={
                            DOC_STATUS_COLORS[
                              club.affiliationDocumentsStatus
                            ] || "#9ca3af"
                          }
                        />
                        <button
                          className="btn-link"
                          style={{
                            marginLeft: "0.5rem",
                            fontSize: "0.75rem",
                            border: "none",
                            background: "none",
                            cursor: "pointer",
                            color: "var(--accent, #e63946)",
                            textDecoration: "underline",
                          }}
                          onClick={() => handleToggleExpand(club._id)}
                        >
                          {expandedClub === club._id ? "Masquer" : "Voir docs"}
                        </button>
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: "0.5rem" }}>
                          {club.affiliationStatus === "PENDING" && (
                            <>
                              <button
                                className="primary"
                                style={{
                                  fontSize: "0.8rem",
                                  padding: "4px 12px",
                                }}
                                disabled={processingIds.has(club._id)}
                                onClick={() =>
                                  handleApproveAffiliation(club._id)
                                }
                              >
                                {processingIds.has(club._id)
                                  ? "Patientez..."
                                  : "Approuver"}
                              </button>
                              <button
                                className="btn-danger"
                                style={{
                                  fontSize: "0.8rem",
                                  padding: "4px 12px",
                                  background: "#ef4444",
                                  color: "#fff",
                                  border: "none",
                                  borderRadius: "6px",
                                  cursor: "pointer",
                                }}
                                disabled={processingIds.has(club._id)}
                                onClick={() =>
                                  handleRejectAffiliation(club._id)
                                }
                              >
                                Rejeter
                              </button>
                            </>
                          )}
                          {club.affiliationStatus === "APPROVED" &&
                            club.federalId && (
                              <span
                                style={{ fontSize: "0.8rem", color: "#10b981" }}
                              >
                                ✓ Validé
                              </span>
                            )}
                          {club.affiliationStatus === "REJECTED" && (
                            <span
                              style={{ fontSize: "0.8rem", color: "#ef4444" }}
                              title={club.rejectionReason}
                            >
                              ✗ Rejeté
                              {club.rejectionReason && (
                                <span
                                  style={{
                                    display: "block",
                                    fontSize: "0.7rem",
                                  }}
                                >
                                  {club.rejectionReason}
                                </span>
                              )}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                    {/* Expanded documents row */}
                    {expandedClub === club._id && (
                      <tr>
                        <td
                          colSpan={7}
                          style={{ background: "#f9fafb", padding: "1rem" }}
                        >
                          <div
                            style={{ fontWeight: 600, marginBottom: "0.5rem" }}
                          >
                            Documents du club ({clubAssets.length})
                          </div>
                          {clubAssets.length === 0 ? (
                            <span
                              style={{ color: "#6b7280", fontSize: "0.85rem" }}
                            >
                              Aucun document trouvé.
                            </span>
                          ) : (
                            <table
                              style={{
                                width: "100%",
                                fontSize: "0.85rem",
                                border: "1px solid #e5e7eb",
                                borderRadius: "8px",
                              }}
                            >
                              <thead>
                                <tr style={{ background: "#f3f4f6" }}>
                                  <th>Document</th>
                                  <th>Catégorie</th>
                                  <th>Statut</th>
                                  <th>Date d'upload</th>
                                </tr>
                              </thead>
                              <tbody>
                                {clubAssets.map((asset) => (
                                  <tr key={asset._id}>
                                    <td>
                                      {asset.url ? (
                                        <a
                                          href={asset.url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                        >
                                          {asset.title ||
                                            asset.originalName ||
                                            "Voir"}
                                        </a>
                                      ) : (
                                        asset.title || asset.originalName || "—"
                                      )}
                                    </td>
                                    <td>{asset.category || "—"}</td>
                                    <td>
                                      {asset.status === "approved" ? (
                                        <span style={{ color: "#10b981" }}>
                                          ✓ Approuvé
                                        </span>
                                      ) : asset.status === "rejected" ? (
                                        <span
                                          style={{ color: "#ef4444" }}
                                          title={asset.rejectionReason}
                                        >
                                          ✗ Rejeté
                                        </span>
                                      ) : (
                                        <span style={{ color: "#f59e0b" }}>
                                          ⏳ {asset.status}
                                        </span>
                                      )}
                                    </td>
                                    <td>
                                      {asset.createdAt
                                        ? new Date(
                                            asset.createdAt,
                                          ).toLocaleDateString("fr-TN")
                                        : "—"}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </AdminLayout>
  );
}
