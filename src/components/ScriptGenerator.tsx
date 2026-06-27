import React, { useState } from "react";
import { Sparkles, Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { ScriptResponse } from "../types";

interface ScriptGeneratorProps {
  onScriptGenerated: (script: string, title: string) => void;
}

export default function ScriptGenerator({ onScriptGenerated }: ScriptGeneratorProps) {
  const [topic, setTopic] = useState("");
  const [category, setCategory] = useState("commercial");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/generate-script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, category }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "فشل توليد السكريبت.");
      }

      const data: ScriptResponse = await response.json();
      onScriptGenerated(data.originalScript, data.title || topic);
      setTopic(""); // Clear topic input on success
    } catch (err: any) {
      console.error("Error generating script:", err);
      setError(err.message || "حدث خطأ غير متوقع أثناء توليد السكريبت.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-slate-900/50 rounded-2xl p-5 border border-slate-800 text-right flex flex-col gap-4">
      <div className="flex justify-between items-center flex-row-reverse">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20">
            <Sparkles className="w-4 h-4 text-cyan-400" />
          </div>
          <h3 className="text-white font-bold text-sm">مساعد السكريبت بالذكاء الاصطناعي</h3>
        </div>
        <span className="text-[10px] bg-cyan-500/10 text-cyan-400 px-2.5 py-1 rounded-full border border-cyan-500/20 font-medium">
          توليد فوري
        </span>
      </div>

      <p className="text-slate-400 text-xs leading-relaxed">
        أدخل موضوعاً أو منتجاً جزائرياً (مثال: "تطبيق لتوصيل الكسكسي"، "محل حلويات تقليدية قسنطينية"، "بودكاست عن ثورة التحرير")، وسيتولى الذكاء الاصطناعي صياغة سكريبت مميز ومناسب للتوليد الصوتي.
      </p>

      <form onSubmit={handleGenerate} className="flex flex-col gap-3">
        {/* Topic Input */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-slate-300 font-medium">موضوع السكريبت أو المنتج:</label>
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="مثال: إعلان عطر رجالي جديد أو عرض ترويجي لمتجر ملابس..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 transition-colors text-right"
            required
            disabled={isLoading}
          />
        </div>

        {/* Category Selector */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {[
            { id: "commercial", name: "إعلان تجاري" },
            { id: "documentary", name: "وثائقي وسردي" },
            { id: "voicemail", name: "مجيب آلي وهاتف" },
            { id: "storytelling", name: "قصة مسلية" },
            { id: "news", name: "أخبار ونشرات" },
          ].map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setCategory(cat.id)}
              className={`px-3 py-2 rounded-lg text-[11px] font-medium border transition-all text-center ${
                category === cat.id
                  ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/30"
                  : "bg-slate-950/40 text-slate-400 border-slate-800 hover:border-slate-700"
              }`}
              disabled={isLoading}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Error State */}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-950/20 border border-red-900/30 rounded-xl text-red-400 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Trigger Button */}
        <button
          type="submit"
          className="w-full h-10 bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-lg shadow-cyan-500/5 disabled:opacity-50"
          disabled={isLoading || !topic.trim()}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
              <span>جاري صياغة السكريبت الفني...</span>
            </>
          ) : (
            <>
              <RefreshCw className="w-3.5 h-3.5" />
              <span>صياغة وتوليد سكريبت جزائري احترافي</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}
