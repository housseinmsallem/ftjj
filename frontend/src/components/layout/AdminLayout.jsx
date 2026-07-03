import { NavLink } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const nav = [
  ["Tableau de bord", "/admin/dashboard"],
  ["Identité fédérale", "/admin/platform-settings"],
  ["Page d'accueil", "/admin/homepage"],
  ["Slider accueil", "/admin/content-builder"],
  ["Médiathèque", "/admin/media-library"],
  ["Événements", "/admin/events"],
  ["Actualités", "/admin/news"],
  ["Clubs", "/admin/clubs"],
  ["Athlètes", "/admin/athletes"],
  ["Coachs", "/admin/coaches"],
  ["Arbitres", "/admin/referees"],
  ["Techniciens", "/admin/technicians"],
  ["Compétitions", "/admin/competitions"],
  ["Affiliation", "/admin/affiliations"],
  ["Import Athlètes", "/admin/athlete-import"],
  ["Inscriptions", "/admin/registrations"],
  ["Transferts", "/admin/transfers"],
  ["Opérations compétition", "/admin/competitions/operations"],
  ["Documents", "/admin/documents"],
  ["Paiements", "/admin/payments"],
  ["Licences", "/admin/licenses"],
  ["Live scoring", "/admin/live-scoring"],
  ["Réglages scoring", "/admin/scoring-settings"],
  ["Audit", "/admin/audit"],
  ["Notifications", "/admin/notifications"],
];

export default function AdminLayout({ children }) {
  const { user, logout } = useAuth();
  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="brand">
          <strong>FTJJ</strong>
          <span>Backoffice fédéral</span>
        </div>
        <nav>
          {nav.map(([label, path]) => (
            <NavLink key={path} to={path} end={path === "/admin"}>
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-user">
          <span>{user?.name}</span>
          <button onClick={logout}>Déconnexion</button>
        </div>
      </aside>
      <section className="admin-content">{children}</section>
    </div>
  );
}
