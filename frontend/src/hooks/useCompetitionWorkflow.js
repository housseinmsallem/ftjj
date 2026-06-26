import { useCallback, useEffect, useState } from "react";
import api from "../services/api";

export default function useCompetitionWorkflow(competitionId) {
  const [competition, setCompetition] = useState(null);
  const [registrations, setRegistrations] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brackets, setBrackets] = useState([]);
  const [categoryPreview, setCategoryPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    if (!competitionId) {
      setCompetition(null);
      setRegistrations([]);
      setCategories([]);
      setBrackets([]);
      setCategoryPreview(null);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const [compRes, regRes, catRes, brkRes, previewRes] = await Promise.all([
        api.get(`/competitions/${competitionId}`),
        api.get(`/competitions/${competitionId}/registrations`),
        api.get(`/competitions/${competitionId}/categories`),
        api.get(`/competitions/${competitionId}/brackets`),
        api.get(`/competitions/${competitionId}/category-preview`).catch(() => ({ data: null })),
      ]);
      setCompetition(compRes.data);
      setRegistrations(regRes.data);
      setCategories(catRes.data);
      setBrackets(brkRes.data);
      setCategoryPreview(previewRes.data);
    } catch (err) {
      setError(err.response?.data?.message || "Chargement impossible");
    } finally {
      setLoading(false);
    }
  }, [competitionId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    competition,
    registrations,
    categories,
    brackets,
    categoryPreview,
    loading,
    error,
    refresh,
  };
}
