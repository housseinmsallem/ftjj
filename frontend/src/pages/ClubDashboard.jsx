import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import DataTable from "../components/ui/DataTable";
import { formatJiuJitsuGrade, formatNewazaGrade } from "../utils/grades";
import ClubLayout from "../components/layout/ClubLayout";

function normalizeRows(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
}

export default function ClubDashboard() {
  const navigate = useNavigate();
  const [athletes, setAthletes] = useState([]);
  const [competitions, setCompetitions] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    Promise.allSettled([
      api.get("/athletes"),
      api.get("/public/competitions"),
      api.get("/documents"),
    ]).then(([athletesResponse, competitionsResponse, documentsResponse]) => {
      if (athletesResponse.status === "fulfilled")
        setAthletes(normalizeRows(athletesResponse.value.data));
      if (competitionsResponse.status === "fulfilled")
        setCompetitions(normalizeRows(competitionsResponse.value.data));
      if (documentsResponse.status === "fulfilled")
        setDocuments(normalizeRows(documentsResponse.value.data));
    });
  }, []);

  const filteredAthletes = useMemo(() => {
    const term = query.toLowerCase();
    return athletes.filter((row) =>
      JSON.stringify(row).toLowerCase().includes(term),
    );
  }, [athletes, query]);

  return (
    <ClubLayout>
      <div className="page-head">
        <h1>Espace Club / Association</h1>
        <p>
          Gestion des athletes, documents, licences, affiliations et
          inscriptions competitions.
        </p>
      </div>

      {/* Quick Actions */}
      <div
        style={{
          display: "flex",
          gap: "0.75rem",
          marginBottom: "1.5rem",
          flexWrap: "wrap",
        }}
      >
        <button
          className="primary"
          onClick={() => navigate("/club/import")}
          style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}
        >
          📥 Importer des athlètes
        </button>
        <button
          className="btn-outline"
          onClick={() => navigate("/club/transfer")}
          style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}
        >
          🔄 Demander un transfert
        </button>
        <button
          className="btn-outline"
          onClick={() => navigate("/club/competitions")}
          style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}
        >
          🏆 Inscriptions compétitions
        </button>
        <button
          className="btn-outline"
          onClick={() => navigate("/club/registrations")}
          style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}
        >
          📋 Mes inscriptions
        </button>
        <button
          className="btn-outline"
          onClick={() => navigate("/club/documents")}
          style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}
        >
          📁 Documents
        </button>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <b>{athletes.length}</b>
          <span>Athletes</span>
        </div>
        <div className="stat-card">
          <b>{documents.length}</b>
          <span>Documents</span>
        </div>
        <div className="stat-card">
          <b>{competitions.length}</b>
          <span>Competitions disponibles</span>
        </div>
      </div>

      <section className="card">
        <h2>Mes athletes</h2>
        <input
          className="search-input"
          placeholder="Rechercher nom, categorie, grade..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <DataTable
          columns={[
            {
              key: "name",
              label: "Nom",
              render: (row) =>
                `${row.firstName || ""} ${row.lastName || ""}`.trim(),
            },
            { key: "category", label: "Categorie" },
            {
              key: "jiujitsuGrade",
              label: "Grade Jiu-Jitsu",
              render: (row) => formatJiuJitsuGrade(row),
            },
            {
              key: "newazaGrade",
              label: "Grade Newaza",
              render: (row) => formatNewazaGrade(row),
            },
            { key: "licenseStatus", label: "Licence" },
          ]}
          rows={filteredAthletes}
        />
      </section>

      <section className="card">
        <h2>Competitions disponibles</h2>
        <DataTable
          columns={[
            { key: "title", label: "Competition" },
            { key: "location", label: "Lieu" },
            {
              key: "date",
              label: "Date",
              render: (row) =>
                row.date ? new Date(row.date).toLocaleDateString("fr-FR") : "",
            },
            { key: "registrationStatus", label: "Inscriptions" },
          ]}
          rows={competitions}
        />
      </section>

      <section className="card">
        <h2>Documents et affiliation</h2>
        <p>
          Deposez vos documents depuis le module documents. La Federation valide
          ensuite l affiliation, les licences et les certificats.
        </p>
        <DataTable
          columns={[
            { key: "title", label: "Document" },
            { key: "type", label: "Type" },
            { key: "status", label: "Statut" },
          ]}
          rows={documents}
        />
      </section>
    </ClubLayout>
  );
}
