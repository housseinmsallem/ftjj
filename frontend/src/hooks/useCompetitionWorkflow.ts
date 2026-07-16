import { useCallback, useEffect, useState } from "react";
import api from "../services/api";
import type { Competition } from "../types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecord = Record<string, any>;

export interface UseCompetitionWorkflowReturn {
  competition: Competition | null;
  registrations: AnyRecord[];
  categories: AnyRecord[];
  brackets: AnyRecord[];
  categoryPreview: AnyRecord | null;
  loading: boolean;
  error: string;
  refresh: () => Promise<void>;
}

export default function useCompetitionWorkflow(
  competitionId: string | undefined,
): UseCompetitionWorkflowReturn {
  const [competition, setCompetition] = useState<Competition | null>(null);
  const [registrations, setRegistrations] = useState<AnyRecord[]>([]);
  const [categories, setCategories] = useState<AnyRecord[]>([]);
  const [brackets, setBrackets] = useState<AnyRecord[]>([]);
  const [categoryPreview, setCategoryPreview] = useState<AnyRecord | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  const refresh = useCallback(async (): Promise<void> => {
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
        api.get<Competition>(`/competitions/${competitionId}`),
        api.get<AnyRecord[]>(`/competitions/${competitionId}/registrations`),
        api.get<AnyRecord[]>(`/competitions/${competitionId}/categories`),
        api.get<AnyRecord[]>(`/competitions/${competitionId}/brackets`),
        api
          .get<AnyRecord>(`/competitions/${competitionId}/category-preview`)
          .catch(() => ({ data: null })),
      ]);
      setCompetition(compRes.data);
      setRegistrations(regRes.data);
      setCategories(catRes.data);
      setBrackets(brkRes.data);
      setCategoryPreview(previewRes.data);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Chargement impossible";
      setError(message);
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
