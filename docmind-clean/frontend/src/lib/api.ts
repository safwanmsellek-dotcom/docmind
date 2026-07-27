import axios from "axios";

const API = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000",
  timeout: 60_000,
});

// ─── Types ─────────────────────────────────────────────────────────────────

export interface Document {
  id: string;
  original_name: string;
  file_type: "pdf" | "docx";
  file_size: number;
  page_count: number | null;
  status: "uploading" | "processing" | "analyzed" | "failed";
  created_at: string;
}

export interface DocumentAnalysis {
  status: string;
  document_id: string;
  filename: string;
  page_count: number;
  summary: string;
  key_points: string[];
  entities: {
    dates: string[];
    persons: string[];
    organizations: string[];
    amounts: string[];
  };
  obligations: {
    party_a: string[];
    party_b: string[];
  };
  risk_flags: Array<{ severity: "high" | "medium" | "low"; description: string }>;
  metadata: {
    title: string;
    document_type: string;
    parties: string[];
    date: string;
    duration: string;
    total_value: string;
    governing_law: string;
  };
  complexity_score: number;
  fiche_synthese: {
    headline: string;
    key_figures: Array<{ label: string; value: string }>;
    payment_schedule?: Array<{ label: string; amount: string; condition: string }>;
    critical_clauses: string[];
    alert?: string;
  };
  analyzed_at: string;
}

// ─── Documents ─────────────────────────────────────────────────────────────

export const documentsApi = {
  upload: async (file: File): Promise<Document> => {
    const form = new FormData();
    form.append("file", file);
    const { data } = await API.post<Document>("/api/documents/upload", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data;
  },

  list: async (): Promise<Document[]> => {
    const { data } = await API.get<Document[]>("/api/documents/");
    return data;
  },

  get: async (id: string): Promise<Document> => {
    const { data } = await API.get<Document>(`/api/documents/${id}`);
    return data;
  },

  delete: async (id: string): Promise<void> => {
    await API.delete(`/api/documents/${id}`);
  },
};

// ─── Analysis ──────────────────────────────────────────────────────────────

export const analysisApi = {
  get: async (docId: string): Promise<DocumentAnalysis> => {
    const { data } = await API.get<DocumentAnalysis>(`/api/analysis/${docId}`);
    return data;
  },

  status: async (docId: string): Promise<{ status: string }> => {
    const { data } = await API.get(`/api/analysis/${docId}/status`);
    return data;
  },

  search: async (docId: string, query: string): Promise<{ results: Array<{ chunk_index: number; content: string }> }> => {
    const { data } = await API.post(`/api/analysis/${docId}/search`, { query });
    return data;
  },
};

// ─── Chat ──────────────────────────────────────────────────────────────────

export const chatApi = {
  createSession: async (docId: string): Promise<{ session_id: string }> => {
    const { data } = await API.post(`/api/chat/${docId}/session`);
    return data;
  },

  sendMessage: async (
    docId: string,
    message: string,
    sessionId?: string
  ): Promise<{ session_id: string; message: string }> => {
    const { data } = await API.post(`/api/chat/${docId}/message`, {
      message,
      session_id: sessionId,
    });
    return data;
  },

  /** Retourne l'URL SSE pour le streaming */
  streamUrl: (docId: string): string =>
    `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/chat/${docId}/stream`,

  getHistory: async (docId: string, sessionId: string) => {
    const { data } = await API.get(`/api/chat/${docId}/sessions/${sessionId}/history`);
    return data;
  },
};

// ─── Export ────────────────────────────────────────────────────────────────

export const exportApi = {
  downloadPdf: (docId: string): void => {
    window.open(
      `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/export/${docId}/pdf`,
      "_blank"
    );
  },
};
