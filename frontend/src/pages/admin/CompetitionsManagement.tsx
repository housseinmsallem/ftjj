import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import PageHeader from "../../components/shared/PageHeader";
import LoadingSpinner from "../../components/shared/LoadingSpinner";
import EmptyState from "../../components/shared/EmptyState";
import StatusBadge from "../../components/shared/StatusBadge";
import ConfirmDialog from "../../components/shared/ConfirmDialog";
import FileUpload from "../../components/shared/FileUpload";
import { AGE_DIVISIONS, getAgeDivisionLabel, getWeightCategories } from "../../utils/formOptions";
import type { Competition, PersonType } from "../../types";

/* ── Types ── */
interface CompetitionFormData { name: string; date: string; location: string; description: string; type: string; splitByBelt: boolean; ageDivision: string; seasonYear: number; posterUrl: string; }
const emptyForm: CompetitionFormData = { name: "", date: "", location: "", description: "", type: "Open", splitByBelt: false, ageDivision: "ADULTS", seasonYear: 2026, posterUrl: "" };
interface SignupWithPerson { _id?: string; id?: string; competitionId?: string; personId?: string; person?: { _id?: string; id?: string; firstName?: string; lastName?: string; name?: string; athleteDetails?: { grade?: string; weight?: number }; gender?: string }; type: PersonType; paymentReceiptUrl?: string; status: string; }

/* ── Styles ── */
const inputS: React.CSSProperties = { background: "var(--bg)", color: "var(--text)", border: "1px solid var(--border)", borderRadius: 12, padding: "11px 12px" };
const cardBox: React.CSSProperties = { background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 16, padding: 24, marginBottom: 24 };
const bracketCard: React.CSSProperties = { background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 12, padding: 16, marginBottom: 16 };

/* ── Match Row Component ── */
function MatchRow({ m, isLive }: { m: any; isLive: boolean }) {
  const nav = useNavigate();
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: isLive ? "rgba(213,19,50,0.08)" : "var(--panel2)", borderRadius: 10, marginBottom: 6 }}>
      <div style={{ flex: 1, textAlign: "right" }}>
        <div style={{ fontWeight: 700, color: "#d51332", fontSize: "0.95rem" }}>{m.redCorner?.firstName} {m.redCorner?.lastName}</div>
      </div>
      <div style={{ textAlign: "center", minWidth: 80 }}>
        {isLive ? (
          <div style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: "1.4rem", fontWeight: 900, color: "#d51332" }}>{m.redScore ?? 0}</span>
            <span style={{ color: "var(--muted)", fontSize: "0.8rem" }}>vs</span>
            <span style={{ fontSize: "1.4rem", fontWeight: 900, color: "#2563eb" }}>{m.blueScore ?? 0}</span>
          </div>
        ) : (
          <span style={{ color: "var(--muted)", fontWeight: 600, fontSize: "0.85rem" }}>VS</span>
        )}
        <div style={{ fontSize: "0.7rem", color: "var(--muted)", marginTop: 2 }}>T{m.matNumber}</div>
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, color: "#2563eb", fontSize: "0.95rem" }}>{m.blueCorner?.firstName} {m.blueCorner?.lastName}</div>
      </div>
      <div style={{ display: "flex", gap: 6, alignItems: "center", marginLeft: 8 }}>
        <StatusBadge status={m.status || "UPCOMING"} />
        <button className="btn primary" style={{ fontSize: "0.7rem", padding: "4px 10px" }} onClick={() => nav("/admin/scoring")}>🎮</button>
      </div>
    </div>
  );
}

