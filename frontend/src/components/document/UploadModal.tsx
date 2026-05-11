"use client";
import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, FileText, X, Loader2 } from "lucide-react";
import { documentsApi } from "@/lib/api";
import { useDocMindStore } from "@/lib/store";
import toast from "react-hot-toast";

const STEPS = [
  "Lecture du fichier...",
  "Extraction du texte...",
  "Analyse IA en cours...",
  "Génération du résumé...",
  "Extraction des entités...",
  "Finalisation...",
];

export function UploadModal() {
  const { uploadModalOpen, setUploadModalOpen, addDocument, setActiveDocId, updateDocument } = useDocMindStore();
  const [uploading, setUploading] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  const processFile = useCallback(async (file: File) => {
    setUploading(true);
    setStepIndex(0);

    // Fake progress steps during upload
    const iv = setInterval(() => setStepIndex((i) => Math.min(i + 1, STEPS.length - 1)), 700);

    try {
      const doc = await documentsApi.upload(file);
      clearInterval(iv);
      addDocument(doc);
      setActiveDocId(doc.id);
      setUploadModalOpen(false);
      toast.success(`"${file.name}" importé — analyse en cours`);

      // Poll until analyzed
      const poll = setInterval(async () => {
        try {
          const updated = await documentsApi.get(doc.id);
          updateDocument(doc.id, { status: updated.status });
          if (updated.status === "analyzed" || updated.status === "failed") {
            clearInterval(poll);
            if (updated.status === "analyzed") toast.success("Analyse terminée !");
            else toast.error("L'analyse a échoué");
          }
        } catch { clearInterval(poll); }
      }, 2500);
    } catch (err: any) {
      clearInterval(iv);
      toast.error(err?.response?.data?.detail || "Erreur lors de l'import");
    } finally {
      setUploading(false);
    }
  }, [addDocument, setActiveDocId, setUploadModalOpen, updateDocument]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { "application/pdf": [".pdf"], "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"] },
    maxFiles: 1,
    maxSize: 50 * 1024 * 1024,
    disabled: uploading,
    onDropAccepted: ([file]) => processFile(file),
    onDropRejected: ([{ errors }]) => toast.error(errors[0]?.message || "Fichier refusé"),
  });

  if (!uploadModalOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={(e) => { if (e.target === e.currentTarget && !uploading) setUploadModalOpen(false); }}
      >
        <motion.div
          className="w-[480px] rounded-3xl bg-bg-2 border border-border-2 p-10"
          initial={{ scale: 0.94, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.94, opacity: 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
        >
          {!uploading ? (
            <>
              <div
                {...getRootProps()}
                className={`
                  rounded-2xl border-2 border-dashed p-12 text-center cursor-pointer transition-all duration-200
                  ${isDragActive ? "border-accent bg-accent/5" : "border-border-2 hover:border-accent hover:bg-accent/5"}
                `}
              >
                <input {...getInputProps()} />
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4 transition-transform duration-200 ${isDragActive ? "scale-110" : ""} bg-accent/15`}>
                  <Upload className="w-6 h-6 text-accent" />
                </div>
                <h3 className="text-base font-medium mb-1.5">
                  {isDragActive ? "Relâchez pour importer" : "Déposez votre document ici"}
                </h3>
                <p className="text-sm text-white/40">ou cliquez pour sélectionner un fichier</p>
                <div className="flex gap-2 justify-center mt-4">
                  <span className="px-2.5 py-1 rounded-md bg-red-500/15 text-red-300 text-xs font-mono font-semibold">PDF</span>
                  <span className="px-2.5 py-1 rounded-md bg-blue-500/15 text-blue-300 text-xs font-mono font-semibold">DOCX</span>
                  <span className="text-xs text-white/30 self-center">· Jusqu'à 50 Mo</span>
                </div>
              </div>
              <button
                onClick={() => setUploadModalOpen(false)}
                className="mt-4 w-full py-2.5 rounded-xl border border-border-2 text-sm text-white/50 hover:bg-bg-3 hover:text-white/80 transition-colors"
              >
                Annuler
              </button>
            </>
          ) : (
            <div className="text-center py-8">
              <div className="w-14 h-14 rounded-2xl bg-accent/15 flex items-center justify-center mx-auto mb-6">
                <Loader2 className="w-7 h-7 text-accent animate-spin" />
              </div>
              <h3 className="text-base font-medium mb-2">Traitement en cours...</h3>
              <p className="text-sm text-white/40 mb-6">{STEPS[stepIndex]}</p>
              <div className="h-0.5 bg-border rounded overflow-hidden relative">
                <div className="absolute inset-y-0 left-0 w-full bg-gradient-to-r from-transparent via-accent to-transparent animate-processing" />
              </div>
              <div className="flex justify-between text-xs text-white/20 mt-2 font-mono">
                <span>Étape {stepIndex + 1}</span>
                <span>{STEPS.length}</span>
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
