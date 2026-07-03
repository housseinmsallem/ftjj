import React, { useEffect, useRef, useState } from "react";
import ClubLayout from "../../components/layout/ClubLayout";
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
  approved: "#10b981",
  rejected: "#ef4444",
  submitted: "#f59e0b",
  pending_validation: "#f59e0b",
  modified: "#f59e0b",
  draft: "#9ca3af",
};

const PAYMENT_LABELS = {
  UNPAID: "Non payé",
  PENDING: "En attente",
  VERIFIED: "Vérifié",
  REJECTED: "Rejeté",
};

const PAYMENT_COLORS = {
  UNPAID: "#ef4444",
  PENDING: "#f59e0b",
  VERIFIED: "#10b981",
  REJECTED: "#ef4444",
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

export default function ClubRegistrations() {
  const [registrations, setRegistrations] = useState([]);
  const [filterStatus, setFilterStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [uploadingId, setUploadingId] = useState(null);
  const fileInputRef = useRef(null);

  async function load() {
    setLoading(true);
    try {
      const res = await api.get("/registrations");
      const data = Array.isArray(res.data) ? res.data : res.data?.data || [];
      setRegistrations(data);
    } catch {
      setMessage("Erreur de chargement des inscriptions.");
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  function handlePayerClick(regId) {
    setUploadingId(regId);
    // trigger hidden file input
    setTimeout(() => fileInputRef.current?.click(), 50);
  }

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file || !uploadingId) {
      setUploadingId(null);
      return;
    }

    setMessage("");
    const regId = uploadingId;
    setUploadingId(null);

    try {
      // 1. Upload receipt
      const fd = new FormData();
      fd.append("file", file);
      fd.append("category", "payment_receipt");
      fd.append("title", `Reçu paiement inscription ${regId}`);

      const uploadRes = await api.post("/uploads", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const assetId = uploadRes.data?._id;
      if (!assetId) throw new Error("Échec de l'upload du reçu.");

      // 2. Link receipt to registration
      await api.patch(`/registrations/${regId}`, {
        paymentReceipt: assetId,
        paymentStatus: "PENDING",
      });

      setMessage("Reçu envoyé. En attente de vérification.");
      await load();
    } catch (err) {
      setMessage(
        err.response?.data?.message || "Erreur lors de l'envoi du reçu.",
      );
    }

    // Reset file input
    e.target.value = "";
  }

  const filtered = registrations.filter((r) => {
    if (filterStatus && r.status !== filterStatus) return false;
    return true;
  });

  const stats = {
    total: registrations.length,
    pending: registrations.filter((r) =>
      ["submitted", "pending_validation", "modified"].includes(r.status),
    ).length,
    approved: registrations.filter((r) => r.status === "approved").length,
    rejected: registrations.filter((r) => r.status === "rejected").length,
  };

  function athleteName(r) {
    if (r.athleteId) {
      return (
        `${r.athleteId.firstName || ""} ${r.athleteId.lastName || ""}`.trim() ||
        r.athleteId.fullName ||
        r.athleteId.name ||
        "—"
      );
    }
    return `${r.firstName || ""} ${r.lastName || ""}`.trim() || "—";
  }

  function competitionName(r) {
    return r.competitionId?.name || r.competitionId?.title || "—";
  }

  return (
    <ClubLayout>
      <div className="page-head">
        <h1>Gestion des Inscriptions</h1>
        <p>
          Suivi des inscriptions de votre club aux compétitions. Consultez le
          statut de chaque inscription et gérez les paiements.
        </p>
      </div>

      {message && (
        <div
          className="notice"
          style={{
            background: message.includes("envoyé") ? "#10b98122" : "#ef444422",
            color: message.includes("envoyé") ? "#10b981" : "#ef4444",
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
          <option value="draft">Brouillon</option>
          <option value="submitted">Soumise</option>
          <option value="pending_validation">En validation</option>
          <option value="approved">Approuvée</option>
          <option value="rejected">Rejetée</option>
          <option value="modified">Modifiée</option>
        </select>
      </div>

      {/* Hidden file input for payment receipt */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,application/pdf"
        style={{ display: "none" }}
        onChange={handleFileChange}
      />

      {loading && <div className="notice">Chargement...</div>}

      {!loading && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Athlète</th>
                <th>Compétition</th>
                <th>Discipline</th>
                <th>Catégorie</th>
                <th>Statut</th>
                <th>Paiement</th>
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
                      <strong>{athleteName(r)}</strong>
                    </td>
                    <td style={{ fontSize: "0.85rem" }}>
                      {r.competitionId?.link ? (
                        <a
                          href={r.competitionId.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            color: "#3b82f6",
                            textDecoration: "underline",
                          }}
                        >
                          {competitionName(r)}
                        </a>
                      ) : (
                        competitionName(r)
                      )}
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
                    </td>
                    <td>
                      <Badge
                        label={
                          PAYMENT_LABELS[r.paymentStatus] ||
                          r.paymentStatus ||
                          "—"
                        }
                        color={PAYMENT_COLORS[r.paymentStatus] || "#6b7280"}
                      />
                    </td>
                    <td>
                      {r.paymentStatus === "UNPAID" || !r.paymentStatus ? (
                        <button
                          className="primary"
                          style={{ fontSize: "0.75rem", padding: "4px 10px" }}
                          onClick={() => handlePayerClick(r._id)}
                        >
                          💳 Payer
                        </button>
                      ) : r.paymentStatus === "PENDING" ? (
                        <span style={{ fontSize: "0.8rem", color: "#f59e0b" }}>
                          En attente de vérification
                        </span>
                      ) : r.paymentStatus === "VERIFIED" ? (
                        <span style={{ fontSize: "0.8rem", color: "#10b981" }}>
                          ✓ Payé
                        </span>
                      ) : r.paymentStatus === "REJECTED" ? (
                        <div
                          style={{
                            display: "flex",
                            gap: "0.4rem",
                            alignItems: "center",
                          }}
                        >
                          <span
                            style={{ fontSize: "0.8rem", color: "#ef4444" }}
                          >
                            ✗ Rejeté
                          </span>
                          <button
                            className="primary"
                            style={{ fontSize: "0.7rem", padding: "3px 8px" }}
                            onClick={() => handlePayerClick(r._id)}
                          >
                            Réessayer
                          </button>
                        </div>
                      ) : null}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </ClubLayout>
  );
}
