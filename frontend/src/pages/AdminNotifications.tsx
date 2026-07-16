import React, { useState } from "react";
import api from "../services/api";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import PageHeader from "../components/shared/PageHeader";

interface NotificationForm {
  title: string;
  message: string;
  audience: string;
}

const emptyForm: NotificationForm = {
  title: "",
  message: "",
  audience: "Tous",
};

const audienceOptions = [
  { value: "Tous", label: "Tous les utilisateurs" },
  { value: "Clubs", label: "Clubs uniquement" },
  { value: "Athlètes", label: "Athlètes uniquement" },
];

export default function AdminNotifications(): React.ReactElement {
  const [form, setForm] = useState<NotificationForm>(emptyForm);

  const sendMutation = useMutation({
    mutationFn: (payload: NotificationForm) =>
      api.post("/notifications", payload),
    onSuccess: () => {
      toast.success("Notification envoyée avec succès");
      setForm(emptyForm);
    },
    onError: (err: any) => {
      toast.error(
        err?.response?.data?.message ||
          "Erreur lors de l'envoi de la notification",
      );
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.error("Le titre de la notification est obligatoire");
      return;
    }
    sendMutation.mutate(form);
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
    minHeight: 120,
    resize: "vertical",
    fontFamily: "inherit",
  };

  const selectStyle: React.CSSProperties = {
    ...inputStyle,
    cursor: "pointer",
  };

  return (
    <div className="page">
      <PageHeader
        title="Notifications"
        breadcrumbs={[
          { label: "Admin", to: "/admin" },
          { label: "Notifications" },
        ]}
      />

      <div className="card" style={{ maxWidth: 700 }}>
        <h3 style={{ color: "var(--text)", marginBottom: 16 }}>
          Envoyer une notification
        </h3>
        <p className="muted" style={{ marginBottom: 24 }}>
          Créez et envoyez une notification système aux utilisateurs de la
          plateforme.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <label className="field-label">
              Titre <span style={{ color: "var(--red)" }}>*</span>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Titre de la notification"
                required
                style={inputStyle}
              />
            </label>
            <label className="field-label">
              Audience
              <select
                value={form.audience}
                onChange={(e) => setForm({ ...form, audience: e.target.value })}
                style={selectStyle}
              >
                {audienceOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="field-label" style={{ marginTop: 18 }}>
            Message
            <textarea
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              placeholder="Contenu du message..."
              style={textareaStyle}
            />
          </label>

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
              disabled={sendMutation.isPending}
            >
              {sendMutation.isPending ? "Envoi en cours..." : "Envoyer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
