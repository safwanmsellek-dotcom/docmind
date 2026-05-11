"use client";
import { DocumentAnalysis } from "@/lib/api";
import { exportApi } from "@/lib/api";
import { Copy, Download, AlertTriangle, CheckCircle, Info } from "lucide-react";
import toast from "react-hot-toast";

// ─── Summary Tab ──────────────────────────────────────────────────────────────

export function SummaryTab({ analysis, docId }: { analysis: DocumentAnalysis; docId: string }) {
  const meta = analysis.metadata || {};

  const copyResults = () => {
    const text = `${meta.title || analysis.filename}\n\nRÉSUMÉ\n${analysis.summary}\n\nPOINTS CLÉS\n${analysis.key_points?.map((k, i) => `${i + 1}. ${k}`).join("\n")}`;
    navigator.clipboard.writeText(text);
    toast.success("Copié dans le presse-papiers");
  };

  return (
    <div className="p-6">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-normal leading-tight mb-3">{meta.title || analysis.filename}</h1>
          <div className="flex flex-wrap gap-2">
            {meta.date && <MetaChip icon="📅">{meta.date}</MetaChip>}
            {meta.parties?.length && <MetaChip icon="👤">{meta.parties.length} parties</MetaChip>}
            {analysis.page_count && <MetaChip icon="📄">{analysis.page_count} pages</MetaChip>}
            {analysis.complexity_score && (
              <MetaChip icon="🎯" accent>Score complexité: {analysis.complexity_score.toFixed(1)}/10</MetaChip>
            )}
          </div>
        </div>
        <span className="px-2.5 py-1 bg-accent/15 text-accent-3 border border-accent/25 rounded-full text-xs font-medium whitespace-nowrap">✦ IA</span>
      </div>

      <SectionTitle>Résumé exécutif</SectionTitle>
      <p className="text-sm leading-relaxed text-white/60 mb-6"
        dangerouslySetInnerHTML={{ __html: analysis.summary?.replace(/\*\*(.*?)\*\*/g, '<strong class="text-white/90">$1</strong>') || "" }}
      />

      {analysis.risk_flags?.length > 0 && (
        <>
          <SectionTitle>Points d'attention</SectionTitle>
          <div className="flex flex-col gap-2 mb-6">
            {analysis.risk_flags.map((r, i) => (
              <RiskFlag key={i} severity={r.severity} description={r.description} />
            ))}
          </div>
        </>
      )}

      <SectionTitle>Points clés identifiés</SectionTitle>
      <div className="flex flex-col gap-2 mb-6">
        {analysis.key_points?.map((kp, i) => (
          <div key={i} className="flex gap-3 p-3 bg-bg-3 border border-border rounded-xl hover:border-border-2 transition-colors">
            <div className="w-5 h-5 rounded-md bg-accent/20 text-accent-3 text-[11px] font-mono font-semibold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</div>
            <p className="text-sm leading-relaxed text-white/60" dangerouslySetInnerHTML={{ __html: kp.replace(/\*\*(.*?)\*\*/g, '<strong class="text-white/90">$1</strong>') }} />
          </div>
        ))}
      </div>

      <div className="flex gap-2 pt-4 border-t border-border">
        <button onClick={copyResults} className="flex items-center gap-1.5 px-3.5 py-2 border border-border rounded-xl text-sm text-white/50 hover:bg-bg-3 hover:text-white/80 transition-colors">
          <Copy className="w-3.5 h-3.5" /> Copier résultats
        </button>
        <button onClick={() => exportApi.downloadPdf(docId)} className="flex items-center gap-1.5 px-3.5 py-2 bg-accent border border-accent text-white rounded-xl text-sm hover:bg-accent-2 transition-colors">
          <Download className="w-3.5 h-3.5" /> Exporter résumé PDF
        </button>
      </div>
    </div>
  );
}

// ─── Extraction Tab ───────────────────────────────────────────────────────────

