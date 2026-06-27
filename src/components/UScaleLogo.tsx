import React from "react";

interface UScaleLogoProps {
  className?: string;
  lightBackground?: boolean;
}

export default function UScaleLogo({ className = "h-8", lightBackground = false }: UScaleLogoProps) {
  return (
    <div className={`flex items-center select-none ${className}`}>
      <svg
        viewBox="0 0 130 52"
        className="w-auto h-full overflow-visible"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="uScaleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#06b6d4" /> {/* cyan-500 */}
            <stop offset="100%" stopColor="#0d9488" /> {/* teal-600 */}
          </linearGradient>
        </defs>

        {/* The Growth/Scale Arrow Graphic - positioned precisely over the S and c */}
        <path
          d="M42 26 L70 10 L84 18 L112 4"
          stroke="url(#uScaleGrad)"
          strokeWidth="4.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M98 4 H112 V18"
          stroke="url(#uScaleGrad)"
          strokeWidth="4.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Text 'u' - lower case in teal/cyan gradient */}
        <text
          x="8"
          y="38"
          fill="url(#uScaleGrad)"
          fontSize="34"
          fontWeight="800"
          fontFamily="Inter, system-ui, sans-serif"
          letterSpacing="-1"
        >
          u
        </text>

        {/* Text 'Scale' - in white/slate */}
        <text
          x="28"
          y="38"
          fill={lightBackground ? "#1e293b" : "#ffffff"}
          fontSize="34"
          fontWeight="800"
          fontFamily="Inter, system-ui, sans-serif"
          letterSpacing="-1.5"
        >
          Scale
        </text>
      </svg>
    </div>
  );
}
