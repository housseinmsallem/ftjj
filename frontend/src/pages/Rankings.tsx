import React, { useEffect, useMemo, useState } from "react";
import { publicApi } from "../services/api";
import { formatJiuJitsuGrade, formatNewazaGrade } from "../utils/grades";

interface AthleteRanking {
  _id?: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  club?: { name?: string };
  category?: string;
  rankingPoints?: number;
  jiujitsuBelt?: string;
  newazaBelt?: string;
}

function athleteName(athlete: AthleteRanking): string {
  return (
    `${athlete.firstName || ""} ${athlete.lastName || ""}`.trim() ||
    athlete.name ||
    "Athlete FTJJ"
  );
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("fr-FR").format(value);
}

export default function Rankings(): React.ReactElement {
  const [athletes, setAthletes] = useState<AthleteRanking[]>([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    publicApi
      .rankings()
      .then((data: any) => setAthletes(Array.isArray(data) ? data : []))
      .catch(() => setAthletes([]));
  }, []);

  const sorted = useMemo(() => {
    return [...athletes].sort(
      (left, right) => (right.rankingPoints || 0) - (left.rankingPoints || 0),
    );
  }, [athletes]);

  const filtered = useMemo(() => {
    const term = query.toLowerCase();
    return sorted.filter((athlete) =>
      JSON.stringify(athlete).toLowerCase().includes(term),
    );
  }, [query, sorted]);

  const podium = filtered.slice(0, 3);

  return (
    <div className="public-page-shell">
      <section className="public-hero-banner public-hero-ranking">
        <div className="section-inner public-hero-grid">
          <div>
            <p className="eyebrow">Classement national</p>
            <h1>Ranking public des athletes FTJJ</h1>
            <p className="hero-copy">
              Ce classement valorise les athletes, leurs clubs, leurs categories
              et leur progression sportive dans un format plus lisible que la
              version de base.
            </p>
          </div>
          <div className="surface-card hero-aside">
            <p className="eyebrow">Top 3 actuel</p>
            <ol className="podium-list">
              {podium.map((athlete, index) => (
                <li key={athlete._id || index}>
                  <strong>
                    {index + 1}. {athleteName(athlete)}
                  </strong>
                  <span>{formatNumber(athlete.rankingPoints || 0)} pts</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section className="public-section">
        <div className="section-inner">
          <div className="surface-card ranking-panel">
            <div className="panel-headline">
              <h3>Tous les athletes classes</h3>
              <input
                className="public-search"
                placeholder="Rechercher un athlete, un club ou une categorie..."
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>

            <div className="table-wrap">
              <table className="smart-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Athlete</th>
                    <th>Club</th>
                    <th>Categorie</th>
                    <th>Grade Jiu-Jitsu</th>
                    <th>Grade Newaza</th>
                    <th>Points</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((athlete, index) => (
                    <tr key={athlete._id || index}>
                      <td>{index + 1}</td>
                      <td>{athleteName(athlete)}</td>
                      <td>{athlete.club?.name || "Club FTJJ"}</td>
                      <td>{athlete.category || "Non renseignee"}</td>
                      <td>{formatJiuJitsuGrade(athlete)}</td>
                      <td>{formatNewazaGrade(athlete)}</td>
                      <td>{formatNumber(athlete.rankingPoints || 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
