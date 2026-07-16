import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../services/api";
import fallbackHero from "../../assets/images/hero.jpg";

interface SliderItem {
  _id: string;
  type?: string;
  title: string;
  subtitle?: string;
  description?: string;
  imageUrl?: string;
  ctaLabel?: string;
  ctaUrl?: string;
  animation?: string;
  startDate?: string;
  location?: string;
}

const typeLabels: Record<string, string> = {
  EVENT: "Événement",
  STAGE: "Stage",
  NEWS: "Actualité",
  ANNOUNCEMENT: "Annonce",
  GRADE_PASSAGE: "Passage de grade",
  CHAMPIONSHIP: "Championnat",
};

export default function HomeContentSlider(): React.ReactElement {
  const [slides, setSlides] = useState<SliderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState(0);

  useEffect(() => {
    setLoading(true);
    api
      .get("/content/public/slider?limit=8")
      .then((res) => {
        const items = res.data?.data || res.data || [];
        setSlides(Array.isArray(items) ? items : []);
      })
      .catch(() => setSlides([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!slides.length) return;
    const timer = setInterval(
      () => setActive((current) => (current + 1) % slides.length),
      5200,
    );
    return () => clearInterval(timer);
  }, [slides.length]);

  if (loading) {
    return (
      <section className="content-slider">
        <div
          className="slider-content"
          style={{ textAlign: "center", padding: "3rem" }}
        >
          <h2>Chargement...</h2>
        </div>
      </section>
    );
  }

  if (!slides.length) {
    return (
      <section className="content-slider">
        <div
          className="slider-content"
          style={{ textAlign: "center", padding: "3rem" }}
        >
          <h2>Annonces federales a venir</h2>
        </div>
      </section>
    );
  }

  const current = slides[active] || slides[0];
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
          {typeLabels[current?.type || ""] || "FTJJ"}
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
        {slides.map((item, index) => (
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
