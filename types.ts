export interface GeneratedAnimation {
  id: string;
  title: string;
  description: string;
  svgContent: string;
  createdAt: number;
  width: number;
  height: number;
  prompt: string;
  style: string;
  duration: number; // Duration in seconds
  designRationale?: string; // The AI's explanation of the design choices
}

export enum AnimationStyle {
  FLAT = 'Flat Design',
  GRADIENT = 'Gradient',
  OUTLINE = 'Outline/Stroke',
  PIXEL = 'Pixel Art',
  MINIMALIST = 'Minimalist',
  ISOMETRIC = 'Isometric',
  RIVE_LIKE = 'Rive-like'
}

export interface GenerationSettings {
  width: number;
  height: number;
  style: AnimationStyle;
}

export type ExportFormat = 'svg' | 'png' | 'gif' | 'webm';