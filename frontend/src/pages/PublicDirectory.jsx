import React, { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import { directoryFallbacks } from "../data/publicContent";
import {
  formatAthleteTechnicalGrades,
  formatJiuJitsuGrade,
  formatNewazaGrade,
} from "../utils/grades";

const meta = {
  clubs: {
    eyebrow: "Reseau officiel FTJJ",
    title: "Clubs & associations affilies",
    intro:
      "Un annuaire plus premium pour trouver les structures affiliees, leurs responsables et leurs coordonnees officielles.",
    asideTitle: "Des clubs verifies",
    asideText:
      "Recherche plus claire, presentation plus sportive et meilleure lecture des statuts d affiliation.",
    endpoint: "/public/clubs",
    searchPlaceholder: "Rechercher par club, gouvernorat, president...",
    filters: [
      { key: "governorate", label: "Gouvernorat" },
      { key: "affiliationStatus", label: "Statut" },
    ],
    details: [
      ["name", "Nom"],
      ["governorate", "Gouvernorat"],
      ["address", "Adresse"],
      ["president", "President"],
      ["email", "Email"],
      ["phone", "Telephone"],
      ["affiliationStatus", "Statut affiliation"],
    ],
  },
  athletes: {
    eyebrow: "Annuaire athletes",
    title: "Athletes licencies FTJJ",
    intro:
      "Les athletes apparaissent maintenant avec un rendu plus valorisant et des grades Jiu-Jitsu / Newaza bien separes.",
    asideTitle: "Grades et identite sportive",
    asideText:
      "Le portail public distingue desormais clairement les grades Jiu-Jitsu et Newaza sur les fiches athletes.",
    endpoint: "/public/athletes",
    searchPlaceholder: "Rechercher par nom, club, categorie...",
    filters: [
      { key: "category", label: "Categorie" },
      { key: "jiujitsuGrade", label: "Grade Jiu-Jitsu" },
      { key: "newazaGrade", label: "Grade Newaza" },
      { key: "licenseStatus", label: "Licence" },
    ],
    details: [
      ["fullName", "Nom complet"],
      ["club.name", "Club"],
      ["category", "Categorie"],
      ["weight", "Poids"],
      ["jiujitsuGrade", "Grade Jiu-Jitsu"],
      ["newazaGrade", "Grade Newaza"],
      ["rankingPoints", "Points ranking"],
      ["licenseNumber", "Numero licence"],
      ["licenseStatus", "Statut licence"],
      ["achievements", "Palmares"],
    ],
  },
  coaches: {
    eyebrow: "Encadrement FTJJ",
    title: "Entraineurs & coachs",
    intro:
      "Un repertoire plus lisible pour reperer les profils d encadrement, leurs clubs et leurs certifications.",
    asideTitle: "Profils d encadrement",
    asideText:
      "Une presentation plus claire des coachs relies aux clubs et aux certifications federales.",
    endpoint: "/public/coaches",
    searchPlaceholder: "Rechercher par nom, club, specialite...",
    filters: [
      { key: "licenseStatus", label: "Licence" },
      { key: "club.name", label: "Club" },
    ],
    details: [
      ["name", "Nom"],
      ["club.name", "Club"],
      ["certifications", "Certifications"],
      ["specialties", "Specialites"],
      ["experienceYears", "Experience"],
      ["licenseStatus", "Statut licence"],
    ],
  },
  referees: {
    eyebrow: "Arbitrage officiel",
    title: "Arbitres officiels",
    intro:
      "Le repertoire arbitrage gagne en lisibilite avec un meilleur rendu des niveaux, disponibilites et certifications.",
    asideTitle: "Corps arbitral",
    asideText:
      "Lecture plus simple des niveaux et disponibilites pour les competitions et evenements FTJJ.",
    endpoint: "/public/referees",
    searchPlaceholder: "Rechercher par nom, niveau, disponibilite...",
    filters: [
      { key: "level", label: "Niveau" },
      { key: "availability", label: "Disponibilite" },
    ],
    details: [
      ["name", "Nom"],
      ["level", "Niveau"],
      ["availability", "Disponibilite"],
      ["certifications", "Certifications"],
      ["events.length", "Evenements affectes"],
    ],
  },
};

function getValue(row, path) {
  if (path === "fullName")
    return `${row.firstName || ""} ${row.lastName || ""}`.trim();
  if (path === "technicalGrade") return formatAthleteTechnicalGrades(row);
  if (path === "jiujitsuGrade") return formatJiuJitsuGrade(row);
  if (path === "newazaGrade") return formatNewazaGrade(row);
  if (path.endsWith(".length")) {
    const base = path.replace(".length", "");
    const value = base
      .split(".")
      .reduce((accumulator, key) => accumulator?.[key], row);
    return Array.isArray(value) ? value.length : 0;
  }
  return path.split(".").reduce((accumulator, key) => accumulator?.[key], row);
}

function displayValue(value) {
  if (Array.isArray(value)) return value.length ? value.join(", ") : "--";
  if (typeof value === "boolean") return value ? "Oui" : "Non";
  if (value === undefined || value === null || value === "") return "--";
  return String(value);
}

function labelFor(row, type) {
  if (type === "athletes")
    return `${row.firstName || ""} ${row.lastName || ""}`.trim();
  return row.name || row.fullName || row.title || "FTJJ";
}

function subFor(row, type) {
  if (type === "clubs")
    return `${row.governorate || "Tunisie"} | ${row.president || row.presidentName || "Association affiliee"}`;
  if (type === "athletes")
    return `${row.club?.name || "Club FTJJ"} | ${row.category || "Categorie non renseignee"}`;
  if (type === "coaches")
    return `${row.club?.name || "Club FTJJ"} | ${row.experienceYears || 0} ans experience`;
  if (type === "referees")
    return `${row.level || "NATIONAL"} | ${(row.availability ?? row.available) ? "Disponible" : "Non disponible"}`;
  return "FTJJ";
}

function cardTags(row, type) {
  if (type === "athletes") {
    return [
      row.licenseStatus || "Valide",
      `Jiu-Jitsu: ${formatJiuJitsuGrade(row)}`,
      `Newaza: ${formatNewazaGrade(row)}`,
    ];
  }

  if (type === "clubs") {
    return [
      row.affiliationStatus || "Affilie",
      row.governorate || "Tunisie",
      row.phone || "Contact FTJJ",
    ];
  }

  if (type === "coaches") {
    return [
      row.licenseStatus || "Valide",
      row.club?.name || "Club FTJJ",
      row.experienceYears ? `${row.experienceYears} ans` : "Encadrement FTJJ",
    ];
  }

  return [
    row.level || "National",
    (row.availability ?? row.available) ? "Disponible" : "Indisponible",
    row.certifications?.length
      ? `${row.certifications.length} certifications`
      : "Arbitrage FTJJ",
  ];
}

export default function PublicDirectory({ type = "clubs" }) {
  const cfg = meta[type] || meta.clubs;
  const fallbackRows = directoryFallbacks[type] || [];
  const [rows, setRows] = useState([]);
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState({});
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    api
      .get(cfg.endpoint)
      .then(({ data }) => setRows(Array.isArray(data) ? data : data.data || []))
      .catch(() => setRows([]));
  }, [cfg.endpoint]);

  const sourceRows = rows.length ? rows : fallbackRows;

  const options = useMemo(() => {
    const result = {};
    cfg.filters.forEach((filter) => {
      result[filter.key] = [
        ...new Set(
          sourceRows
            .map((row) => displayValue(getValue(row, filter.key)))
            .filter((value) => value && value !== "--"),
        ),
      ].sort();
    });
    return result;
  }, [sourceRows, cfg.filters]);

  const filtered = sourceRows.filter((row) => {
    const haystack = JSON.stringify({
      ...row,
      technicalGrade: formatAthleteTechnicalGrades(row),
      jiujitsuGrade: formatJiuJitsuGrade(row),
      newazaGrade: formatNewazaGrade(row),
    }).toLowerCase();
    const matchesSearch = haystack.includes(query.toLowerCase());
    const matchesFilters = Object.entries(filters).every(
      ([key, value]) => !value || displayValue(getValue(row, key)) === value,
    );
    return matchesSearch && matchesFilters;
  });

  const summaryCards = [
    { label: "Profils visibles", value: filtered.length },
    {
      label: "Filtres actifs",
      value: Object.values(filters).filter(Boolean).length,
    },
    { label: "Criteres disponibles", value: cfg.filters.length },
  ];

  return (
    <div className="public-page-shell">
      <section
        className={`public-hero-banner public-hero-directory public-hero-directory-${type}`}
      >
        <div className="section-inner public-hero-grid">
          <div>
            <p className="eyebrow">{cfg.eyebrow}</p>
            <h1>{cfg.title}</h1>
            <p className="hero-copy">{cfg.intro}</p>
          </div>

          <div className="surface-card hero-aside directory-hero-card">
            <p className="eyebrow">Experience publique</p>
            <h2>{cfg.asideTitle}</h2>
            <p>{cfg.asideText}</p>
            <ul className="hero-meta-list">
              <li>{sourceRows.length} profils charges</li>
              <li>{cfg.filters.length} filtres principaux</li>
              <li>Fiches detaillees officielles FTJJ</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="public-section tight-surface directory-stage">
        <div className="section-inner">
          <div className="surface-card directory-command-shell">
            <div className="panel-headline">
              <h3>Rechercher et filtrer</h3>
              <span>{filtered.length} resultat(s)</span>
            </div>
            <div className="directory-tools">
              <input
                placeholder={cfg.searchPlaceholder}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
              {cfg.filters.map((filter) => (
                <select
                  key={filter.key}
                  value={filters[filter.key] || ""}
                  onChange={(event) =>
                    setFilters({ ...filters, [filter.key]: event.target.value })
                  }
                >
                  <option value="">{filter.label}</option>
                  {(options[filter.key] || []).map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              ))}
              <button
                className="public-btn ghost"
                onClick={() => {
                  setQuery("");
                  setFilters({});
                }}
              >
                Reinitialiser
              </button>
            </div>
          </div>

          <div className="directory-summary-cards">
            {summaryCards.map((card) => (
              <article
                className="surface-card directory-summary-card"
                key={card.label}
              >
                <span>{card.label}</span>
                <strong>{card.value}</strong>
              </article>
            ))}
          </div>

          <div className="directory-grid">
            {filtered.map((row, index) => (
              <article className="directory-card card" key={row._id || index}>
                <div className="directory-card-header">
                  <div className="entity-avatar">
                    {labelFor(row, type).slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h3>{labelFor(row, type)}</h3>
                    <p>{subFor(row, type)}</p>
                  </div>
                </div>

                <div className="entity-tags">
                  {cardTags(row, type).map((tag) => (
                    <span key={`${row._id || index}-${tag}`}>{tag}</span>
                  ))}
                </div>

                <div className="directory-card-footer">
                  <span className="directory-card-note">
                    Validation officielle FTJJ
                  </span>
                  <button
                    className="public-btn primary directory-button"
                    onClick={() => setSelected(row)}
                  >
                    Voir la fiche
                  </button>
                </div>
              </article>
            ))}
          </div>

          {!filtered.length && (
            <div className="surface-card directory-empty-state">
              <h3>Aucun resultat pour cette recherche</h3>
              <p>
                Essayez un autre mot-cle ou reinitialisez les filtres pour
                retrouver l ensemble de l annuaire.
              </p>
            </div>
          )}
        </div>

        {selected && (
          <div className="profile-modal" onClick={() => setSelected(null)}>
            <div
              className="profile-card card"
              onClick={(event) => event.stopPropagation()}
            >
              <button className="modal-close" onClick={() => setSelected(null)}>
                x
              </button>
              <div className="profile-head">
                <div className="entity-avatar large">
                  {labelFor(selected, type).slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="eyebrow">Fiche officielle</p>
                  <h2>{labelFor(selected, type)}</h2>
                  <p>{subFor(selected, type)}</p>
                </div>
              </div>
              <div className="profile-details">
                {cfg.details.map(([key, label]) => (
                  <div key={key} className="profile-detail-row">
                    <span>{label}</span>
                    <strong>{displayValue(getValue(selected, key))}</strong>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
