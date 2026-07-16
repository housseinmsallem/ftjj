import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import PageHeader from "../../components/shared/PageHeader";
import LoadingSpinner from "../../components/shared/LoadingSpinner";
import EmptyState from "../../components/shared/EmptyState";
import FileUpload from "../../components/shared/FileUpload";
import type {
  Competition,
  Person,
  PersonType,
  CompetitionSignup,
} from "../../types";

interface SignupForm {
  personId: string;
  type: PersonType;
  paymentReceiptUrl: string;
}

const emptySignup: SignupForm = {
  personId: "",
  type: "ATHLETE",
  paymentReceiptUrl: "",
};

export default function ClubCompetitionRegistration(): React.ReactElement {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<SignupForm>(emptySignup);

  const clubId = user?.club?._id || user?.club?.id || "";

  // Fetch competition details
  const {
    data: competition,
    isLoading: compLoading,
    isError: compError,
    error: compErr,
  } = useQuery({
    queryKey: ["competitions", id],
    queryFn: async () => {
      const res = await api.get(`/competitions/${id}`);
      return ((res.data as any)?.data ?? res.data) as Competition;
    },
    enabled: !!id,
  });

  // Fetch club athletes
  const { data: athletesData, isLoading: athletesLoading } = useQuery({
    queryKey: ["persons", "ATHLETE", "club", clubId],
    queryFn: async () => {
      const res = await api.get("/persons", {
        params: { type: "ATHLETE", clubId },
      });
      return (((res.data as any)?.data ?? res.data) as Person[]) || [];
    },
    enabled: !!clubId,
  });

  const athletes = athletesData || [];

  // Fetch existing club signups for this competition
  const { data: existingSignups, isLoading: signupsLoading } = useQuery({
    queryKey: ["competitions", id, "signups", clubId],
    queryFn: async () => {
      const res = await api.get(`/competitions/${id}/signups`);
      const allSignups: CompetitionSignup[] =
        ((res.data as any)?.data ?? res.data) || [];
      return allSignups.filter((s: any) => {
        const pClubId =
          s.person?.club?._id || s.person?.club?.id || s.person?.clubId;
        return pClubId === clubId;
      });
    },
    enabled: !!id && !!clubId,
  });

  const signupMutation = useMutation({
    mutationFn: (payload: SignupForm) =>
      api.post("/competitions/signups", {
        competitionId: id,
        ...payload,
      }),
    onSuccess: () => {
      toast.success("Inscription envoyée avec succès");
      queryClient.invalidateQueries({ queryKey: ["competition-signups"] });
      queryClient.invalidateQueries({
        queryKey: ["competitions", id, "signups", clubId],
      });
      setForm(emptySignup);
    },
    onError: (err: any) => {
      toast.error(
        err?.response?.data?.message || "Erreur lors de l'inscription",
      );
    },
  });

  function getSelectedAthlete(): Person | null {
    return athletes.find((a) => (a._id || a.id) === form.personId) || null;
  }

  function hasActiveLicense(person: Person): boolean {
    const licenses = (person as any).licenses;
    if (Array.isArray(licenses)) {
      return licenses.some((l: any) => l.isActive);
    }
    if ((person as any).licenseStatus) {
      return (
        (person as any).licenseStatus === "active" ||
        (person as any).licenseStatus === "ACTIVE"
      );
    }
    return true; // allow if no license data
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.personId) {
      toast.error("Veuillez sélectionner un athlète");
      return;
    }
    const athlete = getSelectedAthlete();
    if (athlete && !hasActiveLicense(athlete)) {
      toast.error(
        "Cet athlète n'a pas de licence active. Veuillez d'abord valider sa licence.",
      );
      return;
    }
    signupMutation.mutate(form);
  }

  function getPersonName(p: Person): string {
    if (p.firstName && p.lastName) return `${p.firstName} ${p.lastName}`;
    return (p as any).name || "—";
  }

  function getSignupTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      ATHLETE: "Athlète",
      COACH: "Entraîneur",
      REFEREE: "Arbitre",
      TECHNICIAN: "Technicien",
    };
    return labels[type] || type;
  }

  const isLoading = compLoading || athletesLoading || signupsLoading;

  if (isLoading) {
    return (
      <div className="page">
        <LoadingSpinner text="Chargement..." />
      </div>
    );
  }

  if (compError) {
    return (
      <div className="page">
        <EmptyState
          title="Erreur"
          description={
            (compErr as any)?.message || "Impossible de charger la compétition"
          }
          action={
            <button className="btn primary" onClick={() => navigate(-1)}>
              Retour
            </button>
          }
        />
      </div>
    );
  }

  const selectedAthlete = getSelectedAthlete();

  const inputStyle: React.CSSProperties = {
    background: "var(--bg)",
    color: "var(--text)",
    border: "1px solid var(--border)",
    borderRadius: 12,
    padding: "11px 12px",
    fontSize: "0.9rem",
    width: "100%",
  };

  const selectStyle: React.CSSProperties = {
    ...inputStyle,
    cursor: "pointer",
  };

  return (
    <div className="page">
      <PageHeader
        title={`Inscription — ${competition?.name || "Compétition"}`}
        breadcrumbs={[
          { label: "Club", to: "/club" },
          { label: "Compétitions", to: "/club/competitions" },
          { label: "Inscription" },
        ]}
      />

      {/* Competition info card */}
      {competition && (
        <div
          style={{
            marginBottom: 24,
            padding: 16,
            background: "var(--panel)",
            borderRadius: 12,
            border: "1px solid var(--border)",
            display: "flex",
            gap: 20,
            flexWrap: "wrap",
            alignItems: "flex-start",
          }}
        >
          {(competition as any).posterUrl && (
            <img
              src={(competition as any).posterUrl}
              alt=""
              style={{
                width: 120,
                height: 80,
                borderRadius: 8,
                objectFit: "cover",
                flexShrink: 0,
              }}
            />
          )}
          <div>
            <h3 style={{ color: "var(--text)", margin: "0 0 6px" }}>
              {competition.name}
            </h3>
            <p className="muted" style={{ margin: 0 }}>
              {competition.date
                ? new Date(competition.date).toLocaleDateString("fr-FR", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  })
                : "Date à confirmer"}{" "}
              — {competition.location || "Lieu à confirmer"}
            </p>
            <p className="muted" style={{ margin: "4px 0 0" }}>
              Type: {(competition as any).type || "Open"} • Ruleset:{" "}
              {(competition as any).splitByBelt
                ? "Par ceinture"
                : "Tous niveaux"}
            </p>
          </div>
        </div>
      )}

      <div className="card">
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <label className="field-label">
              Sélectionner un athlète{" "}
              <span style={{ color: "var(--red)" }}>*</span>
              <select
                value={form.personId}
                onChange={(e) => setForm({ ...form, personId: e.target.value })}
                required
                style={selectStyle}
              >
                <option value="">— Sélectionner —</option>
                {athletes.map((p) => (
                  <option key={p._id || p.id} value={p._id || p.id}>
                    {getPersonName(p)} —{" "}
                    {(p as any).athleteDetails?.grade || "?"} —{" "}
                    {(p as any).athleteDetails?.weight
                      ? `${(p as any).athleteDetails.weight}kg`
                      : "?"}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {/* Selected athlete details */}
          {selectedAthlete && (
            <div
              style={{
                marginTop: 16,
                padding: 14,
                background: "var(--bg)",
                borderRadius: 10,
                border: "1px solid var(--border)",
              }}
            >
              <h4
                style={{
                  margin: "0 0 10px",
                  color: "var(--text)",
                  fontSize: "0.9rem",
                }}
              >
                ℹ️ Détails de l'athlète sélectionné
              </h4>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                  gap: 8,
                }}
              >
                <div>
                  <span className="muted">Nom: </span>
                  <strong style={{ color: "var(--text)" }}>
                    {getPersonName(selectedAthlete)}
                  </strong>
                </div>
                <div>
                  <span className="muted">Ceinture: </span>
                  <strong style={{ color: "var(--text)" }}>
                    {(selectedAthlete as any).athleteDetails?.grade || "—"}
                  </strong>
                </div>
                <div>
                  <span className="muted">Poids: </span>
                  <strong style={{ color: "var(--text)" }}>
                    {(selectedAthlete as any).athleteDetails?.weight
                      ? `${(selectedAthlete as any).athleteDetails.weight} kg`
                      : "—"}
                  </strong>
                </div>
                <div>
                  <span className="muted">Licence: </span>
                  <strong
                    style={{
                      color: hasActiveLicense(selectedAthlete)
                        ? "#22c55e"
                        : "var(--red)",
                    }}
                  >
                    {hasActiveLicense(selectedAthlete)
                      ? "Active ✅"
                      : "Inactive ⚠️"}
                  </strong>
                </div>
              </div>
              {!hasActiveLicense(selectedAthlete) && (
                <p
                  style={{
                    margin: "10px 0 0",
                    color: "var(--red)",
                    fontSize: "0.85rem",
                  }}
                >
                  ⚠️ Cet athlète n'a pas de licence active. L'inscription sera
                  bloquée.
                </p>
              )}
            </div>
          )}

          <div style={{ marginTop: 18 }}>
            <FileUpload
              label="Reçu de paiement"
              accept=".pdf,.jpg,.jpeg,.png"
              maxSizeMB={5}
              onUploaded={(url) => setForm({ ...form, paymentReceiptUrl: url })}
              currentUrl={form.paymentReceiptUrl || null}
            />
          </div>

          <div
            style={{
              marginTop: 24,
              display: "flex",
              gap: 10,
              justifyContent: "flex-end",
            }}
          >
            <button type="button" className="btn" onClick={() => navigate(-1)}>
              Annuler
            </button>
            <button
              type="submit"
              className="btn primary"
              disabled={signupMutation.isPending}
            >
              {signupMutation.isPending
                ? "Envoi en cours..."
                : "Soumettre l'inscription"}
            </button>
          </div>
        </form>
      </div>

      {/* Already registered athletes */}
      <div style={{ marginTop: 24 }}>
        <div className="table-card">
          <h4
            style={{
              margin: "0 0 12px",
              padding: "16px 16px 0",
              color: "var(--text)",
              fontSize: "0.95rem",
            }}
          >
            👥 Athlètes déjà inscrits de votre club
          </h4>
          {existingSignups && existingSignups.length > 0 ? (
            <div className="table-wrap">
              <table className="smart-table">
                <thead>
                  <tr>
                    <th>Nom</th>
                    <th>Type</th>
                    <th>Ceinture</th>
                    <th>Poids</th>
                    <th>Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {existingSignups.map((s: any) => (
                    <tr key={s._id || s.id}>
                      <td>
                        {s.person
                          ? `${s.person.firstName || ""} ${s.person.lastName || s.person.name || ""}`.trim() ||
                            "—"
                          : "—"}
                      </td>
                      <td>{getSignupTypeLabel(s.type)}</td>
                      <td>{s.person?.athleteDetails?.grade || "—"}</td>
                      <td>
                        {s.person?.athleteDetails?.weight
                          ? `${s.person.athleteDetails.weight} kg`
                          : "—"}
                      </td>
                      <td>
                        <span
                          style={{
                            background:
                              s.status === "CONFIRMED"
                                ? "#22c55e20"
                                : s.status === "REJECTED"
                                  ? "#ef444420"
                                  : "#f59e0b20",
                            color:
                              s.status === "CONFIRMED"
                                ? "#22c55e"
                                : s.status === "REJECTED"
                                  ? "#ef4444"
                                  : "#f59e0b",
                            padding: "2px 10px",
                            borderRadius: 12,
                            fontSize: "0.8rem",
                            fontWeight: 600,
                          }}
                        >
                          {s.status === "PENDING"
                            ? "En attente"
                            : s.status === "CONFIRMED"
                              ? "Confirmé"
                              : "Refusé"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="muted" style={{ padding: "0 16px 16px" }}>
              Aucun athlète de votre club n'est encore inscrit.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
