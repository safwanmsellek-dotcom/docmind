// @ts-nocheck
"use client";
import { useState, useRef, useEffect } from "react";

export default function Home() {
  const [docs, setDocs] = useState([]);
  const [activeDoc, setActiveDoc] = useState(null);
  const [activeTab, setActiveTab] = useState("summary");
  const [analysis, setAnalysis] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadModal, setUploadModal] = useState(false);
  const [messages, setMessages] = useState([{ role: "ai", content: "Bonjour ! Importez un document pour commencer." }]);
  const [chatInput, setChatInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [activeNav, setActiveNav] = useState("docs");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [multiDocs, setMultiDocs] = useState([]);
  const [selectedDocs, setSelectedDocs] = useState([]);
  const [multiQuestion, setMultiQuestion] = useState("");
  const [multiMode, setMultiMode] = useState("compare");
  const [multiResult, setMultiResult] = useState(null);
  const [isMultiLoading, setIsMultiLoading] = useState(false);
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetch("http://localhost:8000/api/documents/")
      .then(r => r.json()).then(setDocs).catch(() => {});
  }, []);

  useEffect(() => {
    if (activeNav === "multi") {
      fetch("http://localhost:8000/api/multi/documents")
        .then(r => r.json()).then(setMultiDocs).catch(() => {});
    }
  }, [activeNav]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const uploadFile = async (file) => {
    setUploading(true);
    const form = new FormData();
    form.append("file", file);
    try {
      const res = await fetch("http://localhost:8000/api/documents/upload", { method: "POST", body: form });
      const doc = await res.json();
      setDocs(prev => [doc, ...prev]);
      setActiveDoc(doc);
      setActiveNav("docs");
      setUploadModal(false);
      pollAnalysis(doc.id);
    } catch { alert("Erreur upload"); }
    setUploading(false);
  };

  const pollAnalysis = (id) => {
    const iv = setInterval(async () => {
      try {
        const res = await fetch(`http://localhost:8000/api/analysis/${id}`);
        const data = await res.json();
        if (data.status === "analyzed") {
          setAnalysis(data);
          setDocs(prev => prev.map(d => d.id === id ? { ...d, status: "analyzed" } : d));
          clearInterval(iv);
        } else if (data.status === "failed") clearInterval(iv);
      } catch { clearInterval(iv); }
    }, 3000);
  };

  const loadDoc = async (doc) => {
    setActiveDoc(doc);
    setAnalysis(null);
    setActiveTab("summary");
    setMessages([{ role: "ai", content: `Document "${doc.original_name}" chargé. Posez vos questions !` }]);
    try {
      const res = await fetch(`http://localhost:8000/api/analysis/${doc.id}`);
      const data = await res.json();
      if (data.status === "analyzed") setAnalysis(data);
      else if (data.status === "processing") pollAnalysis(doc.id);
    } catch {}
  };

  const sendChat = async () => {
    if (!chatInput.trim() || isThinking || !activeDoc) return;
    const msg = chatInput;
    setChatInput("");
    setMessages(prev => [...prev, { role: "user", content: msg }]);
    setIsThinking(true);
    try {
      const res = await fetch(`http://localhost:8000/api/chat/${activeDoc.id}/message`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg })
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: "ai", content: data.message }]);
    } catch {
      setMessages(prev => [...prev, { role: "ai", content: "Erreur de connexion." }]);
    }
    setIsThinking(false);
  };

  const doSemanticSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    setSearchResults([]);
    try {
      const res = await fetch("http://localhost:8000/api/analysis/search/semantic", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: searchQuery })
      });
      const data = await res.json();
      setSearchResults(data.results || []);
    } catch { alert("Erreur de recherche"); }
    setIsSearching(false);
  };

  const toggleDocSelection = (docId) => {
    setSelectedDocs(prev =>
      prev.includes(docId) ? prev.filter(id => id !== docId) : [...prev, docId]
    );
  };

  const doMultiAnalysis = async () => {
    if (selectedDocs.length < 2 || !multiQuestion.trim()) return;
    setIsMultiLoading(true);
    setMultiResult(null);
    try {
      const res = await fetch("http://localhost:8000/api/multi/analyze", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ document_ids: selectedDocs, question: multiQuestion, mode: multiMode })
      });
      const data = await res.json();
      setMultiResult(data);
    } catch { alert("Erreur analyse multi-documents"); }
    setIsMultiLoading(false);
  };

  const CSS = `
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', sans-serif; background: #0C0C0E; color: #F0EEF8; height: 100vh; overflow: hidden; }
    .app { display: flex; height: 100vh; }
    .sidebar { width: 260px; background: #13131A; border-right: 1px solid #2A2A38; display: flex; flex-direction: column; flex-shrink: 0; }
    .logo { padding: 20px; border-bottom: 1px solid #2A2A38; display: flex; align-items: center; gap: 10px; }
    .logo-icon { width: 32px; height: 32px; background: #7C6BF5; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 16px; }
    .logo-text { font-size: 17px; font-weight: 600; }
    .logo-text span { color: #9D8FFF; }
    .nav { padding: 12px 8px; }
    .nav-item { display: flex; align-items: center; gap: 8px; padding: 8px 12px; border-radius: 8px; cursor: pointer; font-size: 14px; color: #9994B8; margin-bottom: 2px; transition: all 0.15s; }
    .nav-item:hover { background: #1A1A24; color: #F0EEF8; }
    .nav-item.active { background: rgba(124,107,245,0.15); color: #C4BCFF; }
    .section-label { padding: 12px 20px 6px; font-size: 11px; color: #5A5578; font-weight: 600; letter-spacing: 1px; text-transform: uppercase; }
    .doc-list { flex: 1; overflow-y: auto; padding: 4px 8px; }
    .doc-item { padding: 10px 12px; border-radius: 10px; cursor: pointer; border: 1px solid transparent; margin-bottom: 2px; transition: all 0.15s; }
    .doc-item:hover { background: #1A1A24; border-color: #2A2A38; }
    .doc-item.active { background: rgba(124,107,245,0.1); border-color: rgba(124,107,245,0.3); }
    .doc-name { font-size: 13px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 4px; }
    .doc-badges { display: flex; gap: 4px; }
    .badge { padding: 2px 7px; border-radius: 4px; font-size: 10px; font-weight: 600; }
    .badge-pdf { background: rgba(248,113,113,0.15); color: #FCA5A5; }
    .badge-docx { background: rgba(96,165,250,0.15); color: #93C5FD; }
    .badge-ok { background: rgba(74,222,128,0.15); color: #86EFAC; }
    .badge-wait { background: rgba(245,158,11,0.15); color: #FCD34D; }
    .sidebar-footer { padding: 12px; border-top: 1px solid #2A2A38; }
    .upload-btn { width: 100%; padding: 10px; background: #7C6BF5; color: white; border: none; border-radius: 10px; cursor: pointer; font-size: 13px; font-weight: 500; transition: background 0.2s; }
    .upload-btn:hover { background: #9D8FFF; }
    .main { flex: 1; display: flex; flex-direction: column; min-width: 0; }
    .topbar { height: 54px; background: #13131A; border-bottom: 1px solid #2A2A38; display: flex; align-items: center; padding: 0 24px; gap: 10px; flex-shrink: 0; }
    .dot-green { width: 7px; height: 7px; border-radius: 50%; background: #4ADE80; box-shadow: 0 0 6px #4ADE80; }
    .topbar-title { flex: 1; font-size: 14px; font-weight: 500; }
    .tabs { display: flex; background: #13131A; border-bottom: 1px solid #2A2A38; padding: 0 16px; flex-shrink: 0; }
    .tab { padding: 14px 16px; font-size: 13px; color: #5A5578; cursor: pointer; border-bottom: 2px solid transparent; transition: all 0.15s; white-space: nowrap; }
    .tab:hover { color: #9994B8; }
    .tab.active { color: #C4BCFF; border-bottom-color: #7C6BF5; }
    .content { flex: 1; overflow-y: auto; padding: 28px; }
    .doc-title-big { font-size: 22px; font-weight: 600; margin-bottom: 12px; line-height: 1.3; }
    .meta-row { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 24px; }
    .meta-chip { padding: 4px 12px; background: #1A1A24; border: 1px solid #2A2A38; border-radius: 20px; font-size: 12px; color: #9994B8; }
    .section-title { font-size: 11px; font-weight: 600; color: #5A5578; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 10px; margin-top: 20px; }
    .summary-text { font-size: 14px; line-height: 1.8; color: #9994B8; }
    .key-points { display: flex; flex-direction: column; gap: 8px; }
    .key-point { display: flex; gap: 10px; padding: 12px 14px; background: #1A1A24; border: 1px solid #2A2A38; border-radius: 10px; }
    .kp-num { width: 22px; height: 22px; background: rgba(124,107,245,0.2); color: #C4BCFF; border-radius: 6px; font-size: 11px; font-weight: 600; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 1px; }
    .kp-text { font-size: 13px; line-height: 1.6; color: #9994B8; }
    .risk { padding: 10px 14px; border-radius: 8px; margin-bottom: 6px; font-size: 13px; }
    .risk-high { background: rgba(220,38,38,0.08); border-left: 3px solid #DC2626; color: #FCA5A5; }
    .risk-medium { background: rgba(217,119,6,0.08); border-left: 3px solid #D97706; color: #FCD34D; }
    .risk-low { background: rgba(37,99,235,0.08); border-left: 3px solid #2563EB; color: #93C5FD; }
    .entities-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .entity-card { padding: 12px; background: #1A1A24; border: 1px solid #2A2A38; border-radius: 10px; }
    .entity-type { font-size: 10px; font-weight: 600; color: #5A5578; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 8px; }
    .tags { display: flex; flex-wrap: wrap; gap: 4px; }
    .tag { padding: 3px 8px; border-radius: 6px; font-size: 12px; }
    .tag-date { background: rgba(245,158,11,0.15); color: #FCD34D; }
    .tag-person { background: rgba(124,107,245,0.15); color: #C4BCFF; }
    .tag-org { background: rgba(45,212,191,0.15); color: #5EEAD4; }
    .tag-amount { background: rgba(74,222,128,0.15); color: #86EFAC; }
    .chat-wrap { display: flex; flex-direction: column; height: 100%; }
    .chat-messages { flex: 1; overflow-y: auto; padding: 20px; display: flex; flex-direction: column; gap: 14px; }
    .msg { display: flex; gap: 10px; max-width: 100%; }
    .msg.user { flex-direction: row-reverse; }
    .msg-avatar { width: 30px; height: 30px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 600; flex-shrink: 0; }
    .msg.ai .msg-avatar { background: rgba(45,212,191,0.15); color: #2DD4BF; }
    .msg.user .msg-avatar { background: rgba(124,107,245,0.2); color: #C4BCFF; }
    .msg-bubble { padding: 10px 14px; border-radius: 12px; font-size: 13px; line-height: 1.7; max-width: calc(100% - 48px); }
    .msg.ai .msg-bubble { background: #1A1A24; border: 1px solid #2A2A38; color: #9994B8; border-radius: 4px 12px 12px 12px; }
    .msg.user .msg-bubble { background: rgba(124,107,245,0.15); border: 1px solid rgba(124,107,245,0.25); color: #F0EEF8; border-radius: 12px 4px 12px 12px; }
    .thinking { display: flex; gap: 4px; align-items: center; padding: 10px 14px; background: #1A1A24; border: 1px solid #2A2A38; border-radius: 4px 12px 12px 12px; }
    .dot { width: 6px; height: 6px; border-radius: 50%; background: #5A5578; animation: bounce 1.4s infinite; }
    .dot:nth-child(2) { animation-delay: 0.2s; }
    .dot:nth-child(3) { animation-delay: 0.4s; }
    @keyframes bounce { 0%,80%,100%{transform:scale(0.8);opacity:0.3} 40%{transform:scale(1);opacity:1} }
    .chat-footer { padding: 16px; border-top: 1px solid #2A2A38; background: #13131A; flex-shrink: 0; }
    .quick-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 10px; }
    .chip { padding: 5px 12px; background: #1A1A24; border: 1px solid #2A2A38; border-radius: 20px; font-size: 12px; color: #9994B8; cursor: pointer; transition: all 0.15s; }
    .chip:hover { background: rgba(124,107,245,0.1); border-color: rgba(124,107,245,0.4); color: #C4BCFF; }
    .chat-row { display: flex; gap: 8px; }
    .chat-input { flex: 1; background: #1A1A24; border: 1px solid #353548; border-radius: 10px; padding: 10px 14px; color: #F0EEF8; font-size: 13px; font-family: inherit; outline: none; resize: none; }
    .chat-input:focus { border-color: rgba(124,107,245,0.5); }
    .send-btn { width: 40px; height: 40px; background: #7C6BF5; border: none; border-radius: 10px; cursor: pointer; color: white; font-size: 16px; transition: background 0.2s; flex-shrink: 0; }
    .send-btn:hover { background: #9D8FFF; }
    .send-btn:disabled { opacity: 0.4; cursor: not-allowed; }
    .export-row { display: flex; gap: 8px; margin-top: 20px; padding-top: 20px; border-top: 1px solid #2A2A38; }
    .btn { padding: 8px 16px; border-radius: 10px; font-size: 13px; cursor: pointer; font-family: inherit; display: flex; align-items: center; gap: 6px; transition: all 0.15s; border: none; }
    .btn-outline { background: transparent; border: 1px solid #2A2A38 !important; color: #9994B8; }
    .btn-outline:hover { background: #1A1A24; color: #F0EEF8; }
    .btn-primary { background: #7C6BF5; color: white; }
    .btn-primary:hover { background: #9D8FFF; }
    .empty { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; text-align: center; padding: 40px; }
    .empty-icon { width: 64px; height: 64px; background: #1A1A24; border: 1px solid #2A2A38; border-radius: 16px; display: flex; align-items: center; justify-content: center; font-size: 28px; margin-bottom: 8px; }
    .empty h2 { font-size: 18px; font-weight: 500; }
    .empty p { font-size: 13px; color: #5A5578; max-width: 280px; line-height: 1.6; }
    .processing { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px; }
    .spinner { width: 40px; height: 40px; border: 3px solid #2A2A38; border-top-color: #7C6BF5; border-radius: 50%; animation: spin 0.8s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 100; }
    .modal { background: #13131A; border: 1px solid #353548; border-radius: 20px; padding: 36px; width: 440px; text-align: center; }
    .drop-zone { border: 2px dashed #353548; border-radius: 14px; padding: 48px 24px; cursor: pointer; transition: all 0.2s; margin-bottom: 16px; }
    .drop-zone:hover { border-color: #7C6BF5; background: rgba(124,107,245,0.05); }
    .drop-icon { width: 48px; height: 48px; background: rgba(124,107,245,0.15); border-radius: 12px; display: flex; align-items: center; justify-content: center; margin: 0 auto 14px; font-size: 22px; }
    .drop-zone h3 { font-size: 15px; margin-bottom: 6px; }
    .drop-zone p { font-size: 13px; color: #5A5578; }
    .format-badges { display: flex; gap: 8px; justify-content: center; margin-top: 12px; }
    .cancel-btn { width: 100%; padding: 10px; background: transparent; border: 1px solid #2A2A38; color: #9994B8; border-radius: 10px; cursor: pointer; font-size: 13px; }
    .cancel-btn:hover { background: #1A1A24; }
    .search-page { flex: 1; display: flex; flex-direction: column; padding: 32px; overflow-y: auto; }
    .search-header { margin-bottom: 28px; }
    .search-header h1 { font-size: 22px; font-weight: 600; margin-bottom: 6px; }
    .search-header p { font-size: 14px; color: #5A5578; }
    .search-bar { display: flex; gap: 10px; margin-bottom: 20px; }
    .search-input { flex: 1; background: #1A1A24; border: 1px solid #353548; border-radius: 12px; padding: 12px 16px; color: #F0EEF8; font-size: 14px; font-family: inherit; outline: none; transition: border-color 0.15s; }
    .search-input:focus { border-color: rgba(124,107,245,0.5); }
    .search-btn { padding: 12px 24px; background: #7C6BF5; color: white; border: none; border-radius: 12px; cursor: pointer; font-size: 14px; font-family: inherit; font-weight: 500; transition: background 0.2s; white-space: nowrap; }
    .search-btn:hover { background: #9D8FFF; }
    .search-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .search-examples { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 24px; }
    .search-example { padding: 6px 14px; background: #1A1A24; border: 1px solid #2A2A38; border-radius: 20px; font-size: 12px; color: #9994B8; cursor: pointer; transition: all 0.15s; }
    .search-example:hover { background: rgba(124,107,245,0.1); border-color: rgba(124,107,245,0.4); color: #C4BCFF; }
    .search-result { padding: 16px 20px; background: #1A1A24; border: 1px solid #2A2A38; border-radius: 12px; margin-bottom: 12px; transition: border-color 0.15s; }
    .search-result:hover { border-color: rgba(124,107,245,0.4); }
    .result-doc { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
    .result-doc-name { font-size: 12px; font-weight: 600; color: #C4BCFF; }
    .result-score { margin-left: auto; padding: 2px 8px; background: rgba(124,107,245,0.15); color: #C4BCFF; border-radius: 10px; font-size: 11px; font-weight: 600; }
    .result-text { font-size: 13px; line-height: 1.7; color: #9994B8; margin-bottom: 8px; padding: 10px 12px; background: rgba(255,255,255,0.03); border-radius: 8px; border-left: 3px solid #7C6BF5; }
    .result-relevance { font-size: 12px; color: #5A5578; font-style: italic; }
    .multi-page { flex: 1; display: flex; flex-direction: column; padding: 32px; overflow-y: auto; }
    .multi-header { margin-bottom: 28px; }
    .multi-header h1 { font-size: 22px; font-weight: 600; margin-bottom: 6px; }
    .multi-header p { font-size: 14px; color: #5A5578; }
    .doc-selector { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 20px; }
    .doc-select-item { padding: 12px 14px; background: #1A1A24; border: 1px solid #2A2A38; border-radius: 10px; cursor: pointer; transition: all 0.15s; display: flex; align-items: center; gap: 10px; }
    .doc-select-item:hover { border-color: #353548; }
    .doc-select-item.selected { background: rgba(124,107,245,0.1); border-color: rgba(124,107,245,0.4); }
    .doc-checkbox { width: 18px; height: 18px; border-radius: 5px; border: 2px solid #353548; display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-size: 11px; transition: all 0.15s; }
    .doc-select-item.selected .doc-checkbox { background: #7C6BF5; border-color: #7C6BF5; color: white; }
    .doc-select-name { font-size: 13px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .mode-selector { display: flex; gap: 8px; margin-bottom: 20px; flex-wrap: wrap; }
    .mode-btn { padding: 8px 16px; background: #1A1A24; border: 1px solid #2A2A38; border-radius: 20px; font-size: 13px; color: #9994B8; cursor: pointer; transition: all 0.15s; }
    .mode-btn:hover { border-color: #353548; color: #F0EEF8; }
    .mode-btn.active { background: rgba(124,107,245,0.15); border-color: rgba(124,107,245,0.4); color: #C4BCFF; }
    .multi-input { width: 100%; background: #1A1A24; border: 1px solid #353548; border-radius: 12px; padding: 12px 16px; color: #F0EEF8; font-size: 14px; font-family: inherit; outline: none; resize: none; margin-bottom: 16px; transition: border-color 0.15s; }
    .multi-input:focus { border-color: rgba(124,107,245,0.5); }
    .multi-result { padding: 24px; background: #1A1A24; border: 1px solid #2A2A38; border-radius: 14px; margin-top: 20px; }
    .multi-result-header { display: flex; align-items: center; gap: 10px; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid #2A2A38; }
    .multi-result-docs { display: flex; gap: 6px; flex-wrap: wrap; }
    .multi-doc-tag { padding: 3px 10px; background: rgba(124,107,245,0.15); color: #C4BCFF; border-radius: 20px; font-size: 11px; font-weight: 600; }
    .multi-result-text { font-size: 14px; line-height: 1.9; color: #9994B8; white-space: pre-wrap; }
    ::-webkit-scrollbar { width: 4px; }
    ::-webkit-scrollbar-thumb { background: #2A2A38; border-radius: 2px; }
  `;

  return (
    <>
      <style>{CSS}</style>
      <div className="app">
        <div className="sidebar">
          <div className="logo">
            <div className="logo-icon">📄</div>
            <div className="logo-text">Doc<span>Mind</span></div>
          </div>
          <div className="nav">
            <div className={`nav-item ${activeNav === "docs" ? "active" : ""}`} onClick={() => setActiveNav("docs")}>⊞ Mes documents</div>
            <div className={`nav-item ${activeNav === "search" ? "active" : ""}`} onClick={() => setActiveNav("search")}>🔍 Recherche sémantique</div>
            <div className={`nav-item ${activeNav === "multi" ? "active" : ""}`} onClick={() => setActiveNav("multi")}>📚 Multi-documents</div>
          </div>
          {activeNav === "docs" && <>
            <div className="section-label">Récents</div>
            <div className="doc-list">
              {docs.length === 0 && <p style={{ textAlign: "center", fontSize: 12, color: "#5A5578", padding: "20px 10px" }}>Aucun document importé</p>}
              {docs.map(doc => (
                <div key={doc.id} className={`doc-item ${activeDoc?.id === doc.id ? "active" : ""}`} onClick={() => loadDoc(doc)}>
                  <div className="doc-name">{doc.original_name}</div>
                  <div className="doc-badges">
                    <span className={`badge badge-${doc.file_type}`}>{doc.file_type.toUpperCase()}</span>
                    <span className={`badge ${doc.status === "analyzed" ? "badge-ok" : "badge-wait"}`}>{doc.status === "analyzed" ? "Analysé" : "En cours..."}</span>
                  </div>
                </div>
              ))}
            </div>
          </>}
          <div className="sidebar-footer">
            <button className="upload-btn" onClick={() => setUploadModal(true)}>⬆ Importer un document</button>
          </div>
        </div>

        <div className="main">
          <div className="topbar">
            <div className="dot-green" />
            <div className="topbar-title">
              {activeNav === "search" ? "Recherche sémantique" : activeNav === "multi" ? "Multi-documents" : activeDoc?.original_name || "DocMind AI"}
            </div>
            <button className="btn btn-primary" onClick={() => setUploadModal(true)}>+ Nouveau doc</button>
          </div>

          {/* RECHERCHE SEMANTIQUE */}
          {activeNav === "search" && (
            <div className="search-page">
              <div className="search-header">
                <h1>🔍 Recherche sémantique</h1>
                <p>Posez une question — l'IA trouve les passages pertinents dans tous vos documents</p>
              </div>
              <div className="search-bar">
                <input className="search-input" placeholder="Ex: quelles sont les obligations de paiement ?" value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)} onKeyDown={e => e.key === "Enter" && doSemanticSearch()} />
                <button className="search-btn" onClick={doSemanticSearch} disabled={isSearching || !searchQuery.trim()}>
                  {isSearching ? "Recherche..." : "Rechercher"}
                </button>
              </div>
              <div className="search-examples">
                <span style={{ fontSize: 12, color: "#5A5578", alignSelf: "center", marginRight: 4 }}>Exemples :</span>
                {["obligations de paiement", "clause de résiliation", "dates importantes", "montants et pénalités", "responsabilités"].map(ex => (
                  <span key={ex} className="search-example" onClick={() => setSearchQuery(ex)}>{ex}</span>
                ))}
              </div>
              {isSearching && <div style={{ textAlign: "center", padding: "48px", color: "#9994B8" }}><div className="spinner" style={{ margin: "0 auto 16px" }} /><p>L'IA analyse vos documents...</p></div>}
              {!isSearching && searchResults.length > 0 && (<>
                <div className="section-title" style={{ marginTop: 0 }}>{searchResults.length} résultat{searchResults.length > 1 ? "s" : ""}</div>
                {searchResults.map((r, i) => (
                  <div key={i} className="search-result">
                    <div className="result-doc"><span>📄</span><span className="result-doc-name">{r.document_name}</span><span className="result-score">{Math.round(r.score * 100)}% pertinent</span></div>
                    <div className="result-text">"{r.text}"</div>
                    {r.relevance && <div className="result-relevance">💡 {r.relevance}</div>}
                  </div>
                ))}
              </>)}
              {!isSearching && searchResults.length === 0 && searchQuery && <div style={{ textAlign: "center", padding: "48px", color: "#5A5578" }}><div style={{ fontSize: 32, marginBottom: 12 }}>🔍</div><p>Aucun résultat. Essayez une autre formulation.</p></div>}
              {docs.length === 0 && <div style={{ padding: "32px", background: "#1A1A24", border: "1px solid #2A2A38", borderRadius: 12, textAlign: "center" }}><div style={{ fontSize: 32, marginBottom: 12 }}>📁</div><p style={{ color: "#9994B8", fontSize: 14 }}>Importez d'abord des documents</p><button className="btn btn-primary" style={{ margin: "16px auto 0", display: "flex" }} onClick={() => setUploadModal(true)}>⬆ Importer</button></div>}
            </div>
          )}

          {/* MULTI-DOCUMENTS */}
          {activeNav === "multi" && (
            <div className="multi-page">
              <div className="multi-header">
                <h1>📚 Multi-documents</h1>
                <p>Sélectionnez 2 à 5 documents et posez une question d'analyse ou de comparaison</p>
              </div>

              {multiDocs.length === 0 ? (
                <div style={{ padding: "32px", background: "#1A1A24", border: "1px solid #2A2A38", borderRadius: 12, textAlign: "center" }}>
                  <div style={{ fontSize: 32, marginBottom: 12 }}>📁</div>
                  <p style={{ color: "#9994B8", fontSize: 14 }}>Importez et analysez au moins 2 documents pour utiliser cette fonctionnalité</p>
                  <button className="btn btn-primary" style={{ margin: "16px auto 0", display: "flex" }} onClick={() => setUploadModal(true)}>⬆ Importer un document</button>
                </div>
              ) : (
                <>
                  <div className="section-title" style={{ marginTop: 0 }}>1. Sélectionnez les documents ({selectedDocs.length} sélectionné{selectedDocs.length > 1 ? "s" : ""})</div>
                  <div className="doc-selector">
                    {multiDocs.map(doc => (
                      <div key={doc.id} className={`doc-select-item ${selectedDocs.includes(doc.id) ? "selected" : ""}`} onClick={() => toggleDocSelection(doc.id)}>
                        <div className="doc-checkbox">{selectedDocs.includes(doc.id) ? "✓" : ""}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div className="doc-select-name">{doc.name}</div>
                          <div style={{ fontSize: 11, color: "#5A5578", marginTop: 2 }}>{doc.file_type?.toUpperCase()} · {doc.page_count || "?"} pages</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="section-title">2. Choisissez le mode d'analyse</div>
                  <div className="mode-selector">
                    {[
                      { id: "compare", label: "⚖️ Comparer" },
                      { id: "differences", label: "🔍 Différences" },
                      { id: "contradictions", label: "⚡ Contradictions" },
                      { id: "summarize", label: "📝 Synthèse globale" },
                    ].map(m => (
                      <div key={m.id} className={`mode-btn ${multiMode === m.id ? "active" : ""}`} onClick={() => setMultiMode(m.id)}>{m.label}</div>
                    ))}
                  </div>

                  <div className="section-title">3. Posez votre question</div>
                  <textarea className="multi-input" rows={3}
                    placeholder={multiMode === "compare" ? "Ex: Quelles sont les similitudes et différences entre ces contrats ?" :
                      multiMode === "differences" ? "Ex: Quelles sont les différences de montants et durées ?" :
                      multiMode === "contradictions" ? "Ex: Y a-t-il des clauses contradictoires ?" :
                      "Ex: Faites une synthèse globale de ces documents"}
                    value={multiQuestion} onChange={e => setMultiQuestion(e.target.value)} />

                  <button className="btn btn-primary"
                    style={{ padding: "12px 24px", fontSize: 14, opacity: (selectedDocs.length < 2 || !multiQuestion.trim() || isMultiLoading) ? 0.5 : 1 }}
                    onClick={doMultiAnalysis}
                    disabled={selectedDocs.length < 2 || !multiQuestion.trim() || isMultiLoading}>
                    {isMultiLoading ? "⏳ Analyse en cours..." : "✦ Lancer l'analyse IA"}
                  </button>

                  {selectedDocs.length < 2 && <p style={{ fontSize: 12, color: "#5A5578", marginTop: 8 }}>Sélectionnez au moins 2 documents pour continuer</p>}

                  {isMultiLoading && (
                    <div style={{ textAlign: "center", padding: "32px", color: "#9994B8" }}>
                      <div className="spinner" style={{ margin: "0 auto 16px" }} />
                      <p>L'IA analyse vos documents ensemble...</p>
                    </div>
                  )}

                  {multiResult && (
                    <div className="multi-result">
                      <div className="multi-result-header">
                        <span style={{ fontSize: 16 }}>✦</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Analyse de {multiResult.documents?.length} documents</div>
                          <div className="multi-result-docs">
                            {multiResult.documents?.map((d, i) => <span key={i} className="multi-doc-tag">📄 {d.name}</span>)}
                          </div>
                        </div>
                        <button className="btn btn-outline" style={{ fontSize: 12 }} onClick={() => { navigator.clipboard.writeText(multiResult.response); alert("Copié !"); }}>📋 Copier</button>
                      </div>
                      <div className="multi-result-text">{multiResult.response}</div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* MES DOCUMENTS */}
          {activeNav === "docs" && (
            <>
              {!activeDoc ? (
                <div className="empty">
                  <div className="empty-icon">📄</div>
                  <h2>Importez votre premier document</h2>
                  <p>PDF ou DOCX jusqu'à 50 Mo — résumé, extraction et chat IA en quelques secondes</p>
                  <button className="btn btn-primary" style={{ marginTop: 8 }} onClick={() => setUploadModal(true)}>⬆ Importer un document</button>
                </div>
              ) : (
                <>
                  <div className="tabs">
                    {["summary", "extraction", "chat", "fiche"].map(t => (
                      <div key={t} className={`tab ${activeTab === t ? "active" : ""}`} onClick={() => setActiveTab(t)}>
                        {t === "summary" ? "Résumé IA" : t === "extraction" ? "Extraction" : t === "chat" ? "Chat documentaire" : "Fiche synthèse"}
                      </div>
                    ))}
                  </div>
                  {!analysis || activeDoc.status === "processing" ? (
                    <div className="processing"><div className="spinner" /><p style={{ color: "#9994B8", fontSize: 14 }}>Analyse IA en cours...</p></div>
                  ) : (
                    <>
                      {activeTab === "summary" && (
                        <div className="content">
                          <div className="doc-title-big">{analysis.metadata?.title || activeDoc.original_name}</div>
                          <div className="meta-row">
                            {analysis.metadata?.date && <span className="meta-chip">📅 {analysis.metadata.date}</span>}
                            {analysis.page_count && <span className="meta-chip">📄 {analysis.page_count} pages</span>}
                            {analysis.complexity_score && <span className="meta-chip" style={{ borderColor: "rgba(124,107,245,0.3)", color: "#C4BCFF" }}>🎯 Complexité: {analysis.complexity_score}/10</span>}
                          </div>
                          <div className="section-title">Résumé exécutif</div>
                          <p className="summary-text">{analysis.summary}</p>
                          {analysis.risk_flags?.length > 0 && (<>
                            <div className="section-title">Points d'attention</div>
                            {analysis.risk_flags.map((r, i) => <div key={i} className={`risk risk-${r.severity}`}><strong>{r.severity === "high" ? "⚠ Élevé" : r.severity === "medium" ? "⚡ Moyen" : "ℹ Faible"}</strong> — {r.description}</div>)}
                          </>)}
                          <div className="section-title">Points clés</div>
                          <div className="key-points">
                            {analysis.key_points?.map((kp, i) => <div key={i} className="key-point"><div className="kp-num">{i + 1}</div><div className="kp-text">{kp}</div></div>)}
                          </div>
                          <div className="export-row">
                            <button className="btn btn-outline" onClick={() => { navigator.clipboard.writeText(analysis.summary); alert("Copié !"); }}>📋 Copier</button>
                            <button className="btn btn-primary" onClick={() => window.open(`http://localhost:8000/api/export/${activeDoc.id}/pdf`, "_blank")}>⬇ Exporter PDF</button>
                          </div>
                        </div>
                      )}
                      {activeTab === "extraction" && (
                        <div className="content">
                          <div className="section-title" style={{ marginTop: 0 }}>Entités extraites</div>
                          <div className="entities-grid">
                            <div className="entity-card"><div className="entity-type">📅 Dates</div><div className="tags">{analysis.entities?.dates?.map((d, i) => <span key={i} className="tag tag-date">{d}</span>)}</div></div>
                            <div className="entity-card"><div className="entity-type">💶 Montants</div><div className="tags">{analysis.entities?.amounts?.map((a, i) => <span key={i} className="tag tag-amount">{a}</span>)}</div></div>
                            <div className="entity-card"><div className="entity-type">🏢 Organisations</div><div className="tags">{analysis.entities?.organizations?.map((o, i) => <span key={i} className="tag tag-org">{o}</span>)}</div></div>
                            <div className="entity-card"><div className="entity-type">👤 Personnes</div><div className="tags">{analysis.entities?.persons?.map((p, i) => <span key={i} className="tag tag-person">{p}</span>)}</div></div>
                          </div>
                          {(analysis.obligations?.party_a?.length > 0 || analysis.obligations?.party_b?.length > 0) && (<>
                            <div className="section-title">Obligations</div>
                            <div className="key-points">
                              {analysis.obligations?.party_a?.map((o, i) => <div key={i} className="key-point"><div className="kp-num" style={{ background: "rgba(245,158,11,0.2)", color: "#FCD34D" }}>A</div><div className="kp-text">{o}</div></div>)}
                              {analysis.obligations?.party_b?.map((o, i) => <div key={i} className="key-point"><div className="kp-num" style={{ background: "rgba(45,212,191,0.2)", color: "#5EEAD4" }}>B</div><div className="kp-text">{o}</div></div>)}
                            </div>
                          </>)}
                        </div>
                      )}
                      {activeTab === "chat" && (
                        <div className="chat-wrap" style={{ height: "calc(100vh - 108px)" }}>
                          <div className="chat-messages">
                            {messages.map((m, i) => (
                              <div key={i} className={`msg ${m.role}`}>
                                <div className="msg-avatar">{m.role === "ai" ? "✦" : "V"}</div>
                                <div className="msg-bubble">{m.content}</div>
                              </div>
                            ))}
                            {isThinking && <div className="msg ai"><div className="msg-avatar">✦</div><div className="thinking"><div className="dot"/><div className="dot"/><div className="dot"/></div></div>}
                            <div ref={messagesEndRef} />
                          </div>
                          <div className="chat-footer">
                            <div className="quick-chips">
                              {["Obligations principales ?", "Dates importantes ?", "Risques juridiques ?", "Montants ?"].map(q => (
                                <span key={q} className="chip" onClick={() => setChatInput(q)}>{q}</span>
                              ))}
                            </div>
                            <div className="chat-row">
                              <textarea className="chat-input" rows={1} value={chatInput} onChange={e => setChatInput(e.target.value)}
                                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendChat(); } }}
                                placeholder="Posez une question sur ce document..." />
                              <button className="send-btn" onClick={sendChat} disabled={isThinking || !chatInput.trim()}>➤</button>
                            </div>
                          </div>
                        </div>
                      )}
                      {activeTab === "fiche" && (
                        <div className="content">
                          <div style={{ background: "#1A1A24", border: "1px solid #2A2A38", borderRadius: 16, padding: 24 }}>
                            <div style={{ fontSize: 20, fontWeight: 600, marginBottom: 4 }}>{analysis.metadata?.title || activeDoc.original_name}</div>
                            <div style={{ fontSize: 12, color: "#5A5578", marginBottom: 20 }}>Généré par DocMind IA</div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
                              {analysis.metadata?.parties?.map((p, i) => (
                                <div key={i} style={{ padding: 12, background: "#22222F", borderRadius: 10, border: "1px solid #2A2A38" }}>
                                  <div style={{ fontSize: 10, color: "#5A5578", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>{i === 0 ? "Partie A" : "Partie B"}</div>
                                  <div style={{ fontSize: 14, fontWeight: 500 }}>{p}</div>
                                </div>
                              ))}
                              {analysis.metadata?.total_value && (
                                <div style={{ padding: 12, background: "rgba(124,107,245,0.1)", borderRadius: 10, border: "1px solid rgba(124,107,245,0.3)" }}>
                                  <div style={{ fontSize: 10, color: "#C4BCFF", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Valeur totale</div>
                                  <div style={{ fontSize: 14, fontWeight: 500, color: "#C4BCFF" }}>{analysis.metadata.total_value}</div>
                                </div>
                              )}
                            </div>
                            {analysis.fiche_synthese?.alert && (
                              <div style={{ padding: 12, background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: 10, color: "#FCA5A5", fontSize: 13 }}>
                                ⚠️ {analysis.fiche_synthese.alert}
                              </div>
                            )}
                          </div>
                          <div className="export-row">
                            <button className="btn btn-primary" onClick={() => window.open(`http://localhost:8000/api/export/${activeDoc.id}/pdf`, "_blank")}>⬇ Exporter PDF</button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>

      {uploadModal && (
        <div className="overlay" onClick={e => { if (e.target === e.currentTarget) setUploadModal(false); }}>
          <div className="modal">
            {uploading ? (
              <div style={{ padding: "20px 0" }}>
                <div className="spinner" style={{ margin: "0 auto 16px" }} />
                <p style={{ color: "#9994B8", fontSize: 14 }}>Analyse IA en cours...</p>
              </div>
            ) : (
              <>
                <div className="drop-zone" onClick={() => fileInputRef.current?.click()}>
                  <div className="drop-icon">⬆</div>
                  <h3>Déposez votre document ici</h3>
                  <p>ou cliquez pour sélectionner</p>
                  <div className="format-badges">
                    <span className="badge badge-pdf">PDF</span>
                    <span className="badge badge-docx">DOCX</span>
                    <span style={{ fontSize: 11, color: "#5A5578" }}>· 50 Mo max</span>
                  </div>
                </div>
                <input ref={fileInputRef} type="file" accept=".pdf,.docx" style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; if (f) uploadFile(f); }} />
                <button className="cancel-btn" onClick={() => setUploadModal(false)}>Annuler</button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
