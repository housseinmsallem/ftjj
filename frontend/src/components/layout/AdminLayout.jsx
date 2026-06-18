import { NavLink } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const nav = [
  ["Tableau de bord", "/admin/dashboard"],
  ["CMS", "/admin/cms"],
  ["Settings", "/admin/platform-settings"],
  ["Médias", "/admin/media-library"],
  ["Events", "/admin/events"],
  ["News", "/admin/news"],
  ["Clubs", "/admin/clubs"],
  ["Athlètes", "/admin/athletes"],
  ["Coachs", "/admin/coaches"],
  ["Arbitres", "/admin/referees"],
  ["Compétitions", "/admin/competitions"],
  ["Ops compétition", "/admin/competitions/operations"],
  ["Constructeur contenu", "/admin/content-builder"],
  ["Documents", "/admin/documents"],
  ["Paiements", "/admin/payments"],
  ["Licences", "/admin/licenses"],
  ["Live scoring", "/admin/live-scoring"],
  ["Scoring settings", "/admin/scoring-settings"],
  ["Audit", "/admin/audit"],
  ["Notifications", "/admin/notifications"],
  ["Paramètres legacy", "/admin/settings"],
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
