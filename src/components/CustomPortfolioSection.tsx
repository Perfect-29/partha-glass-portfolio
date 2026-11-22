import { ExternalLink } from 'lucide-react';
import type { CustomSectionContentRecord, CustomSectionType, PortfolioSectionConfig } from '../data/portfolioSections';
import { isValidCustomSectionContent, portfolioSectionAnchorId } from '../data/portfolioSections';

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function readString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function CustomContent({ type, content }: { type: CustomSectionType; content: Record<string, unknown> }) {
  switch (type) {
    case 'text': {
      const paragraphs = Array.isArray(content.paragraphs) ? content.paragraphs : [];
      const bullets = Array.isArray(content.bullets) ? content.bullets : [];
      return (
        <div className="space-y-4">
          {readString(content.heading) && <h3 className="text-xl font-bold text-white">{readString(content.heading)}</h3>}
          {readString(content.text) && <p className="whitespace-pre-line leading-relaxed text-gray-300">{readString(content.text)}</p>}
          {paragraphs.map((paragraph, index) => (
            <p key={`paragraph-${index}`} className="whitespace-pre-line leading-relaxed text-gray-300">{readString(paragraph)}</p>
          ))}
          {bullets.length > 0 && (
            <ul className="list-disc space-y-2 pl-6 text-gray-300">
              {bullets.map((bullet, index) => <li key={`bullet-${index}`}>{readString(bullet)}</li>)}
            </ul>
          )}
        </div>
      );
    }
    case 'gallery': {
      const images = Array.isArray(content.images) ? content.images.filter(isRecord) : [];
      return (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {images.map((image, index) => (
            <figure key={`image-${index}`} className="glass-chip overflow-hidden rounded-2xl">
              <img src={readString(image.url)} alt={readString(image.alt)} loading="lazy" className="aspect-video w-full object-cover" />
              {readString(image.caption) && <figcaption className="p-3 text-sm text-gray-300">{readString(image.caption)}</figcaption>}
            </figure>
          ))}
        </div>
      );
    }
    case 'cards': {
      const cards = Array.isArray(content.cards) ? content.cards.filter(isRecord) : [];
      return (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {cards.map((card, index) => (
            <article key={`card-${index}`} className="glass glass-grid-card overflow-hidden rounded-2xl">
              {readString(card.imageUrl) && <img src={readString(card.imageUrl)} alt="" loading="lazy" className="aspect-video w-full object-cover" />}
              <div className="p-5">
                <h3 className="font-bold text-white">{readString(card.title)}</h3>
                <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-gray-300">{readString(card.description)}</p>
                {readString(card.linkUrl) && <a href={readString(card.linkUrl)} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-red-200 hover:text-white">Learn more <ExternalLink size={13} /></a>}
              </div>
            </article>
          ))}
        </div>
      );
    }
    case 'links': {
      const links = Array.isArray(content.links) ? content.links.filter(isRecord) : [];
      return (
        <ul className="grid gap-3 md:grid-cols-2">
          {links.map((link, index) => (
            <li key={`link-${index}`} className="glass-chip rounded-2xl p-4">
              <a href={readString(link.url)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 font-bold text-white hover:text-red-200">
                {readString(link.label)} <ExternalLink size={14} />
              </a>
              {readString(link.description) && <p className="mt-2 text-sm text-gray-400">{readString(link.description)}</p>}
            </li>
          ))}
        </ul>
      );
    }
    case 'blocks': {
      const blocks = Array.isArray(content.blocks) ? content.blocks.filter(isRecord) : [];
      return (
        <div className="space-y-5">
          {blocks.map((block, index) => {
            switch (block.type) {
              case 'heading':
                return <h3 key={`block-${index}`} className="text-xl font-bold text-white">{readString(block.text)}</h3>;
              case 'text':
                return <p key={`block-${index}`} className="whitespace-pre-line leading-relaxed text-gray-300">{readString(block.text)}</p>;
              case 'image':
                return <img key={`block-${index}`} src={readString(block.url)} alt={readString(block.alt)} loading="lazy" className="max-h-[32rem] w-full rounded-2xl object-cover" />;
              case 'card':
                return (
                  <article key={`block-${index}`} className="glass glass-panel-card rounded-2xl p-5">
                    <h3 className="font-bold text-white">{readString(block.title)}</h3>
                    <p className="mt-2 whitespace-pre-line text-sm text-gray-300">{readString(block.description)}</p>
                  </article>
                );
              case 'link':
                return <a key={`block-${index}`} href={readString(block.url)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 font-bold text-red-200 hover:text-white">{readString(block.label)} <ExternalLink size={14} /></a>;
              default:
                return null;
            }
          })}
        </div>
      );
    }
  }
}

export function CustomPortfolioSection({
  section,
  records,
}: {
  section: PortfolioSectionConfig;
  records: CustomSectionContentRecord[];
}) {
  if (
    section.isSystem ||
    !section.isEnabled ||
    !section.isPublic ||
    !['text', 'gallery', 'cards', 'links', 'blocks'].includes(section.sectionType)
  ) return null;

  const sectionType = section.sectionType as CustomSectionType;
  const publishedRecords = records
    .filter((record) => record.sectionId === section.id && record.isPublished && isValidCustomSectionContent(sectionType, record.content))
    .sort((left, right) => left.displayOrder - right.displayOrder);

  return (
    <section id={portfolioSectionAnchorId(section.sectionKey)} className="relative w-full border-t border-white/5 px-5 py-20 text-gray-100 md:px-12 lg:px-20">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 text-center">
          <h2 className="text-4xl font-black uppercase tracking-tight text-white sm:text-5xl">{section.sectionName}</h2>
          {section.description && <p className="mx-auto mt-3 max-w-3xl text-sm leading-relaxed text-gray-400">{section.description}</p>}
          <div className="mx-auto mt-3 h-1.5 w-20 rounded-full bg-[#a31515]" />
        </div>
        {publishedRecords.length ? (
          <div className="space-y-5">
            {publishedRecords.map((record) => {
              if (!isRecord(record.content)) return null;
              return (
                <article key={record.id} className="glass glass-panel-card rounded-3xl p-5 sm:p-8">
                  <CustomContent type={sectionType} content={record.content} />
                </article>
              );
            })}
          </div>
        ) : (
          <p className="glass rounded-2xl p-6 text-center text-gray-400">No published content in this section yet.</p>
        )}
      </div>
    </section>
  );
}
