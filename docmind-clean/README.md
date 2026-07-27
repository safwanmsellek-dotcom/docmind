# DocMind AI — Plateforme d'analyse de documents

Plateforme complète d'analyse IA de documents PDF et DOCX avec résumé automatique, extraction d'entités, et chatbot documentaire.

## Stack

| Couche | Technologie |
|--------|-------------|
| Frontend | Next.js 14 + TypeScript + Tailwind CSS |
| Backend | FastAPI (Python 3.12) + asyncpg |
| Base de données | PostgreSQL 16 + pgvector |
| IA | Claude claude-sonnet-4-20250514 (Anthropic) |
| Extraction PDF | pdfplumber |
| Extraction DOCX | python-docx |
| Export PDF | WeasyPrint |
| State management | Zustand + React Query |
| Streaming | Server-Sent Events (SSE) |

## Structure du projet

```
docmind/
├── backend/
│   ├── app/
│   │   ├── main.py                   # FastAPI app + CORS + lifespan
│   │   ├── core/
│   │   │   ├── config.py             # Settings (pydantic-settings)
│   │   │   └── database.py           # AsyncSQLAlchemy + session
│   │   ├── models/
│   │   │   └── models.py             # Document, Analysis, Chunks, Chat
│   │   ├── schemas/
│   │   │   └── documents.py          # Pydantic response schemas
│   │   ├── services/
│   │   │   ├── extraction.py         # PDF/DOCX text extraction + chunking
│   │   │   └── ai_analysis.py        # Claude API — analyse + chat + search
│   │   └── api/routes/
│   │       ├── documents.py          # Upload, list, delete
│   │       ├── analysis.py           # Get analysis, status, semantic search
│   │       ├── chat.py               # Chat sessions + SSE streaming
│   │       └── export.py             # PDF export (WeasyPrint)
│   ├── requirements.txt
│   ├── Dockerfile
│   ├── init.sql                      # pgvector extension
│   └── .env.example
│
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx              # Main layout + AppShell
│   │   │   ├── layout.tsx            # Fonts + metadata
│   │   │   └── globals.css           # Tailwind + animations
│   │   ├── components/
│   │   │   ├── document/
│   │   │   │   └── UploadModal.tsx   # Drag & drop + progress steps
│   │   │   ├── chat/
│   │   │   │   └── ChatPanel.tsx     # Chat SSE streaming + quick questions
│   │   │   └── analysis/
│   │   │       └── AnalysisTabs.tsx  # Summary, Extraction, Fiche tabs
│   │   ├── hooks/
│   │   │   ├── useChat.ts            # SSE streaming + fallback
│   │   │   └── useDocumentAnalysis.ts# React Query + polling
│   │   └── lib/
│   │       ├── api.ts                # Axios client + all endpoints
│   │       └── store.ts              # Zustand global state
│   ├── package.json
│   ├── tailwind.config.ts
│   └── .env.local.example
│
└── docker-compose.yml
```

## Démarrage rapide

### 1. Variables d'environnement

```bash
# Backend
cp backend/.env.example backend/.env
# Renseignez ANTHROPIC_API_KEY et DATABASE_URL

# Frontend  
cp frontend/.env.local.example frontend/.env.local
```

### 2. Avec Docker (recommandé)

```bash
docker-compose up --build
```

Frontend : http://localhost:3000  
API : http://localhost:8000  
Docs API : http://localhost:8000/docs

### 3. Sans Docker

**Backend :**
```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

**Frontend :**
```bash
cd frontend
npm install
npm run dev
```

## Fonctionnalités

### Upload & traitement
- Drag & drop PDF / DOCX jusqu'à 50 Mo
- Extraction texte native (pdfplumber / python-docx)
- Chunking automatique pour recherche sémantique
- Analyse IA asynchrone (background task FastAPI)

### Analyse IA (Claude Sonnet)
- **Résumé exécutif** — 3-5 phrases synthétiques
- **Points clés** — 5 éléments prioritaires
- **Extraction entités** — dates, montants, personnes, organisations
- **Obligations** — par partie contractante
- **Risques** — classification high/medium/low
- **Fiche synthèse** — jalons, alertes, chiffres clés
- **Score de complexité** — 1 à 10

### Chat documentaire
- Streaming SSE token par token
- Historique de session persisté en base
- Questions rapides prédéfinies
- Arrêt du streaming en cours

### Export
- PDF résumé généré avec WeasyPrint
- Copie presse-papiers des résultats

### Recherche sémantique
- Chunking avec overlap configurable
- Prêt pour pgvector (colonne `embedding` à activer)
- Fallback Claude-based search disponible

## Variables d'environnement

| Variable | Description | Défaut |
|----------|-------------|--------|
| `ANTHROPIC_API_KEY` | Clé API Anthropic | — |
| `DATABASE_URL` | PostgreSQL asyncpg URL | localhost |
| `MAX_FILE_SIZE_MB` | Taille max upload | 50 |
| `CHUNK_SIZE` | Taille des chunks texte | 1000 |
| `CHUNK_OVERLAP` | Overlap entre chunks | 200 |

## Étapes suivantes (roadmap)

- [ ] Activer pgvector + embeddings réels (voyage-3 via Anthropic)
- [ ] Auth utilisateurs (Supabase Auth ou NextAuth)
- [ ] Multi-documents — analyse comparative
- [ ] OCR scans (Tesseract ou AWS Textract)
- [ ] Annotations et commentaires sur le document
- [ ] Partage de résultats (lien public)
