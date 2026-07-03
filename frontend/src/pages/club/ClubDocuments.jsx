import React, { useEffect, useRef, useState } from "react";
import ClubLayout from "../../components/layout/ClubLayout";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";

const REQUIRED_DOCUMENTS = [
  {
    category: "affiliation_request",
    label: "Demande d'inscription",
    description: "Formulaire de demande d'affiliation dûment rempli et signé.",
    icon: "📝",
  },
  {
    category: "work_contract",
    label: "Contrat du travail signé",
    description: "Contrat de travail signé par le club et le coach.",
    icon: "📄",
  },
  {
    category: "black_belt_cert",
    label: "Attestation Black Belt 1er degré",
    description:
      "Attestation officielle de ceinture noire 1er degré (Black Belt).",
    icon: "🥋",
  },
  {
    category: "coaching_cert",
    label: "Attestation fédérale de préparation Coaching",
    description: "Certificat fédéral attestant la préparation au coaching.",
    icon: "🎓",
  },
  {
    category: "official_gazette",
    label: "Copie الرائد الرسمي للجمعية",
    description:
      "Copie du journal officiel (الرائد الرسمي) mentionnant la création de l'association.",
    icon: "📰",
  },
  {
    category: "payment_receipt",
    label: "Reçu de paiement",
    description: "Reçu de paiement des frais d'affiliation et de licence.",
    icon: "🧾",
  },
];

const STATUS_CONFIG = {
  pending: { label: "En attente", color: "#f59e0b", bg: "#f59e0b22" },
  approved: { label: "Approuvé", color: "#10b981", bg: "#10b98122" },
  rejected: { label: "Refusé", color: "#ef4444", bg: "#ef444422" },
};

function Badge({ label, color, bg }) {
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 10px",
        borderRadius: "12px",
        fontSize: "0.78rem",
        fontWeight: 600,
        background: bg,
        color,
        border: `1px solid ${color}44`,
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  );
}

