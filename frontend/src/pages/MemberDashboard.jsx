import React, { useEffect, useMemo, useState } from "react";
import { profileApi } from "../services/api";
import { useAuth } from "../context/AuthContext";
import DataTable from "../components/ui/DataTable";
import {
  BELT_OPTIONS,
  formatAthleteTechnicalGrades,
  formatJiuJitsuGrade,
  formatNewazaGrade,
} from "../utils/grades";

const genderOptions = [
  { value: "MALE", label: "Homme" },
  { value: "FEMALE", label: "Femme" },
];

const refereeAvailabilityOptions = [
  { value: "true", label: "Disponible" },
  { value: "false", label: "Indisponible" },
];

const refereeLevelOptions = [
  { value: "REGIONAL", label: "Regional" },
  { value: "NATIONAL", label: "National" },
  { value: "INTERNATIONAL", label: "International" },
];

const roleConfigs = {
  ATHLETE: {
    title: "Espace athlete",
    subtitle:
      "Profil sportif reel, grades Jiu-Jitsu et Newaza editables, licences et competitions liees a votre compte.",
    profileTitle: "Profil sportif",
    profileFields: [
      { key: "firstName", label: "Prenom", type: "text", required: true },
      { key: "lastName", label: "Nom", type: "text", required: true },
      { key: "phone", label: "Telephone", type: "text" },
      { key: "city", label: "Ville", type: "text" },
      { key: "birthDate", label: "Date de naissance", type: "date" },
      { key: "gender", label: "Genre", type: "select", options: genderOptions },
      { key: "category", label: "Categorie", type: "text", required: true },
      { key: "weight", label: "Poids", type: "number" },
      {
        key: "jiujitsuBelt",
        label: "Grade Jiu-Jitsu",
        type: "select",
        options: BELT_OPTIONS,
      },
      {
        key: "jiujitsuBlackBeltDegree",
        label: "Degre noir Jiu-Jitsu",
        type: "number",
        showWhen: (values) => values.jiujitsuBelt === "BLACK",
      },
      {
        key: "newazaBelt",
        label: "Grade Newaza",
        type: "select",
        options: BELT_OPTIONS,
      },
      {
        key: "newazaBlackBeltDegree",
        label: "Degre noir Newaza",
        type: "number",
        showWhen: (values) => values.newazaBelt === "BLACK",
      },
      { key: "licenseNumber", label: "Numero de licence", type: "text" },
      { key: "achievements", label: "Palmares", type: "textarea" },
    ],
    summary: ({ profile, club, related }) => [
      ["Club", club?.name || "Club non assigne"],
      ["Grade Jiu-Jitsu", formatJiuJitsuGrade(profile)],
      ["Grade Newaza", formatNewazaGrade(profile)],
      [
        "Licence",
        profile?.licenseStatus || related?.licenses?.[0]?.status || "PENDING",
      ],
      ["Points ranking", profile?.rankingPoints || 0],
    ],
    stats: ({ profile, related }) => [
      ["Jiu-Jitsu", formatJiuJitsuGrade(profile)],
      ["Newaza", formatNewazaGrade(profile)],
      ["Competitions", related.competitions?.length || 0],
      ["Documents", related.documents?.length || 0],
    ],
    sections: ({ related }) => [
      {
        title: "Mes competitions",
        rows: related.competitions || [],
        emptyText: "Aucune competition liee a votre profil pour le moment.",
        columns: [
          { key: "title", label: "Competition" },
          { key: "location", label: "Lieu" },
          { key: "date", label: "Date", render: (row) => formatDate(row.date) },
          { key: "registrationStatus", label: "Inscriptions" },
        ],
      },
      {
        title: "Mes licences",
        rows: related.licenses || [],
        emptyText: "Aucune licence disponible.",
        columns: [
          { key: "year", label: "Annee" },
          { key: "status", label: "Statut" },
          {
            key: "issuedAt",
            label: "Emission",
            render: (row) => formatDate(row.issuedAt),
          },
          {
            key: "expiresAt",
            label: "Expiration",
            render: (row) => formatDate(row.expiresAt),
          },
        ],
      },
      {
        title: "Mes documents",
        rows: related.documents || [],
        emptyText: "Aucun document rattache a votre compte.",
        columns: [
          { key: "title", label: "Document" },
          { key: "type", label: "Type" },
          { key: "status", label: "Statut" },
        ],
      },
    ],
  },
  COACH: {
    title: "Espace coach",
    subtitle:
      "Coordonnez vos informations, vos certifications et le groupe d athletes lie a votre club.",
    profileTitle: "Profil coach",
    profileFields: [
      { key: "name", label: "Nom complet", type: "text", required: true },
      { key: "email", label: "Email professionnel", type: "email" },
      { key: "phone", label: "Telephone", type: "text" },
      { key: "licenseNumber", label: "Numero de licence", type: "text" },
      { key: "experienceYears", label: "Annees d experience", type: "number" },
      { key: "certifications", label: "Certifications", type: "textarea" },
      { key: "specialties", label: "Specialites", type: "textarea" },
      { key: "bio", label: "Bio", type: "textarea" },
    ],
    summary: ({ profile, club, related }) => [
      ["Club", club?.name || "Club non assigne"],
      [
        "Licence",
        profile?.licenseStatus || related?.licenses?.[0]?.status || "PENDING",
      ],
      ["Experience", `${profile?.experienceYears || 0} an(s)`],
      ["Certifications", profile?.certifications?.length || 0],
    ],
    stats: ({ related, profile }) => [
      ["Athletes", related.athletes?.length || 0],
      ["Competitions", related.competitions?.length || 0],
      ["Certifications", profile?.certifications?.length || 0],
      ["Documents", related.documents?.length || 0],
    ],
    sections: ({ related }) => [
      {
        title: "Athletes du club",
        rows: related.athletes || [],
        emptyText: "Aucun athlete rattache a ce club.",
        columns: [
          {
            key: "name",
            label: "Athlete",
            render: (row) =>
              `${row.firstName || ""} ${row.lastName || ""}`.trim(),
          },
          { key: "category", label: "Categorie" },
          {
            key: "technicalGrades",
            label: "Grades",
            render: (row) => formatAthleteTechnicalGrades(row),
          },
          { key: "licenseStatus", label: "Licence" },
        ],
      },
      {
        title: "Competitions suivies",
        rows: related.competitions || [],
        emptyText: "Aucune competition disponible.",
        columns: [
          { key: "title", label: "Competition" },
          { key: "location", label: "Lieu" },
          { key: "date", label: "Date", render: (row) => formatDate(row.date) },
          {
            key: "liveEnabled",
            label: "Live",
            render: (row) => (row.liveEnabled ? "Oui" : "Non"),
          },
        ],
      },
      {
        title: "Mes licences et documents",
        rows: [...(related.licenses || []), ...(related.documents || [])],
        emptyText: "Aucune piece administrative disponible.",
        columns: [
          {
            key: "title",
            label: "Libelle",
            render: (row) => row.title || `Licence ${row.year}`,
          },
          {
            key: "type",
            label: "Type",
            render: (row) => row.type || "LICENSE",
          },
          { key: "status", label: "Statut" },
        ],
      },
    ],
  },
  REFEREE: {
    title: "Espace arbitre",
    subtitle:
      "Disponibilite, affectations, licences et pieces administratives sur de vraies donnees.",
    profileTitle: "Profil arbitre",
    profileFields: [
      { key: "name", label: "Nom complet", type: "text", required: true },
      { key: "email", label: "Email professionnel", type: "email" },
      { key: "phone", label: "Telephone", type: "text" },
      { key: "licenseNumber", label: "Numero de licence", type: "text" },
      {
        key: "level",
        label: "Niveau",
        type: "select",
        options: refereeLevelOptions,
      },
      {
        key: "availability",
        label: "Disponibilite",
        type: "select",
        options: refereeAvailabilityOptions,
      },
      { key: "certifications", label: "Certifications", type: "textarea" },
      { key: "bio", label: "Bio", type: "textarea" },
    ],
    summary: ({ profile, related }) => [
      ["Niveau", profile?.level || "REGIONAL"],
      ["Disponibilite", profile?.availability ? "Disponible" : "Indisponible"],
      ["Affectations", related.events?.length || 0],
      ["Certifications", profile?.certifications?.length || 0],
    ],
    stats: ({ related, profile }) => [
      ["Evenements", related.events?.length || 0],
      ["Documents", related.documents?.length || 0],
      ["Licences", related.licenses?.length || 0],
      ["Niveau", profile?.level || "REGIONAL"],
    ],
    sections: ({ related }) => [
      {
        title: "Mes affectations",
        rows: related.events || [],
        emptyText: "Aucune affectation enregistree.",
        columns: [
          { key: "title", label: "Competition" },
          { key: "location", label: "Lieu" },
          { key: "date", label: "Date", render: (row) => formatDate(row.date) },
          {
            key: "liveEnabled",
            label: "Live",
            render: (row) => (row.liveEnabled ? "Oui" : "Non"),
          },
        ],
      },
      {
        title: "Mes licences",
        rows: related.licenses || [],
        emptyText: "Aucune licence disponible.",
        columns: [
          { key: "year", label: "Annee" },
          { key: "status", label: "Statut" },
          {
            key: "issuedAt",
            label: "Emission",
            render: (row) => formatDate(row.issuedAt),
          },
          {
            key: "expiresAt",
            label: "Expiration",
            render: (row) => formatDate(row.expiresAt),
          },
        ],
      },
      {
        title: "Mes documents",
        rows: related.documents || [],
        emptyText: "Aucun document rattache a votre compte.",
        columns: [
          { key: "title", label: "Document" },
          { key: "type", label: "Type" },
          { key: "status", label: "Statut" },
        ],
      },
    ],
  },
};

