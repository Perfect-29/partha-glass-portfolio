import React from 'react';
import { usePortfolio } from '../context/PortfolioContext';
import { PORTFOLIO_BRAND_NAME, PORTFOLIO_TAGLINE } from '../data/portfolioData';
import { portfolioSectionAnchorId } from '../data/portfolioSections';

const CURRENT_YEAR = new Date().getFullYear();

export const Footer: React.FC = () => {
  const { sections } = usePortfolio();
  const navSections = [...sections]
    .filter((section) => section.isEnabled && section.isPublic && section.showInNavigation)
    .sort((left, right) => left.displayOrder - right.displayOrder);
  const homeAnchor = navSections.find((section) => section.sectionKey === 'home');
  const brandAnchor = homeAnchor ?? navSections[0];
  return (
    <footer className="glass-bar w-full text-white py-14 px-6 md:px-16 border-t border-white/5">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="flex flex-col items-center md:items-start gap-1">
          <a href={brandAnchor ? `#${portfolioSectionAnchorId(brandAnchor.sectionKey)}` : '#'} className="text-2xl font-black tracking-tight uppercase">
            <span className="text-red-500 drop-shadow-[0_0_10px_rgba(220,38,38,0.8)]">{PORTFOLIO_BRAND_NAME}</span>
          </a>
          <p className="text-[11px] text-gray-400 font-mono tracking-widest uppercase">
            {PORTFOLIO_TAGLINE}
          </p>
        </div>

        <div className="flex flex-col items-center md:items-end gap-3">
          <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-gray-400 uppercase tracking-widest font-bold">
            {navSections.map((section) => (
              <a key={section.id} href={`#${portfolioSectionAnchorId(section.sectionKey)}`} className="hover:text-red-500 transition-colors">
                {section.sectionKey === 'home' ? 'Home' : section.sectionName}
              </a>
            ))}
          </div>
          <div className="text-[11px] text-gray-500 font-mono uppercase tracking-wider">
            &copy; {CURRENT_YEAR} {PORTFOLIO_BRAND_NAME}. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
};
