const DEFAULT_APP_NAME = "My Reading Tracker";

const configuredAppName = import.meta.env.VITE_APP_NAME?.trim();

export const APP_NAME = configuredAppName || DEFAULT_APP_NAME;

export const APP_DESCRIPTION = `${APP_NAME} helps families keep track of reading time, books, and growing readers.`;

export function applyDocumentBranding() {
  document.title = APP_NAME;

  const description = document.querySelector<HTMLMetaElement>(
    'meta[name="description"]',
  );
  description?.setAttribute("content", APP_DESCRIPTION);
}
