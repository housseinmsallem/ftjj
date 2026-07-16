import React, { useState } from "react";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import PageHeader from "../../components/shared/PageHeader";
import LoadingSpinner from "../../components/shared/LoadingSpinner";
import EmptyState from "../../components/shared/EmptyState";
import ConfirmDialog from "../../components/shared/ConfirmDialog";
import FileUpload from "../../components/shared/FileUpload";

interface ClubDocument {
  name: string;
  url: string;
}

interface ClubData {
  _id: string;
  id?: string;
  name: string;
  documents?: ClubDocument[];
}

export default function ClubDocuments(): React.ReactElement {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ClubDocument | null>(null);

  const clubId = user?.club?._id || user?.club?.id || "";

  const {
    data: clubData,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["clubs", clubId],
    queryFn: async () => {
      const res = await api.get(`/clubs/${clubId}`);
      return ((res.data as any)?.data ?? res.data) as ClubData;
    },
    enabled: !!clubId,
  });

  const documents = clubData?.documents || [];

  const deleteMutation = useMutation({
    mutationFn: (docUrl: string) =>
      api.patch(`/clubs/${clubId}`, {
        documents: documents.filter((d) => d.url !== docUrl),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clubs", clubId] });
      toast.success("Document supprimé avec succès");
      setDeleteTarget(null);
    },
    onError: (err: any) => {
      toast.error(
        err?.response?.data?.message || "Erreur lors de la suppression",
      );
    },
  });

  function handleUploaded(url: string) {
    const updatedDocs = [
      ...documents,
      { name: url.split("/").pop() || "Document", url },
    ];
    setUploading(true);
    api
      .patch(`/clubs/${clubId}`, { documents: updatedDocs })
      .then(() => {
        queryClient.invalidateQueries({ queryKey: ["clubs", clubId] });
        toast.success("Document ajouté avec succès");
      })
      .catch((err: any) => {
        toast.error(
          err?.response?.data?.message || "Erreur lors de l'ajout du document",
        );
      })
      .finally(() => setUploading(false));
  }

  if (isLoading) {
    return (
      <div className="page">
        <LoadingSpinner text="Chargement des documents..." />
      </div>
    );
  }

  if (isError && !clubData) {
    return (
      <div className="page">
        <EmptyState
          title="Erreur de chargement"
          description={
            (error as any)?.message || "Impossible de charger les documents"
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

  return (
    <div className="page">
      <PageHeader
        title="Documents du club"
        breadcrumbs={[{ label: "Club", to: "/club" }, { label: "Documents" }]}
      />

      <div className="card" style={{ marginBottom: 20, maxWidth: 700 }}>
        <h3 style={{ color: "var(--text)", marginBottom: 16 }}>
          Ajouter un document
        </h3>
        <FileUpload
          label="Sélectionner un document"
          accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
          maxSizeMB={10}
          onUploaded={handleUploaded}
        />
        {uploading && (
          <p className="muted" style={{ marginTop: 8 }}>
            Enregistrement du document...
          </p>
        )}
      </div>

      <div className="table-card">
        <h3
          style={{
            color: "var(--text)",
            marginBottom: 16,
            padding: "16px 16px 0",
          }}
        >
          Documents existants
        </h3>

        {documents.length === 0 ? (
          <EmptyState
            title="Aucun document"
            description="Aucun document n'a encore été ajouté au club"
          />
        ) : (
          <div className="table-wrap">
            <table className="smart-table">
              <thead>
                <tr>
                  <th>Nom</th>
                  <th>Date d'ajout</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((doc, idx) => (
                  <tr key={idx}>
                    <td>
                      <a
                        href={doc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: "var(--red)", textDecoration: "none" }}
                      >
                        {doc.name || `Document ${idx + 1}`}
                      </a>
                    </td>
                    <td>—</td>
                    <td>
                      <button
                        className="btn danger"
                        onClick={() => setDeleteTarget(doc)}
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

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Supprimer le document"
        message={`Êtes-vous sûr de vouloir supprimer le document « ${deleteTarget?.name} » ?`}
        confirmLabel="Supprimer"
        variant="danger"
        onConfirm={() => {
          if (deleteTarget) {
            deleteMutation.mutate(deleteTarget.url);
          }
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
