import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "../services/api";
import PageHeader from "../components/shared/PageHeader";
import LoadingSpinner from "../components/shared/LoadingSpinner";

export default function AthleteExport(): React.ReactElement {
  const [exporting, setExporting] = useState(false);

  const { data: athletesData, isLoading: loadingAthletes } = useQuery({
    queryKey: ["persons", "ATHLETE"],
    queryFn: async () => {
      const res = await api.get("/persons", { params: { type: "ATHLETE" } });
      return (res.data?.data ?? res.data ?? []) as any[];
    },
  });

  const { data: clubsData } = useQuery({
    queryKey: ["clubs"],
    queryFn: async () => {
      const res = await api.get("/clubs");
      return (res.data?.data ?? res.data ?? []) as any[];
    },
  });

  const athletes = athletesData || [];
  const clubs = clubsData || [];
  const countByClub: Record<string, number> = {};
  athletes.forEach((a: any) => {
    const cid = a.clubId || a.club?._id || a.club?.id || "Sans club";
    countByClub[cid] = (countByClub[cid] || 0) + 1;
  });

  async function exportCSV(clubId?: string) {
    setExporting(true);
    try {
      const params: Record<string, string> = { type: "ATHLETE" };
      if (clubId) params.clubId = clubId;
      const res = await api.get("/persons/export", {
        params,
        responseType: "blob",
      });
      const blob = res.data;
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = clubId
        ? `athletes-club-${clubId.slice(0, 8)}.csv`
        : "athletes.csv";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error("Export failed", err);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="page">
      <PageHeader
        title="Exportation des athlètes"
        breadcrumbs={[{ label: "Exportation" }]}
      />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        {/* Export all athletes */}
        <div className="card" style={{ padding: 24, textAlign: "center" }}>
          <div style={{ fontSize: "3rem", marginBottom: 12 }}>🥋</div>
          <h3 style={{ margin: "0 0 8px", color: "var(--text)" }}>
            Tous les athlètes
          </h3>
          <p className="muted" style={{ marginBottom: 16 }}>
            {loadingAthletes
              ? "Chargement..."
              : `${athletes.length} athlète${athletes.length !== 1 ? "s" : ""} trouvé${athletes.length !== 1 ? "s" : ""}`}
          </p>
          <button
            className="btn primary"
            onClick={() => exportCSV()}
            disabled={exporting || loadingAthletes}
          >
            {exporting
              ? "Téléchargement..."
              : "📥 Exporter tous les athlètes (CSV)"}
          </button>
        </div>

        {/* Export by club */}
        <div className="card" style={{ padding: 24 }}>
          <h3 style={{ margin: "0 0 16px", color: "var(--text)" }}>Par club</h3>
          {clubs.length === 0 ? (
            <p className="muted">Aucun club trouvé.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {clubs.map((club: any) => {
                const cid = club._id || club.id;
                const count = countByClub[cid] || 0;
                return (
                  <div
                    key={cid}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "10px 14px",
                      background: "var(--bg)",
                      borderRadius: 8,
                      border: "1px solid var(--border)",
                    }}
                  >
                    <div>
                      <strong style={{ color: "var(--text)" }}>
                        {club.name}
                      </strong>
                      <span
                        className="muted"
                        style={{ marginLeft: 8, fontSize: "0.85rem" }}
                      >
                        ({count} athlète{count !== 1 ? "s" : ""})
                      </span>
                    </div>
                    <button
                      className="btn ghost"
                      style={{ fontSize: "0.85rem" }}
                      onClick={() => exportCSV(cid)}
                      disabled={exporting}
                    >
                      📥 Exporter
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="card" style={{ padding: 24, marginTop: 24 }}>
        <h3 style={{ margin: "0 0 8px", color: "var(--text)" }}>
          Format du fichier
        </h3>
        <p className="muted" style={{ margin: 0 }}>
          Le fichier CSV exporté contient les colonnes : code, firstName, lastName,
            dateOfBirth, ageDivision, weightCategory, nationality, gender,
            identityDocumentType, identityDocumentUrl, birthCertificateUrl,
            achievements, photoUrl, type, grade, clubId. Les colonnes ageDivision et
          weightCategory sont calculées dynamiquement selon les règles JJIF. Ce
          format est compatible avec la fonction d'importation CSV.
        </p>
      </div>
    </div>
  );
}
