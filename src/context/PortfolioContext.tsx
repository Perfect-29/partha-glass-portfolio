import { createContext, useContext, useEffect, useState } from 'react';
import { DEFAULT_PORTFOLIO_CONTENT } from '../data/portfolioData';
import { DEFAULT_SYSTEM_SECTIONS } from '../data/portfolioSections';
import type { CustomSectionContentRecord, PortfolioSectionConfig } from '../data/portfolioSections';
import type { PortfolioContent } from '../data/portfolioData';
import { isPortfolioContent } from '../lib/portfolioValidation';
import { getPublishedPortfolio } from '../lib/supabasePortfolioRepository';
import { isSupabaseConfigured, supabase, supabaseConfigurationError } from '../lib/supabase';

interface PortfolioContextValue {
  content: PortfolioContent;
  sections: PortfolioSectionConfig[];
  customSectionContent: CustomSectionContentRecord[];
  loading: boolean;
  syncError: string | null;
  isPreview: boolean;
}

const PortfolioContext = createContext<PortfolioContextValue | null>(null);

function readPreview(): PortfolioContent | null {
  if (new URLSearchParams(window.location.search).get('portfolioPreview') !== '1') return null;
  try {
    const raw = window.localStorage.getItem('portfolio-admin-preview');
    if (!raw) return null;
    const value: unknown = JSON.parse(raw);
    return isPortfolioContent(value) ? value : null;
  } catch (error) {
    console.error('Unable to load the local portfolio preview.', error);
    return null;
  }
}

export function PortfolioProvider({ children }: { children: React.ReactNode }) {
  const [content, setContent] = useState<PortfolioContent>(DEFAULT_PORTFOLIO_CONTENT);
  const [sections, setSections] = useState<PortfolioSectionConfig[]>(DEFAULT_SYSTEM_SECTIONS);
  const [customSectionContent, setCustomSectionContent] = useState<CustomSectionContentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [preview] = useState(readPreview);

  useEffect(() => {
    if (preview) {
      setLoading(false);
      return;
    }
    if (!isSupabaseConfigured) {
      setSyncError(supabaseConfigurationError ?? 'Supabase is not configured. Showing the built-in portfolio content.');
      setLoading(false);
      return;
    }

    const client = supabase;
    if (!client) {
      setSyncError(supabaseConfigurationError ?? 'Supabase is not configured. Showing the built-in portfolio content.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setSyncError(null);
    let disposed = false;
    let refreshTimer: number | undefined;

    const refreshPortfolio = async (initial: boolean) => {
      try {
        const {
          content: publishedContent,
          missingRecords,
          sections: publishedSections,
          customSectionContent: publishedCustomContent,
        } = await getPublishedPortfolio();
        if (disposed) return;
        if (!isPortfolioContent(publishedContent)) {
          throw new Error('Published Supabase portfolio data failed schema validation.');
        }
        setContent(publishedContent);
        setSections(publishedSections);
        setCustomSectionContent(publishedCustomContent);
        setSyncError(
          missingRecords.length
            ? `No published Supabase records found for: ${missingRecords.join(', ')}. Existing portfolio content remains as fallback for empty sections.`
            : null,
        );
      } catch (error: unknown) {
        if (disposed) return;
        console.error('Unable to load the published Supabase portfolio.', error);
        setSyncError(initial
          ? 'Supabase portfolio data is unavailable. Showing the existing portfolio content.'
          : 'Unable to refresh published content from Supabase. The last successfully loaded content remains visible.');
      } finally {
        if (initial && !disposed) setLoading(false);
      }
    };

    const scheduleRefresh = () => {
      if (refreshTimer !== undefined) window.clearTimeout(refreshTimer);
      refreshTimer = window.setTimeout(() => {
        refreshTimer = undefined;
        if (!disposed) void refreshPortfolio(false);
      }, 150);
    };
    const channel = client.channel('public-portfolio-changes');
    [
      'profile',
      'projects',
      'skills',
      'education',
      'experience',
      'achievements',
      'certifications',
      'internships',
      'workshops',
      'coding_profiles',
      'publications',
      'resume',
      'social_links',
      'site_settings',
      'portfolio_sections',
      'custom_section_content',
    ].forEach((table) => {
      channel.on('postgres_changes', { event: '*', schema: 'public', table }, scheduleRefresh);
    });
    channel.subscribe((status, error) => {
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        console.error('Public Supabase Realtime subscription failed.', error);
        if (!disposed) setSyncError('Live portfolio updates are unavailable. Enable Realtime for the portfolio tables in Supabase.');
      }
    });
    void refreshPortfolio(true);

    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') scheduleRefresh();
    };
    window.addEventListener('focus', refreshWhenVisible);
    document.addEventListener('visibilitychange', refreshWhenVisible);

    return () => {
      disposed = true;
      if (refreshTimer !== undefined) window.clearTimeout(refreshTimer);
      window.removeEventListener('focus', refreshWhenVisible);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
      void client.removeChannel(channel);
    };
  }, [preview]);

  return (
    <PortfolioContext.Provider
      value={{
        content: preview ?? content,
        sections,
        customSectionContent,
        loading,
        syncError,
        isPreview: Boolean(preview),
      }}
    >
      {children}
    </PortfolioContext.Provider>
  );
}

export function usePortfolio() {
  const context = useContext(PortfolioContext);
  if (!context) throw new Error('usePortfolio must be used within PortfolioProvider.');
  return context;
}
