const VIEWPORT_META_SELECTOR = 'meta[name="viewport"]';

export const LOCKED_MOBILE_VIEWPORT_CONTENT =
  'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover, shrink-to-fit=no';

const normalizeViewportTokens = (content: string) => {
  const tokenMap = new Map<string, string>();
  content
    .split(',')
    .map((token) => token.trim())
    .filter(Boolean)
    .forEach((token) => {
      const [rawKey] = token.split('=');
      const key = rawKey?.trim().toLowerCase();
      if (!key) return;
      tokenMap.set(key, token);
    });
  return tokenMap;
};

export const getViewportMetaTag = () =>
  document.querySelector<HTMLMetaElement>(VIEWPORT_META_SELECTOR);

export const withTemporaryViewportMaximumScale = (maximumScale: number) => {
  const viewportMeta = getViewportMetaTag();
  if (!viewportMeta) return;

  const originalContent = viewportMeta.content;
  const tokens = normalizeViewportTokens(originalContent);
  tokens.set('maximum-scale', `maximum-scale=${maximumScale}`);

  viewportMeta.content = Array.from(tokens.values()).join(', ');
  requestAnimationFrame(() => {
    viewportMeta.content = originalContent || LOCKED_MOBILE_VIEWPORT_CONTENT;
  });
};
