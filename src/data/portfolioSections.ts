export const CUSTOM_SECTION_TYPES = ['text', 'gallery', 'cards', 'links', 'blocks'] as const;

export type CustomSectionType = (typeof CUSTOM_SECTION_TYPES)[number];
export type PortfolioSectionType = 'system' | CustomSectionType;

export interface PortfolioSectionConfig {
  id: string;
  sectionKey: string;
  sectionName: string;
  description: string;
  sectionType: PortfolioSectionType;
  isEnabled: boolean;
  displayOrder: number;
  isSystem: boolean;
  isPublic: boolean;
  showInNavigation: boolean;
}

export interface CustomSectionContentRecord {
  id: string;
  sectionId: string;
  content: unknown;
  displayOrder: number;
  isPublished: boolean;
}

export const DEFAULT_SYSTEM_SECTIONS: PortfolioSectionConfig[] = [
  { id: 'system-home', sectionKey: 'home', sectionName: 'Home / Hero', description: 'Portfolio introduction and highlights.', sectionType: 'system', isEnabled: true, displayOrder: 1, isSystem: true, isPublic: true, showInNavigation: true },
  { id: 'system-about', sectionKey: 'about', sectionName: 'About & Profile', description: 'Profile information and biography.', sectionType: 'system', isEnabled: true, displayOrder: 2, isSystem: true, isPublic: true, showInNavigation: true },
  { id: 'system-projects', sectionKey: 'projects', sectionName: 'Projects', description: 'Selected projects and project details.', sectionType: 'system', isEnabled: true, displayOrder: 3, isSystem: true, isPublic: true, showInNavigation: true },
  { id: 'system-skills', sectionKey: 'skills', sectionName: 'Skills', description: 'Skills and technology stack.', sectionType: 'system', isEnabled: true, displayOrder: 4, isSystem: true, isPublic: true, showInNavigation: true },
  { id: 'system-experience', sectionKey: 'experience', sectionName: 'Experience', description: 'Experience timeline.', sectionType: 'system', isEnabled: true, displayOrder: 5, isSystem: true, isPublic: true, showInNavigation: true },
  { id: 'system-education', sectionKey: 'education', sectionName: 'Education', description: 'Education history.', sectionType: 'system', isEnabled: true, displayOrder: 6, isSystem: true, isPublic: true, showInNavigation: true },
  { id: 'system-certifications', sectionKey: 'certifications', sectionName: 'Certifications', description: 'Professional certificates.', sectionType: 'system', isEnabled: true, displayOrder: 7, isSystem: true, isPublic: true, showInNavigation: true },
  { id: 'system-achievements', sectionKey: 'achievements', sectionName: 'Achievements', description: 'Awards and achievements.', sectionType: 'system', isEnabled: true, displayOrder: 8, isSystem: true, isPublic: true, showInNavigation: true },
  { id: 'system-internships', sectionKey: 'internships', sectionName: 'Internships', description: 'Internship experience.', sectionType: 'system', isEnabled: true, displayOrder: 9, isSystem: true, isPublic: true, showInNavigation: true },
  { id: 'system-workshops', sectionKey: 'workshops', sectionName: 'Workshops & Events', description: 'Workshops and community events.', sectionType: 'system', isEnabled: true, displayOrder: 10, isSystem: true, isPublic: true, showInNavigation: true },
  { id: 'system-coding-profiles', sectionKey: 'codingProfiles', sectionName: 'Coding Profiles', description: 'Public developer profiles.', sectionType: 'system', isEnabled: true, displayOrder: 11, isSystem: true, isPublic: true, showInNavigation: true },
  { id: 'system-publications', sectionKey: 'publications', sectionName: 'Publications', description: 'Research and publications.', sectionType: 'system', isEnabled: true, displayOrder: 12, isSystem: true, isPublic: true, showInNavigation: true },
  { id: 'system-resume', sectionKey: 'resume', sectionName: 'Resume / CV', description: 'Published resume files.', sectionType: 'system', isEnabled: true, displayOrder: 13, isSystem: true, isPublic: true, showInNavigation: true },
  { id: 'system-fire-effects', sectionKey: 'fireEffects', sectionName: 'Fire Effects Studio', description: 'Admin settings for the public visual effect.', sectionType: 'system', isEnabled: true, displayOrder: 14, isSystem: true, isPublic: false, showInNavigation: false },
  { id: 'system-contact', sectionKey: 'contact', sectionName: 'Contact Settings', description: 'Public contact information and form.', sectionType: 'system', isEnabled: true, displayOrder: 15, isSystem: true, isPublic: true, showInNavigation: true },
  { id: 'system-socials', sectionKey: 'socials', sectionName: 'Footer Social Links', description: 'Published social profile links.', sectionType: 'system', isEnabled: true, displayOrder: 16, isSystem: true, isPublic: true, showInNavigation: true },
  { id: 'system-messages', sectionKey: 'messages', sectionName: 'Messages / Inquiries', description: 'Private admin inbox.', sectionType: 'system', isEnabled: true, displayOrder: 17, isSystem: true, isPublic: false, showInNavigation: false },
];