export default function ClubDocuments() {
  const { user } = useAuth();
  const clubId = user?.club;
  const fileInputRefs = useRef({});

  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState({});
  const [message, setMessage] = useState("");

  // Load existing uploads for this club
  async function loadAssets() {
    try {
      const { data } = await api.get("/uploads");
      const all = Array.isArray(data) ? data : [];
      const clubDocs = all.filter(
        (a) => a.ownerType === "Club" && a.owner === clubId,
      );
      setAssets(clubDocs);
    } catch {
      setAssets([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (clubId) loadAssets();
  }, [clubId]);

  // Compute status per required document
  function getDocInfo(category) {
    const matching = assets.filter((a) => a.category === category);
    if (matching.length === 0) {
      return { uploaded: false, asset: null, status: null };
    }
    // Show the latest matching asset
    const latest = matching.reduce((newest, a) =>
      new Date(a.createdAt) > new Date(newest.createdAt) ? a : newest,
    );
    return { uploaded: true, asset: latest, status: latest.status };
  }

  const uploadedCount = REQUIRED_DOCUMENTS.filter(
    (doc) => getDocInfo(doc.category).uploaded,
  ).length;

  // Handle file selection & upload
  async function handleUpload(category) {
    const input = fileInputRefs.current[category];
    if (!input || !input.files?.length) return;

    const file = input.files[0];
    setUploading((prev) => ({ ...prev, [category]: true }));
    setMessage("");

    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("category", category);
      fd.append("ownerType", "Club");
      fd.append("owner", clubId);
      fd.append(
        "title",
        REQUIRED_DOCUMENTS.find((d) => d.category === category)?.label ||
          category,
      );

      await api.post("/uploads", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      // Reset file input
      input.value = "";
      await loadAssets();
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.message ||
        "Erreur lors de l'envoi du fichier.";
      setMessage(msg);
    } finally {
      setUploading((prev) => ({ ...prev, [category]: false }));
    }
  }

  if (loading) {
    return (
      <ClubLayout>
        <div className="page">
          <div className="card">Chargement des documents...</div>
        </div>
      </ClubLayout>
    );
  }

  return (
    <ClubLayout>
      <div className="page-head">
        <h1>Documents du club</h1>
        <p>
          Gérez les documents obligatoires requis pour l'affiliation de votre
          club auprès de la Fédération Tunisienne de Jiu-Jitsu.
        </p>
      </div>

      {/* Progress bar */}
      <div
        style={{
          background: "var(--bg-card, #fff)",
          borderRadius: "12px",
          padding: "1.25rem 1.5rem",
          marginBottom: "1.5rem",
          boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "0.75rem",
          }}
        >
          <strong style={{ fontSize: "1rem" }}>
            Progression des documents
          </strong>
          <span style={{ fontSize: "0.9rem", color: "#6b7280" }}>
            {uploadedCount} / {REQUIRED_DOCUMENTS.length} documents téléversés
          </span>
        </div>
        <div
          style={{
            height: "10px",
            background: "#e5e7eb",
            borderRadius: "5px",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${(uploadedCount / REQUIRED_DOCUMENTS.length) * 100}%`,
              background:
                uploadedCount === REQUIRED_DOCUMENTS.length
                  ? "#10b981"
                  : "var(--accent, #e63946)",
              borderRadius: "5px",
              transition: "width 0.4s ease",
            }}
          />
        </div>
      </div>

      {message && (
        <div
          className="notice"
          style={{
            marginBottom: "1rem",
            background: message.includes("Erreur") ? "#ef444422" : undefined,
            color: message.includes("Erreur") ? "#ef4444" : undefined,
          }}
        >
          {message}
        </div>
      )}

      {/* Document list */}
      <section
        style={{
          display: "grid",
          gap: "1rem",
        }}
      >
        {REQUIRED_DOCUMENTS.map((doc) => {
          const { uploaded, asset, status } = getDocInfo(doc.category);
          const isUploading = uploading[doc.category];
          const statusCfg = status ? STATUS_CONFIG[status] : null;

          return (
            <div
              key={doc.category}
              className="card"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "1rem",
                padding: "1.25rem 1.5rem",
              }}
            >
              {/* Icon */}
              <div
                style={{
                  fontSize: "2rem",
                  flexShrink: 0,
                  width: "48px",
                  textAlign: "center",
                }}
              >
                {doc.icon}
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <strong style={{ display: "block", marginBottom: "0.2rem" }}>
                  {doc.label}
                </strong>
                <span
                  style={{
                    fontSize: "0.82rem",
                    color: "#6b7280",
                    display: "block",
                    lineHeight: 1.4,
                  }}
                >
                  {doc.description}
                </span>

                {/* Status */}
                <div style={{ marginTop: "0.5rem" }}>
                  {!uploaded ? (
                    <span
                      style={{
                        fontSize: "0.8rem",
                        color: "#9ca3af",
                        fontStyle: "italic",
                      }}
                    >
                      Non téléversé
                    </span>
                  ) : (
                    <Badge
                      label={statusCfg?.label || status}
                      color={statusCfg?.color || "#6b7280"}
                      bg={statusCfg?.bg || "#6b728022"}
                    />
                  )}

                  {/* Rejection reason */}
                  {status === "rejected" && asset?.rejectionReason && (
                    <span
                      style={{
                        display: "block",
                        fontSize: "0.78rem",
                        color: "#ef4444",
                        marginTop: "0.25rem",
                      }}
                    >
                      Motif : {asset.rejectionReason}
                    </span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  flexShrink: 0,
                }}
              >
                {/* Preview link */}
                {uploaded && asset?.url && (
                  <a
                    href={asset.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-outline"
                    style={{
                      fontSize: "0.82rem",
                      padding: "0.4rem 0.8rem",
                      textDecoration: "none",
                    }}
                  >
                    👁️ Aperçu
                  </a>
                )}

                {/* Hidden file input + Upload button */}
                <input
                  ref={(el) => (fileInputRefs.current[doc.category] = el)}
                  type="file"
                  accept="image/*,application/pdf"
                  style={{ display: "none" }}
                  onChange={() => handleUpload(doc.category)}
                />
                <button
                  className="primary"
                  disabled={isUploading}
                  onClick={() => fileInputRefs.current[doc.category]?.click()}
                  style={{
                    fontSize: "0.82rem",
                    padding: "0.4rem 0.8rem",
                  }}
                >
                  {isUploading
                    ? "Envoi..."
                    : uploaded
                      ? "📤 Remplacer"
                      : "📤 Téléverser"}
                </button>
              </div>
            </div>
          );
        })}
      </section>

      {/* All approved hint */}
      {uploadedCount === REQUIRED_DOCUMENTS.length &&
        REQUIRED_DOCUMENTS.every(
          (doc) => getDocInfo(doc.category).status === "approved",
        ) && (
          <div
            className="notice"
            style={{
              marginTop: "1.5rem",
              background: "#10b98122",
              color: "#10b981",
              border: "1px solid #10b98144",
              borderRadius: "8px",
              padding: "1rem 1.25rem",
            }}
          >
            ✅ Tous vos documents ont été approuvés. Votre dossier
            d&apos;affiliation est complet.
          </div>
        )}
    </ClubLayout>
  );
}
