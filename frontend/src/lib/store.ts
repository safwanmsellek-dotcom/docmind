import { create } from "zustand";
import { Document, DocumentAnalysis } from "@/lib/api";

interface DocMindStore {
  // Documents
  documents: Document[];
  setDocuments: (docs: Document[]) => void;
  addDocument: (doc: Document) => void;
  updateDocument: (id: string, updates: Partial<Document>) => void;
  removeDocument: (id: string) => void;

  // Active document
  activeDocId: string | null;
  setActiveDocId: (id: string | null) => void;

  // Analysis cache
  analyses: Record<string, DocumentAnalysis>;
  setAnalysis: (docId: string, analysis: DocumentAnalysis) => void;

  // Chat
  chatSessionIds: Record<string, string>; // docId → sessionId
  setChatSession: (docId: string, sessionId: string) => void;

  // UI
  activeTab: "summary" | "extraction" | "chat" | "fiche";
  setActiveTab: (tab: DocMindStore["activeTab"]) => void;

  uploadModalOpen: boolean;
  setUploadModalOpen: (open: boolean) => void;
}

export const useDocMindStore = create<DocMindStore>((set) => ({
  documents: [],
  setDocuments: (docs) => set({ documents: docs }),
  addDocument: (doc) => set((s) => ({ documents: [doc, ...s.documents] })),
  updateDocument: (id, updates) =>
    set((s) => ({
      documents: s.documents.map((d) => (d.id === id ? { ...d, ...updates } : d)),
    })),
  removeDocument: (id) =>
    set((s) => ({ documents: s.documents.filter((d) => d.id !== id) })),

  activeDocId: null,
  setActiveDocId: (id) => set({ activeDocId: id }),

  analyses: {},
  setAnalysis: (docId, analysis) =>
    set((s) => ({ analyses: { ...s.analyses, [docId]: analysis } })),

  chatSessionIds: {},
  setChatSession: (docId, sessionId) =>
    set((s) => ({ chatSessionIds: { ...s.chatSessionIds, [docId]: sessionId } })),

  activeTab: "summary",
  setActiveTab: (tab) => set({ activeTab: tab }),

  uploadModalOpen: false,
  setUploadModalOpen: (open) => set({ uploadModalOpen: open }),
}));
