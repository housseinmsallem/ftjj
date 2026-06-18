import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../services/api";
import fallbackHero from "../../assets/images/hero.jpg";

const typeLabels = {
  EVENT: "Événement",
  STAGE: "Stage",
  NEWS: "Actualité",
  ANNOUNCEMENT: "Annonce",
  GRADE_PASSAGE: "Passage de grade",
  CHAMPIONSHIP: "Championnat",
};

const fallbackSlides = [
  {
    _id: "default-stage",
    type: "STAGE",
    title: "Stages fédéraux FTJJ",
    subtitle: "Programme technique national",
    description:
      "Publiez vos stages, opens, passages de grade et annonces directement depuis le backoffice fédéral.",
    imageUrl: fallbackHero,
    ctaLabel: "Découvrir",
    ctaUrl: "/competitions",
    animation: "SLIDE",
  },
];

export default function HomeContentSlider() {
  const [slides, setSlides] = useState([]);
  const [active, setActive] = useState(0);
  const items = useMemo(
    () => (slides.length ? slides : fallbackSlides),
    [slides],
  );

  useEffect(() => {
    api
      .get("/content/public/slider?limit=8")
      .then(({ data }) => setSlides(Array.isArray(data) ? data : []))
      .catch(() => setSlides([]));
  }, []);

  useEffect(() => {
    const timer = setInterval(
      () => setActive((current) => (current + 1) % items.length),
      5200,
    );
    return () => clearInterval(timer);
  }, [items.length]);

  const current = items[active] || items[0];
  const background = current?.imageUrl || fallbackHero;
  const date = current?.startDate
    ? new Date(current.startDate).toLocaleDateString("fr-FR")
    : null;

  return (
    <section
      className={`content-slider anim-${(current?.animation || "SLIDE").toLowerCase()}`}
    >
      <div
        className="slider-bg"
        style={{
          backgroundImage: `linear-gradient(90deg, rgba(7,20,44,.92), rgba(7,20,44,.42)), url(${background})`,
        }}
      />
      <div className="slider-content">
        <span className="slider-badge">
          {typeLabels[current?.type] || "FTJJ"}
        </span>
        <h2>{current?.title}</h2>
        {current?.subtitle && <h3>{current.subtitle}</h3>}
        <p>{current?.description}</p>
        <div className="slider-meta">
          {date && <span>{date}</span>}
          {current?.location && <span>{current.location}</span>}
        </div>
        {current?.ctaUrl?.startsWith("http") ? (
          <a
            className="public-btn primary"
            href={current.ctaUrl}
            target="_blank"
            rel="noreferrer"
          >
            {current.ctaLabel || "Voir plus"}
          </a>
        ) : (
          <Link
            className="public-btn primary"
            to={current?.ctaUrl || "/competitions"}
          >
            {current?.ctaLabel || "Voir plus"}
          </Link>
        )}
      </div>
      <div className="slider-dots">
        {items.map((item, index) => (
          <button
            key={item._id || index}
            className={index === active ? "active" : ""}
            onClick={() => setActive(index)}
            aria-label={`Slide ${index + 1}`}
          />
        ))}
      </div>
    </section>
  );
}
