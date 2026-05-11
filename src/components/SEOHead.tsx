import React from 'react';

interface SEOHeadProps {
  title?: string;
  description?: string;
  keywords?: string;
  ogImage?: string;
  ogUrl?: string;
  canonical?: string;
}

const SEOHead: React.FC<SEOHeadProps> = ({
  title = "APS Construction | Plateforme de Gestion de Projets de Construction",
  description = "APS Construction est la plateforme SaaS de référence pour la gestion de projets de construction. Suivi de chantier, gestion documentaire, visas et collaboration d'équipes en temps réel.",
  keywords = "aps construction, plateforme gestion projet construction, logiciel BTP, suivi de chantier, gestion documentaire BTP, APS, APS International",
  ogImage = "/aps-logo.svg",
  ogUrl = typeof window !== 'undefined' ? window.location.href : "https://www.aps-construction.com",
  canonical = typeof window !== 'undefined' ? window.location.href : "https://www.aps-construction.com"
}) => {
  React.useEffect(() => {
    // Update document title
    document.title = title;

    // Update or create meta description
    let metaDescription = document.querySelector('meta[name="description"]') as HTMLMetaElement;
    if (!metaDescription) {
      metaDescription = document.createElement('meta');
      metaDescription.name = 'description';
      document.head.appendChild(metaDescription);
    }
    metaDescription.content = description;

    // Update or create meta keywords
    let metaKeywords = document.querySelector('meta[name="keywords"]') as HTMLMetaElement;
    if (!metaKeywords) {
      metaKeywords = document.createElement('meta');
      metaKeywords.name = 'keywords';
      document.head.appendChild(metaKeywords);
    }
    metaKeywords.content = keywords;

    // Update or create canonical link
    let canonicalLink = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
    if (!canonicalLink) {
      canonicalLink = document.createElement('link');
      canonicalLink.rel = 'canonical';
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.href = canonical;

    // Update Open Graph tags
    const ogTags = [
      { property: 'og:title', content: title },
      { property: 'og:description', content: description },
      { property: 'og:image', content: ogImage },
      { property: 'og:url', content: ogUrl },
      { property: 'og:type', content: 'website' },
      { property: 'og:site_name', content: 'APS Construction' }
    ];

    ogTags.forEach(tag => {
      let metaTag = document.querySelector(`meta[property="${tag.property}"]`) as HTMLMetaElement;
      if (!metaTag) {
        metaTag = document.createElement('meta');
        metaTag.setAttribute('property', tag.property);
        document.head.appendChild(metaTag);
      }
      metaTag.content = tag.content;
    });

    // Update Twitter Card tags
    const twitterTags = [
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: title },
      { name: 'twitter:description', content: description },
      { name: 'twitter:image', content: ogImage }
    ];

    twitterTags.forEach(tag => {
      let metaTag = document.querySelector(`meta[name="${tag.name}"]`) as HTMLMetaElement;
      if (!metaTag) {
        metaTag = document.createElement('meta');
        metaTag.name = tag.name;
        document.head.appendChild(metaTag);
      }
      metaTag.content = tag.content;
    });

    // Add structured data (JSON-LD)
    const structuredData = {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      "name": "APS Construction",
      "applicationCategory": "BusinessApplication",
      "operatingSystem": "Web",
      "url": "https://www.aps-construction.com",
      "logo": "https://www.aps-construction.com/aps-logo.svg",
      "description": description,
      "publisher": {
        "@type": "Organization",
        "name": "APS International"
      },
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "EUR"
      }
    };

    let structuredDataScript = document.querySelector('#structured-data') as HTMLScriptElement;
    if (!structuredDataScript) {
      structuredDataScript = document.createElement('script');
      structuredDataScript.id = 'structured-data';
      structuredDataScript.type = 'application/ld+json';
      document.head.appendChild(structuredDataScript);
    }
    structuredDataScript.textContent = JSON.stringify(structuredData);

  }, [title, description, keywords, ogImage, ogUrl, canonical]);

  return null; // This component doesn't render anything visible
};

export default SEOHead;
