import React, { useEffect, useState } from "react";
import { io } from "socket.io-client";
import api from "../services/api";
import AdminLayout from "../components/layout/AdminLayout";
import ResourceForm from "../components/ui/ResourceForm";
import SmartTable from "../components/ui/SmartTable";

const SOCKET_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000/api"
).replace("/api", "");
export default function AdminLiveScoring() {
  const [matches, setMatches] = useState([]);
  async function load() {
    const { data } = await api.get("/live/matches");
    setMatches(Array.isArray(data) ? data : []);
  }
  useEffect(() => {
    load();
    const s = io(SOCKET_URL);
    s.on("match:updated", load);
    s.on("match:created", load);
    s.on("match:timer", load);
    return () => s.disconnect();
  }, []);
  async function create(payload) {
    await api.post("/live/matches", {
      ...payload,
      durationSeconds: Number(payload.durationSeconds || 300),
      remainingSeconds: Number(payload.durationSeconds || 300),
    });
    load();
  }
  async function patch(id, payload) {
    await api.patch(`/live/matches/${id}`, payload);
    load();
  }
  async function timer(id, action) {
    await api.post(`/live/matches/${id}/timer/${action}`);
    load();
  }
  const first = matches.find((m) => m.status === "live") || matches[0];
  const cols = [
    { key: "mat", label: "Tatami" },
    { key: "category", label: "Catégorie" },
    { key: "redScore", label: "Rouge" },
    { key: "blueScore", label: "Bleu" },
    { key: "timerState", label: "Timer" },
    {
      key: "actions",
      label: "Actions",
      render: (r) => (
        <div className="row-actions">
          <button
            onClick={() => patch(r._id, { redScore: (r.redScore || 0) + 2 })}
          >
            +2 R
          </button>
          <button
            onClick={() => patch(r._id, { blueScore: (r.blueScore || 0) + 2 })}
          >
            +2 B
          </button>
          <button onClick={() => timer(r._id, "start")}>Start</button>
          <button onClick={() => timer(r._id, "pause")}>Pause</button>
          <button onClick={() => timer(r._id, "finish")}>Fin</button>
        </div>
      ),
    },
  ];
  return (
    <AdminLayout>
      <div className="page-head">
        <h1>Live scoring temps réel</h1>
        <p>
          Gestion arbitre : scores, avantages, pénalités, timer et diffusion
          publique WebSocket.
        </p>
      </div>
      <section className="live-board">
        <div className="score-card red">
          <span>Rouge</span>
          <strong>{first?.redScore || 0}</strong>
        </div>
        <div className="timer-card">
          <span>{first?.mat || "Tatami"}</span>
          <strong>{first?.timerState || "READY"}</strong>
          <small>
            {first?.remainingSeconds || first?.durationSeconds || 300}s
          </small>
        </div>
        <div className="score-card blue">
          <span>Bleu</span>
          <strong>{first?.blueScore || 0}</strong>
        </div>
      </section>
      <section className="panel">
        <h2>Nouveau combat</h2>
        <ResourceForm
          fields={[
            { key: "competition", label: "ID compétition", required: true },
            { key: "mat", label: "Tatami" },
            { key: "round", label: "Tour" },
            { key: "category", label: "Catégorie" },
            { key: "durationSeconds", label: "Durée secondes" },
          ]}
          onSubmit={create}
        />
      </section>
      <SmartTable
        title="Tableaux de compétition"
        rows={matches}
        columns={cols}
      />
    </AdminLayout>
  );
}
