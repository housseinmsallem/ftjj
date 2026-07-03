import React, { useEffect, useState } from "react";
import AdminLayout from "../../components/layout/AdminLayout";
import MediaImageField from "../../components/ui/MediaImageField";
import api from "../../services/api";

const moduleConfig = {
  dashboard: {
    title: "Dashboard federal",
    description: "Vue rapide des activites et indicateurs de la plateforme.",
    endpoint: "/dashboard/stats",
    mode: "dashboard",
  },
  homepage: {
    title: "Page d'accueil",
    description:
      "Texte principal, boutons et etat de publication de la page d'accueil publique.",
    sectionTitle: "Contenu principal",
    endpoint: "/cms/homepage",
    mode: "settings",
    fields: [
      "heroTitle",
      "heroSubtitle",
      "introduction",
      "primaryButtonText",
      "primaryButtonLink",
      "secondaryButtonText",
      "secondaryButtonLink",
      "isPublished",
    ],
  },
  settings: {
    title: "Identite federale",
    description:
      "Nom, logo, couleurs et coordonnees officielles utilises sur le site public.",
    sectionTitle: "Identite et contact",
    endpoint: "/cms/platform-settings",
    mode: "settings",
    fields: [
      "federationName",
      "shortName",
      "logo",
      "primaryColor",
      "secondaryColor",
      "accentColor",
      "slogan",
      "contactEmail",
      "phone",
      "address",
      "footerText",
    ],
  },
  media: { title: "Mediatheque federale", endpoint: "/media", mode: "media" },
  events: {
    title: "Evenements",
    description: "Gestion des evenements publics de la federation.",
    endpoint: "/events",
    mode: "crud",
    fields: [
      "title",
      "type",
      "shortDescription",
      "startDate",
      "location",
      "city",
      "mainPoster",
      "registrationEnabled",
      "status",
      "featuredOnHome",
    ],
  },
  news: {
    title: "Actualites",
    description: "Publication des actualites officielles.",
    endpoint: "/news",
    mode: "crud",
    fields: [
      "title",
      "summary",
      "content",
      "mainImage",
      "category",
      "status",
      "featuredOnHome",
    ],
  },
  registrations: {
    title: "Inscriptions competitions",
    description: "Liste des inscriptions aux competitions.",
    endpoint: "/registrations",
    mode: "table",
  },
  categories: {
    title: "Categories",
    description: "Categories generees ou administrees pour les competitions.",
    endpoint: "/categories",
    mode: "table",
  },
  brackets: {
    title: "Bracket builder",
    description: "Suivi des tableaux de competition generes.",
    endpoint: "/brackets",
    mode: "brackets",
  },
  scoringSettings: {
    title: "Reglages scoring",
    description: "Parametres techniques des disciplines et durees de combat.",
    endpoint: "/scoring-settings",
    mode: "crud",
    fields: ["discipline", "rulesetName", "durationSeconds"],
  },
};

const fieldLabels = {
  heroTitle: "Titre principal",
  heroSubtitle: "Sous-titre",
  introduction: "Introduction",
  primaryButtonText: "Texte bouton principal",
  primaryButtonLink: "Lien bouton principal",
  secondaryButtonText: "Texte bouton secondaire",
  secondaryButtonLink: "Lien bouton secondaire",
  isPublished: "Publiee",
  federationName: "Nom officiel",
  shortName: "Acronyme",
  logo: "Logo",
  primaryColor: "Couleur principale",
  secondaryColor: "Couleur secondaire",
  accentColor: "Couleur accent",
  slogan: "Slogan",
  contactEmail: "Email de contact",
  phone: "Telephone",
  address: "Adresse",
  footerText: "Texte de pied de page",
  title: "Titre",
  type: "Type",
  shortDescription: "Description courte",
  startDate: "Date de debut",
  location: "Lieu",
  city: "Ville",
  mainPoster: "Affiche principale",
  registrationEnabled: "Inscriptions ouvertes",
  status: "Statut",
  featuredOnHome: "Afficher en accueil",
  summary: "Resume",
  content: "Contenu",
  mainImage: "Image principale",
  category: "Categorie",
  discipline: "Discipline",
  rulesetName: "Nom du reglement",
  durationSeconds: "Duree en secondes",
};

