import { usePortfolio } from '../context/PortfolioContext';
import { portfolioSectionAnchorId } from '../data/portfolioSections';

export function SocialLinksSection() {
  const { content, sections } = usePortfolio();
  const section = sections.find((item) => item.sectionKey === 'socials' && item.isEnabled && item.isPublic);
  if (!section) return null;

  return (
    <section id={portfolioSectionAnchorId(section.sectionKey)} className="relative w-full border-t border-white/5 px-5 py-16 text-gray-100 md:px-12 lg:px-20">
      <div className="mx-auto max-w-6xl">
        <h2 className="text-center text-3xl font-black uppercase tracking-tight text-white">Connect</h2>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {content.socials.filter((social) => social.href).map((social) => (
            <a
              key={social.id}
              href={social.href}
              target="_blank"
              rel="noopener noreferrer"
              className="glass-chip rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wider text-gray-300 transition-all hover:scale-105 hover:text-white"
            >
              {social.label}
            </a>
          ))}
          {!content.socials.some((social) => social.href) && (
            <p className="text-sm text-gray-400">No public social links have been added.</p>
          )}
        </div>
      </div>
    </section>
  );
}
