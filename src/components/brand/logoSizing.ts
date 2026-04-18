export const LOGO_HEIGHT_TOKENS = {
  MAIN_MOBILE: 49,
  MAIN_DESKTOP: 44,
  SIGN_IN_MOBILE: 60,
  SIGN_IN_DESKTOP: 80,
  LANDING_NAV: 52,
  LANDING_FOOTER: 32,
} as const;

export const APP_BAR_HEIGHT_TOKENS = {
  MAIN_MOBILE: LOGO_HEIGHT_TOKENS.MAIN_MOBILE + 6,
  MAIN_DESKTOP: LOGO_HEIGHT_TOKENS.MAIN_DESKTOP + 14,
} as const;

export const MAIN_MOBILE_LOGO_HEIGHT = LOGO_HEIGHT_TOKENS.MAIN_MOBILE;
export const MAIN_DESKTOP_LOGO_HEIGHT = LOGO_HEIGHT_TOKENS.MAIN_DESKTOP;
export const SIGN_IN_MOBILE_LOGO_HEIGHT = LOGO_HEIGHT_TOKENS.SIGN_IN_MOBILE;
export const SIGN_IN_DESKTOP_LOGO_HEIGHT = LOGO_HEIGHT_TOKENS.SIGN_IN_DESKTOP;
export const LANDING_NAV_LOGO_HEIGHT = LOGO_HEIGHT_TOKENS.LANDING_NAV;
export const LANDING_FOOTER_LOGO_HEIGHT = LOGO_HEIGHT_TOKENS.LANDING_FOOTER;
export const MAIN_MOBILE_HEADER_HEIGHT = APP_BAR_HEIGHT_TOKENS.MAIN_MOBILE;
export const MAIN_DESKTOP_APP_BAR_HEIGHT = APP_BAR_HEIGHT_TOKENS.MAIN_DESKTOP;

// Backward-compatible aliases
export const DASHBOARD_MOBILE_LOGO_HEIGHT = MAIN_MOBILE_LOGO_HEIGHT;
export const DASHBOARD_DESKTOP_LOGO_HEIGHT = MAIN_DESKTOP_LOGO_HEIGHT;
export const AUTH_MOBILE_LOGO_HEIGHT = SIGN_IN_MOBILE_LOGO_HEIGHT;
export const AUTH_DESKTOP_LOGO_HEIGHT = SIGN_IN_DESKTOP_LOGO_HEIGHT;

export type LogoRenderScheme = 'light' | 'dark';

/**
 * The dark logo file currently includes extra vertical alpha padding compared to the white variant.
 * We trim that padding at render time so size tokens control visible logo height consistently.
 */
const LOGO_RENDER_CONFIG = {
  light: {
    src: '/brand/logo-dark.webp',
    rawWidth: 600,
    rawHeight: 411,
    trimTop: 52,
    trimBottom: 52,
  },
  dark: {
    src: '/brand/logo-white.webp',
    rawWidth: 600,
    rawHeight: 403,
    trimTop: 0,
    trimBottom: 0,
  },
} as const satisfies Record<LogoRenderScheme, {
  src: string;
  rawWidth: number;
  rawHeight: number;
  trimTop: number;
  trimBottom: number;
}>;

export function getLogoRenderMetrics(scheme: LogoRenderScheme, visibleHeight: number) {
  const config = LOGO_RENDER_CONFIG[scheme];
  const visibleRawHeight = config.rawHeight - config.trimTop - config.trimBottom;
  const scale = config.rawHeight / visibleRawHeight;
  const renderedHeight = Math.round(visibleHeight * scale);
  const renderedWidth = Math.round((renderedHeight / config.rawHeight) * config.rawWidth);
  const offsetY = Math.round((config.trimTop / config.rawHeight) * renderedHeight);

  return {
    src: config.src,
    visibleHeight,
    renderedHeight,
    renderedWidth,
    offsetY,
  };
}