function Field({ name, value, onChange }) {
  const isBool =
    typeof value === "boolean" ||
    ["isPublished", "featuredOnHome", "registrationEnabled"].includes(name);

  if (["mainPoster", "mainImage", "logo"].includes(name)) {
    return (
      <label className="form-row">
        <span>{fieldLabels[name] || name}</span>
        <MediaImageField
          value={String(value ?? "")}
          onChange={(url) => onChange(name, url)}
        />
      </label>
    );
  }

  if (["primaryColor", "secondaryColor", "accentColor"].includes(name)) {
    return (
      <label className="form-row">
        <span>{fieldLabels[name] || name}</span>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <input
            type="color"
            value={String(value ?? "#000000")}
            onChange={(e) => onChange(name, e.target.value)}
            style={{
              width: "44px",
              height: "36px",
              padding: "2px",
              border: "1px solid var(--border)",
              borderRadius: "6px",
              cursor: "pointer",
              background: "transparent",
            }}
          />
          <input
            type="text"
            value={String(value ?? "")}
            onChange={(e) => onChange(name, e.target.value)}
            placeholder="#000000"
            style={{ width: "110px", fontFamily: "monospace" }}
          />
          <span
            style={{
              width: "28px",
              height: "28px",
              borderRadius: "6px",
              background: String(value ?? "#ccc"),
              border: "1px solid rgba(255,255,255,0.2)",
              flexShrink: 0,
            }}
          />
        </div>
      </label>
    );
  }

  if (isBool)
    return (
      <label className="form-row">
        <span>{fieldLabels[name] || name}</span>
        <select
          value={String(value ?? false)}
          onChange={(e) => onChange(name, e.target.value === "true")}
        >
          <option value="true">Oui</option>
          <option value="false">Non</option>
        </select>
      </label>
    );
  const isLong = [
    "content",
    "introduction",
    "footerText",
    "shortDescription",
  ].includes(name);
  return (
    <label className="form-row">
      <span>{fieldLabels[name] || name}</span>
      {isLong ? (
        <textarea
          rows="4"
          value={value ?? ""}
          onChange={(e) => onChange(name, e.target.value)}
        />
      ) : (
        <input
          type={name.toLowerCase().includes("date") ? "date" : "text"}
          value={value ?? ""}
          onChange={(e) => onChange(name, e.target.value)}
        />
      )}
    </label>
  );
}

