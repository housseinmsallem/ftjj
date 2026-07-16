import React from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import api from "../services/api";
import PageHeader from "../components/shared/PageHeader";
import LoadingSpinner from "../components/shared/LoadingSpinner";
import EmptyState from "../components/shared/EmptyState";
import StatusBadge from "../components/shared/StatusBadge";
import { NEWAZA_GRADES } from "../utils/formOptions";
import { getWeightClass } from "../utils/weightClass";
import type { Person, License, ClubRef } from "../types";

interface PersonDetail extends Person {
  name?: string;
  blackBeltAttestationUrl?: string;
  coachingAttestationUrl?: string;
  contractUrl?: string;
  refereeDegreeAttestationUrl?: string;
  specialization?: string;
}

export default function IdentiteFederale(): React.ReactElement {
  const { personId } = useParams<{ personId: string }>();

  const {
    data: person,
    isLoading,
    isError,
    error: personErr,
    refetch,
  } = useQuery<PersonDetail | null>({
    queryKey: ["person", personId],
    queryFn: async () => {
      if (!personId) return null;
      const res = await api.get(`/persons/${personId}`);
      const data = res.data?.data ?? res.data;
      return Array.isArray(data)
        ? (data[0] ?? null)
        : ((data as PersonDetail) ?? null);
    },
    enabled: !!personId,
  });

  const { data: licenses } = useQuery<License[]>({
    queryKey: ["licenses", personId],
    queryFn: async () => {
      const res = await api.get("/licenses", { params: { personId } });
      const data = res.data?.data ?? res.data;
      return (Array.isArray(data) ? data : (data?.licenses ?? [])) as License[];
    },
    enabled: !!personId,
  });

  if (!personId)
    return (
      <div className="page">
        <EmptyState
          title="Identifiant manquant"
          description="Aucun identifiant de personne fourni."
        />
      </div>
    );
  if (isLoading)
    return (
      <div className="page">
        <LoadingSpinner text="Chargement de l'identité fédérale..." />
      </div>
    );
  if (isError || !person) {
    return (
      <div className="page">
        <EmptyState
          title="Erreur de chargement"
          description={
            (personErr as any)?.message ||
            "Impossible de charger cette identité."
          }
          action={
            <button className="btn primary" onClick={() => refetch()}>
              Réessayer
            </button>
          }
        />
      </div>
    );
  }

  const fullName = `${person.firstName || ""} ${person.lastName || ""}`.trim();
  const typeLabel: Record<string, string> = {
    ATHLETE: "Athlète",
    COACH: "Entraîneur",
    REFEREE: "Arbitre",
    TECHNICIAN: "Technicien",
  };
  const club: ClubRef | undefined = person.club;
  const gradeLabel = person.grade
    ? NEWAZA_GRADES.find((g) => g.value === person.grade)?.label || person.grade
    : null;
  const activeLicense =
    licenses?.find((l) => l.isActive) ?? licenses?.[0] ?? null;

  const card: React.CSSProperties = {
    background: "var(--panel)",
    border: "1px solid var(--border)",
    borderRadius: 16,
    padding: 32,
    maxWidth: 800,
    margin: "0 auto",
  };
  const sectionTitle: React.CSSProperties = {
    color: "var(--red)",
    fontSize: "0.8rem",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    fontWeight: 700,
    marginBottom: 12,
    paddingBottom: 8,
    borderBottom: "1px solid var(--border)",
  };
  const kvRow: React.CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    padding: "8px 0",
    fontSize: "0.9rem",
  };
  const kvLabel: React.CSSProperties = {
    color: "var(--muted)",
    fontWeight: 500,
  };
  const kvValue: React.CSSProperties = {
    color: "white",
    fontWeight: 600,
    textAlign: "right",
    maxWidth: "60%",
  };
  const docLink: React.CSSProperties = {
    color: "var(--gold)",
    textDecoration: "underline",
    fontWeight: 500,
  };

  const DocLink = ({ url, label }: { url?: string; label: string }) =>
    url ? (
      <a href={url} target="_blank" rel="noopener noreferrer" style={docLink}>
        📄 {label}
      </a>
    ) : (
      <span className="muted">Non fourni</span>
    );

  return (
    <div className="page">
      <PageHeader
        title="Identité Fédérale"
        breadcrumbs={[{ label: "Identité Fédérale" }]}
      />

      <div style={card}>
        {/* Header — photo + name + badge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 24,
            marginBottom: 32,
            flexWrap: "wrap",
          }}
        >
          {person.photoUrl ? (
            <img
              src={person.photoUrl}
              alt={fullName}
              style={{
                width: 120,
                height: 120,
                borderRadius: 16,
                objectFit: "cover",
                border: "3px solid var(--border)",
                flexShrink: 0,
              }}
            />
          ) : (
            <div
              style={{
                width: 120,
                height: 120,
                borderRadius: 16,
                background:
                  "linear-gradient(135deg, var(--panel2), var(--panel))",
                border: "3px solid var(--border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "2.5rem",
                flexShrink: 0,
              }}
            >
              👤
            </div>
          )}
          <div style={{ flex: 1, minWidth: 200 }}>
            <h2
              style={{
                margin: "0 0 6px",
                fontSize: "1.5rem",
                color: "white",
                fontWeight: 800,
              }}
            >
              {fullName}
            </h2>
            <div
              style={{
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
                alignItems: "center",
              }}
            >
              <span
                style={{
                  background: "var(--red)",
                  color: "#fff",
                  padding: "3px 12px",
                  borderRadius: 20,
                  fontSize: "0.8rem",
                  fontWeight: 700,
                }}
              >
                {typeLabel[person.type] || person.type}
              </span>
              {gradeLabel && (
                <span
                  style={{
                    background: "var(--panel2)",
                    color: "var(--gold)",
                    padding: "3px 12px",
                    borderRadius: 20,
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    border: "1px solid var(--border)",
                  }}
                >
                  {gradeLabel}
                </span>
              )}
              {activeLicense && (
                <StatusBadge
                  status={activeLicense.isActive ? "ACTIVE" : "EXPIRED"}
                />
              )}
            </div>
            {club?.name && (
              <p
                className="muted"
                style={{ margin: "8px 0 0", fontSize: "0.9rem" }}
              >
                🏛️ {club.name}
              </p>
            )}
          </div>
        </div>

        {/* Two-column grid */}
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}
        >
          {/* Left column */}
          <div>
            <h3 style={sectionTitle}>Identité</h3>
            <div style={kvRow}>
              <span style={kvLabel}>Date de naissance</span>
              <span style={kvValue}>
                {person.dateOfBirth
                  ? new Date(person.dateOfBirth).toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })
                  : "—"}
              </span>
            </div>
            <div style={kvRow}>
              <span style={kvLabel}>Nationalité</span>
              <span style={kvValue}>{person.nationality || "—"}</span>
            </div>
            <div style={kvRow}>
              <span style={kvLabel}>Genre</span>
              <span style={kvValue}>
                {person.gender === "MALE"
                  ? "Homme"
                  : person.gender === "FEMALE"
                    ? "Femme"
                    : "—"}
              </span>
            </div>
            {person.type === "ATHLETE" && (
              <div style={kvRow}>
                <span style={kvLabel}>Catégorie de poids</span>
                <span style={kvValue}>
                  {getWeightClass(
                    (person as any).athleteDetails?.weight ??
                      (person as any).weight,
                    person.gender,
                  )}
                </span>
              </div>
            )}
            {person.type === "TECHNICIAN" && person.specialization && (
              <div style={kvRow}>
                <span style={kvLabel}>Spécialisation</span>
                <span style={kvValue}>{person.specialization}</span>
              </div>
            )}

            <h3 style={{ ...sectionTitle, marginTop: 24 }}>
              Pièces d'identité
            </h3>
            <div style={kvRow}>
              <span style={kvLabel}>Type</span>
              <span style={kvValue}>
                {person.identityDocumentType === "CIN"
                  ? "CIN"
                  : "Acte de naissance"}
              </span>
            </div>
            <div style={kvRow}>
              <span style={kvLabel}>CIN</span>
              <span style={kvValue}>
                <DocLink url={person.identityDocumentUrl} label="Consulter" />
              </span>
            </div>
            <div style={kvRow}>
              <span style={kvLabel}>Acte de naissance</span>
              <span style={kvValue}>
                <DocLink
                  url={(person as any).birthCertificateUrl}
                  label="Consulter"
                />
              </span>
            </div>
          </div>

          {/* Right column */}
          <div>
            <h3 style={sectionTitle}>Club</h3>
            <div style={kvRow}>
              <span style={kvLabel}>Nom</span>
              <span style={kvValue}>{club?.name || "Sans club"}</span>
            </div>
            {club?.address && (
              <div style={kvRow}>
                <span style={kvLabel}>Adresse</span>
                <span style={kvValue}>{club.address}</span>
              </div>
            )}

            {/* Coach attestations */}
            {person.type === "COACH" && (
              <>
                <h3 style={{ ...sectionTitle, marginTop: 24 }}>Attestations</h3>
                <div style={kvRow}>
                  <span style={kvLabel}>Black Belt</span>
                  <span style={kvValue}>
                    <DocLink
                      url={person.blackBeltAttestationUrl}
                      label="Consulter"
                    />
                  </span>
                </div>
                <div style={kvRow}>
                  <span style={kvLabel}>Coaching</span>
                  <span style={kvValue}>
                    <DocLink
                      url={person.coachingAttestationUrl}
                      label="Consulter"
                    />
                  </span>
                </div>
                <div style={kvRow}>
                  <span style={kvLabel}>Contrat</span>
                  <span style={kvValue}>
                    <DocLink url={person.contractUrl} label="Consulter" />
                  </span>
                </div>
              </>
            )}

            {/* Referee attestation */}
            {person.type === "REFEREE" && (
              <>
                <h3 style={{ ...sectionTitle, marginTop: 24 }}>
                  Attestation arbitre
                </h3>
                <div style={kvRow}>
                  <span style={kvLabel}>Attestation</span>
                  <span style={kvValue}>
                    <DocLink
                      url={person.refereeDegreeAttestationUrl}
                      label="Consulter"
                    />
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Licenses — full width */}
        <h3 style={{ ...sectionTitle, marginTop: 32 }}>Licences</h3>
        {licenses && licenses.length > 0 ? (
          <div>
            {licenses.map((lic, idx) => (
              <div
                key={lic._id || lic.id || idx}
                style={{
                  ...kvRow,
                  flexDirection: "column",
                  alignItems: "stretch",
                  gap: 6,
                  padding: "12px 0",
                  borderBottom:
                    idx < licenses.length - 1
                      ? "1px solid var(--border)"
                      : "none",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span style={{ fontWeight: 700, color: "white" }}>
                    {lic.licenseType || (lic as any).type || "Licence"}
                  </span>
                  <StatusBadge status={lic.isActive ? "ACTIVE" : "EXPIRED"} />
                </div>
                <div
                  style={{
                    display: "flex",
                    gap: 24,
                    fontSize: "0.85rem",
                    color: "var(--muted)",
                  }}
                >
                  <span>
                    Émise le{" "}
                    {lic.issuedAt
                      ? new Date(lic.issuedAt).toLocaleDateString("fr-FR")
                      : "—"}
                  </span>
                  <span>
                    Expire le{" "}
                    {lic.expiryDate
                      ? new Date(lic.expiryDate).toLocaleDateString("fr-FR")
                      : "—"}
                  </span>
                </div>
                {(lic as any).paymentReceiptUrl && (
                  <div>
                    <DocLink
                      url={(lic as any).paymentReceiptUrl}
                      label="Reçu de paiement"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="muted" style={{ padding: "8px 0" }}>
            Aucune licence enregistrée.
          </p>
        )}

        {/* Footer */}
        <div
          style={{
            marginTop: 32,
            paddingTop: 16,
            borderTop: "1px solid var(--border)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            color: "var(--muted)",
            fontSize: "0.8rem",
          }}
        >
          <span>🇹🇳 Fédération Tunisienne de Jiu-Jitsu</span>
          <span>Généré le {new Date().toLocaleDateString("fr-FR")}</span>
        </div>
      </div>
    </div>
  );
}
