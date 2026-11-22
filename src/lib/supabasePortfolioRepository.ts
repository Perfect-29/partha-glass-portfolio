import { DEFAULT_CONTACT_SETTINGS, DEFAULT_PORTFOLIO_CONTENT, readContactSettings } from '../data/portfolioData';
import { readFireEffectsSettings } from '../data/fireEffects';
import { isCustomSectionType } from '../data/portfolioSections';
import type { CustomSectionContentRecord, PortfolioSectionConfig, PortfolioSectionType } from '../data/portfolioSections';
import type { PortfolioContent, Project } from '../data/portfolioData';
import { isPortfolioContent } from './portfolioValidation';
import type { Json } from './supabaseDatabase.types';
import { supabase, supabaseConfigurationError } from './supabase';

const PRIVATE_DOCUMENT_BUCKET = 'portfolio-documents';
const PUBLIC_IMAGE_BUCKET = 'portfolio-images';
const SIGNED_URL_LIFETIME_SECONDS = 60 * 60;

export interface PublishedPortfolioResult {
  content: PortfolioContent;
  sections: PortfolioSectionConfig[];
  customSectionContent: CustomSectionContentRecord[];
  missingRecords: string[];
  profilePublished: boolean;
  siteSettingsPublished: boolean;
  siteSettingsExists: boolean;
  fireEffectsColumnAvailable: boolean;
  contactSettingsColumnAvailable: boolean;
}

function assertQuerySucceeded(result: { error: { message: string } | null }, label: string) {
  if (result.error) {
    throw new Error(`Unable to load published ${label} from Supabase: ${result.error.message}`);
  }
}

function isMissingFireEffectsColumn(error: { code?: string; message: string } | null): boolean {
  return Boolean(
    error &&
    (error.code === '42703' || error.code === 'PGRST204') &&
    /fire_effects/i.test(error.message),
  );
}

function isMissingContactSettingsColumn(error: { code?: string; message: string } | null): boolean {
  return Boolean(
    error &&
    (error.code === '42703' || error.code === 'PGRST204') &&
    /\bcontact\b/i.test(error.message),
  );
}

function requireQueryData<T>(result: { data: T | null; error: { message: string } | null }, label: string): T {
  assertQuerySucceeded(result, label);
  if (result.data === null) {
    throw new Error(`Supabase returned no result payload for the published ${label} query.`);
  }
  return result.data;
}

function asObject(value: Json | null | undefined): Record<string, Json | undefined> {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function readString(value: Json | undefined, fallback: string): string {
  return typeof value === 'string' ? value : fallback;
}

function readStringArray(value: Json | undefined, fallback: string[]): string[] {
  if (!Array.isArray(value)) return fallback;
  const result: string[] = [];
  for (const item of value) {
    if (typeof item !== 'string') return fallback;
    result.push(item);
  }
  return result;
}

function readStats(value: Json | undefined, fallback: PortfolioContent['stats']): PortfolioContent['stats'] {
  if (!Array.isArray(value)) return fallback;
  const result: PortfolioContent['stats'] = [];
  for (const item of value) {
    if (
      item === null ||
      typeof item !== 'object' ||
      Array.isArray(item) ||
      typeof item.id !== 'string' ||
      typeof item.value !== 'number' ||
      typeof item.suffix !== 'string' ||
      typeof item.label !== 'string'
    ) {
      return fallback;
    }
    result.push({ id: item.id, value: item.value, suffix: item.suffix, label: item.label });
  }
  return result;
}

function getStorageObjectPath(value: string, bucket: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const url = new URL(trimmed);
      const segments = url.pathname.split('/').filter(Boolean);
      const storageIndex = segments.findIndex(
        (segment, index) => segment === 'storage' && segments[index + 1] === 'v1' && segments[index + 2] === 'object',
      );
      if (storageIndex < 0) return null;
      const bucketIndex = segments.indexOf(bucket, storageIndex + 3);
      if (bucketIndex < 0) return null;
      return segments.slice(bucketIndex + 1).map((segment) => decodeURIComponent(segment)).join('/');
    } catch {
      return null;
    }
  }

  if (trimmed.startsWith('/assets/') || trimmed.startsWith('assets/') || trimmed.startsWith('data:')) {
    return null;
  }

  const path = trimmed.replace(/^\/+/, '');
  return path.startsWith(`${bucket}/`) ? path.slice(bucket.length + 1) : path;
}

