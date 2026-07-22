import React, { useState, useRef } from "react";
import api from "../../services/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import PageHeader from "../../components/shared/PageHeader";
import LoadingSpinner from "../../components/shared/LoadingSpinner";
import EmptyState from "../../components/shared/EmptyState";
import ConfirmDialog from "../../components/shared/ConfirmDialog";
import FileUpload from "../../components/shared/FileUpload";

interface CmsDocument {
  id: string;
  title: string;
  category: string;
  fileName: string;
  fileUrl: string;
  createdAt: string;
}

interface FeaturedMediaItem {
  id: string;
  title?: string;
  description?: string;
  imageUrl: string;
  competitionId?: string;
  competition?: { id: string; name: string };
  sortOrder: number;
}

interface Competition {
  id: string;
  name: string;
  date: string;
  isPublic: boolean;
  type?: string;
  splitByBelt?: boolean;
}

interface Article {
  id: string;
  title: string;
  excerpt: string;
  content?: string;
  category: string;
  imageUrl?: string;
  isPublished: boolean;
  publishedAt: string;
}

const DOCUMENT_CATEGORIES = [
  { value: "RULESET", label: "Règlements" },
  { value: "FEES", label: "Frais et tarifs" },
  { value: "CODE_OF_CONDUCT", label: "Code de conduite" },
  { value: "LICENSE_DOCS", label: "Documents de licence" },
  { value: "OTHER", label: "Autre" },
];

const NEWS_CATEGORIES = [
  { value: "REGISTRATION_OPEN", label: "Inscriptions ouvertes" },
  { value: "STAGE_OPEN_MATS", label: "Stage / Open Mats" },
  { value: "NEW_COMPETITION", label: "Nouvelle compétition" },
  { value: "NEW_TOURNAMENT", label: "Nouveau tournoi open" },
  { value: "OTHER", label: "Autre" },
];

type CmsTab = "competitions" | "documents" | "media" | "articles";