function Table({ rows }) {
  const columns = [...new Set(rows.flatMap((row) => Object.keys(row || {})))]
    .filter((key) => !["__v"].includes(key))
    .slice(0, 8);
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row._id || JSON.stringify(row)}>
              {columns.map((c) => (
                <td key={c}>{renderCell(row[c])}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
function renderCell(value) {
  if (value == null) return "";
  if (Array.isArray(value)) {
    if (!value.length) return "0";

    return value
      .map((item) => readableValue(item))
      .filter(Boolean)
      .join(", ")
      .slice(0, 120);
  }
  return readableValue(value);
}

function readableValue(value) {
  if (value == null) return "";
  if (typeof value === "object") {
    // Common nested shapes for "latest registrations" (registration -> athlete/person)
    const athlete =
      value.athleteId ||
      value.athlete ||
      value.registration?.athlete ||
      value.registration?.athleteId ||
      value.player ||
      value.person;

    const registrationName = [value.firstName, value.lastName]
      .filter(Boolean)
      .join(" ");
    if (registrationName) return registrationName.slice(0, 120);

    if (athlete && typeof athlete === "object") {
      const fullName = athlete.fullName || athlete.name;
      if (fullName) return String(fullName).slice(0, 120);

      const firstLast = [athlete.firstName, athlete.lastName]
        .filter(Boolean)
        .join(" ");
      if (firstLast) return firstLast.slice(0, 120);

      if (athlete.club?.name) return String(athlete.club.name).slice(0, 120);
    }

    // Fallbacks
    const candidate = value.name || value.title || value.firstName || value._id;
    if (candidate) return String(candidate).slice(0, 120);

    return JSON.stringify(value).slice(0, 80);
  }
  return String(value).slice(0, 120);
}

export default function AdminFederationModule({ module }) {
  const cfg = moduleConfig[module] || moduleConfig.dashboard;
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState({});
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get(cfg.endpoint);
      if (cfg.mode === "settings") setForm(data || {});
      else if (cfg.mode === "dashboard") setRows([data || {}]);
      else setRows(Array.isArray(data) ? data : data?.data || []);
    } catch (error) {
      setMessage(error.response?.data?.message || "Chargement impossible");
    }
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, [module]);
  function change(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }
  async function saveSettings() {
    try {
      const { data } = await api.patch(cfg.endpoint, form);
      setForm(data);
      setMessage("Enregistre");
    } catch (error) {
      setMessage(error.response?.data?.message || "Enregistrement impossible");
    }
  }
  async function create() {
    try {
      await api.post(cfg.endpoint, form);
      setForm({});
      setMessage("Cree");
      load();
    } catch (error) {
      setMessage(error.response?.data?.message || "Creation impossible");
    }
  }
  async function upload(e) {
    const files = e.target.files;
    if (!files?.length) return;
    const fd = new FormData();
    [...files].forEach((file) =>
      fd.append(files.length === 1 ? "file" : "files", file),
    );
    try {
      await api.post(
        files.length === 1 ? "/media/upload" : "/media/upload-multiple",
        fd,
      );
      setMessage("Upload effectue");
      load();
    } catch (error) {
      setMessage(error.response?.data?.message || "Upload impossible");
    }
  }
  async function generate(path) {
    try {
      await api.post(path);
      setMessage("Action executee");
      load();
    } catch (error) {
      setMessage(error.response?.data?.message || "Action impossible");
    }
  }

  return (
    <AdminLayout>
      <div className="page-head">
        <h1>{cfg.title}</h1>
        {cfg.description && <p>{cfg.description}</p>}
      </div>
      {message && <div className="notice">{message}</div>}
      {loading && <div className="notice">Chargement...</div>}
      {cfg.mode === "dashboard" && (
        <section className="grid cards">
          {Object.entries(rows[0] || {})
            .filter(([k]) => k !== "latestRegistrations")
            .map(([k, v]) => (
              <div className="stat-card" key={k}>
                <strong>{renderCell(v)}</strong>
                <span>{k}</span>
              </div>
            ))}
        </section>
      )}
      {cfg.mode === "settings" && (
        <section className="panel">
          <h2>{cfg.sectionTitle || "Configuration"}</h2>
          {cfg.fields.map((f) => (
            <Field key={f} name={f} value={form[f]} onChange={change} />
          ))}
          <button className="primary" onClick={saveSettings}>
            Enregistrer
          </button>
        </section>
      )}
      {cfg.mode === "media" && (
        <>
          <section className="panel">
            <h2>Upload media</h2>
            <input type="file" multiple onChange={upload} />
          </section>
          <Table rows={rows} />
        </>
      )}
      {cfg.mode === "crud" && (
        <>
          <section className="panel">
            <h2>Ajouter</h2>
            {cfg.fields.map((f) => (
              <Field key={f} name={f} value={form[f]} onChange={change} />
            ))}
            <button className="primary" onClick={create}>
              Creer
            </button>
          </section>
          <Table rows={rows} />
        </>
      )}
      {cfg.mode === "brackets" && (
        <>
          <section className="panel">
            <h2>Outils rapides</h2>
            <p>
              Depuis une competition, utilisez les endpoints:
              generate-categories, generate-brackets, lock-brackets,
              publish-brackets. Cette vue liste les tableaux generes.
            </p>
          </section>
          <Table rows={rows} />
        </>
      )}
      {cfg.mode === "table" && <Table rows={rows} />}
    </AdminLayout>
  );
}
