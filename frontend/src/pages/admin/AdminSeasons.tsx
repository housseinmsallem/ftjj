import React, { useState, useEffect } from "react";
import api from "../../services/api";
import { toast } from "sonner";
import PageHeader from "../../components/shared/PageHeader";
import LoadingSpinner from "../../components/shared/LoadingSpinner";

interface Season {
  id: string;
  name: string;
  isCurrent: boolean;
  startsAt: string;
  endsAt: string;
  registrationClosesAt: string | null;
}

export default function AdminSeasons(): React.ReactElement {
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    name: "",
    startsAt: "",
    endsAt: "",
    registrationClosesAt: "",
  });
  const [saving, setSaving] = useState(false);

  async function fetchSeasons() {
    try {
      const r = await api.get("/seasons");
      setSeasons(r.data || []);
    } catch {
      toast.error("Erreur lors du chargement des saisons");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchSeasons(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.startsAt || !form.endsAt) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }
    setSaving(true);
    try {
      await api.post("/seasons", {
        name: form.name,
        startsAt: form.startsAt,
        endsAt: form.endsAt,
        registrationClosesAt: form.registrationClosesAt || undefined,
      });
      toast.success("Saison créée");
      setShowCreate(false);
      setForm({ name: "", startsAt: "", endsAt: "", registrationClosesAt: "" });
      await fetchSeasons();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Erreur");
    } finally {
      setSaving(false);
    }
  }

  async function handleActivate(id: string) {
    if (!confirm("Activer cette saison ? Toutes les autres seront désactivées et les licences B réinitialisées en A.")) return;
    try {
      await api.patch(`/seasons/${id}/activate`);
      toast.success("Saison activée");
      await fetchSeasons();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Erreur");
    }
  }

  async function handleUpdate(id: string, field: string, value: string | null) {
    try {
      await api.patch(`/seasons/${id}`, { [field]: value || null });
      await fetchSeasons();
    } catch {
      toast.error("Erreur lors de la mise à jour");
    }
  }

  if (loading) return <LoadingSpinner text="Chargement des saisons..." />;

  return (
    <div className="page">
      <PageHeader
        title="Gestion des saisons"
        breadcrumbs={[{ label: "Admin", to: "/admin" }, { label: "Saisons" }]}
        action={
          <button className="btn primary" onClick={() => setShowCreate(true)}>
            + Nouvelle saison
          </button>
        }
      />

      {seasons.length === 0 && !showCreate && (
        <div className="card" style={{ padding: 24, textAlign: "center" }}>
          <p className="muted">Aucune saison configurée.</p>
          <button className="btn primary" style={{ marginTop: 12 }} onClick={() => setShowCreate(true)}>
            Créer la première saison
          </button>
        </div>
      )}

      {showCreate && (
        <div className="card" style={{ padding: 24, marginBottom: 20 }}>
          <h3 style={{ margin: "0 0 16px", color: "var(--text)" }}>Nouvelle saison</h3>
          <form onSubmit={handleCreate} style={{ display: "grid", gap: 14 }}>
            <label className="field-label">
              Nom <span style={{ color: "var(--red)" }}>*</span>
              <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="ex: 2026/2027" required
                style={{ background: "var(--bg)", color: "var(--text)", border: "1px solid var(--border)", borderRadius: 12, padding: "10px 14px", width: "100%" }} />
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <label className="field-label">
                Début <span style={{ color: "var(--red)" }}>*</span>
                <input type="date" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
                  required style={{ background: "var(--bg)", color: "var(--text)", border: "1px solid var(--border)", borderRadius: 12, padding: "10px 14px", width: "100%" }} />
              </label>
              <label className="field-label">
                Fin <span style={{ color: "var(--red)" }}>*</span>
                <input type="date" value={form.endsAt} onChange={(e) => setForm({ ...form, endsAt: e.target.value })}
                  required style={{ background: "var(--bg)", color: "var(--text)", border: "1px solid var(--border)", borderRadius: 12, padding: "10px 14px", width: "100%" }} />
              </label>
            </div>
            <label className="field-label">
              Date de fermeture des inscriptions aux licences
              <input type="date" value={form.registrationClosesAt} onChange={(e) => setForm({ ...form, registrationClosesAt: e.target.value })}
                style={{ background: "var(--bg)", color: "var(--text)", border: "1px solid var(--border)", borderRadius: 12, padding: "10px 14px", width: "100%" }} />
              <small className="muted">Après cette date, les clubs ne pourront plus enregistrer de nouvelles licences pour cette saison.</small>
            </label>
            <div style={{ display: "flex", gap: 10 }}>
              <button type="submit" className="btn primary" disabled={saving}>
                {saving ? "Création..." : "Créer la saison"}
              </button>
              <button type="button" className="btn ghost" onClick={() => setShowCreate(false)}>
                Annuler
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              <th style={{ padding: "12px 16px", textAlign: "left", color: "var(--muted)", fontSize: "0.8rem", textTransform: "uppercase" }}>Saison</th>
              <th style={{ padding: "12px 16px", textAlign: "left", color: "var(--muted)", fontSize: "0.8rem", textTransform: "uppercase" }}>Statut</th>
              <th style={{ padding: "12px 16px", textAlign: "left", color: "var(--muted)", fontSize: "0.8rem", textTransform: "uppercase" }}>Début</th>
              <th style={{ padding: "12px 16px", textAlign: "left", color: "var(--muted)", fontSize: "0.8rem", textTransform: "uppercase" }}>Fin</th>
              <th style={{ padding: "12px 16px", textAlign: "left", color: "var(--muted)", fontSize: "0.8rem", textTransform: "uppercase" }}>Clôture inscriptions</th>
              <th style={{ padding: "12px 16px", textAlign: "center", color: "var(--muted)", fontSize: "0.8rem", textTransform: "uppercase" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {seasons.map((s) => (
              <tr key={s.id} style={{ borderBottom: "1px solid var(--border)" }}>
                <td style={{ padding: "12px 16px", color: "var(--text)", fontWeight: 600 }}>{s.name}</td>
                <td style={{ padding: "12px 16px" }}>
                  {s.isCurrent ? (
                    <span style={{ background: "#22c55e20", color: "#22c55e", padding: "3px 10px", borderRadius: 8, fontSize: "0.8rem", fontWeight: 700 }}>Active</span>
                  ) : (
                    <span style={{ color: "var(--muted)", fontSize: "0.85rem" }}>Inactive</span>
                  )}
                </td>
                <td style={{ padding: "12px 16px", color: "var(--text)", fontSize: "0.9rem" }}>
                  <input type="date" defaultValue={s.startsAt?.split("T")[0] || ""}
                    onBlur={(e) => { if (e.target.value !== s.startsAt?.split("T")[0]) handleUpdate(s.id, "startsAt", e.target.value); }}
                    style={{ background: "transparent", color: "var(--text)", border: "1px solid transparent", borderRadius: 6, padding: "4px 8px", fontSize: "0.9rem", width: "auto" }}
                    onFocus={(e) => { e.target.style.borderColor = "var(--border)"; e.target.style.background = "var(--bg)"; }}
                    onBlurCapture={(e) => { e.currentTarget.style.borderColor = "transparent"; e.currentTarget.style.background = "transparent"; }} />
                </td>
                <td style={{ padding: "12px 16px", color: "var(--text)", fontSize: "0.9rem" }}>
                  <input type="date" defaultValue={s.endsAt?.split("T")[0] || ""}
                    onBlur={(e) => { if (e.target.value !== s.endsAt?.split("T")[0]) handleUpdate(s.id, "endsAt", e.target.value); }}
                    style={{ background: "transparent", color: "var(--text)", border: "1px solid transparent", borderRadius: 6, padding: "4px 8px", fontSize: "0.9rem", width: "auto" }}
                    onFocus={(e) => { e.target.style.borderColor = "var(--border)"; e.target.style.background = "var(--bg)"; }}
                    onBlurCapture={(e) => { e.currentTarget.style.borderColor = "transparent"; e.currentTarget.style.background = "transparent"; }} />
                </td>
                <td style={{ padding: "12px 16px", color: "var(--text)", fontSize: "0.9rem" }}>
                  <input type="date" defaultValue={s.registrationClosesAt?.split("T")[0] || ""}
                    onBlur={(e) => { if (e.target.value !== (s.registrationClosesAt?.split("T")[0] || "")) handleUpdate(s.id, "registrationClosesAt", e.target.value || null); }}
                    style={{ background: "transparent", color: "var(--text)", border: "1px solid transparent", borderRadius: 6, padding: "4px 8px", fontSize: "0.9rem", width: "auto" }}
                    onFocus={(e) => { e.target.style.borderColor = "var(--border)"; e.target.style.background = "var(--bg)"; }}
                    onBlurCapture={(e) => { e.currentTarget.style.borderColor = "transparent"; e.currentTarget.style.background = "transparent"; }} />
                </td>
                <td style={{ padding: "12px 16px", textAlign: "center" }}>
                  {!s.isCurrent && (
                    <button className="btn primary" style={{ padding: "6px 14px", fontSize: "0.8rem" }}
                      onClick={() => handleActivate(s.id)}>
                      Activer
                    </button>
                  )}
                  {s.isCurrent && (
                    <span style={{ color: "#22c55e", fontSize: "0.8rem", fontWeight: 700 }}>✓ En cours</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
