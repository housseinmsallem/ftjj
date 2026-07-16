import React from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

interface AdminLayoutProps {
  children: React.ReactNode;
}

const adminNavItems = [
  { to: "/admin", label: "Tableau de bord", icon: "📊", end: true },
  { to: "/admin/affiliations", label: "Demandes d'inscription", icon: "📋" },
  { to: "/admin/registrations", label: "Demandes de licence", icon: "📝" },
  { to: "/admin/clubs", label: "Gestion des clubs", icon: "🏛️" },
  { to: "/admin/athletes", label: "Gestion des athlètes", icon: "🥋" },
  { to: "/admin/coaches", label: "Gestion des entraîneurs", icon: "👨‍🏫" },
  { to: "/admin/referees", label: "Gestion des arbitres", icon: "⚖️" },
  { to: "/admin/technicians", label: "Gestion des techniciens", icon: "🔧" },
  { to: "/admin/licenses", label: "Licences", icon: "📜" },
  { to: "/admin/competitions", label: "Compétitions", icon: "🏆" },
  { to: "/admin/live-scoring", label: "Matchs en direct", icon: "🔴" },
  { to: "/admin/import", label: "Importation CSV", icon: "📥" },
  { to: "/admin/transfers", label: "Transferts", icon: "🔄" },
  { to: "/admin/cms", label: "CMS", icon: "🎨" },
];

const sidebarStyle: React.CSSProperties = {
  position: "sticky",
  top: 0,
  width: 250,
  minWidth: 250,
  height: "calc(100vh - 64px)",
  overflowY: "auto",
  backgroundColor: "var(--panel)",
  borderRight: "1px solid var(--border)",
  padding: "16px 0",
  display: "flex",
  flexDirection: "column",
};

const brandStyle: React.CSSProperties = {
  padding: "0 20px 20px",
  borderBottom: "1px solid var(--border)",
  marginBottom: 8,
};

const brandTitleStyle: React.CSSProperties = {
  color: "var(--text)",
  fontSize: "1.1rem",
  fontWeight: 700,
};

const brandSubStyle: React.CSSProperties = {
  color: "var(--muted)",
  fontSize: "0.75rem",
  display: "block",
  marginTop: 2,
};

const navStyle: React.CSSProperties = {
  flex: 1,
};

const navLinkBaseStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "12px 20px",
  color: "var(--muted)",
  fontSize: "0.9rem",
  textDecoration: "none",
  transition: "all 0.2s",
  borderLeft: "3px solid transparent",
};

const navLinkActiveStyle: React.CSSProperties = {
  ...navLinkBaseStyle,
  color: "white",
  background: "rgba(213,19,50,0.15)",
  borderLeft: "3px solid var(--red)",
};

const userSectionStyle: React.CSSProperties = {
  padding: "16px 20px",
  borderTop: "1px solid var(--border)",
  marginTop: "auto",
};

const userEmailStyle: React.CSSProperties = {
  color: "var(--text)",
  fontSize: "0.85rem",
  fontWeight: 600,
  wordBreak: "break-all",
};

const userRoleStyle: React.CSSProperties = {
  color: "var(--muted)",
  fontSize: "0.75rem",
  marginTop: 2,
};

const logoutBtnStyle: React.CSSProperties = {
  marginTop: 10,
  padding: "6px 14px",
  fontSize: "0.8rem",
  color: "var(--muted)",
  background: "transparent",
  border: "1px solid var(--border)",
  borderRadius: 6,
  cursor: "pointer",
  transition: "all 0.2s",
};

const mainStyle: React.CSSProperties = {
  flex: 1,
  padding: 24,
  minHeight: "calc(100vh - 64px)",
  backgroundColor: "var(--bg)",
};

const flexWrapperStyle: React.CSSProperties = {
  display: "flex",
};

const roleLabelMap: Record<string, string> = {
  SUPER_ADMIN: "Super administrateur",
  FEDERATION_ADMIN: "Administrateur fédéral",
  ADMIN: "Administrateur",
};

export default function AdminLayout({
  children,
}: AdminLayoutProps): React.ReactElement {
  const { user, logout } = useAuth();

  return (
    <div style={flexWrapperStyle}>
      <aside style={sidebarStyle}>
        <div style={brandStyle}>
          <span style={brandTitleStyle}>FTJJ</span>
          <span style={brandSubStyle}>Backoffice fédéral</span>
        </div>
        <nav style={navStyle}>
          {adminNavItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              style={({ isActive }: { isActive: boolean }) =>
                isActive ? navLinkActiveStyle : navLinkBaseStyle
              }
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div
          style={{ padding: "8px 20px", borderTop: "1px solid var(--border)" }}
        >
          <NavLink
            to="/admin/export"
            style={({ isActive }: { isActive: boolean }) =>
              isActive ? navLinkActiveStyle : navLinkBaseStyle
            }
          >
            <span>📥</span>
            <span>Exporter les athlètes</span>
          </NavLink>
        </div>
        <div style={userSectionStyle}>
          <div style={userEmailStyle}>
            {user?.firstName
              ? `${user.firstName} ${user?.lastName ?? ""}`
              : user?.email}
          </div>
          <div style={userRoleStyle}>
            {roleLabelMap[user?.role ?? ""] ?? user?.role ?? "Utilisateur"}
          </div>
          <button
            type="button"
            style={logoutBtnStyle}
            onClick={logout}
            onMouseEnter={(e) => {
              (e.target as HTMLButtonElement).style.background =
                "rgba(213,19,50,0.15)";
              (e.target as HTMLButtonElement).style.color = "var(--red)";
              (e.target as HTMLButtonElement).style.borderColor = "var(--red)";
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLButtonElement).style.background = "transparent";
              (e.target as HTMLButtonElement).style.color = "var(--muted)";
              (e.target as HTMLButtonElement).style.borderColor =
                "var(--border)";
            }}
          >
            Déconnexion
          </button>
        </div>
      </aside>
      <main style={mainStyle}>{children}</main>
    </div>
  );
}
