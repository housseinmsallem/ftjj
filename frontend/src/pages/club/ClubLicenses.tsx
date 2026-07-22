import React, { useState, useMemo } from "react";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import PageHeader from "../../components/shared/PageHeader";
import LoadingSpinner from "../../components/shared/LoadingSpinner";
import EmptyState from "../../components/shared/EmptyState";
import StatusBadge from "../../components/shared/StatusBadge";

import LicensePrintWrapper from "../../components/licences/LicensePrintWrapper";

import type { License, Person, Pricing } from "../../types";

export default function ClubLicenses(): React.ReactElement {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<"all" | "active" | "expired">("all");
  const [printLicense, setPrintLicense] = useState<License | null>(null);

  const clubId = user?.club?._id || user?.club?.id || "";

  const {
    data: licensesData,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["licenses", "club", clubId],
    queryFn: async () => {
      const res = await api.get("/licenses", { params: { clubId } });
      return (((res.data as any)?.data ?? res.data) as License[]) || [];
    },
    enabled: !!clubId,
  });

  const { data: personsData } = useQuery({
    queryKey: ["persons"],
    queryFn: async () => {
      const res = await api.get("/persons");
      return (((res.data as any)?.data ?? res.data) as Person[]) || [];
    },
  });

  const { data: pricingData } = useQuery({
    queryKey: ["pricing"],
    queryFn: async () => {
      const res = await api.get("/pricing");
      return (((res.data as any)?.data ?? res.data) as Pricing[]) || [];
    },
  });

  const persons = personsData || [];
  const pricingOptions = pricingData || [];
  const licenses = licensesData || [];

  // Enrich a license with person + pricing data for printing
  const enrichLicense = (lic: License): any => {
    const person = persons.find((p) => (p._id || p.id) === lic.personId);
    const pricing = pricingOptions.find(
      (pr) => (pr._id || pr.id) === (lic as any).pricingId,
    );
    const club = clubId
      ? { id: clubId, name: user?.club?.name || "" }
      : undefined;
    return {
      ...lic,
      person: person
        ? {
            ...person,
            club,
            athleteDetails: (person as any).athleteDetails || null,
          }
        : undefined,
      pricing: pricing || undefined,
    };
  };

  const filteredLicenses = useMemo(() => {
    if (filter === "all") return licenses;
    return filter === "active"
      ? licenses.filter((l) => l.isActive)
      : licenses.filter((l) => !l.isActive);
  }, [licenses, filter]);

  function getPersonName(license: License): string {
    if (license.person?.firstName && license.person?.lastName) {
      return `${license.person.firstName} ${license.person.lastName}`;
    }
    return "—";
  }

  const filterPillStyle = (active: boolean): React.CSSProperties => ({
    padding: "6px 16px",
    borderRadius: 20,
    cursor: "pointer",
    fontWeight: active ? 700 : 500,
    background: active ? "var(--red)" : "transparent",
    color: active ? "#fff" : "var(--text)",
    border: `1px solid ${active ? "var(--red)" : "var(--border)"}`,
    fontSize: "0.85rem",
  });

  if (isLoading) {
    return (
      <div className="page">
        <LoadingSpinner text="Chargement des licences..." />
      </div>
    );
  }

  if (isError && !licensesData) {
    return (
      <div className="page">
        <EmptyState
          title="Erreur de chargement"
          description={
            (error as any)?.message || "Impossible de charger les licences"
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

  return (
    <div className="page">
      <PageHeader
        title="Licences du club"
        breadcrumbs={[{ label: "Club", to: "/club" }, { label: "Licences" }]}
      />

      <div
        style={{
          display: "flex",
          gap: 8,
          marginBottom: 20,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        {(["all", "active", "expired"] as const).map((f) => (
          <button
            key={f}
            style={filterPillStyle(filter === f)}
            onClick={() => setFilter(f)}
          >
            {f === "all" ? "Toutes" : f === "active" ? "Actives" : "Expirées"}
          </button>
        ))}
        <span
          className="muted"
          style={{ marginLeft: "auto", fontSize: "0.85rem" }}
        >
          {filteredLicenses.length} licence
          {filteredLicenses.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="table-card">
        {filteredLicenses.length === 0 ? (
          <EmptyState
            title="Aucune licence"
            description={
              filter !== "all"
                ? `Aucune licence ${filter === "active" ? "active" : "expirée"} trouvée`
                : "Aucune licence enregistrée pour ce club"
            }
          />
        ) : (
          <div className="table-wrap">
            <table className="smart-table">
              <thead>
                <tr>
                  <th>Personne</th>
                  <th>Type</th>
                  <th>Date d'émission</th>
                  <th>Expiration</th>
                  <th>Statut</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredLicenses.map((license) => (
                  <tr key={license._id || license.id}>
                    <td>{getPersonName(license)}</td>
                    <td>{license.licenseType || "—"}</td>
                    <td>
                      {license.issuedAt
                        ? new Date(license.issuedAt).toLocaleDateString("fr-FR")
                        : "—"}
                    </td>
                    <td>
                      {license.expiryDate
                        ? new Date(license.expiryDate).toLocaleDateString(
                            "fr-FR",
                          )
                        : "—"}
                    </td>
                    <td>
                      <StatusBadge
                        status={license.isActive ? "ACTIVE" : "EXPIRED"}
                      />
                    </td>
                    <td>
                      <div className="row-actions">
                        <button
                          className="btn ghost"
                          onClick={() =>
                            navigate(`/identite-federale/${license.personId}`)
                          }
                        >
                          Détails
                        </button>
                        {license.isActive && (
                          <button
                            className="btn primary"
                            onClick={() => setPrintLicense(license)}
                          >
                            🖨️ Imprimer
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {printLicense && (
        <div className="modal-overlay" onClick={() => setPrintLicense(null)}>
          <div
            className="modal-content"
            style={{ maxWidth: 500, textAlign: "center" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3>Imprimer la licence</h3>
            <LicensePrintWrapper license={enrichLicense(printLicense)} />
            <button
              className="btn ghost"
              style={{ marginTop: 12 }}
              onClick={() => setPrintLicense(null)}
            >
              Fermer
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