export default function CmsDashboard(): React.ReactElement {
  const [tab, setTab] = useState<CmsTab>("competitions");
  const queryClient = useQueryClient();

  // --- Competitions ---
  const {
    data: compsData,
    isLoading: compsLoading,
  } = useQuery({
    queryKey: ["cms-competitions"],
    queryFn: async () => {
      const res = await api.get("/competitions");
      return ((res.data?.data ?? res.data) as Competition[]) || [];
    },
  });

  const toggleMutation = useMutation({
    mutationFn: (id: string) =>
      api.patch(`/cms/competitions/${id}/toggle-visibility`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cms-competitions"] });
      toast.success("Visibilité mise à jour");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Erreur");
    },
  });

  // --- Documents ---
  const [docTitle, setDocTitle] = useState("");
  const [docCategory, setDocCategory] = useState("RULESET");
  const [docFileUrl, setDocFileUrl] = useState("");
  const [docFileName, setDocFileName] = useState("");
  const [docSaving, setDocSaving] = useState(false);
  const [deleteDocTarget, setDeleteDocTarget] = useState<CmsDocument | null>(null);

  const {
    data: docsData,
    isLoading: docsLoading,
  } = useQuery({
    queryKey: ["cms-documents"],
    queryFn: async () => {
      const res = await api.get("/cms/documents");
      return ((res.data?.data ?? res.data) as CmsDocument[]) || [];
    },
  });

  async function handleCreateDoc(e: React.FormEvent) {
    e.preventDefault();
    if (!docTitle.trim() || !docFileUrl) {
      toast.error("Titre et fichier sont obligatoires");
      return;
    }
    setDocSaving(true);
    try {
      await api.post("/cms/documents", {
        title: docTitle.trim(),
        category: docCategory,
        fileName: docFileName || "document",
        fileUrl: docFileUrl,
      });
      toast.success("Document ajouté");
      setDocTitle("");
      setDocFileUrl("");
      setDocFileName("");
      queryClient.invalidateQueries({ queryKey: ["cms-documents"] });
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Erreur");
    } finally {
      setDocSaving(false);
    }
  }

  const deleteDocMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/cms/documents/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cms-documents"] });
      toast.success("Document supprimé");
      setDeleteDocTarget(null);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Erreur");
    },
  });

  // --- Featured Media ---
  const [mediaTitle, setMediaTitle] = useState("");
  const [mediaDesc, setMediaDesc] = useState("");
  const [mediaImageUrl, setMediaImageUrl] = useState("");
  const [mediaCompId, setMediaCompId] = useState("");
  const [mediaSaving, setMediaSaving] = useState(false);
  const [deleteMediaTarget, setDeleteMediaTarget] = useState<FeaturedMediaItem | null>(null);

  // --- Batch media upload ---
  const [batchFiles, setBatchFiles] = useState<File[]>([]);
  const [batchUploading, setBatchUploading] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{ name: string; progress: number; done: boolean; url?: string }[]>([]);

  // --- Articles ---
  const [articleTitle, setArticleTitle] = useState("");
  const [articleExcerpt, setArticleExcerpt] = useState("");
  const [articleCategory, setArticleCategory] = useState("REGISTRATION_OPEN");
  const [articleImageUrl, setArticleImageUrl] = useState("");
  const [articlePublished, setArticlePublished] = useState(true);
  const [articleSaving, setArticleSaving] = useState(false);
  const [editingArticle, setEditingArticle] = useState<string | null>(null);
  const [deleteArticleTarget, setDeleteArticleTarget] = useState<Article | null>(null);

  const {
    data: mediaData,
    isLoading: mediaLoading,
  } = useQuery({
    queryKey: ["cms-featured-media"],
    queryFn: async () => {
      const res = await api.get("/cms/featured-media");
      return ((res.data?.data ?? res.data) as FeaturedMediaItem[]) || [];
    },
  });

  async function handleBatchUpload() {
    if (batchFiles.length === 0) { toast.error("Sélectionnez au moins une image"); return; }
    setBatchUploading(true);
    const progress = batchFiles.map((f) => ({ name: f.name, progress: 0, done: false, url: "" }));
    setBatchProgress([...progress]);

    const urls: string[] = [];
    for (let i = 0; i < batchFiles.length; i++) {
      const file = batchFiles[i];
      const formData = new FormData();
      formData.append("file", file);
      try {
        const res = await api.post("/uploads/single", formData, {
          headers: { "Content-Type": "multipart/form-data" },
          onUploadProgress: (pe: any) => {
            if (pe.total) {
              const pct = Math.round((pe.loaded * 100) / pe.total);
              progress[i] = { ...progress[i], progress: pct };
              setBatchProgress([...progress]);
            }
          },
        });
        const url = res.data?.data?.fileUrl || res.data?.fileUrl || "";
        urls.push(url);
        progress[i] = { ...progress[i], progress: 100, done: true, url };
        setBatchProgress([...progress]);
      } catch {
        progress[i] = { ...progress[i], done: true, url: "ERREUR" };
        setBatchProgress([...progress]);
        toast.error(`Échec du téléchargement de ${file.name}`);
      }
    }

    // Create FeaturedMedia records for all successful uploads
    const successUrls = urls.filter(Boolean);
    if (successUrls.length > 0) {
      try {
        for (const url of successUrls) {
          await api.post("/cms/featured-media", {
            title: mediaTitle.trim() || undefined,
            description: mediaDesc.trim() || undefined,
            imageUrl: url,
            competitionId: mediaCompId || undefined,
          });
        }
        toast.success(`${successUrls.length} image(s) ajoutée(s)`);
        setMediaTitle("");
        setMediaDesc("");
        setMediaImageUrl("");
        setMediaCompId("");
        setBatchFiles([]);
        setBatchProgress([]);
        queryClient.invalidateQueries({ queryKey: ["cms-featured-media"] });
      } catch (err: any) {
        toast.error(err?.response?.data?.message || "Erreur lors de la création");
      }
    }
    setBatchUploading(false);
  }

  async function handleCreateMedia(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    if (!mediaImageUrl) {
      toast.error("Une image est obligatoire");
      return;
    }
    setMediaSaving(true);
    try {
      await api.post("/cms/featured-media", {
        title: mediaTitle.trim() || undefined,
        description: mediaDesc.trim() || undefined,
        imageUrl: mediaImageUrl,
        competitionId: mediaCompId || undefined,
      });
      toast.success("Image ajoutée");
      setMediaTitle("");
      setMediaDesc("");
      setMediaImageUrl("");
      setMediaCompId("");
      queryClient.invalidateQueries({ queryKey: ["cms-featured-media"] });
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Erreur");
    } finally {
      setMediaSaving(false);
    }
  }

  const deleteMediaMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/cms/featured-media/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cms-featured-media"] });
      toast.success("Image supprimée");
      setDeleteMediaTarget(null);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Erreur");
    },
  });

  // --- Articles queries & mutations ---
  const { data: articlesData, isLoading: articlesLoading } = useQuery({
    queryKey: ["cms-articles"],
    queryFn: async () => { const res = await api.get("/cms/articles"); return ((res.data?.data ?? res.data) as Article[]) || []; },
  });

  async function handleSaveArticle(e: React.FormEvent) {
    e.preventDefault();
    if (!articleTitle.trim() || !articleExcerpt.trim()) { toast.error("Titre et résumé sont obligatoires"); return; }
    setArticleSaving(true);
    try {
      if (editingArticle) {
        await api.patch(`/cms/articles/${editingArticle}`, { title: articleTitle.trim(), excerpt: articleExcerpt.trim(), category: articleCategory, imageUrl: articleImageUrl || undefined, isPublished: articlePublished });
        toast.success("Actualité mise à jour");
      } else {
        await api.post("/cms/articles", { title: articleTitle.trim(), excerpt: articleExcerpt.trim(), category: articleCategory, imageUrl: articleImageUrl || undefined, isPublished: articlePublished });
        toast.success("Actualité créée");
      }
      setArticleTitle(""); setArticleExcerpt(""); setArticleCategory("REGISTRATION_OPEN"); setArticleImageUrl(""); setArticlePublished(true); setEditingArticle(null);
      queryClient.invalidateQueries({ queryKey: ["cms-articles"] });
    } catch (err: any) { toast.error(err?.response?.data?.message || "Erreur"); }
    finally { setArticleSaving(false); }
  }

  const deleteArticleMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/cms/articles/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["cms-articles"] }); toast.success("Actualité supprimée"); setDeleteArticleTarget(null); },
    onError: (err: any) => toast.error(err?.response?.data?.message || "Erreur"),
  });

  // Reorder
  async function moveMedia(id: string, direction: "up" | "down") {
    const list = mediaData || [];
    const idx = list.findIndex((m) => m.id === id);
    if (idx < 0) return;
    const otherIdx = direction === "up" ? idx - 1 : idx + 1;
    if (otherIdx < 0 || otherIdx >= list.length) return;

    try {
      await api.patch(`/cms/featured-media/${id}`, { sortOrder: list[otherIdx].sortOrder });
      await api.patch(`/cms/featured-media/${list[otherIdx].id}`, { sortOrder: list[idx].sortOrder });
      queryClient.invalidateQueries({ queryKey: ["cms-featured-media"] });
    } catch (err: any) {
      toast.error("Erreur lors du réordonnancement");
    }
  }

  const tabBtnStyle = (active: boolean): React.CSSProperties => ({
    padding: "10px 20px",
    border: "none",
    background: active ? "var(--red)" : "var(--panel)",
    color: active ? "white" : "var(--muted)",
    borderRadius: 8,
    cursor: "pointer",
    fontWeight: 600,
    fontSize: "0.9rem",
    transition: "all 0.2s",
  });

  const cardStyle: React.CSSProperties = {
    background: "white",
    border: "1px solid var(--border)",
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  };

  return (
    <div className="page">
      <PageHeader
        title="CMS - Gestion de contenu"
        breadcrumbs={[
          { label: "Admin", to: "/admin" },
          { label: "CMS" },
        ]}
      />

      <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        <button style={tabBtnStyle(tab === "competitions")} onClick={() => setTab("competitions")}>
          🏆 Compétitions
        </button>
        <button style={tabBtnStyle(tab === "documents")} onClick={() => setTab("documents")}>
          📄 Documents
        </button>
        <button style={tabBtnStyle(tab === "media")} onClick={() => setTab("media")}>
          🖼️ Médias à la une
        </button>
        <button style={tabBtnStyle(tab === "articles")} onClick={() => setTab("articles")}>
          📰 Actualités
        </button>
      </div>

      {/* ============= COMPETITIONS TAB ============= */}
      {tab === "competitions" && (
        <div>
          {compsLoading ? (
            <LoadingSpinner text="Chargement..." />
          ) : (compsData || []).length === 0 ? (
            <EmptyState title="Aucune compétition" description="Aucune compétition trouvée." />
          ) : (
            <div className="table-wrap">
              <table className="smart-table">
                <thead>
                  <tr>
                    <th>Nom</th>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Visibilité</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {(compsData || []).map((comp) => (
                    <tr key={comp.id}>
                      <td>{comp.name}</td>
                      <td>{comp.date ? new Date(comp.date).toLocaleDateString("fr-FR") : "—"}</td>
                      <td>{comp.type || "Open"}</td>
                      <td>
                        <span
                          style={{
                            color: comp.isPublic ? "var(--green)" : "var(--muted)",
                            fontWeight: 600,
                          }}
                        >
                          {comp.isPublic ? "Visible" : "Masquée"}
                        </span>
                      </td>
                      <td>
                        <button
                          className="btn primary"
                          onClick={() => toggleMutation.mutate(comp.id)}
                          disabled={toggleMutation.isPending}
                        >
                          {comp.isPublic ? "Masquer" : "Afficher"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ============= DOCUMENTS TAB ============= */}
      {tab === "documents" && (
        <div>
          {/* Add form */}
          <div style={cardStyle}>
            <h3 style={{ color: "var(--text)", marginBottom: 16 }}>Ajouter un document</h3>
            <form onSubmit={handleCreateDoc}>
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 12 }}>
                <label className="field-label" style={{ minWidth: 200, flex: 1 }}>
                  Titre <span style={{ color: "var(--red)" }}>*</span>
                  <input
                    type="text"
                    value={docTitle}
                    onChange={(e) => setDocTitle(e.target.value)}
                    placeholder="Titre du document"
                    style={{
                      background: "var(--bg)",
                      color: "var(--text)",
                      border: "1px solid var(--border)",
                      borderRadius: 12,
                      padding: "11px 12px",
                      width: "100%",
                    }}
                  />
                </label>
                <label className="field-label" style={{ minWidth: 200 }}>
                  Catégorie
                  <select
                    value={docCategory}
                    onChange={(e) => setDocCategory(e.target.value)}
                    style={{
                      background: "var(--bg)",
                      color: "var(--text)",
                      border: "1px solid var(--border)",
                      borderRadius: 12,
                      padding: "11px 12px",
                      width: "100%",
                    }}
                  >
                    {DOCUMENT_CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </label>
              </div>
              <div style={{ marginBottom: 12 }}>
                <FileUpload
                  label="Fichier (PDF, DOC, etc.)"
                  accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                  onUploaded={(url) => {
                    setDocFileUrl(url);
                    const parts = url.split("/");
                    setDocFileName(parts[parts.length - 1] || "document");
                  }}
                  currentUrl={docFileUrl || null}
                />
              </div>
              <button type="submit" className="btn primary" disabled={docSaving}>
                {docSaving ? "Ajout..." : "Ajouter le document"}
              </button>
            </form>
          </div>

          {/* List */}
          {docsLoading ? (
            <LoadingSpinner text="Chargement..." />
          ) : (docsData || []).length === 0 ? (
            <EmptyState title="Aucun document" description="Ajoutez des documents téléchargeables." />
          ) : (
            <div className="table-wrap">
              <table className="smart-table">
                <thead>
                  <tr>
                    <th>Titre</th>
                    <th>Catégorie</th>
                    <th>Fichier</th>
                    <th>Date</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {(docsData || []).map((doc) => (
                    <tr key={doc.id}>
                      <td>{doc.title}</td>
                      <td>{DOCUMENT_CATEGORIES.find((c) => c.value === doc.category)?.label || doc.category}</td>
                      <td>
                        <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" style={{ color: "var(--red)" }}>
                          {doc.fileName}
                        </a>
                      </td>
                      <td>{new Date(doc.createdAt).toLocaleDateString("fr-FR")}</td>
                      <td>
                        <button
                          className="btn danger"
                          onClick={() => setDeleteDocTarget(doc)}
                        >
                          Supprimer
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ============= MEDIA TAB ============= */}
      {tab === "media" && (
        <div>
          {/* Add form */}
          <div style={cardStyle}>
            <h3 style={{ color: "var(--text)", marginBottom: 16 }}>Ajouter des images à la une</h3>

            {/* Shared metadata fields */}
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 12 }}>
              <label className="field-label" style={{ minWidth: 200, flex: 1 }}>
                Titre commun (optionnel)
                <input type="text" value={mediaTitle} onChange={(e) => setMediaTitle(e.target.value)} placeholder="Appliqué à toutes les images"
                  style={{ background: "var(--bg)", color: "var(--text)", border: "1px solid var(--border)", borderRadius: 12, padding: "11px 12px", width: "100%" }} />
              </label>
              <label className="field-label" style={{ minWidth: 200, flex: 1 }}>
                Description commune (optionnelle)
                <input type="text" value={mediaDesc} onChange={(e) => setMediaDesc(e.target.value)} placeholder="Appliquée à toutes les images"
                  style={{ background: "var(--bg)", color: "var(--text)", border: "1px solid var(--border)", borderRadius: 12, padding: "11px 12px", width: "100%" }} />
              </label>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label className="field-label" style={{ minWidth: 200 }}>
                Lier à une compétition (optionnel)
                <select value={mediaCompId} onChange={(e) => setMediaCompId(e.target.value)}
                  style={{ background: "var(--bg)", color: "var(--text)", border: "1px solid var(--border)", borderRadius: 12, padding: "11px 12px", width: "100%", maxWidth: 400 }}>
                  <option value="">— Aucune —</option>
                  {(compsData || []).map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
                </select>
              </label>
            </div>

            {/* Single upload */}
            <div style={{ marginBottom: 8, padding: "12px 16px", background: "var(--bg)", borderRadius: 12, border: "1px solid var(--border)" }}>
              <p style={{ margin: "0 0 8px", color: "var(--muted)", fontSize: "0.85rem", fontWeight: 600 }}>Upload Rapide (1 image)</p>
              <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <FileUpload label="Image" accept=".png,.jpg,.jpeg,.webp" onUploaded={setMediaImageUrl} currentUrl={mediaImageUrl || null} />
                </div>
                <button type="button" className="btn primary" onClick={handleCreateMedia} disabled={mediaSaving || !mediaImageUrl}>
                  {mediaSaving ? "..." : "Ajouter"}
                </button>
              </div>
            </div>

            {/* Batch upload */}
            <div style={{ padding: "12px 16px", background: "var(--bg)", borderRadius: 12, border: "1px solid var(--border)" }}>
              <p style={{ margin: "0 0 8px", color: "var(--muted)", fontSize: "0.85rem", fontWeight: 600 }}>Upload par Lot (plusieurs images)</p>
              <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginBottom: 8 }}>
                <input
                  type="file"
                  accept=".png,.jpg,.jpeg,.webp"
                  multiple
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    setBatchFiles(files);
                    setBatchProgress([]);
                  }}
                  disabled={batchUploading}
                  style={{ color: "var(--text)" }}
                />
                <button type="button" className="btn primary" onClick={handleBatchUpload} disabled={batchUploading || batchFiles.length === 0}>
                  {batchUploading ? "Upload en cours..." : `Uploader ${batchFiles.length > 0 ? `(${batchFiles.length})` : ""}`}
                </button>
              </div>

              {/* Upload progress */}
              {batchProgress.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 200, overflowY: "auto" }}>
                  {batchProgress.map((p, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "4px 0", borderBottom: "1px solid var(--border)" }}>
                      <span style={{ flex: 1, fontSize: "0.8rem", color: p.done && p.url === "ERREUR" ? "var(--red)" : "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {p.name}
                      </span>
                      <div style={{ width: 100, height: 6, background: "var(--border)", borderRadius: 3, overflow: "hidden", flexShrink: 0 }}>
                        <div style={{ width: `${p.progress}%`, height: "100%", background: p.done && p.url === "ERREUR" ? "var(--red)" : "var(--green)", borderRadius: 3, transition: "width 0.2s" }} />
                      </div>
                      <span style={{ fontSize: "0.75rem", color: "var(--muted)", width: 35, textAlign: "right", flexShrink: 0 }}>
                        {p.done ? (p.url === "ERREUR" ? "❌" : "✅") : `${p.progress}%`}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* List */}
          {mediaLoading ? (
            <LoadingSpinner text="Chargement..." />
          ) : (mediaData || []).length === 0 ? (
            <EmptyState title="Aucune image" description="Ajoutez des images à la une." />
          ) : (
            <div className="table-wrap">
              <table className="smart-table">
                <thead>
                  <tr>
                    <th>Aperçu</th>
                    <th>Titre</th>
                    <th>Compétition</th>
                    <th>Ordre</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(mediaData || []).map((media) => (
                    <tr key={media.id}>
                      <td>
                        <img
                          src={media.imageUrl}
                          alt={media.title || ""}
                          style={{ width: 60, height: 40, objectFit: "cover", borderRadius: 6 }}
                        />
                      </td>
                      <td>{media.title || "—"}</td>
                      <td>{media.competition?.name || "—"}</td>
                      <td>{media.sortOrder}</td>
                      <td>
                        <div className="row-actions">
                          <button
                            className="btn"
                            onClick={() => moveMedia(media.id, "up")}
                            title="Monter"
                          >
                            ↑
                          </button>
                          <button
                            className="btn"
                            onClick={() => moveMedia(media.id, "down")}
                            title="Descendre"
                          >
                            ↓
                          </button>
                          <button
                            className="btn danger"
                            onClick={() => setDeleteMediaTarget(media)}
                          >
                            Supprimer
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ============= ARTICLES TAB ============= */}
      {tab === "articles" && (
        <div>
          {/* Add form */}
          <div style={cardStyle}>
            <h3 style={{ color: "var(--text)", marginBottom: 16 }}>{editingArticle ? "Modifier l'actualité" : "Ajouter une actualité"}</h3>
            <form onSubmit={handleSaveArticle}>
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 12 }}>
                <label className="field-label" style={{ minWidth: 200, flex: 1 }}>
                  Titre <span style={{ color: "var(--red)" }}>*</span>
                  <input type="text" value={articleTitle} onChange={(e) => setArticleTitle(e.target.value)} placeholder="Titre de l'actualité" style={{ background: "var(--bg)", color: "var(--text)", border: "1px solid var(--border)", borderRadius: 12, padding: "11px 12px", width: "100%" }} />
                </label>
                <label className="field-label" style={{ minWidth: 200 }}>
                  Catégorie
                  <select value={articleCategory} onChange={(e) => setArticleCategory(e.target.value)} style={{ background: "var(--bg)", color: "var(--text)", border: "1px solid var(--border)", borderRadius: 12, padding: "11px 12px", width: "100%" }}>
                    {NEWS_CATEGORIES.map((c) => (<option key={c.value} value={c.value}>{c.label}</option>))}
                  </select>
                </label>
              </div>
              <label className="field-label" style={{ marginBottom: 12 }}>
                Résumé <span style={{ color: "var(--red)" }}>*</span>
                <textarea value={articleExcerpt} onChange={(e) => setArticleExcerpt(e.target.value)} rows={2} style={{ background: "var(--bg)", color: "var(--text)", border: "1px solid var(--border)", borderRadius: 12, padding: "11px 12px", width: "100%", resize: "vertical" }} />
              </label>
              <div style={{ marginBottom: 12 }}>
                <FileUpload label="Image (optionnelle)" accept=".jpg,.jpeg,.png,.webp" onUploaded={setArticleImageUrl} currentUrl={articleImageUrl || null} />
              </div>
              <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 12 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", color: "var(--text)" }}>
                  <input type="checkbox" checked={articlePublished} onChange={(e) => setArticlePublished(e.target.checked)} style={{ accentColor: "var(--red)" }} />
                  Publié
                </label>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button type="submit" className="btn primary" disabled={articleSaving}>{articleSaving ? "Enregistrement..." : editingArticle ? "Mettre à jour" : "Publier"}</button>
                {editingArticle && <button type="button" className="btn" onClick={() => { setEditingArticle(null); setArticleTitle(""); setArticleExcerpt(""); setArticleCategory("REGISTRATION_OPEN"); setArticleImageUrl(""); setArticlePublished(true); }}>Annuler</button>}
              </div>
            </form>
          </div>

          {/* List */}
          {articlesLoading ? (<LoadingSpinner text="Chargement..." />) : (articlesData || []).length === 0 ? (<EmptyState title="Aucune actualité" description="Ajoutez des actualités à publier." />) : (
            <div className="table-wrap">
              <table className="smart-table">
                <thead><tr><th>Image</th><th>Titre</th><th>Catégorie</th><th>Date</th><th>Publié</th><th>Actions</th></tr></thead>
                <tbody>
                  {(articlesData || []).map((a: Article) => (
                    <tr key={a.id}>
                      <td>{a.imageUrl ? <img src={a.imageUrl} alt="" style={{ width: 50, height: 34, objectFit: "cover", borderRadius: 6 }} /> : "—"}</td>
                      <td>{a.title}</td>
                      <td>{NEWS_CATEGORIES.find((c) => c.value === a.category)?.label || a.category}</td>
                      <td>{new Date(a.publishedAt).toLocaleDateString("fr-FR")}</td>
                      <td><span style={{ color: a.isPublished ? "var(--green)" : "var(--muted)", fontWeight: 600 }}>{a.isPublished ? "Oui" : "Non"}</span></td>
                      <td>
                        <div className="row-actions">
                          <button className="btn primary" onClick={() => { setEditingArticle(a.id); setArticleTitle(a.title); setArticleExcerpt(a.excerpt); setArticleCategory(a.category); setArticleImageUrl(a.imageUrl || ""); setArticlePublished(a.isPublished); }}>Modifier</button>
                          <button className="btn danger" onClick={() => setDeleteArticleTarget(a)}>Supprimer</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Delete Document Confirm */}
      <ConfirmDialog
        open={deleteDocTarget !== null}
        title="Supprimer le document"
        message={`Supprimer « ${deleteDocTarget?.title} » ?`}
        confirmLabel="Supprimer"
        variant="danger"
        onConfirm={() => {
          if (deleteDocTarget) deleteDocMutation.mutate(deleteDocTarget.id);
        }}
        onCancel={() => setDeleteDocTarget(null)}
      />

      {/* Delete Media Confirm */}
      <ConfirmDialog
        open={deleteMediaTarget !== null}
        title="Supprimer l'image"
        message={`Supprimer cette image${deleteMediaTarget?.title ? ` « ${deleteMediaTarget.title} »` : ""} ?`}
        confirmLabel="Supprimer"
        variant="danger"
        onConfirm={() => {
          if (deleteMediaTarget) deleteMediaMutation.mutate(deleteMediaTarget.id);
        }}
        onCancel={() => setDeleteMediaTarget(null)}
      />

      {/* Delete Article Confirm */}
      <ConfirmDialog
        open={deleteArticleTarget !== null}
        title="Supprimer l'actualité"
        message={`Supprimer « ${deleteArticleTarget?.title} » ?`}
        confirmLabel="Supprimer"
        variant="danger"
        onConfirm={() => { if (deleteArticleTarget) deleteArticleMutation.mutate(deleteArticleTarget.id); }}
        onCancel={() => setDeleteArticleTarget(null)}
      />
    </div>
  );
}
