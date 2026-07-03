import React, { useEffect, useState } from "react";
import api from "../services/api";
import AdminLayout from "../components/layout/AdminLayout";
import SmartTable from "../components/ui/SmartTable";
import ResourceForm from "../components/ui/ResourceForm";
import {
  formatAthleteTechnicalGrades,
  formatJiuJitsuGrade,
  formatNewazaGrade,
} from "../utils/grades";

const BASE_URL = "";

const configs = {
  clubs: {
    title: "Gestion des clubs",
    endpoint: "/clubs",
    fields: [
      { key: "name", label: "Nom club", type: "text", required: true },
      { key: "governorate", label: "Gouvernorat" },
      { key: "president", label: "President" },
      { key: "email", label: "Email", type: "email" },
      { key: "phone", label: "Telephone" },
      {
        key: "logo",
        label: "Logo",
        type: "file",
        render: (row) => (
          <img src={`${BASE_URL}${row.logo}`} className="custom-club-style" />
        ),
      },
    ],
    columns: [
      ["name", "Club"],
      ["governorate", "Gouvernorat"],
      ["president", "President"],
      ["affiliationStatus", "Statut"],
    ],
  },
  athletes: {
    title: "Gestion des athletes",
    endpoint: "/athletes",
    fields: [
      { key: "firstName", label: "Prenom", type: "text", required: true },
      { key: "lastName", label: "Nom", type: "text", required: true },
      { key: "category", label: "Categorie", type: "text", required: true },
      { key: "weight", label: "Poids", type: "number" },
      { key: "phone", label: "Telephone", type: "text" },
      { key: "city", label: "Ville", type: "text" },
      {
        key: "club",
        label: "Club",
        type: "lookup",
        endpoint: "/clubs",
        displayKey: "name",
      },
      { key: "birthDate", label: "Date de naissance", type: "date" },
      {
        key: "photo",
        label: "Photo",
        type: "file",
        render: (row) => (
          <img src={`${BASE_URL}${row.photo}`} className="custom-club-style" />
        ),
      },
      { key: "licenseNumber", label: "Numero licence", type: "text" },
      {
        key: "jiujitsuBelt",
        label: "Grade Jiu-Jitsu",
        type: "select",
        options: ["WHITE", "BLUE", "PURPLE", "BROWN", "BLACK"],
      },
      {
        key: "jiujitsuBlackBeltDegree",
        label: "Degre noir Jiu-Jitsu",
        type: "number",
      },
      {
        key: "newazaBelt",
        label: "Grade Newaza",
        type: "select",
        options: ["WHITE", "BLUE", "PURPLE", "BROWN", "BLACK"],
      },
      {
        key: "newazaBlackBeltDegree",
        label: "Degre noir Newaza",
        type: "number",
      },
      {
        key: "licenseStatus",
        label: "Statut licence",
        type: "select",
        options: ["PENDING", "ACTIVE", "EXPIRED", "SUSPENDED"],
      },
      { key: "rankingPoints", label: "Points", type: "number" },
      { key: "achievements", label: "Palmares", type: "textarea", rows: 4 },
    ],
    columns: [
      ["name", "Athlete"],
      ["category", "Categorie"],
      ["jiujitsuGrade", "Grade Jiu-Jitsu"],
      ["newazaGrade", "Grade Newaza"],
      ["rankingPoints", "Points"],
      ["licenseStatus", "Licence"],
      ["photo", "Photo"],
    ],
  },
  coaches: {
    title: "Gestion des coachs",
    endpoint: "/coaches",
    fields: [
      { key: "firstName", label: "Prénom", type: "text", required: true },
      { key: "lastName", label: "Nom", type: "text", required: true },
      { key: "email", label: "Email", type: "email" },
      { key: "phone", label: "Telephone", type: "text" },
      {
        key: "club",
        label: "Club",
        type: "lookup",
        endpoint: "/clubs",
        displayKey: "name",
      },
      { key: "licenseNumber", label: "Numero licence", type: "text" },
      { key: "experienceYears", label: "Experience", type: "number" },
      { key: "birthDate", label: "Date de naissance", type: "date" },

      {
        key: "licenseStatus",
        label: "Licence",
        type: "select",
        options: ["PENDING", "ACTIVE", "EXPIRED"],
      },
      {
        key: "photo",
        label: "Photo",
        type: "file",
        render: (row) => (
          <img src={`${BASE_URL}${row.photo}`} className="custom-club-style" />
        ),
      },
      {
        key: "certifications",
        label: "Certifications",
        type: "textarea",
        rows: 4,
      },
      { key: "specialties", label: "Specialites", type: "textarea", rows: 4 },
      { key: "bio", label: "Bio", type: "textarea", rows: 4 },
    ],
    columns: [
      ["firstName", "Prénom"],
      ["lastName", "Nom"],
      ["experienceYears", "Annees"],
      ["licenseNumber", "Licence N"],
      ["licenseStatus", "Statut"],
      ["birthDate", "Date de naissance"],
    ],
  },
  referees: {
    title: "Gestion des arbitres",
    endpoint: "/referees",
    fields: [
      { key: "firstName", label: "Prénom", type: "text", required: true },
      { key: "lastName", label: "Nom", type: "text", required: true },
      { key: "email", label: "Email", type: "email" },
      { key: "phone", label: "Telephone", type: "text" },
      { key: "licenseNumber", label: "Numero licence", type: "text" },
      { key: "birthDate", label: "Date de naissance", type: "date" },

      {
        key: "level",
        label: "Niveau",
        type: "select",
        options: ["REGIONAL", "NATIONAL", "INTERNATIONAL"],
      },
      {
        key: "availability",
        label: "Disponible",
        type: "select",
        options: ["true", "false"],
      },
      {
        key: "certifications",
        label: "Certifications",
        type: "textarea",
        rows: 4,
      },
      {
        key: "photo",
        label: "Photo",
        type: "file",
        render: (row) => (
          <img src={`${BASE_URL}${row.photo}`} className="custom-club-style" />
        ),
      },
      { key: "bio", label: "Bio", type: "textarea", rows: 4 },
    ],
    columns: [
      ["firstName", "Prénom"],
      ["lastName", "Nom"],
      ["level", "Niveau"],
      ["availability", "Disponible"],
      ["licenseNumber", "Licence N"],
      ["birthDate", "Date de naissance"],
    ],
  },
  technicians: {
    title: "Gestion des techniciens",
    endpoint: "/technicians",
    fields: [
      { key: "firstName", label: "Prénom", type: "text", required: true },
      { key: "lastName", label: "Nom", type: "text", required: true },
      { key: "email", label: "Email", type: "email" },
      { key: "phone", label: "Telephone", type: "text" },
      {
        key: "club",
        label: "Club",
        type: "lookup",
        endpoint: "/clubs",
        displayKey: "name",
      },
      { key: "licenseNumber", label: "Numero licence", type: "text" },
      { key: "birthDate", label: "Date de naissance", type: "date" },
      {
        key: "specialty",
        label: "Specialite",
        type: "select",
        options: ["BJJ", "NE_WAZA", "MMA", "JU_JITSU", "SELF_DEFENSE", "OTHER"],
      },
      {
        key: "licenseStatus",
        label: "Licence",
        type: "select",
        options: ["PENDING", "ACTIVE", "EXPIRED"],
      },
      { key: "experienceYears", label: "Experience", type: "number" },
      {
        key: "photo",
        label: "Photo",
        type: "file",
        render: (row) => (
          <img src={BASE_URL + row.photo} className="custom-club-style" />
        ),
      },
      {
        key: "certifications",
        label: "Certifications",
        type: "textarea",
        rows: 4,
      },
      { key: "bio", label: "Bio", type: "textarea", rows: 4 },
    ],
    columns: [
      ["firstName", "Prénom"],
      ["lastName", "Nom"],
      ["specialty", "Specialite"],
      ["experienceYears", "Annees"],
      ["licenseNumber", "Licence N"],
      ["licenseStatus", "Statut"],
      ["birthDate", "Date de naissance"],
    ],
  },
  competitions: {
    title: "Gestion des competitions",
    endpoint: "/competitions",
    fields: [
      { key: "title", label: "Titre", type: "text", required: true },
      {
        key: "type",
        label: "Type",
        type: "select",
        options: [
          "OPEN",
          "CHAMPIONSHIP",
          "STAGE",
          "GRADE_PASSAGE",
          "NATIONAL_EVENT",
        ],
      },
      { key: "date", label: "Date", type: "date", required: true },
      { key: "location", label: "Lieu" },
      { key: "maxParticipants", label: "Limite", type: "number" },
    ],
    columns: [
      ["title", "Evenement"],
      ["type", "Type"],
      ["date", "Date"],
      ["location", "Lieu"],
      ["registrationStatus", "Inscriptions"],
    ],
  },
  documents: {
    title: "Validation documentaire",
    endpoint: "/documents",
    fields: [
      { key: "title", label: "Titre", type: "text", required: true },
      {
        key: "type",
        label: "Type",
        type: "select",
        options: [
          "LICENSE",
          "MEDICAL_CERTIFICATE",
          "AFFILIATION",
          "REGULATION",
          "ADMIN",
        ],
      },
      {
        key: "ownerType",
        label: "Proprietaire",
        type: "select",
        options: [
          "CLUB",
          "ATHLETE",
          "COACH",
          "REFEREE",
          "TECHNICIAN",
          "FEDERATION",
        ],
      },
      {
        key: "ownerId",
        label: "ID propriétaire",
        type: "lookup",
        endpoint: "/athletes",
        displayKey: "name",
        required: true,
      },
      { key: "fileUrl", label: "URL fichier" },
    ],
    columns: [
      ["title", "Document"],
      ["type", "Type"],
      ["ownerType", "Proprietaire"],
      ["status", "Statut"],
    ],
  },
  payments: {
    title: "Paiements et recus",
    endpoint: "/payments",
    fields: [
      {
        key: "payerType",
        label: "Payeur",
        type: "select",
        required: true,
        options: ["CLUB", "ATHLETE"],
      },
      {
        key: "payerId",
        label: "Payeur",
        type: "lookup",
        endpoint: "/athletes",
        displayKey: "name",
        required: true,
      },
      { key: "amount", label: "Montant", type: "number", required: true },
      {
        key: "method",
        label: "Methode",
        type: "select",
        options: [
          "MANUAL",
          "BANK_TRANSFER",
          "KONNECT",
          "FLOUCI",
          "STRIPE",
          "PAYPAL",
        ],
      },
      {
        key: "purpose",
        label: "Objet",
        type: "select",
        required: true,
        options: [
          "CLUB_LICENSE",
          "ATHLETE_LICENSE",
          "COMPETITION_REGISTRATION",
        ],
      },
    ],
    columns: [
      ["payerType", "Payeur"],
      ["amount", "Montant"],
      ["method", "Methode"],
      ["purpose", "Objet"],
      ["status", "Statut"],
    ],
  },
  licenses: {
    title: "Licences federales",
    endpoint: "/licenses",
    fields: [
      {
        key: "ownerType",
        label: "Type",
        type: "select",
        required: true,
        options: ["CLUB", "ATHLETE", "COACH", "REFEREE", "TECHNICIAN"],
      },
      {
        key: "ownerId",
        label: "Propriétaire",
        type: "lookup",
        endpoint: "/athletes",
        displayKey: "name",
        required: true,
      },
      { key: "year", label: "Annee", type: "number" },
      { key: "amount", label: "Montant (TND)", type: "number" },
      { key: "serviceType", label: "Service", type: "select", options: ["INSCRIPTION_ANNUELLE","LICENSE_COACH","LICENSE_TECHNICIEN","LICENSE_ATHLETE","LICENSE_REFEREE","STAGE_PASSAGE_GRADE","RECYCLAGE_COACH","RECYCLAGE_ARBITRE","PASSAGE_GRADE_MARRON","PASSAGE_GRADE_BLACK","PASSAGE_GRADE_ARBITRE_1","PASSAGE_GRADE_ARBITRE_2","PASSAGE_GRADE_ARBITRE_3","COACH_FEDERALE","PARTICIPATION_COMPETITION","PARTICIPATION_QUALIFICATIONS","PARTICIPATION_FINALS","ASSURANCE_COMPETITION_MALE","ASSURANCE_COMPETITION_FEMALE","OTHER"] },
      { key: "status", label: "Statut", type: "select", options: ["PENDING","ACTIVE","EXPIRED","SUSPENDED","REJECTED"] },
    ],
    columns: [
      ["ownerType", "Type"],
      ["year", "Annee"],
      ["status", "Statut"],
      ["amount", "Montant"],
    ],
  },
  "audit-logs": {
    title: "Audit administratif",
    endpoint: "/audit-logs",
    fields: [],
    columns: [
      ["action", "Action"],
      ["entity", "Entite"],
      ["createdAt", "Date"],
    ],
  },
};

