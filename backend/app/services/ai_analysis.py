import json
import re
from groq import AsyncGroq
from app.core.config import settings

client = AsyncGroq(api_key=settings.GROQ_API_KEY)
MODEL = "llama-3.3-70b-versatile"

ANALYSIS_SYSTEM = """Tu es un expert en analyse documentaire. Analyse le document et reponds UNIQUEMENT en JSON valide, sans markdown ni backticks.

Retourne exactement cette structure JSON:
{
  "summary": "Resume executif en 3-5 phrases",
  "key_points": ["point 1", "point 2", "point 3", "point 4", "point 5"],
  "entities": {
    "dates": ["date1"],
    "persons": ["nom (role)"],
    "organizations": ["organisation"],
    "amounts": ["montant + contexte"]
  },
  "obligations": {
    "party_a": ["obligation 1"],
    "party_b": ["obligation 1"]
  },
  "risk_flags": [
    {"severity": "high", "description": "description du risque"}
  ],
  "metadata": {
    "title": "titre du document",
    "document_type": "contrat",
    "parties": ["partie 1", "partie 2"],
    "date": "date principale",
    "duration": "duree si applicable",
    "total_value": "valeur totale si applicable"
  },
  "complexity_score": 7.5,
  "fiche_synthese": {
    "headline": "resume en 10 mots",
    "key_figures": [{"label": "Valeur", "value": "100 euros"}],
    "critical_clauses": ["clause importante"],
    "alert": "point attention majeur"
  }
}"""

CHAT_SYSTEM = """Tu es un assistant expert en analyse documentaire. Tu as analyse ce document:

--- DOCUMENT ---
{document_text}
--- FIN DOCUMENT ---

Reponds aux questions de l'utilisateur sur ce document de facon precise et concise en francais."""


async def analyze_document(document_text: str) -> dict:
    text = document_text[:30000]

    try:
        response = await client.chat.completions.create(
            model=MODEL,
            max_tokens=4000,
            messages=[
                {"role": "system", "content": ANALYSIS_SYSTEM},
                {"role": "user", "content": f"Analyse ce document:\n\n{text}"}
            ]
        )

        raw = response.choices[0].message.content.strip()
        raw = re.sub(r'^```json\s*', '', raw)
        raw = re.sub(r'^```\s*', '', raw)
        raw = re.sub(r'\s*```$', '', raw)

        result = json.loads(raw)
        return result

    except json.JSONDecodeError as e:
        print(f"JSON parse error: {e}, raw: {raw[:200]}")
        return _fallback_analysis()
    except Exception as e:
        print(f"Groq API error: {e}")
        raise


async def chat_with_document(document_text: str, messages: list) -> str:
    system = CHAT_SYSTEM.format(document_text=document_text[:20000])

    response = await client.chat.completions.create(
        model=MODEL,
        max_tokens=1000,
        messages=[{"role": "system", "content": system}] + messages
    )

    return response.choices[0].message.content


def _fallback_analysis() -> dict:
    return {
        "summary": "Document importe avec succes. Utilisez le chat pour poser des questions.",
        "key_points": ["Document analyse"],
        "entities": {"dates": [], "persons": [], "organizations": [], "amounts": []},
        "obligations": {"party_a": [], "party_b": []},
        "risk_flags": [],
        "metadata": {"title": "Document", "document_type": "autre", "parties": []},
        "complexity_score": 5.0,
        "fiche_synthese": {"headline": "Document importe", "key_figures": [], "critical_clauses": [], "alert": ""}
    }