export function ExtractionTab({ analysis }: { analysis: DocumentAnalysis }) {
  const { entities, obligations } = analysis;

  return (
    <div className="p-6">
      <SectionTitle>Entités extraites automatiquement</SectionTitle>
      <div className="grid grid-cols-2 gap-3 mb-6">
        <EntityCard type="📅 Dates" items={entities?.dates} color="#F59E0B" />
        <EntityCard type="💶 Montants" items={entities?.amounts} color="#4ADE80" />
        <EntityCard type="🏢 Organisations" items={entities?.organizations} color="#2DD4BF" />
        <EntityCard type="👤 Personnes" items={entities?.persons} color="#C4BCFF" />
      </div>

      {(obligations?.party_a?.length || obligations?.party_b?.length) && (
        <>
          <SectionTitle>Obligations contractuelles</SectionTitle>
          <div className="flex flex-col gap-2">
            {obligations?.party_a?.map((o, i) => <ObligationItem key={`a${i}`} text={o} type="a" />)}
            {obligations?.party_b?.map((o, i) => <ObligationItem key={`b${i}`} text={o} type="b" />)}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Fiche Tab ────────────────────────────────────────────────────────────────

export function FicheTab({ analysis, docId }: { analysis: DocumentAnalysis; docId: string }) {
  const fiche = analysis.fiche_synthese || {};
  const meta = analysis.metadata || {};
  const colors = ["#7C6BF5", "#2DD4BF", "#F59E0B", "#F87171", "#4ADE80"];

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="text-[11px] text-white/30 uppercase tracking-widest font-semibold mb-1">Fiche synthèse générée</div>
          <div className="text-sm text-white/30">Format exportable · Mise à jour automatique</div>
        </div>
        <span className="px-2.5 py-1 bg-accent/15 text-accent-3 border border-accent/25 rounded-full text-xs font-medium">✦ Auto-générée</span>
      </div>

      <div className="bg-bg-3 border border-border rounded-2xl p-6">
        <h2 className="font-display text-xl font-normal mb-1">{meta.title || analysis.filename}</h2>
        <p className="text-xs text-white/25 font-mono mb-5">Généré par DocMind IA · {new Date().toLocaleDateString("fr-FR")}</p>

        <div className="grid grid-cols-2 gap-3 mb-6">
          {meta.parties?.[0] && <FicheCard label="Prestataire" value={meta.parties[0]} />}
          {meta.parties?.[1] && <FicheCard label="Client" value={meta.parties[1]} />}
          {meta.duration && <FicheCard label="Durée" value={meta.duration} />}
          {meta.total_value && <FicheCard label="Valeur totale" value={meta.total_value} accent />}
        </div>

        {fiche.key_figures?.length > 0 && (
          <div className="grid grid-cols-2 gap-3 mb-6">
            {fiche.key_figures.map((kf, i) => (
              <FicheCard key={i} label={kf.label} value={kf.value} />
            ))}
          </div>
        )}

        {fiche.payment_schedule?.length > 0 && (
          <>
            <div className="text-[11px] text-white/30 uppercase tracking-widest mb-3">Jalons de paiement</div>
            <div className="flex flex-col gap-2 mb-5">
              {fiche.payment_schedule.map((p, i) => (
                <div key={i} className="flex items-center gap-3 text-sm">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: colors[i % colors.length] }} />
                  <span className="flex-1 text-white/50">{p.label}</span>
                  <span className="font-mono text-sm" style={{ color: colors[i % colors.length] }}>{p.amount}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {fiche.alert && (
          <div className="p-3.5 bg-red-500/8 border border-red-500/20 rounded-xl text-sm text-red-300">
            ⚠️ <strong>Point d'attention :</strong> {fiche.alert}
          </div>
        )}
      </div>

      <div className="flex gap-2 mt-4">
        <button
          onClick={() => { navigator.clipboard.writeText(JSON.stringify(fiche, null, 2)); toast.success("Copié"); }}
          className="flex items-center gap-1.5 px-3.5 py-2 border border-border rounded-xl text-sm text-white/50 hover:bg-bg-3 transition-colors"
        >
          <Copy className="w-3.5 h-3.5" /> Copier
        </button>
        <button onClick={() => exportApi.downloadPdf(docId)} className="flex items-center gap-1.5 px-3.5 py-2 bg-accent text-white rounded-xl text-sm hover:bg-accent-2 transition-colors">
          <Download className="w-3.5 h-3.5" /> Exporter fiche PDF
        </button>
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div className="text-[11px] font-semibold text-white/30 tracking-widest uppercase mb-3 mt-6 first:mt-0">{children}</div>;
}

function MetaChip({ icon, children, accent }: { icon: string; children: React.ReactNode; accent?: boolean }) {
  return (
    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs ${accent ? "bg-accent/10 border-accent/30 text-accent-3" : "bg-bg-3 border-border text-white/50"} border`}>
      <span>{icon}</span>{children}
    </div>
  );
}

function EntityCard({ type, items, color }: { type: string; items?: string[]; color: string }) {
  return (
    <div className="p-3 bg-bg-3 border border-border rounded-xl">
      <div className="text-[10px] font-semibold text-white/30 uppercase tracking-widest mb-2">{type}</div>
      <div className="flex flex-wrap gap-1">
        {items?.map((item, i) => (
          <span key={i} className="px-2 py-0.5 rounded-md text-xs" style={{ background: `${color}20`, color }}>{item}</span>
        ))}
        {!items?.length && <span className="text-xs text-white/20 italic">Aucune trouvée</span>}
      </div>
    </div>
  );
}

function ObligationItem({ text, type }: { text: string; type: "a" | "b" }) {
  const Icon = type === "a" ? AlertTriangle : CheckCircle;
  const color = type === "a" ? "text-amber-400" : "text-docmind-teal";
  return (
    <div className="flex gap-3 p-3 bg-bg-3 border border-border rounded-xl">
      <Icon className={`w-4 h-4 ${color} flex-shrink-0 mt-0.5`} />
      <p className="text-sm text-white/60">{text}</p>
    </div>
  );
}

function RiskFlag({ severity, description }: { severity: string; description: string }) {
  const map = {
    high: { color: "#DC2626", bg: "bg-red-500/8", border: "border-red-500/20", label: "Élevé" },
    medium: { color: "#D97706", bg: "bg-amber-500/8", border: "border-amber-500/20", label: "Moyen" },
    low: { color: "#2563EB", bg: "bg-blue-500/8", border: "border-blue-500/20", label: "Faible" },
  } as any;
  const s = map[severity] || map.low;
  return (
    <div className={`p-3 ${s.bg} border ${s.border} rounded-xl`}>
      <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: s.color }}>{s.label}</span>
      <p className="text-sm text-white/60 mt-1">{description}</p>
    </div>
  );
}

function FicheCard({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`p-3 rounded-xl border ${accent ? "bg-accent/10 border-accent/30" : "bg-bg-4 border-border"}`}>
      <div className={`text-[10px] uppercase tracking-widest mb-1 ${accent ? "text-accent-3" : "text-white/30"}`}>{label}</div>
      <div className={`text-sm font-medium ${accent ? "text-accent-3" : "text-white"}`}>{value}</div>
    </div>
  );
}
