export enum AspectRatio {
  SQUARE = "1:1",
  LANDSCAPE = "16:9",
  PORTRAIT = "9:16"
}

export enum Resolution {
  RES_1K = "1K",
  RES_2K = "2K",
  RES_4K = "4K"
}

export enum Engine {
  NANO_BANANA = "imagen-3.0-generate-001",
  NANO_BANANA_PRO = "imagen-3.0-generate-001"
}

export interface GenerationSettings {
  aspectRatio: AspectRatio;
  resolution: Resolution;
  engine: Engine;
  targetSceneCount: number;
  totalParts: number; // Added back for multi-part support
}

export interface GeneratedAsset {
  id: string;
  url: string;
  prompt: string;
  createdAt: number;
  // Video specific fields for history items
  videoUrl?: string;
  videoStatus?: 'pending' | 'generating' | 'completed' | 'failed';
}

export interface Character {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'generating' | 'completed' | 'failed';
  imageUrl?: string;
  history: GeneratedAsset[];
  error?: string;
}

export interface VideoSettings {
  model: 'veo-3.1-fast-generate-preview' | 'veo-3.1-generate-preview';
  resolution: '720p' | '1080p';
}

export interface Scene {
  id: string;
  sceneNumber: number;
  originalText: string;
  imagePrompt: string;
  videoPrompt: string;
  status: 'pending' | 'generating' | 'completed' | 'failed';
  imageUrl?: string;
  history: GeneratedAsset[];
  error?: string;
  videoStatus?: 'pending' | 'generating' | 'completed' | 'failed';
  videoUrl?: string;
  // Canvas specific properties
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  rotation?: number;
}

export interface AnalysisResult {
  scenes: Scene[];
  characters: Character[];
}