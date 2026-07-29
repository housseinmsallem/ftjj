import React from "react";
import { useQuery } from "@tanstack/react-query";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import PageHeader from "../components/shared/PageHeader";
import LoadingSpinner from "../components/shared/LoadingSpinner";
import StatusBadge from "../components/shared/StatusBadge";

interface ClubData {
  club: { id: string; name: string; address?: string };
  owner: { id: string; email: string };
  persons: {
    total: number;
    athletes: number;
    coaches: number;
    technicians: number;
  };
  activeLicenses: number;
  pendingRequests: number;
}

interface RegistrationItem {
  _id: string;
  person?: { firstName: string; lastName: string };
  licenseType: string;
  status: string;
  createdAt: string;
}

export default function ClubDashboard(): React.ReactElement {
  const { user, loading: authLoading } = useAuth();

  const { data, isLoading, isError } = useQuery<ClubData>({
    queryKey: ["club-stats", user?.id],
    queryFn: async () => {
      const res = await api.get("/dashboard/club-stats");
      return res.data?.data ?? res.data;
    },
    enabled: !authLoading && !!user,
  });

  const { data: registrations, isLoading: regLoading } = useQuery<
    RegistrationItem[]
  >({
    queryKey: ["registrations", user?.id],
    queryFn: async () => {
      const res = await api.get("/registrations");
      const arr = res.data?.data ?? res.data;
      return Array.isArray(arr) ? arr.slice(0, 5) : [];
    },
    enabled: !authLoading && !!user,
  });

  if (authLoading || isLoading)
    return <LoadingSpinner text="Chargement du tableau de bord..." />;

  if (isError || !data?.club) {
    return (
      <div className="page" style={{ textAlign: "center", padding: 64 }}>
        <h2 style={{ color: "var(--text)" }}>Aucun club associé</h2>
        <p className="muted">
          Votre compte n'est pas encore rattaché à un club.
        </p>
      </div>
    );
  }

  const cardBase: React.CSSProperties = {
    background: "var(--panel)",
    border: "1px solid var(--border)",
    borderRadius: 16,
    padding: 24,
  };

  const bigNumber: React.CSSProperties = {
    fontSize: "2.2rem",
    fontWeight: 800,
    color: "var(--text)",
    lineHeight: 1.1,
  };

  const club = data.club;
  const owner = data.owner ?? { id: "", email: "—" };
  const persons = data.persons ?? { total: 0, athletes: 0, coaches: 0, technicians: 0 };
  const activeLicenses = data.activeLicenses ?? 0;
  const pendingRequests = data.pendingRequests ?? 0;

  return (
    <div>
      <PageHeader
        title="Tableau de bord"
        breadcrumbs={[
          { label: "Club", to: "/club" },
          { label: "Tableau de bord" },
        ]}
      />

      {/* Club identity card */}
      <div
        style={{
          ...cardBase,
          marginBottom: 24,
          display: "flex",
          alignItems: "center",
          gap: 24,
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: 16,
            background: "linear-gradient(135deg, #d51332, #a90720)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "1.5rem",
            fontWeight: 800,
            color: "#fff",
            flexShrink: 0,
          }}
        >
          {(club.name || "C").charAt(0).toUpperCase()}
        </div>
        <div style={{ flex: 1 }}>
          <h2 style={{ margin: 0, fontSize: "1.4rem", color: "white" }}>
            {club.name || "Mon Club"}
          </h2>
          {club.address && (
            <p className="muted" style={{ margin: "4px 0 0", color: "white" }}>
              {club.address}
            </p>
          )}
          <p
            className="muted"
            style={{ margin: "2px 0 0", fontSize: "0.85rem", color: "white" }}
          >
            Propriétaire : {owner.email}
          </p>
        </div>
        <div
          style={{
            textAlign: "center",
            padding: "0 20px",
            borderLeft: "1px solid var(--border)",
          }}
        >
          <div style={bigNumber}>{persons.athletes}</div>
          <div className="muted" style={{ fontSize: "0.8rem", color: "white" }}>
            Athlètes
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: 16,
          marginBottom: 32,
        }}
      >
        {[
          { label: "Total personnes", value: persons.total, color: "#fff" },
          { label: "Athlètes", value: persons.athletes, color: "#22c55e" },
          { label: "Entraîneurs", value: persons.coaches, color: "#3b82f6" },
          { label: "Techniciens", value: persons.technicians, color: "#a855f7" },
          { label: "Licences actives", value: activeLicenses, color: "#22c55e" },
          {
            label: "En attente",
            value: pendingRequests,
            color: pendingRequests > 0 ? "#d51332" : "#22c55e",
          },
        ].map((stat) => (
          <div key={stat.label} style={{ ...cardBase, textAlign: "center" }}>
            <div
              style={{ ...bigNumber, color: stat.color, fontSize: "1.8rem" }}
            >
              {stat.value}
            </div>
            <div
              className="muted"
              style={{ fontSize: "0.8rem", marginTop: 4, color: "white" }}
            >
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {/* Recent registrations */}
      <div style={cardBase}>
        <h3
          style={{
            margin: "0 0 16px",
            color: "white",
            fontSize: "1rem",
          }}
        >
          Demandes d'inscription récentes
        </h3>
        {regLoading ? (
          <LoadingSpinner text="Chargement..." />
        ) : !registrations || registrations.length === 0 ? (
          <p className="muted">Aucune demande pour le moment.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {["Personne", "Type de licence", "Statut", "Date"].map(
                    (h) => (
                      <th
                        key={h}
                        style={{
                          textAlign: "left",
                          padding: "10px 12px",
                          borderBottom: "1px solid var(--border)",
                          color: "var(--muted)",
                          fontSize: "0.8rem",
                          textTransform: "uppercase",
                        }}
                      >
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {registrations.map((reg) => (
                  <tr key={reg._id}>
                    <td
                      style={{
                        padding: "12px",
                        borderBottom: "1px solid var(--border)",
                        color: "white",
                      }}
                    >
                      {reg.person
                        ? `${reg.person.firstName} ${reg.person.lastName}`
                        : "—"}
                    </td>
                    <td
                      style={{
                        padding: "12px",
                        borderBottom: "1px solid var(--border)",
                        color: "white",
                      }}
                    >
                      {reg.licenseType || "—"}
                    </td>
                    <td
                      style={{
                        padding: "12px",
                        borderBottom: "1px solid var(--border)",
                        color: "white",
                      }}
                    >
                      <StatusBadge status={reg.status} />
                    </td>
                    <td
                      style={{
                        padding: "12px",
                        borderBottom: "1px solid var(--border)",
                        color: "white",
                      }}
                    >
                      {reg.createdAt
                        ? new Date(reg.createdAt).toLocaleDateString("fr-FR")
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