/* ── Bracket Category Card ── */
function BracketCard({ cat, comp, compId, categoryMatches, onGenMatches, genLoading }: {
  cat: any; comp: Competition; compId: string; categoryMatches: Record<string, any[]>; onGenMatches: (comp: Competition, ids: string[]) => void; genLoading: string | null;
}) {
  const catKey = cat.athletes.sort().join(",");
  const matches = categoryMatches[catKey] || [];
  const loading = genLoading === catKey;
  const liveCount = matches.filter((m: any) => m.status === "LIVE").length;
  const doneCount = matches.filter((m: any) => m.status === "FINISHED").length;

  return (
    <div style={bracketCard}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: matches.length > 0 ? "#22c55e" : "var(--muted)", flexShrink: 0 }} />
          <span style={{ color: "var(--gold)", fontWeight: 800, fontSize: "1rem" }}>{cat.name}</span>
          <span className="muted" style={{ fontSize: "0.8rem" }}>{cat.athletes.length} athlètes</span>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {matches.length > 0 && (
            <span style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
              {doneCount > 0 && <span style={{ color: "#22c55e", fontWeight: 600 }}>{doneCount} terminé{doneCount > 1 ? "s" : ""}</span>}
              {liveCount > 0 && <span style={{ color: "#d51332", fontWeight: 600, marginLeft: 8 }}>{liveCount} en direct</span>}
            </span>
          )}
          {matches.length === 0 ? (
            <button className="btn primary" style={{ fontSize: "0.8rem", padding: "6px 14px" }}
              onClick={() => onGenMatches(comp, cat.athletes)} disabled={!!loading}>
              {loading ? "⏳..." : "Générer les matchs"}
            </button>
          ) : (
            <button className="btn ghost" style={{ fontSize: "0.75rem", padding: "4px 10px" }}
              onClick={() => onGenMatches(comp, cat.athletes)} disabled={!!loading}>
              🔄 Régénérer
            </button>
          )}
        </div>
      </div>

      {/* Matches */}
      {matches.length > 0 && (
        <div style={{ marginTop: 14 }}>
          {matches.map((m: any, i: number) => (
            <MatchRow key={m._id || m.id || i} m={m} isLive={m.status === "LIVE"} />
          ))}
        </div>
      )}

      {/* Empty state */}
      {matches.length === 0 && (
        <div style={{ marginTop: 12, padding: "16px", textAlign: "center", border: "1px dashed var(--border)", borderRadius: 8 }}>
          <p className="muted" style={{ fontSize: "0.85rem", margin: 0 }}>Aucun match généré. Cliquez sur "Générer les matchs" pour créer les confrontations.</p>
        </div>
      )}
    </div>
  );
}

