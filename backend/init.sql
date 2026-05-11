-- Active l'extension pgvector pour la recherche sémantique
CREATE EXTENSION IF NOT EXISTS vector;

-- Index pour la recherche vectorielle (à décommenter après avoir ajouté la colonne embedding)
-- CREATE INDEX ON document_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
