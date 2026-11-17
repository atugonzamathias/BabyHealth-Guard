"use client";

import { useState, useRef, type ChangeEvent } from "react";
import { type MotherProfile } from "@/lib/care-data";

type AnalysisResult = {
  status: "success" | "rejected";
  is_newborn_valid: boolean;
  rejection_reason?: string;
  message?: string;
  message_luganda?: string;
  message_swahili?: string;
  modality?: "skin" | "eyes";
  condition_id?: string;
  condition_name?: string;
  confidence?: number;
  severity?: "SAFE" | "MONITOR" | "URGENT_CLINIC" | "EMERGENCY_DANGER";
  danger_sign_triggered?: boolean;
  clinical_explanation?: string;
  mother_guidance?: string;
  translations?: {
    luganda?: string;
    swahili?: string;
  };
  top_predictions?: Array<{
    class_id: string;
    label: string;
    probability: number;
  }>;
};

type Props = {
  mothers: MotherProfile[];
  currentStaffName?: string;
  currentFacilityName?: string;
  onSaveToHealthLog?: (motherId: string, result: AnalysisResult) => Promise<void>;
  onEscalateDangerSign?: (motherId: string, result: AnalysisResult) => Promise<void>;
};

export function BabyVisionScanner({
  mothers,
  currentStaffName,
  currentFacilityName,
  onSaveToHealthLog,
  onEscalateDangerSign,
}: Props) {
  const [selectedMotherId, setSelectedMotherId] = useState<string>("");
  const [modality, setModality] = useState<string>("auto");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [analyzing, setAnalyzing] = useState<boolean>(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [languageTab, setLanguageTab] = useState<"en" | "lg" | "sw">("en");
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);
  const [escalatedSuccess, setEscalatedSuccess] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setSelectedImage(URL.createObjectURL(file));
      setResult(null);
      setSavedSuccess(false);
      setEscalatedSuccess(false);
    }
  };

  const handleRunAnalysis = async () => {
    if (!imageFile) return;
    setAnalyzing(true);
    setResult(null);
    setSavedSuccess(false);
    setEscalatedSuccess(false);

    try {
      const formData = new FormData();
      formData.append("file", imageFile);
      formData.append("modality", modality);

      const response = await fetch("/api/ml/analyze", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorBody = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(
          errorBody?.error || `Image analysis failed (HTTP ${response.status}).`
        );
      }

      const data: AnalysisResult = await response.json();
      setResult(data);
    } catch (err) {
      console.error(err);
      alert(
        err instanceof Error
          ? err.message
          : "Failed to analyze image. Please check the ML service connection."
      );
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSaveLog = async () => {
    if (!selectedMotherId || !result || !onSaveToHealthLog) return;
    try {
      await onSaveToHealthLog(selectedMotherId, result);
      setSavedSuccess(true);
    } catch (err) {
      console.error(err);
      alert("Could not save to health log.");
    }
  };

  const handleEscalate = async () => {
    if (!selectedMotherId || !result || !onEscalateDangerSign) return;
    try {
      await onEscalateDangerSign(selectedMotherId, result);
      setEscalatedSuccess(true);
    } catch (err) {
      console.error(err);
      alert("Could not escalate emergency triage.");
    }
  };

  // Quick sample test cases
  const loadSyntheticDemo = (type: "jaundice" | "normal" | "conjunctivitis" | "invalid") => {
    // Generate simple colored canvas blob to test immediately
    const canvas = document.createElement("canvas");
    canvas.width = 224;
    canvas.height = 224;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (type === "jaundice") {
      ctx.fillStyle = "#ffdb4d";
      ctx.fillRect(0, 0, 224, 224);
      ctx.fillStyle = "#e6a817";
      ctx.beginPath();
      ctx.arc(112, 112, 60, 0, Math.PI * 2);
      ctx.fill();
    } else if (type === "normal") {
      ctx.fillStyle = "#f5c3a5";
      ctx.fillRect(0, 0, 224, 224);
      ctx.fillStyle = "#f0b290";
      ctx.beginPath();
      ctx.arc(112, 112, 50, 0, Math.PI * 2);
      ctx.fill();
    } else if (type === "conjunctivitis") {
      ctx.fillStyle = "#f5c3a5";
      ctx.fillRect(0, 0, 224, 224);
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.ellipse(112, 112, 60, 25, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#d93838";
      ctx.beginPath();
      ctx.arc(112, 112, 20, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#c5d92e";
      ctx.beginPath();
      ctx.arc(70, 112, 12, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Geometric non-baby
      ctx.fillStyle = "#111827";
      ctx.fillRect(0, 0, 224, 224);
      ctx.fillStyle = "#3b82f6";
      ctx.fillRect(20, 20, 184, 40);
      ctx.fillStyle = "#10b981";
      ctx.fillRect(20, 80, 184, 40);
    }

    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], `demo_${type}.png`, { type: "image/png" });
      setImageFile(file);
      setSelectedImage(canvas.toDataURL());
      setResult(null);
      setSavedSuccess(false);
      setEscalatedSuccess(false);
    });
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-gradient-to-r from-teal-700 via-cyan-800 to-sky-900 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-semibold tracking-wide uppercase mb-3">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            AI Neonatal Vision Screening (0 - 28 Days)
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Baby Skin & Eye Diagnostic Scanner
          </h2>
          <p className="mt-2 text-sm text-cyan-100 leading-relaxed">
            Screen newborn babies for cutaneous jaundice, severe scleral icterus, ophthalmia neonatorum,
            bacterial impetigo, and congenital cataracts. Non-baby pictures are automatically validated
            and rejected to preserve clinical integrity. Results are experimental and are not a diagnosis.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Upload & Setup */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-5">
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-cyan-100 text-cyan-800 flex items-center justify-center font-bold text-sm">
                1
              </span>
              Target Patient & Mode
            </h3>

            {/* Select Mother */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Assign to Mother / Baby Profile
              </label>
              <select
                value={selectedMotherId}
                onChange={(e) => setSelectedMotherId(e.target.value)}
                className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-3.5 py-2.5 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-600 focus:bg-white transition-all"
              >
                <option value="">-- Anonymous / Walk-in Triage --</option>
                {mothers.map((m) => (
                  <option key={m.uid} value={m.uid}>
                    {m.fullName || "Unnamed Mother"} ({m.phone || "No phone"}) - {m.village || "Village N/A"}
                  </option>
                ))}
              </select>
            </div>

            {/* Select Modality */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Anatomical Target
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "auto", label: "Auto-Detect" },
                  { id: "skin", label: "Baby Skin" },
                  { id: "eyes", label: "Baby Eyes" },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setModality(item.id)}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                      modality === item.id
                        ? "bg-cyan-700 text-white border-cyan-700 shadow-xs"
                        : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Image Upload Area */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Capture or Upload Photo
              </label>
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                capture="environment"
                onChange={handleFileChange}
                className="hidden"
              />

              <div
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-3xl p-6 text-center cursor-pointer transition-all ${
                  selectedImage
                    ? "border-cyan-500 bg-cyan-50/20"
                    : "border-slate-300 hover:border-cyan-600 bg-slate-50 hover:bg-cyan-50/10"
                }`}
              >
                {selectedImage ? (
                  <div className="space-y-3">
                    <img
                      src={selectedImage}
                      alt="Uploaded baby preview"
                      className="w-48 h-48 mx-auto object-cover rounded-2xl shadow-md border border-slate-200"
                    />
                    <p className="text-xs text-cyan-800 font-semibold">
                      Click to choose a different photo
                    </p>
                  </div>
                ) : (
                  <div className="py-6 space-y-2">
                    <div className="w-12 h-12 rounded-full bg-cyan-100 text-cyan-700 flex items-center justify-center mx-auto">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <p className="text-sm font-bold text-slate-800">
                      Take Photo or Browse Image
                    </p>
                    <p className="text-xs text-slate-500">
                      Supports phone camera capture or files (PNG, JPEG, WebP)
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Demo Previews */}
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                Quick Test Samples
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => loadSyntheticDemo("jaundice")}
                  className="p-2 rounded-xl border border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100"
                >
                  🟡 Jaundice Sample
                </button>
                <button
                  type="button"
                  onClick={() => loadSyntheticDemo("normal")}
                  className="p-2 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-900 hover:bg-emerald-100"
                >
                  🟢 Healthy Sample
                </button>
                <button
                  type="button"
                  onClick={() => loadSyntheticDemo("conjunctivitis")}
                  className="p-2 rounded-xl border border-rose-200 bg-rose-50 text-rose-900 hover:bg-rose-100"
                >
                  🔴 Eye Infection
                </button>
                <button
                  type="button"
                  onClick={() => loadSyntheticDemo("invalid")}
                  className="p-2 rounded-xl border border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200"
                >
                  ⬛ Non-Baby Rejection
                </button>
              </div>
            </div>

            {/* Run Button */}
            <button
              type="button"
              disabled={!imageFile || analyzing}
              onClick={handleRunAnalysis}
              className={`w-full py-3.5 px-4 rounded-2xl font-extrabold text-sm flex items-center justify-center gap-2 shadow-md transition-all ${
                !imageFile || analyzing
                  ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                  : "bg-cyan-700 hover:bg-cyan-800 text-white hover:shadow-lg active:scale-98"
              }`}
            >
              {analyzing ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Analyzing with VisionNet...
                </>
              ) : (
                <>
                  <span>Run AI Vision Screening</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Column: AI Analysis Result */}
        <div className="lg:col-span-7 space-y-4">
          {result ? (
            <div className="space-y-4 animate-fade-in">
              {/* Rejection / Non-Baby Card */}
              {result.status === "rejected" ? (
                <div className="bg-rose-50 border-2 border-rose-300 rounded-3xl p-6 shadow-sm space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-rose-600 text-white flex items-center justify-center shrink-0">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </div>
                    <div>
                      <div className="inline-block px-2.5 py-0.5 rounded-full bg-rose-200 text-rose-800 text-[11px] font-extrabold uppercase tracking-wide mb-1">
                        Gatekeeper Rejection: Not a Newborn Baby
                      </div>
                      <h4 className="text-lg font-bold text-rose-950">
                        Image Ineligible for Clinical Screening
                      </h4>
                      <p className="mt-1 text-sm text-rose-800 leading-relaxed">
                        {result.message}
                      </p>
                    </div>
                  </div>

                  {/* Local Language Translations */}
                  <div className="border-t border-rose-200 pt-3 space-y-2 text-xs text-rose-900">
                    <p>
                      <strong>Luganda:</strong> {result.message_luganda}
                    </p>
                    <p>
                      <strong>Kiswahili:</strong> {result.message_swahili}
                    </p>
                  </div>
                </div>
              ) : (
                /* Successful Clinical Assessment */
                <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-6">
                  {/* Header Badge & Severity */}
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                          Verified Newborn {result.modality === "eyes" ? "Eye" : "Skin"} Check
                        </span>
                      </div>
                      <h3 className="text-2xl font-extrabold text-slate-900 mt-1">
                        {result.condition_name}
                      </h3>
                    </div>

                    <div className="text-right">
                      <span
                        className={`inline-block px-3.5 py-1.5 rounded-full text-xs font-extrabold uppercase tracking-wide shadow-xs ${
                          result.severity === "EMERGENCY_DANGER"
                            ? "bg-rose-600 text-white animate-bounce"
                            : result.severity === "URGENT_CLINIC"
                            ? "bg-amber-500 text-white"
                            : result.severity === "MONITOR"
                            ? "bg-sky-500 text-white"
                            : "bg-emerald-600 text-white"
                        }`}
                      >
                        {result.severity?.replace("_", " ")}
                      </span>
                      <p className="text-xs font-bold text-slate-500 mt-1">
                        Confidence: {result.confidence}%
                      </p>
                    </div>
                  </div>

                  {/* Danger Alert Warning Banner */}
                  {result.danger_sign_triggered && (
                    <div className="bg-gradient-to-r from-rose-600 to-red-700 rounded-2xl p-4 text-white flex items-start gap-3 shadow-md">
                      <span className="text-2xl">🚨</span>
                      <div>
                        <h4 className="font-bold text-sm leading-tight">
                          Clinical Danger Sign Detected
                        </h4>
                        <p className="text-xs text-rose-100 mt-0.5">
                          This condition poses a high risk to the newborn baby if left untreated.
                          Emergency referral or medical intervention at a health center is recommended.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Clinical Explanation */}
                  <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
                    <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Clinical Pathology Notes
                    </h5>
                    <p className="text-sm text-slate-700 leading-relaxed">
                      {result.clinical_explanation}
                    </p>
                  </div>

                  {/* Mother Guidance with Language Switcher */}
                  <div className="bg-cyan-50/50 rounded-2xl p-4 border border-cyan-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <h5 className="text-xs font-bold text-cyan-950 uppercase tracking-wider">
                        Mother Guidance & Care Advice
                      </h5>
                      {/* Language pills */}
                      <div className="flex rounded-lg bg-cyan-100/80 p-0.5 text-[11px] font-bold">
                        <button
                          type="button"
                          onClick={() => setLanguageTab("en")}
                          className={`px-2 py-0.5 rounded-md ${
                            languageTab === "en" ? "bg-white text-cyan-900 shadow-xs" : "text-cyan-700"
                          }`}
                        >
                          English
                        </button>
                        <button
                          type="button"
                          onClick={() => setLanguageTab("lg")}
                          className={`px-2 py-0.5 rounded-md ${
                            languageTab === "lg" ? "bg-white text-cyan-900 shadow-xs" : "text-cyan-700"
                          }`}
                        >
                          Luganda
                        </button>
                        <button
                          type="button"
                          onClick={() => setLanguageTab("sw")}
                          className={`px-2 py-0.5 rounded-md ${
                            languageTab === "sw" ? "bg-white text-cyan-900 shadow-xs" : "text-cyan-700"
                          }`}
                        >
                          Kiswahili
                        </button>
                      </div>
                    </div>

                    <p className="text-sm text-cyan-900 font-medium leading-relaxed">
                      {languageTab === "en" && result.mother_guidance}
                      {languageTab === "lg" && (result.translations?.luganda || result.mother_guidance)}
                      {languageTab === "sw" && (result.translations?.swahili || result.mother_guidance)}
                    </p>
                  </div>

                  {/* Top Predicted Probabilities */}
                  {result.top_predictions && result.top_predictions.length > 0 && (
                    <div className="space-y-2">
                      <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                        Model Class Probabilities
                      </h5>
                      <div className="space-y-2">
                        {result.top_predictions.map((pred) => (
                          <div key={pred.class_id}>
                            <div className="flex justify-between text-xs font-bold text-slate-700 mb-0.5">
                              <span>{pred.label}</span>
                              <span>{pred.probability}%</span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                              <div
                                className={`h-2 rounded-full ${
                                  pred.probability > 70 ? "bg-cyan-600" : "bg-slate-400"
                                }`}
                                style={{ width: `${pred.probability}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Action Buttons for Health Workers */}
                  <div className="pt-2 flex flex-wrap items-center gap-3">
                    {selectedMotherId && onSaveToHealthLog && (
                      <button
                        type="button"
                        onClick={handleSaveLog}
                        disabled={savedSuccess}
                        className={`py-2.5 px-4 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                          savedSuccess
                            ? "bg-emerald-100 text-emerald-800 cursor-default"
                            : "bg-slate-800 hover:bg-slate-900 text-white shadow-xs"
                        }`}
                      >
                        {savedSuccess ? "✓ Saved to Baby Record" : "Save to Health Log"}
                      </button>
                    )}

                    {result.danger_sign_triggered && selectedMotherId && onEscalateDangerSign && (
                      <button
                        type="button"
                        onClick={handleEscalate}
                        disabled={escalatedSuccess}
                        className={`py-2.5 px-4 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all ${
                          escalatedSuccess
                            ? "bg-rose-100 text-rose-800 cursor-default"
                            : "bg-rose-600 hover:bg-rose-700 text-white shadow-md active:scale-98"
                        }`}
                      >
                        {escalatedSuccess ? "✓ Danger Sign Escalated" : "🚨 Escalate to Emergency Triage"}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Empty State */
            <div className="bg-slate-50 rounded-3xl border border-dashed border-slate-300 p-12 text-center text-slate-500 space-y-3">
              <div className="w-16 h-16 rounded-3xl bg-white shadow-xs border border-slate-200 flex items-center justify-center mx-auto text-2xl">
                🔬
              </div>
              <h4 className="font-bold text-slate-800 text-base">
                Awaiting Newborn Image
              </h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                Take or upload a clear photo of the baby&apos;s skin or eye, or click one of the quick test samples on the left to see live AI diagnostic predictions.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
