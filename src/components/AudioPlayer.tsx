import React, { useRef, useState, useEffect } from "react";
import { Play, Pause, RotateCcw, Volume2, Download, Check, Sparkles, FileText, Globe } from "lucide-react";
import Visualizer from "./Visualizer";

interface AudioPlayerProps {
  audioUrl: string | null;
  onDownload: () => void;
  title: string;
  pronunciationGuide?: string;
  vibeDescription?: string;
  adaptedLatin?: string;
  adaptedArabic?: string;
}

export default function AudioPlayer({
  audioUrl,
  onDownload,
  title,
  pronunciationGuide,
  vibeDescription,
  adaptedLatin,
  adaptedArabic
}: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [copiedArabic, setCopiedArabic] = useState(false);
  const [copiedLatin, setCopiedLatin] = useState(false);

  useEffect(() => {
    // Reset play state if audioUrl changes
    setIsPlaying(false);
    setCurrentTime(0);
  }, [audioUrl]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch((e) => {
        console.error("Error playing audio:", e);
      });
    }
  };

  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    setCurrentTime(audioRef.current.currentTime);
  };

  const handleLoadedMetadata = () => {
    if (!audioRef.current) return;
    setDuration(audioRef.current.duration || 0);
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!audioRef.current) return;
    const seekTime = parseFloat(e.target.value);
    audioRef.current.currentTime = seekTime;
    setCurrentTime(seekTime);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = parseFloat(e.target.value);
    setVolume(vol);
    if (audioRef.current) {
      audioRef.current.volume = vol;
    }
  };

  const handleReset = () => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = 0;
    setCurrentTime(0);
    if (!isPlaying) {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return "00:00";
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const copyToClipboard = (text: string, setCopied: (v: boolean) => void) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!audioUrl) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-slate-900/40 rounded-2xl border border-slate-800 text-center h-[340px]">
        <div className="w-16 h-16 bg-slate-800/80 rounded-full flex items-center justify-center mb-4 border border-slate-700">
          <Play className="w-8 h-8 text-slate-500 fill-slate-500" />
        </div>
        <h3 className="text-white font-medium text-lg mb-2">أستوديو الإلقاء الصوتي جاهز</h3>
        <p className="text-slate-400 text-sm max-w-sm">
          أدخل سكريبت، واختر اللهجة الجزائرية الفرعية والإعدادات التي تناسبك، ثم اضغط على زر التوليد لتتمكن من الاستماع للمخرجات هنا.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6 bg-slate-900/80 rounded-2xl border border-cyan-900/30 backdrop-blur-xl relative overflow-hidden">
      {/* Background radial highlight */}
      <div className="absolute -top-24 -left-24 w-48 h-48 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />
      
      {/* Hidden Audio element */}
      <audio
        ref={audioRef}
        src={audioUrl}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleAudioEnded}
      />

      {/* Visualizer Waveform */}
      <Visualizer isPlaying={isPlaying} color="bg-cyan-500" />

      {/* Audio details */}
      <div className="flex justify-between items-start">
        <div className="flex flex-col gap-1 text-right w-full">
          <span className="text-[10px] uppercase font-semibold text-cyan-400 tracking-wider">التعليق الصوتي المولد</span>
          <h3 className="text-white font-bold text-lg leading-relaxed truncate">{title}</h3>
        </div>
      </div>

      {/* Playback Controls & Scrubber */}
      <div className="flex flex-col gap-3">
        {/* Scrubber slider */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-slate-400 w-10 text-left">{formatTime(currentTime)}</span>
          <input
            type="range"
            min={0}
            max={duration || 100}
            step={0.1}
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
          />
          <span className="text-xs font-mono text-slate-400 w-10 text-right">
            {formatTime(duration || 0)}
          </span>
        </div>

        {/* Central Bar Controls */}
        <div className="flex items-center justify-between mt-1">
          {/* Volume slider control */}
          <div className="flex items-center gap-2 w-28">
            <Volume2 className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={volume}
              onChange={handleVolumeChange}
              className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
            />
          </div>

          {/* Central Play button */}
          <div className="flex items-center gap-4">
            <button
              onClick={handleReset}
              className="p-2.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded-full transition-colors border border-slate-700"
              title="إعادة التشغيل من البداية"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={togglePlay}
              className="w-14 h-14 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 rounded-full flex items-center justify-center shadow-lg shadow-cyan-500/20 transition-all active:scale-95"
            >
              {isPlaying ? (
                <Pause className="w-6 h-6 fill-slate-950 text-slate-950" />
              ) : (
                <Play className="w-6 h-6 fill-slate-950 text-slate-950 translate-x-[2px]" />
              )}
            </button>
            <button
              onClick={onDownload}
              className="p-2.5 bg-slate-800/80 hover:bg-slate-700 text-cyan-400 hover:text-cyan-300 rounded-full transition-colors border border-slate-700"
              title="تحميل الملف الصوتي"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>

          <div className="w-28 text-left text-[11px] text-slate-500 font-mono">
            WAV/MP3 Audio
          </div>
        </div>
      </div>

      {/* Script Adaptations Output display */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
        {adaptedArabic && (
          <div className="bg-slate-900/90 rounded-xl p-4 border border-slate-800/80 relative text-right">
            <div className="flex justify-between items-center mb-2">
              <button
                onClick={() => copyToClipboard(adaptedArabic, setCopiedArabic)}
                className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 bg-slate-800 px-2 py-1 rounded transition-colors"
              >
                {copiedArabic ? (
                  <>
                    <Check className="w-3 h-3 text-cyan-400" />
                    <span>تم النسخ</span>
                  </>
                ) : (
                  <>
                    <FileText className="w-3 h-3" />
                    <span>نسخ النص</span>
                  </>
                )}
              </button>
              <span className="text-xs font-semibold text-cyan-400 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" />
                السكريبت بالدارجة الجزائرية
              </span>
            </div>
            <p className="text-white text-sm leading-relaxed font-medium font-sans">
              {adaptedArabic}
            </p>
          </div>
        )}

        {adaptedLatin && (
          <div className="bg-slate-900/90 rounded-xl p-4 border border-slate-800/80 relative text-left font-mono">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-semibold text-slate-400 flex items-center gap-1">
                <Globe className="w-3.5 h-3.5 text-slate-400" />
                Franco / Phonetic Transliteration
              </span>
              <button
                onClick={() => copyToClipboard(adaptedLatin, setCopiedLatin)}
                className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 bg-slate-800 px-2 py-1 rounded transition-colors"
              >
                {copiedLatin ? (
                  <>
                    <Check className="w-3 h-3 text-cyan-400" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <FileText className="w-3 h-3" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
            <p className="text-slate-300 text-xs leading-relaxed text-left">
              {adaptedLatin}
            </p>
          </div>
        )}
      </div>

      {/* Pronunciation & Style helper info */}
      {(pronunciationGuide || vibeDescription) && (
        <div className="bg-cyan-950/20 border border-cyan-900/30 rounded-xl p-4 text-right flex flex-col gap-3">
          {vibeDescription && (
            <div className="flex flex-col gap-1">
              <span className="text-xs font-bold text-cyan-400">💡 روح النص والأسلوب المقترح للإلقاء:</span>
              <p className="text-slate-300 text-xs leading-relaxed">{vibeDescription}</p>
            </div>
          )}
          {pronunciationGuide && (
            <div className="flex flex-col gap-1 border-t border-slate-800/60 pt-2">
              <span className="text-xs font-bold text-cyan-400">🗣️ دليل مخارج الحروف والنطق:</span>
              <p className="text-slate-300 text-xs leading-relaxed">{pronunciationGuide}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
