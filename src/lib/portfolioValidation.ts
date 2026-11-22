import type { PortfolioContent } from '../data/portfolioData';
import { isContactSettings } from '../data/portfolioData';
import { isFireEffectsSettings } from '../data/fireEffects';

export function isPortfolioContent(value: unknown): value is PortfolioContent {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const content = value as Partial<PortfolioContent>;
  const isRecord = (item: unknown): item is Record<string, unknown> =>
    Boolean(item && typeof item === 'object' && !Array.isArray(item));
  const isString = (item: unknown) => typeof item === 'string';
  const isHttpUrl = (item: unknown) => {
    if (typeof item !== 'string') return false;
    const value = item.trim();
    if (!value) return true;
    if (value.length > 2048) return false;
    try {
      const url = new URL(value);
      return (url.protocol === 'http:' || url.protocol === 'https:') &&
        Boolean(url.hostname) &&
        !url.username &&
        !url.password;
    } catch {
      return false;
    }
  };
  const isStringList = (items: unknown) => Array.isArray(items) && items.every(isString);
  const isSafeId = (id: string) => /^[A-Za-z0-9_-]+$/.test(id);
  const isFileMetadata = (item: Record<string, unknown>, prefix = '') => {
    const fileName = item[prefix ? `${prefix}FileName` : 'fileName'];
    const fileType = item[prefix ? `${prefix}FileType` : 'fileType'];
    const fileSize = item[prefix ? `${prefix}FileSize` : 'fileSize'];
    return (
      (fileName === undefined || isString(fileName)) &&
      (fileType === undefined || ['application/pdf', 'image/jpeg', 'image/png'].includes(String(fileType))) &&
      (fileSize === undefined || (typeof fileSize === 'number' && fileSize >= 0 && fileSize <= 15 * 1024 * 1024))
    );
  };
  const isEntryList = (items: unknown, keys: string[]) => {
    if (!Array.isArray(items)) return false;
    const ids = new Set<string>();
    return items.every((item) => {
      if (!isRecord(item) || !keys.every((key) => isString(item[key]))) return false;
      if (!keys.includes('id')) return true;
      const id = item.id as string;
      if (!isSafeId(id) || ids.has(id)) return false;
      if (item.published !== undefined && typeof item.published !== 'boolean') return false;
      if (item.displayOrder !== undefined && (
        typeof item.displayOrder !== 'number' || !Number.isInteger(item.displayOrder) || item.displayOrder < 0
      )) return false;
      ids.add(id);
      return true;
    });
  };
  const isManagedList = (items: unknown, keys: string[], stringLists: string[] = []) => {
    if (!Array.isArray(items)) return false;
    const ids = new Set<string>();
    return items.every((item) => {
      if (!isRecord(item) || !keys.every((key) => isString(item[key]))) return false;
      const id = item.id as string;
      if (!isSafeId(id) || ids.has(id)) return false;
      ids.add(id);
      return (
        (item.published === undefined || typeof item.published === 'boolean') &&
        (item.displayOrder === undefined || (
          typeof item.displayOrder === 'number' && Number.isInteger(item.displayOrder) && item.displayOrder >= 0
        )) &&
        keys.filter((key) => key.toLowerCase().endsWith('url')).every((key) => isHttpUrl(item[key])) &&
        isFileMetadata(item) &&
        isFileMetadata(item, 'certificate') &&
        isFileMetadata(item, 'image') &&
        stringLists.every((key) => item[key] === undefined || isStringList(item[key]))
      );
    });
  };
  const isProjectList = (items: unknown) => {
    if (!Array.isArray(items)) return false;
    const ids = new Set<string>();
    return items.every((item) => {
      if (!isRecord(item)) return false;
      const requiredStrings = ['id', 'title', 'subtitle', 'category', 'status'];
      const optionalStrings = [
        'videoUrl',
        'embedUrl',
        'driveUrl',
        'liveUrl',
        'repoUrl',
        'poster',
        'description',
        'problem',
        'solution',
        'implementation',
      ];
      const id = isString(item.id) ? item.id : '';
      const valid =
        requiredStrings.every((key) => isString(item[key])) &&
        (item.status === 'Completed' ||
          item.status === 'In Development' ||
          item.status === 'Concept' ||
          item.status === 'Academic Project') &&
        optionalStrings.every((key) => item[key] === undefined || isString(item[key])) &&
        (item.published === undefined || typeof item.published === 'boolean') &&
        (item.displayOrder === undefined || (
          typeof item.displayOrder === 'number' && Number.isInteger(item.displayOrder) && item.displayOrder >= 0
        )) &&
        ['tags', 'objectives', 'features', 'applications'].every((key) => item[key] === undefined || isStringList(item[key])) &&
        (item.kind === undefined || item.kind === 'video' || item.kind === 'software');
      if (!valid || !isSafeId(id) || ids.has(id)) return false;
      ids.add(id);
      return true;
    });
  };
  const isExperienceList = (items: unknown) => {
    const sourceTypes = new Set([
      'projects',
      'achievements',
      'skills',
      'internships',
      'workshops',
      'certifications',
      'publications',
      'education',
    ]);
    return Array.isArray(items) && items.every((item) => {
      if (!isRecord(item)) return false;
      const sourceType = item.sourceType;
      const sourceRecordId = item.sourceRecordId;
      return (
        (sourceType === undefined
          ? sourceRecordId === undefined
          : sourceTypes.has(String(sourceType)) && isString(sourceRecordId) && sourceRecordId.length > 0) &&
        ['organization', 'date', 'category', 'generatedDescription'].every(
          (key) => item[key] === undefined || isString(item[key]),
        ) &&
        (item.technologies === undefined || isStringList(item.technologies))
      );
    }) && isEntryList(items, ['id', 'title', 'description']);
  };

  return Boolean(
    content.site &&
      isString(content.site.name) &&
      isString(content.site.pageTitle) &&
      isString(content.site.role) &&
      isString(content.site.email) &&
      isString(content.site.emailPlaceholder) &&
      content.hero &&
      isString(content.hero.eyebrow) &&
      isString(content.hero.headline) &&
      Array.isArray(content.hero.roles) &&
      content.hero.roles.length === 2 &&
      content.hero.roles.every(isString) &&
      isString(content.hero.tagline) &&
      isString(content.hero.primaryButton) &&
      isString(content.hero.secondaryButton) &&
      isString(content.hero.image) &&
      isString(content.hero.imageAlt) &&
      isString(content.hero.imagePosition) &&
      content.loader &&
      isString(content.loader.statement) &&
      isStringList(content.loader.redWords) &&
      content.about &&
      isString(content.about.eyebrow) &&
      isString(content.about.portrait) &&
      isString(content.about.portraitAlt) &&
      isStringList(content.about.paragraphs) &&
      isStringList(content.about.technologies) &&
      isStringList(content.about.focus) &&
      isEntryList(content.socials, ['id', 'label', 'href']) &&
      isContactSettings(content.contactSettings) &&
      isEntryList(content.skills, ['name', 'category', 'level']) &&
      Array.isArray(content.skills) &&
      content.skills.every((skill) => !('id' in skill) || (isString(skill.id) && isSafeId(skill.id))) &&
      isStringList(content.techStack) &&
      isProjectList(content.projects) &&
      isEntryList(content.education, ['id', 'degree', 'institution', 'period', 'status']) &&
      isExperienceList(content.experience) &&
      isEntryList(content.achievements, ['id', 'title', 'issuer', 'date', 'description']) &&
      Array.isArray(content.achievements) &&
      content.achievements.every((achievement) =>
        (!('certificateUrl' in achievement) || isString(achievement.certificateUrl)) &&
        (!('organization' in achievement) || isString(achievement.organization)) &&
        (!('category' in achievement) || isString(achievement.category)) &&
        (!('proofUrl' in achievement) || isString(achievement.proofUrl)) &&
        (!('credentialId' in achievement) || isString(achievement.credentialId)) &&
        (!('credentialUrl' in achievement) || isHttpUrl(achievement.credentialUrl)) &&
        (!('featured' in achievement) || typeof achievement.featured === 'boolean') &&
        (!('published' in achievement) || typeof achievement.published === 'boolean') &&
        isFileMetadata(achievement)
      ) &&
      content.achievements.every((achievement) =>
        (!('certificateUrl' in achievement) || isHttpUrl(achievement.certificateUrl)) &&
        (!('proofUrl' in achievement) || isHttpUrl(achievement.proofUrl))
      ) &&
      isManagedList(content.certifications, ['id', 'title', 'organization', 'issueDate', 'category', 'credentialId', 'credentialUrl', 'certificateUrl']) &&
      isManagedList(content.internships, ['id', 'company', 'role', 'duration', 'startDate', 'endDate', 'description', 'certificateUrl'], ['skills']) &&
      isManagedList(content.workshops, ['id', 'title', 'institution', 'date', 'description', 'certificateUrl', 'imageUrl', 'url']) &&
      isManagedList(content.codingProfiles, ['id', 'platform', 'username', 'profileUrl']) &&
      isManagedList(content.publications, ['id', 'title', 'abstract', 'publicationDate', 'venue', 'doi', 'publicationUrl', 'pdfUrl']) &&
      isManagedList(content.resumes, ['id', 'title', 'fileUrl', 'uploadedAt']) &&
      Array.isArray(content.stats) &&
      content.stats.every(
        (stat) =>
          stat &&
          isString(stat.id) &&
          typeof stat.value === 'number' &&
          isString(stat.suffix) &&
          isString(stat.label)
      ) &&
      typeof content.resumeUrl === 'string' &&
      isFireEffectsSettings(content.fireEffects)
  );
}
