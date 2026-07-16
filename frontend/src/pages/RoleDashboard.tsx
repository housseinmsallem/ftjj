import React from "react";
import { useAuth } from "../context/AuthContext";
import SmartTable from "../components/ui/SmartTable";
import type { UserRole } from "../types";

interface RoleDashboardProps {
  role: UserRole;
}

interface RoleConfig {
  title: string;
  subtitle: string;
  cards: [string, string][];
  columns: { key: string; label: string }[];
  rows: { name: string; status: string; action: string }[];
}

const roleData: Record<string, RoleConfig> = {
  CLUB_ADMIN: {
    title: "Espace Club / Association",
    subtitle:
      "Gestion des athlètes, licences, documents, compétitions et paiements.",
    cards: [
      ["Athlètes", "24"],
      ["Licences actives", "19"],
      ["Documents en attente", "3"],
      ["Compétitions ouvertes", "5"],
    ],
    columns: [
      { key: "name", label: "Module" },
      { key: "status", label: "Statut" },
      { key: "action", label: "Action" },
    ],
    rows: [
      {
        name: "Demande affiliation",
        status: "Validée / En attente selon workflow",
        action: "Suivre",
      },
      { name: "Ajouter athlète", status: "Disponible", action: "Créer" },
      { name: "Upload documents", status: "Disponible", action: "Téléverser" },
      {
        name: "Inscription compétition",
        status: "Ouverte",
        action: "Inscrire",
      },
    ],
  },
  ATHLETE: {
    title: "Espace Athlète",
    subtitle:
      "Profil sportif, licence, ranking, palmarès et historique compétitions.",
    cards: [
      ["Licence", "Active"],
      ["Ranking", "2450 pts"],
      ["Catégorie", "-70kg"],
      ["Club", "FTJJ"],
    ],
    columns: [
      { key: "name", label: "Information" },
      { key: "status", label: "Valeur" },
      { key: "action", label: "Action" },
    ],
    rows: [
      { name: "Profil sportif", status: "Complet", action: "Voir" },
      { name: "Licence annuelle", status: "Active", action: "Télécharger" },
      { name: "Palmarès", status: "Mis à jour", action: "Consulter" },
    ],
  },
  COACH: {
    title: "Espace Coach",
    subtitle: "Certifications, club affilié, licences et suivi administratif.",
    cards: [
      ["Certification", "Niveau 1"],
      ["Licence", "Active"],
      ["Athlètes suivis", "18"],
      ["Stages", "2"],
    ],
    columns: [
      { key: "name", label: "Module" },
      { key: "status", label: "Statut" },
      { key: "action", label: "Action" },
    ],
    rows: [
      { name: "Certifications", status: "Validées", action: "Voir" },
      { name: "Licence coach", status: "Active", action: "Télécharger" },
      { name: "Stages fédéraux", status: "Ouverts", action: "S'inscrire" },
    ],
  },
  REFEREE: {
    title: "Espace Arbitre",
    subtitle:
      "Disponibilité, affectations, certifications et événements arbitrés.",
    cards: [
      ["Niveau", "National"],
      ["Disponibilité", "Oui"],
      ["Affectations", "4"],
      ["Certifications", "3"],
    ],
    columns: [
      { key: "name", label: "Module" },
      { key: "status", label: "Statut" },
      { key: "action", label: "Action" },
    ],
    rows: [
      { name: "Disponibilité", status: "Disponible", action: "Modifier" },
      {
        name: "Compétitions affectées",
        status: "4 événements",
        action: "Voir",
      },
      { name: "Live scoring arbitre", status: "Activé", action: "Ouvrir" },
    ],
  },
};

export default function RoleDashboard({
  role,
}: RoleDashboardProps): React.ReactElement {
  const { user } = useAuth();
  const cfg = roleData[role] || roleData.CLUB_ADMIN;

  return (
    <div className="page role-dashboard">
      <div className="page-head">
        <h1>{cfg.title}</h1>
        <p>{cfg.subtitle}</p>
        <small>
          Connecté : {user?.firstName || user?.lastName || "Utilisateur"} · rôle{" "}
          {role}
        </small>
      </div>
      <div className="stats-grid">
        {cfg.cards.map(([label, value]) => (
          <div className="stat-card" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
      <SmartTable
        title="Actions rapides"
        rows={cfg.rows}
        columns={cfg.columns}
      />
    </div>
  );
}
