import React from "react";
import { Play, Download, Trash2, Calendar, User, Sliders, MapPin, Music } from "lucide-react";
import { HistoryItem } from "../types";

interface HistoryListProps {
  items: HistoryItem[];
  onPlay: (item: HistoryItem) => void;
  onDelete: (id: string) => void;
  onLoad: (item: HistoryItem) => void;
}

export default function HistoryList({ items, onPlay, onDelete, onLoad }: HistoryListProps) {
  const getRegionName = (region: string) => {
    switch (region) {
      case "central":
        return "الوسط (العاصمية)";
      case "western":
        return "الغرب (الوهرانية)";
      case "eastern":
        return "الشرق (القسنطينية)";
      case "southern":
        return "الجنوب (الصحراوية)";
      default:
        return "لهجة جزائرية عامة";
    }
  };

  const getVoiceName = (voice: string) => {
    switch (voice) {
      case "Kore":
        return "أمينة (صوت نسائي)";
      case "Puck":
        return "سليم (صوت رجالي)";
      case "Zephyr":
        return "جميلة (صوت نسائي)";
      case "Charon":
        return "أمين (صوت رجالي)";
      case "Fenrir":
        return "ياسين (صوت رجالي)";
      default:
        return voice;
    }
  };

  if (items.length === 0) {
    return (
      <div className="bg-slate-900/40 rounded-2xl p-8 border border-slate-800 text-center text-slate-500">
        <Music className="w-8 h-8 mx-auto mb-3 text-slate-600" />
        <p className="text-xs">لا يوجد أي مقاطع صوتية محفوظة في أرشيف الأستوديو حالياً.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 max-h-[500px] overflow-y-auto pr-1">
      {items.map((item) => (
        <div
          key={item.id}
          className="bg-slate-900/60 hover:bg-slate-900/95 border border-slate-800 hover:border-slate-700/80 rounded-xl p-4 transition-all flex flex-col sm:flex-row-reverse justify-between items-start sm:items-center gap-4 text-right"
        >
          {/* Audio Title and Metadata */}
          <div className="flex-1 flex flex-col gap-1 w-full sm:text-right">
            <h4 className="text-white text-sm font-bold leading-snug line-clamp-1">{item.title}</h4>
            
            {/* Tag Badges */}
            <div className="flex flex-wrap gap-1.5 mt-1 sm:justify-start flex-row-reverse">
              <span className="text-[10px] bg-cyan-500/10 text-cyan-400 border border-cyan-500/15 px-2 py-0.5 rounded flex items-center gap-1 font-medium">
                <MapPin className="w-2.5 h-2.5" />
                {getRegionName(item.region)}
              </span>
              <span className="text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/15 px-2 py-0.5 rounded flex items-center gap-1 font-medium">
                <User className="w-2.5 h-2.5" />
                {getVoiceName(item.voice)}
              </span>
              <span className="text-[10px] bg-purple-500/10 text-purple-400 border border-purple-500/15 px-2 py-0.5 rounded flex items-center gap-1 font-medium">
                <Sliders className="w-2.5 h-2.5" />
                {item.emotion === "cheerful" ? "مرح" : item.emotion === "professional" ? "جدي" : item.emotion === "dramatic" ? "حماسي" : "هادئ"}
              </span>
            </div>

            {/* Timestamps */}
            <div className="flex items-center gap-1 text-[10px] text-slate-500 mt-2 flex-row-reverse">
              <Calendar className="w-3 h-3" />
              <span>{item.timestamp}</span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            <button
              onClick={() => onDelete(item.id)}
              className="p-2 bg-red-950/20 hover:bg-red-950/80 text-red-400 hover:text-red-300 rounded-lg transition-colors border border-red-900/10 hover:border-red-900/30 cursor-pointer"
              title="حذف من الأرشيف"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <a
              href={item.audioUrl}
              download={`${item.title.replace(/\s+/g, "_")}_DZ.${item.mimeType === "audio/wav" ? "wav" : "mp3"}`}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-cyan-400 hover:text-cyan-300 rounded-lg transition-colors border border-slate-700 cursor-pointer"
              title="تحميل الملف الصوتي"
            >
              <Download className="w-4 h-4" />
            </a>
            <button
              onClick={() => onLoad(item)}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold transition-colors border border-slate-700 cursor-pointer"
              title="استرجاع وتعديل هذا السكريبت"
            >
              تعديل
            </button>
            <button
              onClick={() => onPlay(item)}
              className="p-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-lg transition-all transform active:scale-95 shadow-md shadow-cyan-500/10 cursor-pointer"
              title="تشغيل المقطع الصوتي"
            >
              <Play className="w-4 h-4 fill-slate-950 text-slate-950" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
