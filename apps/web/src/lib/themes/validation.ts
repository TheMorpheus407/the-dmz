import type {
  ThemeColors,
  ThemeValidationResult,
  ContrastValidationResult,
} from '@the-dmz/shared/types';

const WCAG_AA_NORMAL_TEXT = 4.5;
const WCAG_AA_LARGE_TEXT = 3.0;
const WCAG_AAA_NORMAL_TEXT = 7.0;
const WCAG_AAA_LARGE_TEXT = 4.5;
const WARNING_THRESHOLD = 0.5;

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (result) {
    return {
      r: parseInt(result[1]!, 16),
      g: parseInt(result[2]!, 16),
      b: parseInt(result[3]!, 16),
    };
  }
  const shortResult = /^#?([a-f\d])([a-f\d])([a-f\d])$/i.exec(hex);
  if (shortResult) {
    return {
      r: parseInt(shortResult[1]! + shortResult[1]!, 16),
      g: parseInt(shortResult[2]! + shortResult[2]!, 16),
      b: parseInt(shortResult[3]! + shortResult[3]!, 16),
    };
  }
  return null;
}

function getRelativeLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c): number => {
    const sRGB = c / 255;
    return sRGB <= 0.03928 ? sRGB / 12.92 : Math.pow((sRGB + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs! + 0.7152 * gs! + 0.0722 * bs!;
}

export function calculateContrastRatio(foreground: string, background: string): number {
  const fgRgb = hexToRgb(foreground);
  const bgRgb = hexToRgb(background);

  if (!fgRgb || !bgRgb) {
    return 1;
  }

  const fgLuminance = getRelativeLuminance(fgRgb.r, fgRgb.g, fgRgb.b);
  const bgLuminance = getRelativeLuminance(bgRgb.r, bgRgb.g, bgRgb.b);

  const lighter = Math.max(fgLuminance, bgLuminance);
  const darker = Math.min(fgLuminance, bgLuminance);

  return (lighter + 0.05) / (darker + 0.05);
}

export function validateContrast(foreground: string, background: string): ContrastValidationResult {
  const ratio = calculateContrastRatio(foreground, background);

  const passesAA = ratio >= WCAG_AA_NORMAL_TEXT;
  const passesAALarge = ratio >= WCAG_AA_LARGE_TEXT;
  const passesAAA = ratio >= WCAG_AAA_NORMAL_TEXT;
  const passesAAALarge = ratio >= WCAG_AAA_LARGE_TEXT;

  const warningThreshold = WCAG_AA_NORMAL_TEXT - WARNING_THRESHOLD;
  const isWarning = ratio >= warningThreshold && ratio < WCAG_AA_NORMAL_TEXT;

  return {
    ratio: Math.round(ratio * 100) / 100,
    passesAA,
    passesAALarge,
    passesAAA,
    passesAAALarge,
    isWarning,
  };
}

export function validateThemeColors(colors: ThemeColors): ThemeValidationResult {
  const warnings: string[] = [];
  const errors: string[] = [];

  const primaryTextResult = validateContrast(colors.text.primary, colors.background.primary);
  const secondaryTextResult = validateContrast(colors.text.secondary, colors.background.primary);
  const accentTextResult = validateContrast(colors.text.accent, colors.background.primary);

  if (!primaryTextResult.passesAA) {
    errors.push(`Primary text contrast (${primaryTextResult.ratio}:1) fails WCAG AA (4.5:1)`);
  } else if (primaryTextResult.isWarning) {
    warnings.push(
      `Primary text contrast (${primaryTextResult.ratio}:1) is approaching WCAG AA minimum`,
    );
  }

  if (!secondaryTextResult.passesAALarge) {
    warnings.push(
      `Secondary text contrast (${secondaryTextResult.ratio}:1) fails WCAG AA for normal text but passes for large text`,
    );
  }

  if (!accentTextResult.passesAA) {
    errors.push(`Accent text contrast (${accentTextResult.ratio}:1) fails WCAG AA (4.5:1)`);
  } else if (accentTextResult.isWarning) {
    warnings.push(
      `Accent text contrast (${accentTextResult.ratio}:1) is approaching WCAG AA minimum`,
    );
  }

  const semanticColors = [
    { key: 'error', color: colors.semantic.error, label: 'Error' },
    { key: 'warning', color: colors.semantic.warning, label: 'Warning' },
    { key: 'success', color: colors.semantic.success, label: 'Success' },
    { key: 'info', color: colors.semantic.info, label: 'Info' },
  ];

  for (const { color, label } of semanticColors) {
    const result = validateContrast(color, colors.background.primary);
    if (!result.passesAA) {
      errors.push(`${label} semantic color contrast (${result.ratio}:1) fails WCAG AA (4.5:1)`);
    }
  }

  const highlightResult = validateContrast(colors.highlight, colors.background.primary);
  if (!highlightResult.passesAALarge) {
    warnings.push(
      `Highlight color contrast (${highlightResult.ratio}:1) may not meet UI component contrast requirements`,
    );
  }

  return {
    isValid: errors.length === 0,
    warnings,
    errors,
    contrastResults: {
      primaryText: primaryTextResult,
      secondaryText: secondaryTextResult,
      accentText: accentTextResult,
    },
  };
}

export function simulateColorBlindness(
  hex: string,
  mode: 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia',
): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;

  const { r, g, b } = rgb;

  let rSim: number, gSim: number, bSim: number;

  switch (mode) {
    case 'protanopia': {
      rSim = 0.567 * r + 0.433 * g;
      gSim = 0.558 * r + 0.442 * g;
      bSim = 0.242 * g + 0.758 * b;
      break;
    }
    case 'deuteranopia': {
      rSim = 0.625 * r + 0.375 * g;
      gSim = 0.7 * r + 0.3 * g;
      bSim = 0.3 * g + 0.7 * b;
      break;
    }
    case 'tritanopia': {
      rSim = 0.95 * r + 0.05 * g;
      gSim = 0.433 * g + 0.567 * b;
      bSim = 0.475 * g + 0.525 * b;
      break;
    }
    default:
      return hex;
  }

  const toHex = (c: number) =>
    Math.round(Math.max(0, Math.min(255, c)))
      .toString(16)
      .padStart(2, '0');

  return `#${toHex(rSim)}${toHex(gSim)}${toHex(bSim)}`;
}

export function applyColorBlindSimulation(
  colors: ThemeColors,
  mode: 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia',
): ThemeColors {
  if (mode === 'none') return colors;

  return {
    background: {
      primary: simulateColorBlindness(colors.background.primary, mode),
      secondary: simulateColorBlindness(colors.background.secondary, mode),
    },
    text: {
      primary: simulateColorBlindness(colors.text.primary, mode),
      secondary: simulateColorBlindness(colors.text.secondary, mode),
      accent: simulateColorBlindness(colors.text.accent, mode),
    },
    border: simulateColorBlindness(colors.border, mode),
    highlight: simulateColorBlindness(colors.highlight, mode),
    semantic: {
      error: simulateColorBlindness(colors.semantic.error, mode),
      warning: simulateColorBlindness(colors.semantic.warning, mode),
      success: simulateColorBlindness(colors.semantic.success, mode),
      info: simulateColorBlindness(colors.semantic.info, mode),
    },
  };
}
