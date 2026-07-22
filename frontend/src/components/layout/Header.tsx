import React, { useEffect, useMemo, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import type { User } from "../../types";
import logo from "../../assets/images/logo.png";
import aivoLogo from "../../assets/images/aivoteam.com-favicon.ico";

interface NavLinkItem {
  to: string;
  label: string;
  end?: boolean;
}

const utilityLinks: NavLinkItem[] = [
  { to: "/federation", label: "A propos" },
  { to: "/clubs", label: "Organisateurs" },
  { to: "/contact", label: "Support" },
];

const mainLeftLinks: NavLinkItem[] = [
  { to: "/competitions", label: "Competitions" },
  // { to: "/events", label: "Evenements" },
  { to: "/ranking", label: "Rankings" },
  { to: "/athletes", label: "Athletes" },
];

const mainRightLinks: NavLinkItem[] = [
  { to: "/actualites", label: "Actualites" },
  { to: "/medias", label: "Medias" },
  { to: "/en-direct", label: "Live" },
];

const directoryLinks: NavLinkItem[] = [
  { to: "/clubs", label: "Clubs" },
  { to: "/coaches", label: "Coachs" },
  { to: "/referees", label: "Arbitres" },
  { to: "/affiliation", label: "Affiliation" },
];

const socialMarks = ["WA", "FB", "IG", "YT"];
const partnerMarks = ["JJIF", "UNJA", "FTJJ SaaS"];

function uniqueLinks(items: NavLinkItem[]): NavLinkItem[] {
  return Array.from(new Map(items.map((item) => [item.to, item])).values());
}

function dashboardLinkFor(user: User | null): string {
  if (!user) return "/espace-licencie";
  if (user.role === "FEDERATION_ADMIN" || user.role === "ADMIN")
    return "/admin";
  if (user.role === "CLUB_ADMIN" || user.role === "CLUB_OWNER") return "/club";
  if (user.role === "ATHLETE") return "/athlete/dashboard";
  if (user.role === "COACH") return "/coach/dashboard";
  if (user.role === "REFEREE") return "/referee/dashboard";
  return "/espace-licencie";
}

function dashboardLabelFor(user: User | null): string {
  if (!user) return "Espace licencie";
  if (user.role === "FEDERATION_ADMIN" || user.role === "ADMIN")
    return "Backoffice";
  if (user.role === "CLUB_ADMIN" || user.role === "CLUB_OWNER")
    return "Espace club";
  if (user.role === "ATHLETE") return "Espace athlete";
  if (user.role === "COACH") return "Espace coach";
  if (user.role === "REFEREE") return "Espace arbitre";
  return "Mon espace";
}

export default function Header(): React.ReactElement {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const portalLink = useMemo(() => dashboardLinkFor(user), [user]);
  const portalLabel = useMemo(() => dashboardLabelFor(user), [user]);
  const mobileLinks = useMemo(
    () =>
      uniqueLinks([
        { to: "/", label: "Accueil", end: true },
        ...mainLeftLinks,
        { to: portalLink, label: portalLabel },
        ...mainRightLinks,
        ...directoryLinks,
        ...utilityLinks,
      ]),
    [portalLabel, portalLink],
  );

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  return (
    <header className="public-site-header">
      <div className="public-utility-bar">
        <div className="public-utility-inner">
          <div className="public-utility-left">
            <div className="public-social-strip" aria-hidden="true">
              {socialMarks.map((mark) => (
                <span className="public-social-mark" key={mark}>
                  {mark}
                </span>
              ))}
            </div>
            <div
              className="public-partner-strip desktop-only"
              aria-hidden="true"
            >
              {partnerMarks.map((mark) => (
                <span className="public-partner-pill" key={mark}>
                  {mark}
                </span>
              ))}
            </div>
          </div>

          <div className="public-utility-right">
            {utilityLinks.map((item) => (
              <NavLink key={item.to} to={item.to}>
                {item.label}
              </NavLink>
            ))}
            {user ? (
              <button
                className="public-utility-button"
                type="button"
                onClick={logout}
              >
                Deconnexion
              </button>
            ) : (
              <NavLink to="/login">Connexion</NavLink>
            )}
            <Link className="public-utility-cta desktop-only" to="/affiliation">
              Affiliation
            </Link>
            {/*<a href="https://aivoteam.com/" target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", marginRight: 8 }}>
              <img src={aivoLogo} alt="AivoTeam" style={{ height: 18, opacity: 0.6 }} />
            </a>*/}
            <span className="public-locale-pill">TN</span>
          </div>
        </div>
      </div>

      <div className="public-header-main">
        <div className="public-header-inner public-header-grid">
          <nav
            className="public-nav public-nav-cluster public-nav-left"
            aria-label="Navigation principale gauche"
          >
            {mainLeftLinks.map((item) => (
              <NavLink key={item.to} to={item.to}>
                {item.label}
              </NavLink>
            ))}
          </nav>

          <Link to="/" className="public-brand public-brand-center">
            <span className="public-brand-badge">
              <img src={logo} alt="FTJJ" />
            </span>
            <span className="public-brand-copy">
              <strong>FTJJ</strong>
              <small>Federation Tunisienne de Jiu-Jitsu</small>
            </span>
          </Link>

          <nav
            className="public-nav public-nav-cluster public-nav-right"
            aria-label="Navigation principale droite"
          >
            <NavLink to={portalLink}>{portalLabel}</NavLink>
            {mainRightLinks.map((item) => (
              <NavLink key={item.to} to={item.to}>
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="public-header-actions">
            <button
              className="public-menu-toggle"
              type="button"
              aria-expanded={open}
              aria-label="Ouvrir le menu"
              onClick={() => setOpen((value) => !value)}
            >
              {open ? "x" : "|||"}
            </button>
          </div>
        </div>
      </div>

      <div className={`public-mobile-menu ${open ? "open" : ""}`}>
        <div className="public-mobile-scroll">
          <div className="public-mobile-group">
            <span>Navigation</span>
            {mobileLinks.map((item) => (
              <NavLink key={item.to} end={item.end} to={item.to}>
                {item.label}
              </NavLink>
            ))}
          </div>
          <div className="public-mobile-group">
            <span>Compte</span>
            <Link className="public-mobile-button-link" to="/affiliation">
              Affiliation
            </Link>
            {user ? (
              <button
                className="public-mobile-button"
                type="button"
                onClick={logout}
              >
                Deconnexion
              </button>
            ) : (
              <Link className="public-mobile-button-link" to="/login">
                Connexion
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
