import React, { useEffect, useState } from "react";

interface VisualizerProps {
  isPlaying: boolean;
  color?: string;
}

export default function Visualizer({ isPlaying, color = "bg-cyan-500" }: VisualizerProps) {
  const [bars, setBars] = useState<number[]>([]);

  useEffect(() => {
    // Generate 32 bars with random heights
    const initialBars = Array.from({ length: 28 }, () => Math.floor(Math.random() * 60) + 15);
    setBars(initialBars);
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying) {
      interval = setInterval(() => {
        setBars((prev) =>
          prev.map(() => Math.floor(Math.random() * 75) + 10)
        );
      }, 100);
    } else {
      // Set to soft rest state
      setBars((prev) => prev.map(() => 6));
    }
    return () => clearInterval(interval);
  }, [isPlaying]);

  return (
    <div className="flex items-end justify-center gap-1 h-24 w-full bg-slate-900/60 rounded-xl p-4 border border-slate-800 overflow-hidden relative">
      <div className="absolute top-2 left-3 flex items-center gap-1.5">
        <span className={`w-2 h-2 rounded-full ${isPlaying ? "bg-red-500 animate-pulse" : "bg-slate-500"}`} />
        <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
          {isPlaying ? "LIVE PLAYBACK" : "STANDBY"}
        </span>
      </div>

      <div className="absolute top-2 right-3 flex items-center gap-1">
        <span className="text-[9px] font-mono text-slate-500">48.0 kHz</span>
      </div>

      {/* Renders the spectrum bars */}
      <div className="flex items-end justify-center gap-[3px] w-full h-12">
        {bars.map((height, index) => (
          <div
            key={index}
            style={{ height: `${height}%` }}
            className={`w-[4px] rounded-full transition-all duration-100 ${
              isPlaying ? color : "bg-slate-700"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
