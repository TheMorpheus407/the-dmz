export type { ThemeId } from '../constants/taxonomy.js';
export type { ColorBlindMode } from '../schemas/preferences.schema.js';

export interface ThemeColors {
  background: {
    primary: string;
    secondary: string;
  };
  text: {
    primary: string;
    secondary: string;
    accent: string;
  };
  border: string;
  highlight: string;
  semantic: {
    error: string;
    warning: string;
    success: string;
    info: string;
  };
}

export interface CrtEffectSettings {
  glowIntensity: number;
  scanlineOpacity: number;
  curvatureEnabled: boolean;
  noiseEnabled: boolean;
  vignetteEnabled: boolean;
  flickerEnabled: boolean;
}

export interface ThemeConfig {
  id: string;
  name: string;
  isBuiltIn: boolean;
  colors: ThemeColors;
  crt?: Partial<CrtEffectSettings>;
  createdAt: string;
  updatedAt: string;
}

export interface ThemeExportMetadata {
  name: string;
  author: string;
  createdAt: string;
  version: string;
}

export interface ExportedTheme {
  metadata: ThemeExportMetadata;
  config: ThemeConfig;
}

export interface ContrastValidationResult {
  ratio: number;
  passesAA: boolean;
  passesAALarge: boolean;
  passesAAA: boolean;
  passesAAALarge: boolean;
  isWarning: boolean;
}

export interface ThemeValidationResult {
  isValid: boolean;
  warnings: string[];
  errors: string[];
  contrastResults: {
    primaryText: ContrastValidationResult;
    secondaryText: ContrastValidationResult;
    accentText: ContrastValidationResult;
  };
}
