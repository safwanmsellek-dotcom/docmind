"use client";
import { useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { analysisApi, DocumentAnalysis } from "@/lib/api";
import { useDocMindStore } from "@/lib/store";

export function useDocumentAnalysis(docId: string | null) {
  const { analyses, setAnalysis } = useDocMindStore();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["analysis", docId],
    queryFn: () => analysisApi.get(docId!),
    enabled: !!docId,
    staleTime: 30_000,
    refetchInterval: (query) => {
      // Continue polling si en cours de traitement
      const data = query.state.data as DocumentAnalysis | undefined;
      if (!data || data.status === "processing") return 3000;
      return false;
    },
  });

  useEffect(() => {
    if (data && data.status === "analyzed" && docId) {
      setAnalysis(docId, data);
    }
  }, [data, docId, setAnalysis]);

  const cachedAnalysis = docId ? analyses[docId] : null;

  return {
    analysis: data || cachedAnalysis,
    isLoading,
    isProcessing: data?.status === "processing",
    error,
    refetch,
  };
}