function formatDate(value) {
  if (!value) return "Non renseigne";
  return new Date(value).toLocaleDateString("fr-FR");
}

function profileFormFromData(role, profile = {}) {
  if (role === "ATHLETE") {
    return {
      ...profile,
      birthDate: profile.birthDate
        ? String(profile.birthDate).slice(0, 10)
        : "",
      jiujitsuBelt: profile.jiujitsuBelt || profile.belt || "",
      jiujitsuBlackBeltDegree:
        profile.jiujitsuBlackBeltDegree ?? profile.blackBeltDegree ?? "",
      newazaBelt: profile.newazaBelt || "",
      newazaBlackBeltDegree: profile.newazaBlackBeltDegree ?? "",
      achievements: Array.isArray(profile.achievements)
        ? profile.achievements.join("\n")
        : "",
    };
  }

  if (role === "COACH") {
    return {
      ...profile,
      certifications: Array.isArray(profile.certifications)
        ? profile.certifications.join("\n")
        : "",
      specialties: Array.isArray(profile.specialties)
        ? profile.specialties.join("\n")
        : "",
    };
  }

  if (role === "REFEREE") {
    return {
      ...profile,
      availability: profile.availability === false ? "false" : "true",
      certifications: Array.isArray(profile.certifications)
        ? profile.certifications.join("\n")
        : "",
    };
  }

  return profile;
}

