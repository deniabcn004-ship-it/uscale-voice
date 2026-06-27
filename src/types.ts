export interface ScriptResponse {
  title?: string;
  originalScript: string;
  audience?: string;
}

export interface DialectResponse {
  adaptedArabic: string;
  adaptedLatin: string;
  pronunciationGuide: string;
  vibeDescription: string;
}

export interface AudioResponse {
  audioBase64: string;
  mimeType: string;
  sampleRate: number;
}

export interface HistoryItem {
  id: string;
  title: string;
  originalText: string;
  adaptedArabic: string;
  adaptedLatin: string;
  region: string;
  voice: string;
  speed: string;
  emotion: string;
  audioUrl: string;
  timestamp: string;
  vibeDescription: string;
  pronunciationGuide: string;
  mimeType?: string;
  audioBase64?: string;
}

export interface PresetScript {
  id: string;
  title: string;
  category: string;
  text: string;
  description: string;
}