/* ── Main Component ── */
export default function CompetitionsManagement(): React.ReactElement {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingComp, setEditingComp] = useState<Competition | null>(null);
  const [form, setForm] = useState<CompetitionFormData>(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<Competition | null>(null);
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [viewTab, setViewTab] = useState<"overview" | "signups" | "documents" | "brackets">("overview");
  const [docUploading, setDocUploading] = useState(false);
  const [newDocFile, setNewDocFile] = useState<string>("");
  const [bracketLoading, setBracketLoading] = useState<string | null>(null);
  const [bracketResults, setBracketResults] = useState<Record<string, any>>({});
  const [categoryMatches, setCategoryMatches] = useState<Record<string, any[]>>({});
  const [matchGenLoading, setMatchGenLoading] = useState<string | null>(null);

  const { data: comps, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["competitions"],
    queryFn: async () => { const r = await api.get("/competitions"); return (r.data?.data ?? r.data ?? []) as Competition[]; },
  });
  const competitions = comps || [];

  const { data: detail } = useQuery({
    queryKey: ["competitions", expandedId],
    queryFn: async () => { if (!expandedId) return null; const r = await api.get(`/competitions/${expandedId}`); return r.data?.data ?? r.data; },
    enabled: !!expandedId,
  });

  function openCreate() { setEditingComp(null); setForm(emptyForm); setModalOpen(true); }
  function openEdit(c: Competition) { setEditingComp(c); setForm({ name: c.name, date: c.date?.slice(0, 10) || "", location: c.location || "", description: c.description || "", type: (c as any).type || "Open", splitByBelt: !!(c as any).splitByBelt, ageDivision: (c as any).ageDivision || "ADULTS", seasonYear: (c as any).seasonYear || 2026, posterUrl: (c as any).posterUrl || "" }); setModalOpen(true); }
  function closeModal() { setModalOpen(false); setEditingComp(null); setForm(emptyForm); }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { toast.error("Nom requis"); return; }
    if (!form.date) { toast.error("Date requise"); return; }
    setSaving(true);
    const p = { name: form.name.trim(), date: form.date, location: form.location.trim() || undefined, description: form.description.trim() || undefined, type: form.type, splitByBelt: form.splitByBelt, ageDivision: form.ageDivision, seasonYear: form.seasonYear, posterUrl: form.posterUrl || undefined };
    try {
      if (editingComp) { await api.patch(`/competitions/${editingComp._id || editingComp.id}`, p); toast.success("Compétition modifiée"); }
      else { await api.post("/competitions", p); toast.success("Compétition créée"); }
      queryClient.invalidateQueries({ queryKey: ["competitions"] });
      closeModal();
    } catch (e: any) { toast.error(e?.response?.data?.message || "Erreur"); } finally { setSaving(false); }
  }

  const delMut = useMutation({ mutationFn: (id: string) => api.delete(`/competitions/${id}`), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["competitions"] }); toast.success("Supprimée"); setDeleteTarget(null); }, onError: (e: any) => toast.error(e?.response?.data?.message || "Erreur") });

  async function handleConfirmSignup(sid: string) {
    try { await api.patch(`/competitions/signups/${sid}/status`, { status: "APPROVED" }); toast.success("Confirmé"); queryClient.invalidateQueries({ queryKey: ["competitions", expandedId] }); } catch (e: any) { toast.error(e?.response?.data?.message || "Erreur"); }
  }

  async function handleGenBrackets(comp: Competition) {
    const cid = comp._id || comp.id || "";
    setBracketLoading(cid);
    try { const r = await api.post(`/competitions/${cid}/generate-brackets`); const d = r.data?.data || r.data; setBracketResults({ ...bracketResults, [cid]: d }); toast.success(`${d.categories?.length || 0} catégories`); } catch (e: any) { toast.error(e?.response?.data?.message || "Erreur"); } finally { setBracketLoading(null); }
  }

  async function handleGenMatches(comp: Competition, ids: string[]) {
    const cid = comp._id || comp.id || "";
    const key = ids.sort().join(",");
    setMatchGenLoading(key);
    try { const r = await api.post(`/competitions/${cid}/generate-matches`, { athleteIds: ids }); const d = r.data?.data || r.data; setCategoryMatches({ ...categoryMatches, [key]: d.matches || [] }); toast.success(`${d.total || 0} matchs`); queryClient.invalidateQueries({ queryKey: ["competitions", expandedId] }); } catch (e: any) { toast.error(e?.response?.data?.message || "Erreur"); } finally { setMatchGenLoading(null); }
  }

  function toggleExpand(id: string) { setExpandedId(expandedId === id ? null : id); setViewTab("overview"); }
  function getPersonName(s: any) { const p = s.person; if (p?.firstName) return `${p.firstName} ${p.lastName || ""}`; return p?.name || "—"; }
  const typeLabel: Record<string, string> = { ATHLETE: "Athlète", COACH: "Entraîneur", REFEREE: "Arbitre", TECHNICIAN: "Technicien" };

  async function handleAddDocument(cid: string) {
    if (!newDocFile) { toast.error("Veuillez télécharger un fichier"); return; }
    setDocUploading(true);
    try {
      const fileName = newDocFile.split("/").pop() || "document.pdf";
      await api.post(`/competitions/${cid}/documents`, { fileName, fileUrl: newDocFile });
      toast.success("Document ajouté");
      setNewDocFile("");
      queryClient.invalidateQueries({ queryKey: ["competitions", expandedId] });
    } catch (e: any) { toast.error(e?.response?.data?.message || "Erreur"); }
    finally { setDocUploading(false); }
  }

  async function handleDeleteDoc(docId: string, cid: string) {
    try {
      await api.delete(`/competitions/${cid}/documents/${docId}`);
      toast.success("Document supprimé");
      queryClient.invalidateQueries({ queryKey: ["competitions", expandedId] });
    } catch (e: any) { toast.error(e?.response?.data?.message || "Erreur"); }
  }

  if (isLoading) return <div className="page"><LoadingSpinner text="Chargement..." /></div>;
  if (isError && !comps) return <div className="page"><EmptyState title="Erreur" action={<button className="btn primary" onClick={() => refetch()}>Réessayer</button>} /></div>;

  return (
    <div className="page">
      <PageHeader title="Compétitions" breadcrumbs={[{ label: "Admin", to: "/admin" }, { label: "Compétitions" }]} action={<button className="btn primary" onClick={openCreate}>+ Ajouter</button>} />

      <div className="table-card">
        {competitions.length === 0 ? <EmptyState title="Aucune compétition" action={<button className="btn primary" onClick={openCreate}>+ Ajouter</button>} /> : (
          <div className="table-wrap">
            <table className="smart-table">
              <thead><tr><th>Affiche</th><th>Nom</th><th>Type</th><th>Division</th><th>Ceintures</th><th>Date</th><th>Lieu</th><th>Inscrits</th><th>Actions</th></tr></thead>
              <tbody>
                {competitions.map((comp) => {
                  const cid = comp._id || comp.id || "";
                  const isOpen = expandedId === cid;
                  return (
                    <React.Fragment key={cid}>
                      <tr onClick={() => toggleExpand(cid)} style={{ cursor: "pointer" }}>
                        <td>{(comp as any).posterUrl ? <img src={(comp as any).posterUrl} style={{ width: 36, height: 36, borderRadius: 6, objectFit: "cover" }} /> : <span className="muted">—</span>}</td>
                        <td style={{ fontWeight: 600 }}>{comp.name}</td>
                        <td><span style={{ padding: "2px 10px", borderRadius: 12, fontSize: "0.8rem", fontWeight: 600, background: (comp as any).type === "Championship" ? "#e4c32820" : "#3b82f620", color: (comp as any).type === "Championship" ? "#e4c328" : "#3b82f6" }}>{(comp as any).type || "Open"}</span></td>
                        <td><span style={{ fontSize: "0.85rem", fontWeight: 600 }}>{getAgeDivisionLabel((comp as any).ageDivision || "ADULTS")}</span></td>
                        <td><span style={{ color: "var(--muted)", fontSize: "0.85rem" }}>{(comp as any).splitByBelt ? "Par ceinture" : "Toutes"}</span></td>
                        <td>{comp.date ? new Date(comp.date).toLocaleDateString("fr-FR") : "—"}</td>
                        <td>{comp.location || "—"}</td>
                        <td>{comp._count?.signups ?? (comp as any).signupsCount ?? "—"}</td>
                        <td onClick={e => e.stopPropagation()}><div className="row-actions"><button className="btn primary" onClick={() => openEdit(comp)}>Modifier</button><button className="btn danger" onClick={() => setDeleteTarget(comp)}>Supprimer</button></div></td>
                      </tr>
                      {isOpen && (
                        <tr><td colSpan={9} style={{ padding: "24px", background: "var(--panel)" }}>
                          {/* Competition Summary Header */}
                          <div style={{ ...cardBox, marginBottom: 20 }}>
                            <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
                              {(comp as any).posterUrl && (
                                <img src={(comp as any).posterUrl} alt="" style={{ width: 120, height: 160, objectFit: "cover", borderRadius: 12, flexShrink: 0 }} />
                              )}
                              <div style={{ flex: 1, minWidth: 200 }}>
                                <h2 style={{ margin: "0 0 4px", color: "var(--text)", fontSize: "1.3rem" }}>{comp.name}</h2>
                                <p style={{ color: "var(--muted)", margin: "0 0 12px", fontSize: "0.9rem" }}>
                                  {comp.date ? new Date(comp.date).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) : "—"}
                                </p>
                                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
                                  <span style={{ padding: "3px 10px", borderRadius: 12, fontSize: "0.75rem", fontWeight: 600, background: (comp as any).type === "Championship" ? "#e4c32820" : "#3b82f620", color: (comp as any).type === "Championship" ? "#e4c328" : "#3b82f6" }}>{(comp as any).type || "Open"}</span>
                                  <span style={{ padding: "3px 10px", borderRadius: 12, fontSize: "0.75rem", fontWeight: 600, background: "#8b5cf620", color: "#8b5cf6" }}>{getAgeDivisionLabel((comp as any).ageDivision || "ADULTS")}</span>
                                  <span style={{ padding: "3px 10px", borderRadius: 12, fontSize: "0.75rem", fontWeight: 600, background: "#22c55e20", color: "#22c55e" }}>{(comp as any).splitByBelt ? "Par ceinture" : "Toutes ceintures"}</span>
                                  {new Date(comp.date) > new Date() ? (
                                    <span style={{ padding: "3px 10px", borderRadius: 12, fontSize: "0.75rem", fontWeight: 600, background: "#22c55e20", color: "#22c55e" }}>✅ Inscriptions ouvertes</span>
                                  ) : (
                                    <span style={{ padding: "3px 10px", borderRadius: 12, fontSize: "0.75rem", fontWeight: 600, background: "var(--bg)", color: "var(--muted)" }}>🔒 Terminée</span>
                                  )}
                                </div>
                                {comp.location && <p style={{ margin: "4px 0", color: "var(--muted)", fontSize: "0.85rem" }}>📍 {comp.location}</p>}
                                {(comp as any).description && <p style={{ margin: "8px 0 0", color: "var(--text)", fontSize: "0.85rem", lineHeight: 1.5 }}>{(comp as any).description}</p>}
                              </div>
                              <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end", minWidth: 120 }}>
                                <div style={{ textAlign: "center", padding: "12px 16px", background: "var(--bg)", borderRadius: 10 }}>
                                  <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "var(--red)" }}>{detail?.signups?.length || comp._count?.signups || 0}</div>
                                  <div style={{ fontSize: "0.7rem", color: "var(--muted)" }}>Inscrits</div>
                                </div>
                                <div style={{ textAlign: "center", padding: "12px 16px", background: "var(--bg)", borderRadius: 10 }}>
                                  <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "var(--gold)" }}>{detail?.matches?.length || comp._count?.matches || 0}</div>
                                  <div style={{ fontSize: "0.7rem", color: "var(--muted)" }}>Matchs</div>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Tabs */}
                          <div style={{ display: "flex", gap: 0, marginBottom: 20, borderBottom: "2px solid var(--border)" }}>
                            {(["overview", "signups", "documents", "brackets"] as const).map(t => (
                              <button key={t} onClick={() => setViewTab(t)} style={{ padding: "10px 20px", border: "none", background: "transparent", color: viewTab === t ? "var(--red)" : "var(--muted)", fontWeight: viewTab === t ? 700 : 500, borderBottom: viewTab === t ? "2px solid var(--red)" : "2px solid transparent", cursor: "pointer", fontSize: "0.9rem" }}>
                                {t === "overview" && "📋 Aperçu"}
                                {t === "signups" && `📋 Inscriptions (${detail?.signups?.length || 0})`}
                                {t === "documents" && `📄 Documents (${detail?.documents?.length || 0})`}
                                {t === "brackets" && "🏆 Catégories & Matchs"}
                              </button>
                            ))}
                          </div>

                          {/* OVERVIEW TAB */}
                          {viewTab === "overview" && (
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                              {/* Info cards */}
                              <div style={cardBox}>
                                <h3 style={{ margin: "0 0 12px", color: "var(--text)", fontSize: "0.95rem" }}>📊 Statistiques</h3>
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                                  {[
                                    { label: "Inscrits", value: detail?.signups?.length || 0 },
                                    { label: "Confirmés", value: detail?.signups?.filter((s: any) => s.status === "APPROVED").length || 0 },
                                    { label: "En attente", value: detail?.signups?.filter((s: any) => s.status === "PENDING").length || 0 },
                                    { label: "Matchs", value: detail?.matches?.length || 0 },
                                    { label: "En direct", value: detail?.matches?.filter((m: any) => m.status === "LIVE").length || 0 },
                                    { label: "Terminés", value: detail?.matches?.filter((m: any) => m.status === "FINISHED").length || 0 },
                                  ].map(stat => (
                                    <div key={stat.label} style={{ padding: "12px", background: "var(--bg)", borderRadius: 8, textAlign: "center" }}>
                                      <div style={{ fontSize: "1.4rem", fontWeight: 700, color: "var(--text)" }}>{stat.value}</div>
                                      <div style={{ fontSize: "0.7rem", color: "var(--muted)" }}>{stat.label}</div>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* Weight categories */}
                              <div style={cardBox}>
                                <h3 style={{ margin: "0 0 12px", color: "var(--text)", fontSize: "0.95rem" }}>⚖️ Catégories de poids</h3>
                                <div style={{ display: "flex", gap: 20 }}>
                                  <div style={{ flex: 1 }}>
                                    <p style={{ margin: "0 0 6px", fontSize: "0.8rem", fontWeight: 600, color: "#3b82f6" }}>Hommes</p>
                                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                                      {getWeightCategories((comp as any).ageDivision || "ADULTS", "MALE").map((wc: string) => (
                                        <span key={wc} style={{ padding: "2px 8px", fontSize: "0.72rem", background: "var(--bg)", borderRadius: 6, color: "var(--muted)" }}>{wc}</span>
                                      ))}
                                    </div>
                                  </div>
                                  <div style={{ flex: 1 }}>
                                    <p style={{ margin: "0 0 6px", fontSize: "0.8rem", fontWeight: 600, color: "#ec4899" }}>Femmes</p>
                                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                                      {getWeightCategories((comp as any).ageDivision || "ADULTS", "FEMALE").map((wc: string) => (
                                        <span key={wc} style={{ padding: "2px 8px", fontSize: "0.72rem", background: "var(--bg)", borderRadius: 6, color: "var(--muted)" }}>{wc}</span>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Documents preview */}
                              <div style={cardBox}>
                                <h3 style={{ margin: "0 0 12px", color: "var(--text)", fontSize: "0.95rem" }}>📄 Documents</h3>
                                {!detail?.documents || detail.documents.length === 0 ? (
                                  <p className="muted" style={{ fontSize: "0.85rem" }}>Aucun document attaché à cette compétition.</p>
                                ) : (
                                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                    {detail.documents.slice(0, 5).map((doc: any) => (
                                      <a key={doc.id} href={doc.fileUrl} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: "var(--bg)", borderRadius: 8, color: "var(--text)", textDecoration: "none", fontSize: "0.85rem" }}>
                                        📎 {doc.fileName}
                                      </a>
                                    ))}
                                    {detail.documents.length > 5 && <span className="muted" style={{ fontSize: "0.75rem" }}>+ {detail.documents.length - 5} autre(s)</span>}
                                  </div>
                                )}
                              </div>

                              {/* Signups preview */}
                              <div style={cardBox}>
                                <h3 style={{ margin: "0 0 12px", color: "var(--text)", fontSize: "0.95rem" }}>👥 Derniers inscrits</h3>
                                {!detail?.signups || detail.signups.length === 0 ? (
                                  <p className="muted" style={{ fontSize: "0.85rem" }}>Aucun inscrit pour le moment.</p>
                                ) : (
                                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                    {detail.signups.slice(0, 5).map((s: any, i: number) => (
                                      <div key={s._id || s.id || i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: "var(--bg)", borderRadius: 8 }}>
                                        <span style={{ fontSize: "0.85rem", color: "var(--text)" }}>{getPersonName(s)}</span>
                                        <StatusBadge status={s.status} />
                                      </div>
                                    ))}
                                    {detail.signups.length > 5 && <span className="muted" style={{ fontSize: "0.75rem" }}>+ {detail.signups.length - 5} autre(s)</span>}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* SIGNUPS TAB */}
                          {viewTab === "signups" && (
                            <div>
                              {!detail?.signups || detail.signups.length === 0 ? (
                                <EmptyState title="Aucune inscription" description="Aucun athlète inscrit à cette compétition." />
                              ) : (
                                <div className="table-wrap">
                                  <table className="smart-table">
                                    <thead><tr><th>Personne</th><th>Club</th><th>Type</th><th>Ceinture</th><th>Poids</th><th>Statut</th><th>Action</th></tr></thead>
                                    <tbody>
                                      {detail.signups.map((s: any, i: number) => (
                                        <tr key={s._id || s.id || i}>
                                          <td>{getPersonName(s)}</td>
                                          <td>{s.person?.club?.name || "—"}</td>
                                          <td>{typeLabel[s.type] || s.type}</td>
                                          <td>{s.person?.athleteDetails?.grade || "—"}</td>
                                          <td>{s.person?.athleteDetails?.weight ? `${s.person.athleteDetails.weight} kg` : "—"}</td>
                                          <td><StatusBadge status={s.status} /></td>
                                          <td>{s.status === "PENDING" && <button className="btn primary" style={{ fontSize: "0.75rem" }} onClick={() => handleConfirmSignup(s._id || s.id)}>Confirmer</button>}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>
                          )}

                          {/* DOCUMENTS TAB */}
                          {viewTab === "documents" && (
                            <div>
                              <div style={cardBox}>
                                <h3 style={{ margin: "0 0 12px", color: "var(--text)", fontSize: "0.95rem" }}>Ajouter un document</h3>
                                <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
                                  <div style={{ flex: 1, minWidth: 200 }}>
                                    <FileUpload
                                      label="Fichier (PDF, image, etc.)"
                                      accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                                      onUploaded={setNewDocFile}
                                      currentUrl={newDocFile || null}
                                    />
                                  </div>
                                  <button className="btn primary" onClick={() => handleAddDocument(cid)} disabled={docUploading || !newDocFile}>
                                    {docUploading ? "Ajout..." : "Ajouter"}
                                  </button>
                                </div>
                              </div>
                              {!detail?.documents || detail.documents.length === 0 ? (
                                <EmptyState title="Aucun document" description="Ajoutez des règlements, communiqués ou notices." />
                              ) : (
                                <div className="table-wrap">
                                  <table className="smart-table">
                                    <thead><tr><th>Fichier</th><th>Date</th><th>Action</th></tr></thead>
                                    <tbody>
                                      {detail.documents.map((doc: any) => (
                                        <tr key={doc.id}>
                                          <td>
                                            <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" style={{ color: "var(--red)", display: "flex", alignItems: "center", gap: 6 }}>
                                              📎 {doc.fileName}
                                            </a>
                                          </td>
                                          <td>{doc.createdAt ? new Date(doc.createdAt).toLocaleDateString("fr-FR") : "—"}</td>
                                          <td>
                                            <button className="btn danger" style={{ fontSize: "0.75rem" }} onClick={() => handleDeleteDoc(doc.id, cid)}>Supprimer</button>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>
                          )}

                          {/* BRACKETS TAB */}
                          {viewTab === "brackets" && (
                            <div>
                              <div style={cardBox}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
                                  <div>
                                    <h3 style={{ margin: 0, color: "var(--text)", fontSize: "1rem" }}>📊 Catégories</h3>
                                    <p className="muted" style={{ margin: "4px 0 0", fontSize: "0.8rem" }}>
                                      {(comp as any).splitByBelt ? "Séparation par ceintures activée" : "Toutes ceintures confondues (Newaza)"}
                                    </p>
                                  </div>
                                  <button className="btn primary" onClick={() => handleGenBrackets(comp)} disabled={bracketLoading === cid}>
                                    {bracketLoading === cid ? "⏳..." : bracketResults[cid] ? "🔄 Régénérer les catégories" : "1. Générer les catégories"}
                                  </button>
                                </div>

                                {bracketResults[cid] && (
                                  <div style={{ marginTop: 20 }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                                      <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
                                      <span style={{ color: "var(--muted)", fontSize: "0.8rem", whiteSpace: "nowrap" }}>
                                        {bracketResults[cid].categories.length} catégorie{bracketResults[cid].categories.length > 1 ? "s" : ""} · {bracketResults[cid].totalAthletes} athlètes
                                      </span>
                                      <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
                                    </div>
                                    {bracketResults[cid].categories.map((cat: any, i: number) => (
                                      <BracketCard key={i} cat={cat} comp={comp} compId={cid} categoryMatches={categoryMatches} onGenMatches={handleGenMatches} genLoading={matchGenLoading} />
                                    ))}
                                  </div>
                                )}

                                {!bracketResults[cid] && (
                                  <div style={{ marginTop: 16, padding: "20px", textAlign: "center", border: "1px dashed var(--border)", borderRadius: 8 }}>
                                    <p className="muted" style={{ margin: 0 }}>Cliquez sur "Générer les catégories" pour regrouper les athlètes par poids et ceinture.</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </td></tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {modalOpen && (
        <div className="modal-overlay" onClick={closeModal}><div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 550 }}>
          <h3>{editingComp ? "Modifier" : "Ajouter"}</h3>
          <form onSubmit={handleSave} style={{ marginTop: 16 }}>
            <div className="form-grid">
              <label className="field-label">Nom <span style={{ color: "var(--red)" }}>*</span><input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required style={inputS} /></label>
              <label className="field-label">Date <span style={{ color: "var(--red)" }}>*</span><input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} required style={inputS} /></label>
              <label className="field-label">Lieu<input type="text" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} style={inputS} /></label>
            </div>
            <label className="field-label" style={{ marginTop: 16 }}>Description<textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} style={{ ...inputS, minHeight: 80, resize: "vertical" }} /></label>
            <div className="form-grid" style={{ marginTop: 16 }}>
              <label className="field-label">Type<select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} style={inputS}><option value="Open">Open</option><option value="Championship">Championship</option></select></label>
              <label className="field-label" style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", paddingTop: 24 }}><input type="checkbox" checked={form.splitByBelt} onChange={e => setForm({ ...form, splitByBelt: e.target.checked })} style={{ width: 18, height: 18, accentColor: "var(--red)" }} /> Séparation par ceintures</label>
            </div>
            <div className="form-grid" style={{ marginTop: 16 }}>
              <label className="field-label">Division d'âge<select value={form.ageDivision} onChange={e => setForm({ ...form, ageDivision: e.target.value })} style={inputS}>{AGE_DIVISIONS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}</select></label>
              <label className="field-label">Année de saison<input type="number" value={form.seasonYear} onChange={e => setForm({ ...form, seasonYear: Number(e.target.value) })} min={2020} max={2030} style={inputS} /></label>
            </div>
            <div style={{ marginTop: 16 }}><FileUpload label="Affiche (poster)" accept=".jpg,.jpeg,.png,.webp" onUploaded={url => setForm({ ...form, posterUrl: url })} currentUrl={form.posterUrl || null} /></div>
            <div style={{ marginTop: 20, display: "flex", gap: 10, justifyContent: "flex-end" }}><button type="button" className="btn" onClick={closeModal}>Annuler</button><button type="submit" className="btn primary" disabled={saving}>{saving ? "..." : editingComp ? "Enregistrer" : "Créer"}</button></div>
          </form>
        </div></div>
      )}
      <ConfirmDialog open={!!deleteTarget} title="Supprimer" message="Confirmer la suppression ?" variant="danger" confirmLabel="Supprimer" onConfirm={() => deleteTarget && delMut.mutate(deleteTarget._id || deleteTarget.id || "")} onCancel={() => setDeleteTarget(null)} />
    </div>
  );
}
