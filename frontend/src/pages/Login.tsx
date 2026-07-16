import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";
import type { UserRole } from "../types";

function dashboardPathForRole(role: UserRole | string): string {
  if (role === "FEDERATION_ADMIN" || role === "ADMIN") return "/admin";
  if (role === "CLUB_ADMIN" || role === "CLUB_OWNER") return "/club";
  if (role === "ATHLETE") return "/athlete/dashboard";
  if (role === "COACH") return "/coach/dashboard";
  if (role === "REFEREE") return "/referee/dashboard";
  return "/";
}

export default function Login(): React.ReactElement {
  const [email, setEmail] = useState("admin@example.com");
  const [password, setPassword] = useState("Admin123!");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password.trim()) {
      setError("Veuillez remplir tous les champs.");
      return;
    }

    setLoading(true);
    try {
      const user = await login(email, password);
      if (user) {
        navigate(dashboardPathForRole(user.role));
      }
    } catch (err: any) {
      console.error("FTJJ login failed", err);
      const message =
        err.response?.data?.message || err.message || "Connexion impossible";
      setError(message);
      toast.error("Échec de la connexion : " + message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page auth-page">
      <div
        className="auth-card"
        style={{
          background: "var(--panel)",
          borderRadius: 16,
          padding: "40px 36px",
          width: "min(440px, 100%)",
          border: "1px solid var(--border)",
          boxShadow: "0 20px 60px rgba(0,0,0,.45)",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <h2
            style={{
              color: "white",
              fontSize: "1.6rem",
              margin: "0 0 8px",
              fontWeight: 800,
            }}
          >
            Connexion FTJJ
          </h2>
          <p
            className="muted"
            style={{ fontSize: "0.9rem", margin: 0, color: "white" }}
          >
            Accédez à votre espace fédéral
          </p>
        </div>

        {error && (
          <div
            className="alert"
            style={{
              background: "rgba(213,19,50,.18)",
              color: "var(--red)",
              border: "1px solid rgba(213,19,50,.3)",
              padding: 12,
              borderRadius: 12,
              marginBottom: 20,
              fontSize: "0.88rem",
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={submit} style={{ display: "grid", gap: 18 }}>
          <label
            className="field-label"
            style={{
              display: "grid",
              gap: 7,
              fontWeight: 700,
              fontSize: "0.85rem",
              color: "var(--muted)",
            }}
          >
            Adresse email
            <input
              type="email"
              placeholder="exemple@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                background: "var(--bg)",
                border: "1px solid var(--border)",
                color: "black",
                borderRadius: 12,
                padding: "12px 14px",
                fontSize: "0.95rem",
              }}
            />
          </label>

          <label
            className="field-label"
            style={{
              display: "grid",
              gap: 7,
              fontWeight: 700,
              fontSize: "0.85rem",
              color: "var(--muted)",
            }}
          >
            Mot de passe
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{
                background: "var(--bg)",
                border: "1px solid var(--border)",
                color: "black",
                borderRadius: 12,
                padding: "12px 14px",
                fontSize: "0.95rem",
              }}
            />
          </label>

          <button
            type="submit"
            className="btn primary"
            disabled={loading}
            style={{
              marginTop: 4,
              padding: "13px 20px",
              fontSize: "0.95rem",
              fontWeight: 800,
              background: loading
                ? "rgba(213,19,50,.5)"
                : "linear-gradient(135deg, var(--red), #9c1119)",
              border: 0,
              borderRadius: 12,
              color: "#fff",
              cursor: loading ? "not-allowed" : "pointer",
              boxShadow: loading ? "none" : "0 8px 24px rgba(213,19,50,.3)",
            }}
          >
            {loading ? "Connexion..." : "Se connecter"}
          </button>
        </form>

        <div style={{ textAlign: "center", marginTop: 24 }}>
          <Link
            to="/affiliation"
            style={{
              color: "var(--muted)",
              fontSize: "0.85rem",
              textDecoration: "underline",
            }}
          >
            Pas encore de compte ? Demander une affiliation
          </Link>
        </div>
      </div>
    </div>
  );
}
