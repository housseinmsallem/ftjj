import React, { useEffect, useState } from "react";
import { publicApi } from "../services/api";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRow = Record<string, any>;

interface PortalEvent {
  _id: string;
  type?: string;
  title: string;
  excerpt?: string;
  description?: string;
  startDate?: string;
}

interface PortalData {
  slider?: unknown[];
  events?: PortalEvent[];
  settings?: {
    homepage?: {
      heroTitle?: string;
      heroSubtitle?: string;
    };
  };
}

export default function PublicPortal(): React.ReactElement {
  const [data, setData] = useState<PortalData>({ slider: [], events: [] });

  useEffect(() => {
    publicApi.home().then(setData);
  }, []);

  return (
    <div className="public-page">
      <section className="hero-pro">
        <div>
          <span className="badge">Site public officiel</span>
          <h1>
            {data.settings?.homepage?.heroTitle ||
              "Fédération Tunisienne de Jiu-Jitsu"}
          </h1>
          <p>
            {data.settings?.homepage?.heroSubtitle ||
              "Compétitions, stages, classements, clubs affiliés et live scoring officiel."}
          </p>
          <div className="hero-actions">
            <a href="/competitions" className="btn primary">
              Voir compétitions
            </a>
            <a href="/rankings" className="btn ghost">
              Classements
            </a>
          </div>
        </div>
      </section>
      <section className="section">
        <h2>À la une</h2>
        <div className="feature-grid">
          {(data.events || []).map((e) => (
            <article className="feature-card" key={e._id}>
              <span>{e.type}</span>
              <h3>{e.title}</h3>
              <p>{e.excerpt || e.description}</p>
              <small>
                {e.startDate
                  ? new Date(e.startDate).toLocaleDateString("fr-FR")
                  : "FTJJ"}
              </small>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
