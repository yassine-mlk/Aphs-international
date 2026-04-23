import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render } from '@testing-library/react';
import SEOHead from '@/components/SEOHead';

// Mock window object
Object.defineProperty(window, 'location', {
  value: {
    href: 'https://example.com/test'
  },
  writable: true
});

describe('SEOHead', () => {
  beforeEach(() => {
    // Clean up document head before each test
    document.head.innerHTML = '';
  });

  it('sets default meta tags', () => {
    render(<SEOHead />);
    
    expect(document.title).toBe('APS International - Plateforme de gestion de projets BTP');
    
    const description = document.querySelector('meta[name="description"]');
    expect(description?.getAttribute('content')).toContain('Solution SaaS complète');
  });

  it('updates meta tags with custom props', () => {
    render(<SEOHead 
      title="Custom Title"
      description="Custom description"
      keywords="custom, keywords"
    />);
    
    expect(document.title).toBe('Custom Title');
    
    const description = document.querySelector('meta[name="description"]');
    expect(description?.getAttribute('content')).toBe('Custom description');
    
    const keywords = document.querySelector('meta[name="keywords"]');
    expect(keywords?.getAttribute('content')).toBe('custom, keywords');
  });

  it('adds Open Graph tags', () => {
    render(<SEOHead />);
    
    const ogTitle = document.querySelector('meta[property="og:title"]');
    expect(ogTitle?.getAttribute('content')).toBe('APS International - Plateforme de gestion de projets BTP');
    
    const ogType = document.querySelector('meta[property="og:type"]');
    expect(ogType?.getAttribute('content')).toBe('website');
  });

  it('adds Twitter Card tags', () => {
    render(<SEOHead />);
    
    const twitterCard = document.querySelector('meta[name="twitter:card"]');
    expect(twitterCard?.getAttribute('content')).toBe('summary_large_image');
  });

  it('adds structured data', () => {
    render(<SEOHead />);
    
    const structuredData = document.querySelector('#structured-data');
    expect(structuredData).toBeInTheDocument();
    
    const data = JSON.parse(structuredData?.textContent || '{}');
    expect(data['@context']).toBe('https://schema.org');
    expect(data['@type']).toBe('Organization');
    expect(data.name).toBe('APS International');
  });

  it('sets canonical link', () => {
    render(<SEOHead />);
    
    const canonical = document.querySelector('link[rel="canonical"]');
    expect(canonical?.getAttribute('href')).toBe('https://example.com/test');
  });
});
