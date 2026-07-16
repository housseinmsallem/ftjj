import React, { useState } from "react";
import api from "../services/api";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import PageHeader from "../components/shared/PageHeader";
import LoadingSpinner from "../components/shared/LoadingSpinner";

interface ContentForm {
  heroTitle: string;
  heroDescription: string;
  announcementText: string;
}

const emptyForm: ContentForm = {
  heroTitle: "",
  heroDescription: "",
  announcementText: "",
};

export default function AdminContentBuilder(): React.ReactElement {
  const [form, setForm] = useState<ContentForm>(emptyForm);

  const saveMutation = useMutation({
    mutationFn: (payload: ContentForm) =>
      api.post("/content/homepage", payload),
    onSuccess: () => {
      toast.success("Contenu de la page d'accueil enregistré avec succès");
    },
    onError: (err: any) => {
      toast.error(
        err?.response?.data?.message ||
          "Erreur lors de l'enregistrement du contenu",
      );
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    saveMutation.mutate(form);
  }

  const inputStyle: React.CSSProperties = {
    background: "var(--bg)",
    color: "var(--text)",
    border: "1px solid var(--border)",
    borderRadius: 12,
    padding: "11px 12px",
    fontSize: "0.9rem",
    width: "100%",
  };

  const textareaStyle: React.CSSProperties = {
    ...inputStyle,
    minHeight: 100,
    resize: "vertical",
    fontFamily: "inherit",
  };

  return (
    <div className="page">
      <PageHeader
        title="Constructeur de contenu"
        breadcrumbs={[
          { label: "Admin", to: "/admin" },
          { label: "Constructeur de contenu" },
        ]}
      />

      <div className="card" style={{ maxWidth: 800 }}>
        <h3 style={{ color: "var(--text)", marginBottom: 20 }}>
          Modifier le contenu de la page d'accueil
        </h3>
        <p className="muted" style={{ marginBottom: 24 }}>
          Modifiez le slider et les annonces affichés sur la page d'accueil
          publique.
        </p>

        {saveMutation.isPending ? (
          <LoadingSpinner text="Enregistrement en cours..." />
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              <label className="field-label">
                Titre du héros
                <input
                  type="text"
                  value={form.heroTitle}
                  onChange={(e) =>
                    setForm({ ...form, heroTitle: e.target.value })
                  }
                  placeholder="Titre principal de la bannière"
                  style={inputStyle}
                />
              </label>
              <label className="field-label">
                Description du héros
                <textarea
                  value={form.heroDescription}
                  onChange={(e) =>
                    setForm({ ...form, heroDescription: e.target.value })
                  }
                  placeholder="Description affichée sous le titre"
                  style={textareaStyle}
                />
              </label>
              <label className="field-label">
                Texte d'annonce
                <input
                  type="text"
                  value={form.announcementText}
                  onChange={(e) =>
                    setForm({ ...form, announcementText: e.target.value })
                  }
                  placeholder="Texte de la barre d'annonce"
                  style={inputStyle}
                />
              </label>
            </div>

            <div
              style={{
                marginTop: 24,
                display: "flex",
                justifyContent: "flex-end",
              }}
            >
              <button
                type="submit"
                className="btn primary"
                disabled={saveMutation.isPending}
              >
                Enregistrer
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
