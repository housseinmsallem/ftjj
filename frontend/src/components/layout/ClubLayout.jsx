import { NavLink } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const nav = [
  ["Tableau de bord", "/club/dashboard"],
  ["Importer Athlètes", "/club/import"],
  ["Demande de Transfert", "/club/transfer"],
  ["Compétitions", "/club/competitions"],
  ["Inscriptions", "/club/registrations"],
  ["Documents", "/club/documents"],
];

export default function ClubLayout({ children }) {
  const { user, logout } = useAuth();

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="brand">
          <strong>FTJJ</strong>
          <span>Espace Club</span>
        </div>
        <nav>
          {nav.map(([label, path]) => (
            <NavLink
              key={path}
              to={path}
              end={path === "/club/dashboard"}
              style={({ isActive }) => ({
                background: isActive ? "rgba(255,255,255,0.08)" : "transparent",
                fontWeight: isActive ? 600 : 400,
              })}
            >
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-user">
          <span>{user?.firstName || user?.name || user?.email}</span>
          <button onClick={logout}>Déconnexion</button>
        </div>
      </aside>
      <section className="admin-content">{children}</section>
    </div>
  );
}