export function isCustomSectionType(value: unknown): value is CustomSectionType {
  return CUSTOM_SECTION_TYPES.some((type) => type === value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isHttpUrl(value: unknown): value is string {
  if (!isString(value)) return false;
  try {
    const url = new URL(value);
    return (url.protocol === 'http:' || url.protocol === 'https:') && Boolean(url.hostname);
  } catch {
    return false;
  }
}

function isStringList(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(isString);
}

export function isValidCustomSectionContent(type: CustomSectionType, value: unknown): boolean {
  if (!isRecord(value)) return false;

  switch (type) {
    case 'text':
      return (
        (value.heading === undefined || isString(value.heading)) &&
        (value.text === undefined || isString(value.text)) &&
        (value.paragraphs === undefined || isStringList(value.paragraphs)) &&
        (value.bullets === undefined || isStringList(value.bullets)) &&
        (isString(value.text) || isStringList(value.paragraphs) || isStringList(value.bullets))
      );
    case 'gallery':
      return Array.isArray(value.images) && value.images.every((item) =>
        isRecord(item) &&
        isHttpUrl(item.url) &&
        (item.alt === undefined || isString(item.alt)) &&
        (item.caption === undefined || isString(item.caption))
      );
    case 'cards':
      return Array.isArray(value.cards) && value.cards.every((item) =>
        isRecord(item) &&
        isString(item.title) &&
        isString(item.description) &&
        (item.imageUrl === undefined || item.imageUrl === '' || isHttpUrl(item.imageUrl)) &&
        (item.linkUrl === undefined || item.linkUrl === '' || isHttpUrl(item.linkUrl))
      );
    case 'links':
      return Array.isArray(value.links) && value.links.every((item) =>
        isRecord(item) &&
        isString(item.label) &&
        isHttpUrl(item.url) &&
        (item.description === undefined || isString(item.description))
      );
    case 'blocks':
      return Array.isArray(value.blocks) && value.blocks.every((item) => {
        if (!isRecord(item) || !isString(item.type)) return false;
        switch (item.type) {
          case 'heading':
          case 'text':
            return isString(item.text);
          case 'image':
            return isHttpUrl(item.url) && (item.alt === undefined || isString(item.alt));
          case 'card':
            return isString(item.title) && isString(item.description);
          case 'link':
            return isString(item.label) && isHttpUrl(item.url);
          default:
            return false;
        }
      });
  }
}

export function emptyCustomSectionContent(type: CustomSectionType): Record<string, unknown> {
  switch (type) {
    case 'text':
      return { heading: '', paragraphs: [''] };
    case 'gallery':
      return { images: [] };
    case 'cards':
      return { cards: [] };
    case 'links':
      return { links: [] };
    case 'blocks':
      return { blocks: [] };
  }
}

export function portfolioSectionAnchorId(sectionKey: string): string {
  switch (sectionKey) {
    case 'home':
      return 'hero';
    case 'codingProfiles':
      return 'coding-profiles';
    default:
      return sectionKey;
  }
}
