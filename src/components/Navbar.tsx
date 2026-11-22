import React, { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';
import { usePortfolio } from '../context/PortfolioContext';
import { PORTFOLIO_BRAND_NAME } from '../data/portfolioData';
import { portfolioSectionAnchorId } from '../data/portfolioSections';

export const Navbar: React.FC = () => {
  const { sections } = usePortfolio();
  const navItems = [...sections]
    .filter((section) => section.isEnabled && section.isPublic && section.showInNavigation)
    .sort((left, right) => left.displayOrder - right.displayOrder);
  const homeSection = navItems.find((section) => section.sectionKey === 'home');
  const brandAnchor = homeSection ?? navItems[0];
  const contactSection = sections.find((section) => section.sectionKey === 'contact' && section.isEnabled && section.isPublic);
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav className="fixed top-0 left-0 w-full z-50 px-3 md:px-6 pt-3">
      <div
        className={`glass max-w-7xl mx-auto rounded-2xl px-5 md:px-8 flex items-center justify-between transition-all duration-300 ${
          scrolled ? 'py-2.5 !bg-[#111113]/80' : 'py-3.5'
        }`}
      >
        <a href={brandAnchor ? `#${portfolioSectionAnchorId(brandAnchor.sectionKey)}` : '#'} aria-label={`${PORTFOLIO_BRAND_NAME} home`} className="shrink-0 whitespace-nowrap text-xs font-black tracking-tight uppercase group sm:text-sm lg:text-base">
          <span className="text-red-500 drop-shadow-[0_0_10px_rgba(220,38,38,0.8)]">{PORTFOLIO_BRAND_NAME}</span>
        </a>

        <div className="hidden max-w-[72%] flex-wrap items-center justify-center gap-x-2 gap-y-1 xl:flex 2xl:gap-x-3">
          {navItems.map((item) => (
            <a
              key={item.id}
              href={`#${portfolioSectionAnchorId(item.sectionKey)}`}
              className="relative whitespace-nowrap text-[10px] font-bold text-gray-400 uppercase tracking-[0.1em] transition-colors duration-300 hover:text-white group 2xl:text-xs"
            >
              {item.sectionKey === 'home' ? 'Home' : item.sectionName}
              <span className="absolute -bottom-2 left-0 w-0 h-[2px] bg-red-600 transition-all duration-300 ease-out group-hover:w-full shadow-[0_0_8px_rgba(220,38,38,0.8)]" />
            </a>
          ))}
        </div>

        {contactSection && <div className="hidden xl:block">
          <a
            href={`#${portfolioSectionAnchorId(contactSection.sectionKey)}`}
            className="glass-red inline-block px-5 py-2 rounded-full text-white text-xs font-bold uppercase tracking-wider"
          >
            Let's Talk
          </a>
        </div>}
        <button
          type="button"
          aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={menuOpen}
          aria-controls="mobile-navigation"
          onClick={() => setMenuOpen((open) => !open)}
          className="glass-chip grid h-10 w-10 place-items-center rounded-full text-white xl:hidden"
        >
          {menuOpen ? <X aria-hidden="true" size={20} /> : <Menu aria-hidden="true" size={20} />}
        </button>
      </div>
      {menuOpen && (
        <div id="mobile-navigation" className="glass mx-auto mt-2 max-w-7xl rounded-2xl p-3 xl:hidden">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {navItems.map((item) => (
              <a
                key={item.id}
                href={`#${portfolioSectionAnchorId(item.sectionKey)}`}
                onClick={() => setMenuOpen(false)}
                className="rounded-xl px-4 py-3 text-xs font-bold uppercase tracking-wider text-gray-200 transition-colors hover:bg-red-950/60 hover:text-white"
              >
                {item.sectionKey === 'home' ? 'Home' : item.sectionName}
              </a>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
};