function normalizeFields(fields) {
  return fields.map((field) => ({
    key: field.key,
    label: field.label,
    type: field.type || "text",
    required: field.required || false,
    options: field.options || [],
    rows: field.rows,
  }));
}

function normalizeInitialValues(row = {}) {
  const values = { ...row };
  ["achievements", "certifications", "specialties"].forEach((key) => {
    if (Array.isArray(values[key])) values[key] = values[key].join("\n");
  });
  if (typeof values.availability === "boolean")
    values.availability = values.availability ? "true" : "false";
  if (!values.jiujitsuBelt && values.belt) values.jiujitsuBelt = values.belt;
  if (values.jiujitsuBlackBeltDegree == null && values.blackBeltDegree != null)
    values.jiujitsuBlackBeltDegree = values.blackBeltDegree;
  return values;
}

function normalizeColumns(cols) {
  return cols.map((col) => {
    // 1. If it's a standard configuration array: [key, label]
    let key, label, customRender;

    if (Array.isArray(col)) {
      [key, label] = col;
    } else {
      // 2. If it's an object configuration: { key, label, render }
      key = col.key;
      label = col.label;
      customRender = col.render;
    }

    return {
      key,
      label,
      render: (row, i) => {
        // If a completely custom render function was provided in the object, use it!
        if (customRender) return customRender(row, i);

        // --- Catch image fields dynamically ---
        if (key === "photo" || key === "logo") {
          return row[key] ? (
            <img
              src={`${BASE_URL}${row[key]}`}
              alt={key}
              style={{
                width: "45px",
                height: "45px",
                borderRadius: key === "photo" ? "50%" : "4px",
                objectFit: "cover",
              }}
            />
          ) : (
            <span className="no-media">Aucun(e)</span>
          );
        }

        // --- Your existing fallback rendering logic ---
        if (key === "name")
          return row.firstName ? `${row.firstName} ${row.lastName}` : row.name;
        if (key === "technicalGrade") return formatAthleteTechnicalGrades(row);
        if (key === "jiujitsuGrade") return formatJiuJitsuGrade(row);
        if (key === "newazaGrade") return formatNewazaGrade(row);
        if (key === "availability")
          return row[key] === false || row[key] === "false" ? "Non" : "Oui";
        if (key === "date" || key === "createdAt")
          return row[key] ? new Date(row[key]).toLocaleDateString() : "";
        if (Array.isArray(row[key])) return row[key].join(", ");

        return row[key];
      },
    };
  });
}