function serializeProfileForm(role, form = {}) {
  if (role === "ATHLETE") {
    return {
      ...form,
      jiujitsuBlackBeltDegree:
        form.jiujitsuBelt === "BLACK" ? form.jiujitsuBlackBeltDegree : null,
      newazaBlackBeltDegree:
        form.newazaBelt === "BLACK" ? form.newazaBlackBeltDegree : null,
    };
  }
  return form;
}

function renderField(field, values, onChange) {
  if (field.showWhen && !field.showWhen(values)) return null;

  const value = values[field.key] ?? "";
  let control = null;

  if (field.type === "select") {
    control = (
      <select
        value={value}
        onChange={(event) => onChange(field.key, event.target.value)}
      >
        <option value="">Choisir</option>
        {(field.options || []).map((option) => {
          const item =
            typeof option === "string"
              ? { value: option, label: option }
              : option;
          return (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          );
        })}
      </select>
    );
  } else if (field.type === "textarea") {
    control = (
      <textarea
        rows={field.rows || 4}
        value={value}
        onChange={(event) => onChange(field.key, event.target.value)}
      />
    );
  } else {
    control = (
      <input
        type={field.type || "text"}
        value={value}
        onChange={(event) => onChange(field.key, event.target.value)}
        required={field.required}
      />
    );
  }

  return (
    <label key={field.key}>
      {field.label}
      {control}
    </label>
  );
}

function TableSection({ title, rows = [], columns, emptyText }) {
  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <h2>{title}</h2>
          <small>{rows.length} resultat(s)</small>
        </div>
      </div>
      {rows.length ? (
        <DataTable columns={columns} rows={rows} />
      ) : (
        <p className="member-empty">{emptyText}</p>
      )}
    </section>
  );
}

