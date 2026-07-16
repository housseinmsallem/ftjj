import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import PageHeader from "../../components/shared/PageHeader";
import LoadingSpinner from "../../components/shared/LoadingSpinner";
import EmptyState from "../../components/shared/EmptyState";
import FileUpload from "../../components/shared/FileUpload";
import type { ClubRef } from "../../types";

interface ClubDetail extends ClubRef {
  _id: string;
  name: string;
  shortName?: string;
  address?: string;
  governorate?: string;
  phone?: string;
  email?: string;
  status?: string;
  documents?: { _id: string; name: string; url: string }[];
  createdAt?: string;
}

export default function ClubDetails(): React.ReactElement {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const clubId = user?.club?._id || user?.club?.id || "";
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: "",
    address: "",
    governorate: "",
    phone: "",
    email: "",
  });
  const [saving, setSaving] = useState(false);
  const [uploadKey, setUploadKey] = useState(0);

  const {
    data: club,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<ClubDetail | null>({
    queryKey: ["club", clubId],
    queryFn: async () => {
      if (!clubId) return user?.club as ClubDetail | null;
      const res = await api.get(`/clubs/${clubId}`);
      const data = res.data?.data ?? res.data;
      return (data as ClubDetail) ?? null;
    },
    enabled: true,
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      await api.patch(`/clubs/${clubId}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["club", clubId] });
      toast.success("Informations du club mises à jour");
      setEditing(false);
    },
    onError: (err: any) => {
      toast.error(
        err?.response?.data?.message || "Erreur lors de la mise à jour",
      );
    },
    onSettled: () => setSaving(false),
  });

  function startEdit() {
    if (!club) return;
    setForm({
      name: club.name || "",
      address: club.address || "",
      governorate: club.governorate || "",
      phone: (club as any).phone || "",
      email: (club as any).email || "",
    });
    setEditing(true);
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Le nom du club est obligatoire");
      return;
    }
    setSaving(true);
    saveMutation.mutate({
      name: form.name.trim(),
      address: form.address.trim(),
      governorate: form.governorate.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
    });
  }

  const inputStyle: React.CSSProperties = {
    background: "var(--bg)",
    color: "var(--text)",
    border: "1px solid var(--border)",
    borderRadius: 12,
    padding: "11px 12px",
    width: "100%",
  };

  if (isLoading) {
    return (
      <div className="page">
        <LoadingSpinner text="Chargement des détails du club..." />
      </div>
    );
  }

  if (isError && !club) {
    return (
      <div className="page">
        <EmptyState
          title="Erreur de chargement"
          description={
            (error as any)?.message ||
            "Impossible de charger les détails du club"
          }
          action={
            <button className="btn primary" onClick={() => refetch()}>
              Réessayer
            </button>
          }
        />
      </div>
    );
  }

  if (!club) {
    return (
      <div className="page">
        <EmptyState
          title="Aucun club"
          description="Aucun club n'est associé à votre compte."
        />
      </div>
    );
  }

  return (
    <div className="page">
      <PageHeader
        title="Mon club"
        breadcrumbs={[{ label: "Club", to: "/club" }, { label: "Mon club" }]}
        action={
          !editing ? (
            <button className="btn primary" onClick={startEdit}>
              Modifier
            </button>
          ) : undefined
        }
      />

      {/* Informations du club */}
      <div className="card" style={{ marginBottom: 24 }}>
        <h3 style={{ color: "var(--text)", marginTop: 0 }}>
          Informations générales
        </h3>

        {!editing ? (
          <div style={{ display: "grid", gap: 12 }}>
            <InfoRow label="Nom" value={club.name} />
            <InfoRow label="Nom abrégé" value={club.shortName} />
            <InfoRow label="Adresse" value={club.address} />
            <InfoRow label="Gouvernorat" value={club.governorate} />
            <InfoRow label="Téléphone" value={(club as any).phone} />
            <InfoRow label="Email" value={(club as any).email} />
            <InfoRow label="Statut" value={club.status} />
            <InfoRow
              label="Date de création"
              value={
                club.createdAt
                  ? new Date(club.createdAt).toLocaleDateString("fr-FR")
                  : undefined
              }
            />
          </div>
        ) : (
          <form
            onSubmit={handleSave}
            className="form-grid"
            style={{ marginTop: 16 }}
          >
            <label className="field-label">
              Nom <span style={{ color: "var(--red)" }}>*</span>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                style={inputStyle}
              />
            </label>
            <label className="field-label">
              Adresse
              <input
                type="text"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                style={inputStyle}
              />
            </label>
            <label className="field-label">
              Gouvernorat
              <input
                type="text"
                value={form.governorate}
                onChange={(e) =>
                  setForm({ ...form, governorate: e.target.value })
                }
                style={inputStyle}
              />
            </label>
            <label className="field-label">
              Téléphone
              <input
                type="text"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                style={inputStyle}
              />
            </label>
            <label className="field-label">
              Email
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                style={inputStyle}
              />
            </label>
          </form>
        )}

        {editing && (
          <div
            style={{
              marginTop: 20,
              display: "flex",
              gap: 10,
              justifyContent: "flex-end",
            }}
          >
            <button
              className="btn"
              onClick={() => setEditing(false)}
              disabled={saving}
            >
              Annuler
            </button>
            <button
              className="btn primary"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? "Enregistrement..." : "Enregistrer"}
            </button>
          </div>
        )}
      </div>

      {/* Documents du club */}
      <div className="card">
        <h3 style={{ color: "var(--text)", marginTop: 0 }}>
          Documents du club
        </h3>

        {club.documents && club.documents.length > 0 ? (
          <div style={{ marginBottom: 16 }}>
            {club.documents.map((doc) => (
              <div
                key={doc._id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "8px 0",
                  borderBottom: "1px solid var(--border)",
                }}
              >
                <span style={{ color: "var(--text)" }}>{doc.name}</span>
                <a
                  href={doc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "var(--red)", fontWeight: 600 }}
                >
                  Voir
                </a>
              </div>
            ))}
          </div>
        ) : (
          <p className="muted" style={{ marginBottom: 16 }}>
            Aucun document téléchargé pour le moment.
          </p>
        )}

        <FileUpload
          key={uploadKey}
          label="Ajouter un document"
          accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
          maxSizeMB={10}
          onUploaded={() => {
            queryClient.invalidateQueries({ queryKey: ["club", clubId] });
            setUploadKey((k) => k + 1);
            toast.success("Document ajouté avec succès");
          }}
        />
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value?: string }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        padding: "4px 0",
      }}
    >
      <span style={{ color: "var(--muted)", fontWeight: 600 }}>{label}</span>
      <span style={{ color: "var(--text)" }}>{value || "—"}</span>
    </div>
  );
}