async function resolveImageUrl(value: string): Promise<string> {
  const objectPath = getStorageObjectPath(value, PUBLIC_IMAGE_BUCKET);
  if (objectPath === null) return value;
  if (!supabase) throw new Error(supabaseConfigurationError ?? 'Supabase is not configured.');
  return supabase.storage.from(PUBLIC_IMAGE_BUCKET).getPublicUrl(objectPath).data.publicUrl;
}

async function resolveDocumentUrl(value: string, fileType?: string | null): Promise<string> {
  if (fileType === 'image/jpeg' || fileType === 'image/png') {
    return resolveImageUrl(value);
  }

  const objectPath = getStorageObjectPath(value, PRIVATE_DOCUMENT_BUCKET);
  if (objectPath === null) return value;
  if (!supabase) throw new Error(supabaseConfigurationError ?? 'Supabase is not configured.');

  const { data, error } = await supabase.storage
    .from(PRIVATE_DOCUMENT_BUCKET)
    .createSignedUrl(objectPath, SIGNED_URL_LIFETIME_SECONDS);
  if (error) {
    if (/object not found/i.test(error.message)) {
      console.error('A published private portfolio document could not be signed. Check the Storage object and its public access policy.');
      return '';
    }
    throw new Error(`Unable to create a private document URL: ${error.message}`);
  }
  if (!data?.signedUrl) {
    throw new Error('Supabase did not return a signed URL for a private portfolio document.');
  }
  return data.signedUrl;
}

