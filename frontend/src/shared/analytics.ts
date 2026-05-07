const googleAnalyticsId = import.meta.env.VITE_GOOGLE_ANALYTICS_ID?.trim();

type GtagArguments =
  | ['js', Date]
  | ['config', string, Record<string, unknown>?]
  | ['event', string, Record<string, unknown>?];

declare global {
  interface Window {
    dataLayer?: GtagArguments[];
    gtag?: (...args: GtagArguments) => void;
  }
}

let initializedAnalyticsId: string | null = null;
let lastTrackedPageLocation: string | null = null;
let skippedInitialStaticPageView = false;

function canUseGoogleAnalytics() {
  return Boolean(googleAnalyticsId) && typeof window !== 'undefined' && typeof document !== 'undefined';
}

function hasGoogleAnalyticsScript() {
  if (!googleAnalyticsId || typeof document === 'undefined') {
    return false;
  }

  const encodedId = encodeURIComponent(googleAnalyticsId);
  return Boolean(
    document.querySelector(
      `script[src*="googletagmanager.com/gtag/js?id=${googleAnalyticsId}"], script[src*="googletagmanager.com/gtag/js?id=${encodedId}"]`,
    ),
  );
}

export function initializeGoogleAnalytics() {
  if (!canUseGoogleAnalytics() || initializedAnalyticsId === googleAnalyticsId) {
    return;
  }

  window.dataLayer = window.dataLayer || [];
  window.gtag =
    window.gtag ||
    function gtag(...args: GtagArguments) {
      window.dataLayer?.push(args);
    };

  const scriptAlreadyPresent = hasGoogleAnalyticsScript();

  if (!scriptAlreadyPresent) {
    window.gtag('js', new Date());
    window.gtag('config', googleAnalyticsId, { send_page_view: false });

    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(googleAnalyticsId)}`;
    document.head.appendChild(script);
  }

  initializedAnalyticsId = googleAnalyticsId;
}

export function trackGoogleAnalyticsPageView(path: string) {
  if (!canUseGoogleAnalytics()) {
    return;
  }

  initializeGoogleAnalytics();

  const pageLocation = new URL(path, window.location.origin).toString();

  if (pageLocation === lastTrackedPageLocation) {
    return;
  }

  if (hasGoogleAnalyticsScript() && !skippedInitialStaticPageView) {
    skippedInitialStaticPageView = true;
    lastTrackedPageLocation = pageLocation;
    return;
  }

  const pageReferrer = lastTrackedPageLocation || document.referrer;
  const pageParameters: Record<string, string> = {
    send_to: googleAnalyticsId,
    page_location: pageLocation,
    page_path: `${window.location.pathname}${window.location.search}${window.location.hash}`,
    page_title: document.title,
  };

  if (pageReferrer) {
    pageParameters.page_referrer = pageReferrer;
  }

  window.gtag?.('event', 'page_view', pageParameters);
  lastTrackedPageLocation = pageLocation;
}
