import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";

interface RefereeData {
  personId?: string;
  refereeDegreeAttestationUrl?: string | null;
  person?: {
    id?: string;
    firstName?: string;
    lastName?: string;
    dateOfBirth?: string;
    nationality?: string;
    gender?: string;
    photoUrl?: string | null;
    identityDocumentType?: string;
    identityDocumentUrl?: string | null;
    birthCertificateUrl?: string | null;
  } | null;
}

export default function RefereeDashboard(): React.ReactElement {
  const { user, loading: authLoading } = useAuth();
  const [refereeData, setRefereeData] = useState<RefereeData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && user?.role === "REFEREE") {
      api
        .get<{ data: RefereeData }>("/profile/referee/me")
        .then((res) => setRefereeData(res.data.data))
        .catch(() => {
          // fallback: use data from user object if available
          setRefereeData(null);
        })
        .finally(() => setLoading(false));
    } else if (!authLoading) {
      setLoading(false);
    }
  }, [authLoading, user]);

  if (authLoading || loading) {
    return (
      <div className="page" style={{ display: "grid", placeItems: "center", minHeight: "60vh" }}>
        <p style={{ color: "var(--muted)" }}>Chargement...</p>
      </div>
    );
  }

  if (!user || user.role !== "REFEREE") {
    return <Navigate to="/" replace />;
  }

  const person = refereeData?.person;

  return (
    <div className="page" style={{ padding: "40px 24px", maxWidth: 900, margin: "0 auto" }}>
      {/* Header card */}
      <div
        style={{
          background: "var(--panel)",
          borderRadius: 16,
          padding: "32px 28px",
          border: "1px solid var(--border)",
          boxShadow: "0 12px 40px rgba(0,0,0,.35)",
          marginBottom: 24,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
          {person?.photoUrl ? (
            <img
              src={person.photoUrl}
              alt="Photo"
              style={{
                width: 80,
                height: 80,
                borderRadius: "50%",
                objectFit: "cover",
                border: "2px solid var(--border)",
              }}
            />
          ) : (
            <div
              style={{
                width: 80,
                height: 80,
                borderRadius: "50%",
                background: "var(--panel2)",
                border: "2px solid var(--border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.8rem",
                color: "var(--muted)",
              }}
            >
              👤
            </div>
          )}
          <div>
            <h1
              style={{
                color: "white",
                fontSize: "1.5rem",
                fontWeight: 800,
                margin: "0 0 4px",
              }}
            >
              {person?.firstName} {person?.lastName}
            </h1>
            <p
              style={{
                color: "var(--muted)",
                fontSize: "0.9rem",
                margin: 0,
              }}
            >
              Arbitre FTJJ
            </p>
            <span
              style={{
                display: "inline-block",
                marginTop: 8,
                padding: "4px 12px",
                borderRadius: 20,
                background: user.isApproved
                  ? "rgba(34,197,94,.15)"
                  : "rgba(228,195,40,.15)",
                color: user.isApproved ? "var(--green)" : "var(--gold)",
                fontSize: "0.8rem",
                fontWeight: 700,
                border: user.isApproved
                  ? "1px solid rgba(34,197,94,.3)"
                  : "1px solid rgba(228,195,40,.3)",
              }}
            >
              {user.isApproved ? "Validé" : "En attente de validation"}
            </span>
          </div>
        </div>
      </div>

      {/* Info cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 20,
        }}
      >
        {/* Personal info */}
        <div
          style={{
            background: "var(--panel)",
            borderRadius: 16,
            padding: "24px 22px",
            border: "1px solid var(--border)",
            boxShadow: "0 8px 30px rgba(0,0,0,.25)",
          }}
        >
          <h3
            style={{
              color: "white",
              fontSize: "1rem",
              fontWeight: 700,
              margin: "0 0 16px",
            }}
          >
            Informations personnelles
          </h3>
          <InfoRow label="Email" value={user.email} />
          <InfoRow label="Genre" value={person?.gender === "MALE" ? "Homme" : person?.gender === "FEMALE" ? "Femme" : "—"} />
          <InfoRow label="Nationalité" value={person?.nationality || "—"} />
          <InfoRow
            label="Date de naissance"
            value={person?.dateOfBirth ? new Date(person.dateOfBirth).toLocaleDateString("fr-FR") : "—"}
          />
          <InfoRow
            label="Pièce d'identité"
            value={person?.identityDocumentType === "CIN" ? "CIN" : person?.identityDocumentType === "BIRTH_CERTIFICATE" ? "Extrait de naissance" : "—"}
          />
        </div>

        {/* License status */}
        <div
          style={{
            background: "var(--panel)",
            borderRadius: 16,
            padding: "24px 22px",
            border: "1px solid var(--border)",
            boxShadow: "0 8px 30px rgba(0,0,0,.25)",
          }}
        >
          <h3
            style={{
              color: "white",
              fontSize: "1rem",
              fontWeight: 700,
              margin: "0 0 16px",
            }}
          >
            Statut licence
          </h3>
          <div
            style={{
              padding: "16px",
              background: "var(--panel2)",
              borderRadius: 12,
              textAlign: "center",
            }}
          >
            <span
              style={{
                display: "inline-block",
                padding: "6px 16px",
                borderRadius: 20,
                background: "rgba(228,195,40,.15)",
                color: "var(--gold)",
                fontSize: "0.85rem",
                fontWeight: 700,
                border: "1px solid rgba(228,195,40,.3)",
              }}
            >
              En attente de validation
            </span>
            <p
              style={{
                color: "var(--muted)",
                fontSize: "0.85rem",
                marginTop: 12,
                lineHeight: 1.5,
              }}
            >
              Votre profil est en cours d'examen par l'administration. Vous
              serez notifié par email une fois votre compte validé.
            </p>
          </div>
        </div>

        {/* Documents */}
        <div
          style={{
            background: "var(--panel)",
            borderRadius: 16,
            padding: "24px 22px",
            border: "1px solid var(--border)",
            boxShadow: "0 8px 30px rgba(0,0,0,.25)",
          }}
        >
          <h3
            style={{
              color: "white",
              fontSize: "1rem",
              fontWeight: 700,
              margin: "0 0 16px",
            }}
          >
            Documents soumis
          </h3>
          <DocRow
            label="Pièce d'identité"
            url={person?.identityDocumentUrl}
          />
          <DocRow
            label="Extrait de naissance"
            url={person?.birthCertificateUrl}
          />
          <DocRow label="Photo d'identité" url={person?.photoUrl} />
          <DocRow
            label="Attestation degré arbitrage"
            url={refereeData?.refereeDegreeAttestationUrl}
          />
        </div>
      </div>
    </div>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string;
}): React.ReactElement {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "10px 0",
        borderBottom: "1px solid rgba(255,255,255,.06)",
      }}
    >
      <span style={{ color: "var(--muted)", fontSize: "0.85rem" }}>
        {label}
      </span>
      <span style={{ color: "white", fontSize: "0.9rem", fontWeight: 600 }}>
        {value}
      </span>
    </div>
  );
}

function DocRow({
  label,
  url,
}: {
  label: string;
  url?: string | null;
}): React.ReactElement {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "10px 0",
        borderBottom: "1px solid rgba(255,255,255,.06)",
      }}
    >
      <span style={{ color: "var(--muted)", fontSize: "0.85rem" }}>
        {label}
      </span>
      {url ? (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            color: "var(--red)",
            fontSize: "0.85rem",
            textDecoration: "underline",
          }}
        >
          Voir
        </a>
      ) : (
        <span style={{ color: "rgba(255,255,255,.3)", fontSize: "0.85rem" }}>
          —
        </span>
      )}
    </div>
  );
}
