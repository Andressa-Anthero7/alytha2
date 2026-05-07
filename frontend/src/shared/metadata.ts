import { useEffect } from 'react';

export interface DocumentMetadata {
  title: string;
  description: string;
  canonicalUrl?: string;
  imageUrl?: string;
  type?: 'website' | 'article';
  robots?: string;
}

const managedAttribute = 'data-alytha-managed';

const getOrCreateMeta = (attribute: 'name' | 'property', key: string) => {
  const selector = `meta[${attribute}="${key}"]`;
  const existing = document.head.querySelector<HTMLMetaElement>(selector);
  if (existing) {
    return existing;
  }

  const element = document.createElement('meta');
  element.setAttribute(attribute, key);
  element.setAttribute(managedAttribute, 'true');
  document.head.appendChild(element);
  return element;
};

const setMetaContent = (attribute: 'name' | 'property', key: string, content?: string) => {
  if (!content) {
    return;
  }

  getOrCreateMeta(attribute, key).setAttribute('content', content);
};

const setCanonicalUrl = (canonicalUrl?: string) => {
  if (!canonicalUrl) {
    return;
  }

  let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!canonical) {
    canonical = document.createElement('link');
    canonical.setAttribute('rel', 'canonical');
    canonical.setAttribute(managedAttribute, 'true');
    document.head.appendChild(canonical);
  }
  canonical.setAttribute('href', canonicalUrl);
};

export function useDocumentMetadata(metadata: DocumentMetadata) {
  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }

    document.title = metadata.title;
    setCanonicalUrl(metadata.canonicalUrl);

    setMetaContent('name', 'description', metadata.description);
    setMetaContent('name', 'robots', metadata.robots || 'index, follow');
    setMetaContent('name', 'twitter:card', metadata.imageUrl ? 'summary_large_image' : 'summary');
    setMetaContent('name', 'twitter:title', metadata.title);
    setMetaContent('name', 'twitter:description', metadata.description);
    setMetaContent('name', 'twitter:image', metadata.imageUrl);

    setMetaContent('property', 'og:locale', 'pt_BR');
    setMetaContent('property', 'og:site_name', 'Alytha');
    setMetaContent('property', 'og:type', metadata.type || 'website');
    setMetaContent('property', 'og:title', metadata.title);
    setMetaContent('property', 'og:description', metadata.description);
    setMetaContent('property', 'og:url', metadata.canonicalUrl);
    setMetaContent('property', 'og:image', metadata.imageUrl);
  }, [metadata.canonicalUrl, metadata.description, metadata.imageUrl, metadata.robots, metadata.title, metadata.type]);
}
