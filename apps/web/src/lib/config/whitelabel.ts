export interface WhiteLabelColors {
  primary: string;
  primaryHover: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  textMuted: string;
  border: string;
  success: string;
  warning: string;
  danger: string;
  info: string;
}

export interface WhiteLabelLogo {
  src: string;
  alt: string;
  width?: string;
  height?: string;
}

export interface WhiteLabelConfig {
  tenantId: string;
  tenantName: string;
  logo?: WhiteLabelLogo;
  logoLight?: WhiteLabelLogo;
  logoDark?: WhiteLabelLogo;
  favicon?: string;
  colors?: Partial<WhiteLabelColors>;
  customCss?: string;
  customFonts?: string[];
}

export const DEFAULT_WHITE_LABEL: WhiteLabelConfig = {
  tenantId: 'default',
  tenantName: 'The DMZ',
  colors: {
    primary: '#0d6efd',
    primaryHover: '#0b5ed7',
    secondary: '#6c757d',
    accent: '#0d6efd',
    background: '#ffffff',
    surface: '#f8f9fa',
    text: '#212529',
    textMuted: '#6c757d',
    border: '#dee2e6',
    success: '#198754',
    warning: '#ffc107',
    danger: '#dc3545',
    info: '#0dcaf0',
  },
};

export const WHITE_LABEL_STORAGE_KEY = 'dmz-whitelabel-config';

export function validateContrastRatio(color1: string, color2: string): number {
  const getLuminance = (hex: string): number => {
    const rgb = parseInt(hex.replace('#', ''), 16);
    const r = ((rgb >> 16) & 0xff) / 255;
    const g = ((rgb >> 8) & 0xff) / 255;
    const b = (rgb & 0xff) / 255;

    const toLinear = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));

    return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
  };

  const l1 = getLuminance(color1);
  const l2 = getLuminance(color2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);

  return (lighter + 0.05) / (darker + 0.05);
}

export function meetsWCAGAA(ratio: number, isLargeText: boolean = false): boolean {
  return isLargeText ? ratio >= 3 : ratio >= 4.5;
}

export function meetsWCAGAAA(ratio: number, isLargeText: boolean = false): boolean {
  return isLargeText ? ratio >= 4.5 : ratio >= 7;
}

export interface ContrastValidationResult {
  passesAA: boolean;
  passesAAA: boolean;
  ratio: number;
}

export function validateBrandingContrast(
  background: string,
  text: string,
  isLargeText: boolean = false,
): ContrastValidationResult {
  const ratio = validateContrastRatio(background, text);
  return {
    passesAA: meetsWCAGAA(ratio, isLargeText),
    passesAAA: meetsWCAGAAA(ratio, isLargeText),
    ratio,
  };
}

export function applyWhiteLabelConfig(config: WhiteLabelConfig): void {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;

  if (config.colors) {
    if (config.colors.primary) {
      root.style.setProperty('--whitelabel-primary', config.colors.primary);
    }
    if (config.colors.primaryHover) {
      root.style.setProperty('--whitelabel-primary-hover', config.colors.primaryHover);
    }
    if (config.colors.accent) {
      root.style.setProperty('--whitelabel-accent', config.colors.accent);
    }
    if (config.colors.background) {
      root.style.setProperty('--whitelabel-background', config.colors.background);
    }
    if (config.colors.surface) {
      root.style.setProperty('--whitelabel-surface', config.colors.surface);
    }
    if (config.colors.text) {
      root.style.setProperty('--whitelabel-text', config.colors.text);
    }
    if (config.colors.textMuted) {
      root.style.setProperty('--whitelabel-text-muted', config.colors.textMuted);
    }
    if (config.colors.border) {
      root.style.setProperty('--whitelabel-border', config.colors.border);
    }
    if (config.colors.success) {
      root.style.setProperty('--whitelabel-success', config.colors.success);
    }
    if (config.colors.warning) {
      root.style.setProperty('--whitelabel-warning', config.colors.warning);
    }
    if (config.colors.danger) {
      root.style.setProperty('--whitelabel-danger', config.colors.danger);
    }
    if (config.colors.info) {
      root.style.setProperty('--whitelabel-info', config.colors.info);
    }
  }

  root.dataset['whitelabelTenant'] = config.tenantId;
}

export function clearWhiteLabelConfig(): void {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  const props = [
    '--whitelabel-primary',
    '--whitelabel-primary-hover',
    '--whitelabel-accent',
    '--whitelabel-background',
    '--whitelabel-surface',
    '--whitelabel-text',
    '--whitelabel-text-muted',
    '--whitelabel-border',
    '--whitelabel-success',
    '--whitelabel-warning',
    '--whitelabel-danger',
    '--whitelabel-info',
  ];

  props.forEach((prop) => root.style.removeProperty(prop));
  delete root.dataset['whitelabelTenant'];
}