export default function AdminResourcePage({ type }) {
  const cfg = configs[type];
  const [rows, setRows] = useState([]);
  const [message, setMessage] = useState("");
  const [editing, setEditing] = useState(null);

  async function load() {
    const { data } = await api.get(cfg.endpoint);
    setRows(Array.isArray(data) ? data : data.data || []);
  }

  useEffect(() => {
    setEditing(null);
    load();
  }, [type]);

  async function create(payload) {
    try {
      await api.post(cfg.endpoint, payload);
      setMessage("Ajout effectue avec succes");
      await load();
    } catch (error) {
      setMessage(error.response?.data?.message || "Action impossible");
    }
  }

  async function update(payload) {
    if (!editing?._id) return;
    try {
      await api.put(`${cfg.endpoint}/${editing._id}`, payload);
      setEditing(null);
      setMessage("Modification enregistree");
      await load();
    } catch (error) {
      setMessage(error.response?.data?.message || "Action impossible");
    }
  }

  async function remove(row) {
    try {
      await api.delete(`${cfg.endpoint}/${row._id}`);
      if (editing?._id === row._id) setEditing(null);
      setMessage("Suppression effectuee");
      await load();
    } catch (error) {
      setMessage(error.response?.data?.message || "Suppression impossible");
    }
  }

  async function approveClub(row) {
    try {
      await api.patch(`/workflow/clubs/${row._id}/approve`);
      setMessage("Club approuve et acces active");
      await load();
    } catch (error) {
      setMessage(error.response?.data?.message || "Approbation impossible");
    }
  }

  async function suspendClub(row) {
    try {
      await api.patch(`/workflow/clubs/${row._id}/suspend`, {});
      setMessage("Club suspendu et acces desactive");
      await load();
    } catch (error) {
      setMessage(error.response?.data?.message || "Suspension impossible");
    }
  }

  const actionColumn = {
    key: "adminActions",
    label: "Actions",
    render: (row) => (
      <div className="table-row-actions">
        {cfg.fields.length > 0 && (
          <button
            className="ghost"
            type="button"
            onClick={() => setEditing(row)}
          >
            Modifier
          </button>
        )}
        {type === "clubs" && row.affiliationStatus !== "APPROVED" && (
          <button
            className="primary"
            type="button"
            onClick={() => approveClub(row)}
          >
            Approuver
          </button>
        )}
        {type === "clubs" && row.affiliationStatus === "APPROVED" && (
          <button
            className="ghost"
            type="button"
            onClick={() => suspendClub(row)}
          >
            Suspendre
          </button>
        )}
        {type !== "audit-logs" && (
          <button
            className="ghost danger"
            type="button"
            onClick={() => remove(row)}
          >
            Supprimer
          </button>
        )}
      </div>
    ),
  };

  const columns = [...normalizeColumns(cfg.columns), actionColumn];

  return (
    <AdminLayout>
      <div className="page-head">
        <h1>{cfg.title}</h1>
        <p>Recherche, creation, suivi et actions federales.</p>
      </div>

      {message && <div className="notice">{message}</div>}

      {cfg.fields.length > 0 && (
        <section className="panel">
          <h2>{editing ? "Modifier" : "Ajouter"}</h2>
          <ResourceForm
            fields={normalizeFields(cfg.fields)}
            initialValues={editing ? normalizeInitialValues(editing) : {}}
            submitLabel={
              editing ? "Enregistrer les changements" : "Enregistrer"
            }
            onSubmit={editing ? update : create}
            onCancel={editing ? () => setEditing(null) : null}
          />
        </section>
      )}

      <SmartTable
        title="Liste"
        rows={rows}
        columns={columns}
        showExportLicence={[
          "athletes",
          "coaches",
          "referees",
          "technicians",
          "licenses",
        ].includes(type)}
      />
    </AdminLayout>
  );
}
