import React, { useState } from "react";
import api from "../../services/api";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import PageHeader from "../../components/shared/PageHeader";
import LoadingSpinner from "../../components/shared/LoadingSpinner";
import EmptyState from "../../components/shared/EmptyState";
import FileUpload from "../../components/shared/FileUpload";

interface Club {
  _id: string;
  id?: string;
  name: string;
}

interface AthleteData {
  _id: string;
  id?: string;
  firstName: string;
  lastName: string;
  clubId?: string;
  club?: { _id?: string; id?: string; name?: string };
}

interface TransferRecord {
  athleteId: string;
  athleteName: string;
  newClubId: string;
  newClubName: string;
  timestamp: number;
  withAuth: boolean;
}

export default function AdminTransfers(): React.ReactElement {
  const queryClient = useQueryClient();
  const [transferTarget, setTransferTarget] = useState<AthleteData | null>(null);
  const [selectedClubId, setSelectedClubId] = useState("");
  const [transferAuthUrl, setTransferAuthUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [transferHistory, setTransferHistory] = useState<TransferRecord[]>([]);

  const { data: athletesData, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["persons", "ATHLETE"],
    queryFn: async () => {
      const res = await api.get("/persons", { params: { type: "ATHLETE" } });
      return (((res.data as any)?.data ?? res.data) as AthleteData[]) || [];
    },
  });

  const { data: clubsData } = useQuery({
    queryKey: ["clubs"],
    queryFn: async () => {
      const res = await api.get("/clubs");
      return (((res.data as any)?.data ?? res.data) as Club[]) || [];
    },
  });

  const athletes = athletesData || [];
  const clubs = clubsData || [];

  function openTransfer(athlete: AthleteData) {
    setTransferTarget(athlete);
    setSelectedClubId("");
    setTransferAuthUrl("");
  }

  function closeTransfer() {
    setTransferTarget(null);
    setSelectedClubId("");
    setTransferAuthUrl("");
  }

  async function handleTransfer() {
    if (!transferTarget) return;
    if (!selectedClubId) {
      toast.error("Veuillez sélectionner un club de destination");
      return;
    }
    const athleteId = transferTarget._id || transferTarget.id || "";
    const currentClubId = transferTarget.clubId || transferTarget.club?._id || transferTarget.club?.id || "";
    if (selectedClubId === currentClubId) {
      toast.error("L'athlète est déjà dans ce club");
      return;
    }

    const newClub = clubs.find((c) => (c._id || c.id) === selectedClubId);
    const newClubName = newClub?.name || "—";
    const athleteName = `${transferTarget.firstName} ${transferTarget.lastName}`;
    const hasAuth = !!transferAuthUrl;

    setSaving(true);
    try {
      if (hasAuth) {
        // Normal transfer: change club + attach authorization document
        await api.patch(`/persons/${athleteId}`, {
          clubId: selectedClubId,
          transferAuthorizationUrl: transferAuthUrl,
        });
        toast.success(`${athleteName} transféré vers ${newClubName}`);
      } else {
        // No authorization → licence becomes type B (restricted)
        await api.patch(`/persons/${athleteId}/transfer-no-auth`, {
          clubId: selectedClubId,
        });
        toast.success(
          `${athleteName} transféré vers ${newClubName} (licence type B — autorisation de transfert manquante)`,
        );
      }

      queryClient.invalidateQueries({ queryKey: ["persons", "ATHLETE"] });
      queryClient.invalidateQueries({ queryKey: ["persons"] });

      setTransferHistory((prev) => [
        { athleteId, athleteName, newClubId: selectedClubId, newClubName, timestamp: Date.now(), withAuth: hasAuth },
        ...prev.slice(0, 19),
      ]);

      closeTransfer();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Erreur lors du transfert");
    } finally {
      setSaving(false);
    }
  }

  function getClubName(athlete: AthleteData): string {
    if (athlete.club?.name) return athlete.club.name;
    if (athlete.clubId) {
      const club = clubs.find((c) => (c._id || c.id) === athlete.clubId);
      if (club) return club.name;
    }
    return "—";
  }

  const inputStyle = { background: "var(--bg)", color: "var(--text)", border: "1px solid var(--border)", borderRadius: 12, padding: "11px 12px" };

  if (isLoading) return <div className="page"><LoadingSpinner text="Chargement des athlètes..." /></div>;
  if (isError && !athletesData) return (
    <div className="page">
      <EmptyState title="Erreur de chargement" description={(error as any)?.message || "Impossible de charger les athlètes"}
        action={<button className="btn primary" onClick={() => refetch()}>Réessayer</button>} />
    </div>
  );

  return (
    <div className="page">
      <PageHeader title="Transferts" breadcrumbs={[{ label: "Admin", to: "/admin" }, { label: "Transferts" }]} />
      {transferTarget && (
        <div className="modal-overlay" onClick={closeTransfer}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 520 }}>
            <h3>Transfert d'athlète</h3>
            <p style={{ marginTop: 8, marginBottom: 16 }}>
              Transférer <strong>{transferTarget.firstName} {transferTarget.lastName}</strong> depuis{" "}
              <strong>{getClubName(transferTarget)}</strong> vers un autre club.
            </p>

            <label className="field-label">
              Club de destination <span style={{ color: "var(--red)" }}>*</span>
              <select value={selectedClubId} onChange={(e) => setSelectedClubId(e.target.value)}
                style={{ ...inputStyle, width: "100%", marginTop: 4 }}>
                <option value="">— Sélectionner un club —</option>
                {clubs.map((c) => (
                  <option key={c._id || c.id} value={c._id || c.id}>{c.name}</option>
                ))}
              </select>
            </label>

            <div style={{ marginTop: 16 }}>
              <FileUpload
                label="Autorisation de transfert (optionnel)"
                accept=".pdf,.jpg,.jpeg,.png"
                onUploaded={setTransferAuthUrl}
                currentUrl={transferAuthUrl || null}
                hint="Si fourni → transfert complet (licence A). Si non fourni → licence type B."
              />
            </div>

            {!transferAuthUrl && (
              <div style={{ marginTop: 12, padding: 10, background: "rgba(228,195,40,0.1)", borderRadius: 8, border: "1px solid #e4c328", fontSize: "0.8rem", color: "#e4c328" }}>
                ⚠️ Aucune autorisation de transfert fournie. L'athlète sera transféré avec une <strong>licence de type B</strong> (restrictions : inscriptions limitées aux compétitions Open uniquement).
              </div>
            )}

            <div className="modal-actions" style={{ marginTop: 20, display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button type="button" className="btn" onClick={closeTransfer}>Annuler</button>
              <button type="button" className="btn primary" disabled={!selectedClubId || saving} onClick={handleTransfer}>
                {saving ? "Transfert en cours..." : transferAuthUrl ? "Confirmer le transfert (Licence A)" : "Transférer (Licence B)"}
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="table-card">
        {athletes.length === 0 ? (
          <EmptyState title="Aucun athlète" description="Aucun athlète n'a encore été enregistré" />
        ) : (
          <div className="table-wrap">
            <table className="smart-table">
              <thead><tr><th>Athlète</th><th>Club actuel</th><th>Actions</th></tr></thead>
              <tbody>
                {athletes.map((a) => (
                  <tr key={a._id || a.id}>
                    <td>{a.firstName} {a.lastName}</td>
                    <td>{getClubName(a)}</td>
                    <td><button className="btn primary" onClick={() => openTransfer(a)}>Transférer</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {transferHistory.length > 0 && (
        <div className="card" style={{ marginTop: 24 }}>
          <h3 style={{ marginBottom: 12 }}>Historique des transferts récents</h3>
          <div className="table-wrap">
            <table className="smart-table">
              <thead><tr><th>Athlète</th><th>Nouveau club</th><th>Type</th><th>Date</th></tr></thead>
              <tbody>
                {transferHistory.map((record) => (
                  <tr key={record.athleteId + record.timestamp}>
                    <td>{record.athleteName}</td>
                    <td>{record.newClubName}</td>
                    <td><span style={{ background: record.withAuth ? "#22c55e" : "#e4c328", color: "#fff", padding: "2px 8px", borderRadius: 4, fontSize: "0.7rem", fontWeight: 700 }}>
                      {record.withAuth ? "Licence A" : "Licence B"}
                    </span></td>
                    <td>{new Date(record.timestamp).toLocaleString("fr-FR")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}


    </div>
  );
}