async function loadPortfolio(options: {
  includeUnpublished?: boolean;
  preserveFallback?: boolean;
} = {}): Promise<PublishedPortfolioResult> {
  const client = supabase;
  if (!client) throw new Error(supabaseConfigurationError ?? 'Supabase is not configured.');
  const includeUnpublished = options.includeUnpublished ?? false;
  const preserveFallback = options.preserveFallback ?? true;

  const profileQuery = client.from('profile').select('record_id,published,site,hero,about').eq('record_id', 'main');
  const siteSettingsQuery = client.from('site_settings').select('record_id,display_order,published,schema_version,page_title,loader,tech_stack,stats,resume_url').eq('record_id', 'main');
  const fireEffectsQuery = client.from('site_settings').select('fire_effects').eq('record_id', 'main');
  const contactSettingsQuery = client.from('site_settings').select('contact').eq('record_id', 'main');
  const projectsQuery = client.from('projects').select('record_id,display_order,published,title,category,subtitle,status,video_url,embed_url,drive_url,live_url,repo_url,kind,poster,description,tags,problem,objectives,solution,implementation,features,applications');
  const skillsQuery = client.from('skills').select('record_id,display_order,published,name,category,level');
  const educationQuery = client.from('education').select('record_id,display_order,published,degree,institution,period,status');
  const experienceQuery = client.from('experience').select('record_id,display_order,published,title,description,source_type,source_record_id,organization,event_date,category,technologies,generated_description');
  const sectionsQuery = client.from('portfolio_sections')
    .select('id,section_key,section_name,description,section_type,is_enabled,display_order,is_system,is_public,show_in_navigation,deleted_at')
    .is('deleted_at', null);
  const customSectionContentQuery = client.from('custom_section_content')
    .select('id,section_id,content,display_order,is_published');
  const achievementsQuery = client.from('achievements').select('record_id,display_order,published,title,issuer,date,description,certificate_url,organization,category,proof_url,featured,credential_id,credential_url,file_name,file_type,file_size');
  const certificationsQuery = client.from('certifications').select('record_id,display_order,published,title,organization,issue_date,category,credential_id,credential_url,certificate_url,file_name,file_type,file_size');
  const internshipsQuery = client.from('internships').select('record_id,display_order,published,company,role,duration,start_date,end_date,description,skills,certificate_url,file_name,file_type,file_size');
  const workshopsQuery = client.from('workshops').select('record_id,display_order,published,title,institution,date,description,certificate_url,image_url,url,file_name,file_type,file_size,certificate_file_name,certificate_file_type,certificate_file_size,image_file_name,image_file_type,image_file_size');
  const codingProfilesQuery = client.from('coding_profiles').select('record_id,display_order,published,platform,username,profile_url');
  const publicationsQuery = client.from('publications').select('record_id,display_order,published,title,abstract,publication_date,venue,doi,publication_url,pdf_url,file_name,file_type,file_size');
  const resumeQuery = client.from('resume').select('record_id,display_order,published,title,file_url,uploaded_at,file_name,file_type,file_size');
  const socialLinksQuery = client.from('social_links').select('record_id,display_order,published,label,href');

  const [
    sectionsResult,
    customSectionContentResult,
    profileResult,
    projectsResult,
    skillsResult,
    educationResult,
    experienceResult,
    achievementsResult,
    certificationsResult,
    internshipsResult,
    workshopsResult,
    codingProfilesResult,
    publicationsResult,
    resumeResult,
    socialLinksResult,
    siteSettingsResult,
    fireEffectsResult,
    contactSettingsResult,
  ] = await Promise.all([
    (includeUnpublished
      ? sectionsQuery
      : sectionsQuery.eq('is_enabled', true).or('is_public.eq.true,section_key.eq.fireEffects')
    ).order('display_order', { ascending: true }),
    (includeUnpublished
      ? customSectionContentQuery
      : customSectionContentQuery.eq('is_published', true)
    ).order('display_order', { ascending: true }),
    (includeUnpublished ? profileQuery : profileQuery.eq('published', true)).maybeSingle(),
    (includeUnpublished ? projectsQuery : projectsQuery.eq('published', true)).order('display_order', { ascending: true }),
    (includeUnpublished ? skillsQuery : skillsQuery.eq('published', true)).order('display_order', { ascending: true }),
    (includeUnpublished ? educationQuery : educationQuery.eq('published', true)).order('display_order', { ascending: true }),
    (includeUnpublished ? experienceQuery : experienceQuery.eq('published', true)).order('display_order', { ascending: true }),
    (includeUnpublished ? achievementsQuery : achievementsQuery.eq('published', true)).order('display_order', { ascending: true }),
    (includeUnpublished ? certificationsQuery : certificationsQuery.eq('published', true)).order('display_order', { ascending: true }),
    (includeUnpublished ? internshipsQuery : internshipsQuery.eq('published', true)).order('display_order', { ascending: true }),
    (includeUnpublished ? workshopsQuery : workshopsQuery.eq('published', true)).order('display_order', { ascending: true }),
    (includeUnpublished ? codingProfilesQuery : codingProfilesQuery.eq('published', true)).order('display_order', { ascending: true }),
    (includeUnpublished ? publicationsQuery : publicationsQuery.eq('published', true)).order('display_order', { ascending: true }),
    (includeUnpublished ? resumeQuery : resumeQuery.eq('published', true)).order('display_order', { ascending: true }),
    (includeUnpublished ? socialLinksQuery : socialLinksQuery.eq('published', true)).order('display_order', { ascending: true }),
    (includeUnpublished ? siteSettingsQuery : siteSettingsQuery.eq('published', true)).maybeSingle(),
    (includeUnpublished ? fireEffectsQuery : fireEffectsQuery.eq('published', true)).maybeSingle(),
    (includeUnpublished ? contactSettingsQuery : contactSettingsQuery.eq('published', true)).maybeSingle(),
  ]);

  const queryResults = [
    ['portfolio_sections', sectionsResult],
    ['custom_section_content', customSectionContentResult],
    ['profile/main', profileResult],
    ['projects', projectsResult],
    ['skills', skillsResult],
    ['education', educationResult],
    ['experience', experienceResult],
    ['achievements', achievementsResult],
    ['certifications', certificationsResult],
    ['internships', internshipsResult],
    ['workshops', workshopsResult],
    ['coding_profiles', codingProfilesResult],
    ['publications', publicationsResult],
    ['resume', resumeResult],
    ['social_links', socialLinksResult],
    ['site_settings/main', siteSettingsResult],
  ] as const;
  queryResults.forEach(([label, result]) => assertQuerySucceeded(result, label));
  const fireEffectsColumnAvailable = !isMissingFireEffectsColumn(fireEffectsResult.error);
  if (fireEffectsResult.error && fireEffectsColumnAvailable) {
    assertQuerySucceeded(fireEffectsResult, 'site_settings fire effects');
  }
  const contactSettingsColumnAvailable = !isMissingContactSettingsColumn(contactSettingsResult.error);
  if (contactSettingsResult.error && contactSettingsColumnAvailable) {
    assertQuerySucceeded(contactSettingsResult, 'site_settings contact settings');
  }

  const projectRows = requireQueryData(projectsResult, 'projects');
  const skillRows = requireQueryData(skillsResult, 'skills');
  const educationRows = requireQueryData(educationResult, 'education');
  const experienceRows = requireQueryData(experienceResult, 'experience');
  const achievementRows = requireQueryData(achievementsResult, 'achievements');
  const certificationRows = requireQueryData(certificationsResult, 'certifications');
  const internshipRows = requireQueryData(internshipsResult, 'internships');
  const workshopRows = requireQueryData(workshopsResult, 'workshops');
  const codingProfileRows = requireQueryData(codingProfilesResult, 'coding_profiles');
  const publicationRows = requireQueryData(publicationsResult, 'publications');
  const resumeRows = requireQueryData(resumeResult, 'resume');
  const socialLinkRows = requireQueryData(socialLinksResult, 'social_links');
  const profile = profileResult.data;
  const sectionRows = requireQueryData(sectionsResult, 'portfolio_sections');
  const sectionContentRows = requireQueryData(customSectionContentResult, 'custom_section_content');
  const sections: PortfolioSectionConfig[] = sectionRows.map((row) => {
    const sectionType: PortfolioSectionType = row.section_type === 'system'
      ? 'system'
      : isCustomSectionType(row.section_type)
        ? row.section_type
        : (() => { throw new Error(`Unsupported portfolio section type: ${row.section_type}`); })();
    return {
      id: row.id,
      sectionKey: row.section_key,
      sectionName: row.section_name,
      description: row.description,
      sectionType,
      isEnabled: row.is_enabled,
      displayOrder: row.display_order,
      isSystem: row.is_system,
      isPublic: row.is_public,
      showInNavigation: row.show_in_navigation,
    };
  });
  const activeSectionIds = new Set(sections.filter((section) => !section.isSystem).map((section) => section.id));
  const customSectionContent: CustomSectionContentRecord[] = sectionContentRows
    .filter((row) => activeSectionIds.has(row.section_id))
    .map((row) => ({
      id: row.id,
      sectionId: row.section_id,
      content: row.content,
      displayOrder: row.display_order,
      isPublished: row.is_published,
    }));
  const settings = siteSettingsResult.data;
  const profileSite = asObject(profile?.site);
  const heroData = asObject(profile?.hero);
  const aboutData = asObject(profile?.about);
  const loaderData = asObject(settings?.loader);
  const githubRow = socialLinkRows.find((row) =>
    row.record_id.toLowerCase() === 'github' || row.label.trim().toLowerCase() === 'github'
  );
  const linkedinRow = socialLinkRows.find((row) =>
    row.record_id.toLowerCase() === 'linkedin' || row.label.trim().toLowerCase().startsWith('linkedin')
  );
  const contactFallback = {
    ...DEFAULT_CONTACT_SETTINGS,
    email: {
      ...DEFAULT_CONTACT_SETTINGS.email,
      value: readString(profileSite.email, DEFAULT_PORTFOLIO_CONTENT.site.email),
    },
    github: githubRow
      ? { value: githubRow.href, enabled: Boolean(githubRow.href), published: githubRow.published }
      : { ...DEFAULT_CONTACT_SETTINGS.github },
    linkedin: linkedinRow
      ? { value: linkedinRow.href, enabled: Boolean(linkedinRow.href), published: linkedinRow.published }
      : { ...DEFAULT_CONTACT_SETTINGS.linkedin },
  };
  const contactSettings = readContactSettings(
    contactSettingsResult.data?.contact,
    contactFallback,
  );

  const [heroImage, portrait, projects, achievements, certifications, internships, workshops, publications, resumes, resumeUrl] =
    await Promise.all([
      resolveImageUrl(readString(heroData.image, DEFAULT_PORTFOLIO_CONTENT.hero.image)),
      resolveImageUrl(readString(aboutData.portrait, DEFAULT_PORTFOLIO_CONTENT.about.portrait)),
      Promise.all(projectRows.map(async (row): Promise<Project> => ({
        id: row.record_id,
        published: row.published,
        displayOrder: row.display_order,
        title: row.title,
        category: row.category,
        subtitle: row.subtitle,
        status: row.status,
        ...(row.video_url ? { videoUrl: row.video_url } : {}),
        ...(row.embed_url ? { embedUrl: row.embed_url } : {}),
        ...(row.drive_url ? { driveUrl: row.drive_url } : {}),
        ...(row.live_url ? { liveUrl: row.live_url } : {}),
        ...(row.repo_url ? { repoUrl: row.repo_url } : {}),
        ...(row.kind ? { kind: row.kind } : {}),
        ...(row.poster ? { poster: await resolveImageUrl(row.poster) } : {}),
        ...(row.description !== null ? { description: row.description } : {}),
        ...(row.tags !== null ? { tags: row.tags } : {}),
        ...(row.problem !== null ? { problem: row.problem } : {}),
        ...(row.objectives !== null ? { objectives: row.objectives } : {}),
        ...(row.solution !== null ? { solution: row.solution } : {}),
        ...(row.implementation !== null ? { implementation: row.implementation } : {}),
        ...(row.features !== null ? { features: row.features } : {}),
        ...(row.applications !== null ? { applications: row.applications } : {}),
      }))),
      Promise.all(achievementRows.map(async (row) => ({
        id: row.record_id,
        displayOrder: row.display_order,
        title: row.title,
        issuer: row.issuer,
        date: row.date,
        description: row.description,
        ...(row.certificate_url ? { certificateUrl: await resolveDocumentUrl(row.certificate_url, row.file_type) } : {}),
        ...(row.organization ? { organization: row.organization } : {}),
        ...(row.category ? { category: row.category } : {}),
        ...(row.proof_url ? { proofUrl: await resolveDocumentUrl(row.proof_url, row.file_type) } : {}),
        ...(row.featured !== null ? { featured: row.featured } : {}),
        ...(row.credential_id ? { credentialId: row.credential_id } : {}),
        ...(row.credential_url ? { credentialUrl: row.credential_url } : {}),
        ...(row.file_name !== null ? { fileName: row.file_name } : {}),
        ...(row.file_type !== null ? { fileType: row.file_type } : {}),
        ...(row.file_size !== null ? { fileSize: row.file_size } : {}),
        published: row.published,
      }))),
      Promise.all(certificationRows.map(async (row) => ({
        id: row.record_id,
        displayOrder: row.display_order,
        title: row.title,
        organization: row.organization,
        issueDate: row.issue_date,
        category: row.category,
        credentialId: row.credential_id,
        credentialUrl: row.credential_url,
        certificateUrl: await resolveDocumentUrl(row.certificate_url, row.file_type),
        ...(row.file_name !== null ? { fileName: row.file_name } : {}),
        ...(row.file_type !== null ? { fileType: row.file_type } : {}),
        ...(row.file_size !== null ? { fileSize: row.file_size } : {}),
        published: row.published,
      }))),
      Promise.all(internshipRows.map(async (row) => ({
        id: row.record_id,
        displayOrder: row.display_order,
        company: row.company,
        role: row.role,
        duration: row.duration,
        startDate: row.start_date,
        endDate: row.end_date,
        description: row.description,
        skills: row.skills,
        certificateUrl: await resolveDocumentUrl(row.certificate_url, row.file_type),
        ...(row.file_name !== null ? { fileName: row.file_name } : {}),
        ...(row.file_type !== null ? { fileType: row.file_type } : {}),
        ...(row.file_size !== null ? { fileSize: row.file_size } : {}),
        published: row.published,
      }))),
      Promise.all(workshopRows.map(async (row) => ({
        id: row.record_id,
        displayOrder: row.display_order,
        title: row.title,
        institution: row.institution,
        date: row.date,
        description: row.description,
        certificateUrl: await resolveDocumentUrl(
          row.certificate_url,
          row.certificate_file_type ?? row.file_type,
        ),
        imageUrl: row.image_url ? await resolveImageUrl(row.image_url) : '',
        url: row.url,
        ...(row.file_name !== null ? { fileName: row.file_name } : {}),
        ...(row.file_type !== null ? { fileType: row.file_type } : {}),
        ...(row.file_size !== null ? { fileSize: row.file_size } : {}),
        ...(row.certificate_file_name !== null ? { certificateFileName: row.certificate_file_name } : {}),
        ...(row.certificate_file_type !== null ? { certificateFileType: row.certificate_file_type } : {}),
        ...(row.certificate_file_size !== null ? { certificateFileSize: row.certificate_file_size } : {}),
        ...(row.image_file_name !== null ? { imageFileName: row.image_file_name } : {}),
        ...(row.image_file_type !== null ? { imageFileType: row.image_file_type } : {}),
        ...(row.image_file_size !== null ? { imageFileSize: row.image_file_size } : {}),
        published: row.published,
      }))),
      Promise.all(publicationRows.map(async (row) => ({
        id: row.record_id,
        displayOrder: row.display_order,
        title: row.title,
        abstract: row.abstract,
        publicationDate: row.publication_date,
        venue: row.venue,
        doi: row.doi,
        publicationUrl: row.publication_url,
        pdfUrl: await resolveDocumentUrl(row.pdf_url, row.file_type),
        ...(row.file_name !== null ? { fileName: row.file_name } : {}),
        ...(row.file_type !== null ? { fileType: row.file_type } : {}),
        ...(row.file_size !== null ? { fileSize: row.file_size } : {}),
        published: row.published,
      }))),
      Promise.all(resumeRows.map(async (row) => ({
        id: row.record_id,
        displayOrder: row.display_order,
        title: row.title,
        fileUrl: await resolveDocumentUrl(row.file_url, row.file_type),
        uploadedAt: row.uploaded_at,
        ...(row.file_name !== null ? { fileName: row.file_name } : {}),
        ...(row.file_type !== null ? { fileType: row.file_type } : {}),
        ...(row.file_size !== null ? { fileSize: row.file_size } : {}),
        published: row.published,
      }))),
      settings?.resume_url
        ? resolveDocumentUrl(settings.resume_url, 'application/pdf')
        : Promise.resolve(DEFAULT_PORTFOLIO_CONTENT.resumeUrl),
    ]);

  const roles = readStringArray(heroData.roles, [...DEFAULT_PORTFOLIO_CONTENT.hero.roles]);
  const candidate: PortfolioContent = {
    ...DEFAULT_PORTFOLIO_CONTENT,
    site: {
      ...DEFAULT_PORTFOLIO_CONTENT.site,
      name: readString(profileSite.name, DEFAULT_PORTFOLIO_CONTENT.site.name),
      role: readString(profileSite.role, DEFAULT_PORTFOLIO_CONTENT.site.role),
      email: readString(profileSite.email, DEFAULT_PORTFOLIO_CONTENT.site.email),
      emailPlaceholder: readString(profileSite.emailPlaceholder, DEFAULT_PORTFOLIO_CONTENT.site.emailPlaceholder),
      pageTitle: settings?.page_title ?? DEFAULT_PORTFOLIO_CONTENT.site.pageTitle,
    },
    contactSettings,
    hero: {
      ...DEFAULT_PORTFOLIO_CONTENT.hero,
      eyebrow: readString(heroData.eyebrow, DEFAULT_PORTFOLIO_CONTENT.hero.eyebrow),
      headline: readString(heroData.headline, DEFAULT_PORTFOLIO_CONTENT.hero.headline),
      roles: [roles[0] ?? DEFAULT_PORTFOLIO_CONTENT.hero.roles[0], roles[1] ?? DEFAULT_PORTFOLIO_CONTENT.hero.roles[1]],
      tagline: readString(heroData.tagline, DEFAULT_PORTFOLIO_CONTENT.hero.tagline),
      primaryButton: readString(heroData.primaryButton, DEFAULT_PORTFOLIO_CONTENT.hero.primaryButton),
      secondaryButton: readString(heroData.secondaryButton, DEFAULT_PORTFOLIO_CONTENT.hero.secondaryButton),
      image: heroImage,
      imageAlt: readString(heroData.imageAlt, DEFAULT_PORTFOLIO_CONTENT.hero.imageAlt),
      imagePosition: readString(heroData.imagePosition, DEFAULT_PORTFOLIO_CONTENT.hero.imagePosition),
    },
    about: {
      ...DEFAULT_PORTFOLIO_CONTENT.about,
      eyebrow: readString(aboutData.eyebrow, DEFAULT_PORTFOLIO_CONTENT.about.eyebrow),
      portrait,
      portraitAlt: readString(aboutData.portraitAlt, DEFAULT_PORTFOLIO_CONTENT.about.portraitAlt),
      paragraphs: readStringArray(aboutData.paragraphs, DEFAULT_PORTFOLIO_CONTENT.about.paragraphs),
      technologies: readStringArray(aboutData.technologies, DEFAULT_PORTFOLIO_CONTENT.about.technologies),
      focus: readStringArray(aboutData.focus, DEFAULT_PORTFOLIO_CONTENT.about.focus),
    },
    loader: {
      statement: readString(loaderData.statement, DEFAULT_PORTFOLIO_CONTENT.loader.statement),
      redWords: readStringArray(loaderData.redWords, DEFAULT_PORTFOLIO_CONTENT.loader.redWords),
    },
    projects: projects.length ? projects : preserveFallback ? DEFAULT_PORTFOLIO_CONTENT.projects : [],
    skills: skillRows.length
      ? skillRows.map((row) => ({
          id: row.record_id,
          name: row.name,
          category: row.category,
          level: row.level,
          published: row.published,
          displayOrder: row.display_order,
        }))
      : preserveFallback ? DEFAULT_PORTFOLIO_CONTENT.skills : [],
    techStack: settings?.tech_stack ?? (preserveFallback ? DEFAULT_PORTFOLIO_CONTENT.techStack : []),
    education: educationRows.length
      ? educationRows.map((row) => ({
          id: row.record_id,
          degree: row.degree,
          institution: row.institution,
          period: row.period,
          status: row.status,
          published: row.published,
          displayOrder: row.display_order,
        }))
      : preserveFallback ? DEFAULT_PORTFOLIO_CONTENT.education : [],
    experience: experienceRows.length
      ? experienceRows.map((row) => ({
          id: row.record_id,
          title: row.title,
          description: row.description,
          ...(row.source_type ? { sourceType: row.source_type } : {}),
          ...(row.source_record_id ? { sourceRecordId: row.source_record_id } : {}),
          ...(row.organization ? { organization: row.organization } : {}),
          ...(row.event_date ? { date: row.event_date } : {}),
          ...(row.category ? { category: row.category } : {}),
          technologies: row.technologies,
          ...(row.generated_description ? { generatedDescription: row.generated_description } : {}),
          published: row.published,
          displayOrder: row.display_order,
        }))
      : preserveFallback ? DEFAULT_PORTFOLIO_CONTENT.experience : [],
    achievements: achievements.length ? achievements : preserveFallback ? DEFAULT_PORTFOLIO_CONTENT.achievements : [],
    certifications: certifications.length ? certifications : preserveFallback ? DEFAULT_PORTFOLIO_CONTENT.certifications : [],
    internships: internships.length ? internships : preserveFallback ? DEFAULT_PORTFOLIO_CONTENT.internships : [],
    workshops: workshops.length ? workshops : preserveFallback ? DEFAULT_PORTFOLIO_CONTENT.workshops : [],
    codingProfiles: codingProfileRows.length
      ? codingProfileRows.map((row) => ({
          id: row.record_id,
          platform: row.platform,
          username: row.username,
          profileUrl: row.profile_url,
          published: row.published,
          displayOrder: row.display_order,
        }))
      : preserveFallback ? DEFAULT_PORTFOLIO_CONTENT.codingProfiles : [],
    publications: publications.length ? publications : preserveFallback ? DEFAULT_PORTFOLIO_CONTENT.publications : [],
    resumes: resumes.length ? resumes : preserveFallback ? DEFAULT_PORTFOLIO_CONTENT.resumes : [],
    socials: socialLinkRows.length
      ? socialLinkRows.map((row) => ({
          id: row.record_id,
          label: row.label,
          href: row.href,
          published: row.published,
          displayOrder: row.display_order,
        }))
      : preserveFallback ? DEFAULT_PORTFOLIO_CONTENT.socials : [],
    stats: settings
      ? readStats(settings.stats, DEFAULT_PORTFOLIO_CONTENT.stats)
      : preserveFallback ? DEFAULT_PORTFOLIO_CONTENT.stats : [],
    resumeUrl,
    fireEffects: readFireEffectsSettings(fireEffectsResult.data?.fire_effects),
  };

  if (!isPortfolioContent(candidate)) {
    throw new Error('Published Supabase portfolio records do not match the application content schema.');
  }

  const recordCounts: [string, number][] = [
    ['home', profile ? 1 : 0],
    ['projects', projectRows.length],
    ['skills', skillRows.length],
    ['education', educationRows.length],
    ['experience', experienceRows.length],
    ['achievements', achievementRows.length],
    ['certifications', certificationRows.length],
    ['internships', internshipRows.length],
    ['workshops', workshopRows.length],
    ['codingProfiles', codingProfileRows.length],
    ['publications', publicationRows.length],
    ['resume', resumeRows.length],
    ['socials', socialLinkRows.length],
  ];
  const publicSectionKeys = new Set(sections.filter((section) => section.isPublic).map((section) => section.sectionKey));

  return {
    content: candidate,
    sections,
    customSectionContent,
    missingRecords: recordCounts
      .filter(([key, count]) => publicSectionKeys.has(key) && count === 0)
      .map(([name]) => name),
    profilePublished: profile?.published ?? false,
    siteSettingsPublished: settings?.published ?? false,
    siteSettingsExists: settings !== null,
    fireEffectsColumnAvailable,
    contactSettingsColumnAvailable,
  };
}

export function getPublishedPortfolio(): Promise<PublishedPortfolioResult> {
  return loadPortfolio({ preserveFallback: true });
}

export function getAdminPortfolio(): Promise<PublishedPortfolioResult> {
  return loadPortfolio({ includeUnpublished: true, preserveFallback: false });
}