export default function MemberDashboard({ role }) {
  const { user, refreshUser } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [savingAccount, setSavingAccount] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [accountForm, setAccountForm] = useState({ email: "" });
  const [profileForm, setProfileForm] = useState({});

  const config = roleConfigs[role] || roleConfigs.ATHLETE;

  async function loadDashboard() {
    setLoading(true);
    setError("");
    try {
      const payload = await profileApi.me();
      setData(payload);
      setAccountForm({ email: payload.user?.email || "" });
      setProfileForm(profileFormFromData(role, payload.profile || {}));
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Impossible de charger votre espace pour le moment.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, [role]);

  const stats = useMemo(
    () => config.stats(data || { profile: {}, related: {} }),
    [config, data],
  );
  const summary = useMemo(
    () => config.summary(data || { profile: {}, related: {}, club: null }),
    [config, data],
  );
  const sections = useMemo(
    () => config.sections(data || { related: {} }),
    [config, data],
  );

  async function saveAccount(event) {
    event.preventDefault();
    setSavingAccount(true);
    setMessage("");
    setError("");
    try {
      const payload = await profileApi.update({ user: accountForm });
      setData(payload);
      setAccountForm({ email: payload.user?.email || "" });
      setProfileForm(profileFormFromData(role, payload.profile || {}));
      await refreshUser();
      setMessage("Compte mis a jour avec succes.");
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Mise a jour du compte impossible.",
      );
    } finally {
      setSavingAccount(false);
    }
  }

  async function saveProfile(event) {
    event.preventDefault();
    setSavingProfile(true);
    setMessage("");
    setError("");
    try {
      const payload = await profileApi.update({
        profile: serializeProfileForm(role, profileForm),
      });
      setData(payload);
      setProfileForm(profileFormFromData(role, payload.profile || {}));
      setAccountForm({ email: payload.user?.email || "" });
      await refreshUser();
      setMessage("Profil enregistre avec succes.");
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Enregistrement du profil impossible.",
      );
    } finally {
      setSavingProfile(false);
    }
  }

  if (loading) {
    return (
      <div className="page role-dashboard">
        <div className="panel">
          <h2>Chargement...</h2>
          <p>Nous recuperons les donnees de votre espace.</p>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="page role-dashboard">
        <div className="alert">{error}</div>
      </div>
    );
  }

  return (
    <div className="page role-dashboard member-dashboard">
      <div className="page-head">
        <h1>{config.title}</h1>
        <p>{config.subtitle}</p>
        <small>
          Connecte : {user?.name || data?.user?.name || "Utilisateur"} · role{" "}
          {role}
        </small>
      </div>

      {message && <div className="notice">{message}</div>}
      {error && <div className="alert">{error}</div>}

      <div className="stats-grid">
        {stats.map(([label, value]) => (
          <div className="stat-card" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>

      <div className="member-dashboard-grid">
        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Mon statut</h2>
              <small>Lecture rapide des informations utiles</small>
            </div>
          </div>
          <div className="member-summary-list">
            {summary.map(([label, value]) => (
              <div className="member-summary-row" key={label}>
                <span>{label}</span>
                <strong>{value}</strong>
              </div>
            ))}
          </div>
        </section>

        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Compte d acces</h2>
              <small>Email du compte relie a votre espace</small>
            </div>
          </div>
          <form className="member-form-grid" onSubmit={saveAccount}>
            <label>
              Email
              <input
                type="email"
                value={accountForm.email || ""}
                onChange={(event) =>
                  setAccountForm({ email: event.target.value })
                }
                required
              />
            </label>
            <div className="form-actions member-submit-row">
              <button
                className="primary"
                type="submit"
                disabled={savingAccount}
              >
                {savingAccount ? "Enregistrement..." : "Enregistrer le compte"}
              </button>
            </div>
          </form>
        </section>
      </div>

      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>{config.profileTitle}</h2>
            <small>
              Ces informations sont maintenant reliees a votre compte et restent
              modifiables.
            </small>
          </div>
        </div>
        <form className="member-form-grid" onSubmit={saveProfile}>
          {config.profileFields.map((field) =>
            renderField(field, profileForm, (key, value) =>
              setProfileForm((current) => ({ ...current, [key]: value })),
            ),
          )}
          <div className="form-actions member-submit-row">
            <button className="primary" type="submit" disabled={savingProfile}>
              {savingProfile ? "Enregistrement..." : "Enregistrer le profil"}
            </button>
          </div>
        </form>
      </section>

      {sections.map((section) => (
        <TableSection
          key={section.title}
          title={section.title}
          rows={section.rows}
          columns={section.columns}
          emptyText={section.emptyText}
        />
      ))}
    </div>
  );
}
