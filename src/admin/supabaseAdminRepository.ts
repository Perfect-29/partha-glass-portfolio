import type { ContactSettings, PortfolioContent } from '../data/portfolioData';
import { isContactSettings } from '../data/portfolioData';
import type { FireEffectsSettings } from '../data/fireEffects';
import { isFireEffectsSettings } from '../data/fireEffects';
import type { Database, Json } from '../lib/supabaseDatabase.types';
import { isPortfolioContent } from '../lib/portfolioValidation';
import { supabase, supabaseConfigurationError } from '../lib/supabase';

type PortfolioTable = Exclude<keyof Database['public']['Tables'], 'admin_users' | 'messages'>;
type AdminSection =
  | 'home'
  | 'hero'
  | 'about'
  | 'socials'
  | 'projects'
  | 'skills'
  | 'experience'
  | 'education'
  | 'certifications'
  | 'achievements'
  | 'internships'
  | 'workshops'
  | 'codingProfiles'
  | 'publications'
  | 'resume';

export interface AdminPublicationState {
  profile: boolean;
  siteSettings: boolean;
}

export interface AdminMessage {
  id: string;
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  status: 'new' | 'read' | 'replied' | 'archived';
  createdAt: string;
}

const REALTIME_TABLES: PortfolioTable[] = [
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
];

function getClient() {
  if (!supabase) throw new Error(supabaseConfigurationError ?? 'Supabase is not configured.');
  return supabase;
}

function rowMetadata(
  record: { id: string; published?: boolean; displayOrder?: number },
  index: number,
  userId: string,
  publish: boolean,
) {
  return {
    record_id: record.id,
    display_order: index,
    published: publish || record.published === true,
    updated_by: userId,
  };
}

type SyncResult<T> = { data: T | null; error: { message: string } | null };
type WriteResult = { error: { message: string } | null };
async function syncRows<T extends { record_id?: string }>(
  table: string,
  rows: T[],
  list: () => PromiseLike<SyncResult<{ record_id: string }[]>>,
  save: () => PromiseLike<WriteResult>,
  remove: (ids: string[]) => PromiseLike<WriteResult>,
) {
  const existingResult = await list();
  if (existingResult.error) throw new Error(`Unable to load current ${table} records: ${existingResult.error.message}`);
  const existingIds = (existingResult.data ?? []).map((row) => row.record_id);
  const nextIds = new Set(rows.flatMap((row) => typeof row.record_id === 'string' ? [row.record_id] : []));
  const removedIds = existingIds.filter((id) => !nextIds.has(id));

  if (removedIds.length && !window.confirm(`Permanently delete ${removedIds.length} ${table} record(s) from Supabase?`)) {
    throw new Error('Deletion cancelled. Review the section status before retrying.');
  }

  if (rows.length) {
    const upsertResult = await save();
    if (upsertResult.error) throw new Error(`Unable to save ${table} records: ${upsertResult.error.message}`);
  }

  if (removedIds.length) {
    const deleteResult = await remove(removedIds);
    if (deleteResult.error) throw new Error(`Records were saved, but removed ${table} records could not be deleted: ${deleteResult.error.message}`);
  }
}

async function upsertSiteSettings(row: Database['public']['Tables']['site_settings']['Insert']) {
  const { error } = await getClient().from('site_settings').upsert(row, {
    onConflict: 'record_id',
    defaultToNull: false,
  });
  if (error) throw new Error(`Unable to save site_settings: ${error.message}`);
}

async function ensureSiteSettingsMain(initialContent: PortfolioContent, userId: string) {
  const { error } = await getClient().from('site_settings').upsert({
    record_id: 'main',
    display_order: 0,
    published: false,
    updated_by: userId,
    schema_version: 1,
    page_title: initialContent.site.pageTitle,
    loader: {
      statement: initialContent.loader.statement,
      redWords: initialContent.loader.redWords,
    } as Json,
    tech_stack: initialContent.techStack,
    stats: initialContent.stats as Json,
    resume_url: initialContent.resumeUrl,
  }, {
    onConflict: 'record_id',
    ignoreDuplicates: true,
    defaultToNull: false,
  });
  if (error) throw new Error(`Unable to initialize site_settings/main: ${error.message}`);
}

function publishedRows<T extends { id?: string; published?: boolean; displayOrder?: number }>(
  tableName: string,
  records: T[],
  userId: string,
  publish: boolean,
  toRow: (record: T, index: number) => Record<string, unknown>,
) {
  return records.map((record, index) => {
    if (!record.id) throw new Error(`A record in ${tableName} is missing its stable ID.`);
    return {
      ...rowMetadata({ ...record, id: record.id }, index, userId, publish),
      ...toRow(record, index),
    };
  });
}

function addMissingSkillIds(skills: PortfolioContent['skills']) {
  const ids = new Set<string>();
  return skills.map((skill, index) => {
    const generatedId = skill.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || `skill-${index + 1}`;
    const baseId = skill.id ?? generatedId;
    let id = baseId;
    let suffix = 2;
    while (ids.has(id)) id = `${baseId}-${suffix++}`;
    ids.add(id);
    return { ...skill, id };
  });
}

export async function saveAdminSection(
  section: AdminSection,
  content: PortfolioContent,
  userId: string,
  publish: boolean,
  publicationState: AdminPublicationState,
): Promise<AdminPublicationState> {
  if (!isPortfolioContent(content)) throw new Error('Content is incomplete or invalid. Check required fields and array shapes.');
  let nextPublicationState = { ...publicationState };

  switch (section) {
    case 'home':
    case 'about':
    case 'hero': {
      const { error } = await getClient().from('profile').upsert({
        record_id: 'main',
        display_order: 0,
        published: publish || publicationState.profile,
        updated_by: userId,
        site: {
          name: content.site.name,
          role: content.site.role,
          email: content.site.email,
          emailPlaceholder: content.site.emailPlaceholder,
        } as Json,
        hero: {
          eyebrow: content.hero.eyebrow,
          headline: content.hero.headline,
          roles: content.hero.roles,
          tagline: content.hero.tagline,
          primaryButton: content.hero.primaryButton,
          primaryButtonLink: content.hero.primaryButtonLink,
          secondaryButton: content.hero.secondaryButton,
          secondaryButtonLink: content.hero.secondaryButtonLink,
          image: content.hero.image,
          imageAlt: content.hero.imageAlt,
          imagePosition: content.hero.imagePosition,
          showFeatures: content.hero.showFeatures,
          features: content.hero.features.map((feature) => ({
            id: feature.id,
            icon: feature.icon,
            name: feature.name,
            enabled: feature.enabled,
          })),
        },
        about: {
          eyebrow: content.about.eyebrow,
          portrait: content.about.portrait,
          portraitAlt: content.about.portraitAlt,
          paragraphs: content.about.paragraphs,
          technologies: content.about.technologies,
          focus: content.about.focus,
        } as Json,
      }, { onConflict: 'record_id' });
      if (error) throw new Error(`Unable to save profile: ${error.message}`);
      nextPublicationState.profile = publish || publicationState.profile;
      if (section === 'home') {
        await upsertSiteSettings({
          record_id: 'main',
          display_order: 0,
          published: publish || publicationState.siteSettings,
          updated_by: userId,
          schema_version: 1,
          page_title: content.site.pageTitle,
          loader: { statement: content.loader.statement, redWords: content.loader.redWords } as Json,
          tech_stack: content.techStack,
          stats: content.stats as Json,
          resume_url: content.resumeUrl,
        });
        nextPublicationState.siteSettings = publish || publicationState.siteSettings;
      }
      break;
    }
    case 'socials': {
      const rows = publishedRows('social_links', content.socials, userId, publish, (record) => ({
        label: record.label,
        href: record.href,
      })) as Database['public']['Tables']['social_links']['Insert'][];
      const client = getClient();
      await syncRows('social_links', rows,
        () => client.from('social_links').select('record_id'),
        () => client.from('social_links').upsert(rows, { onConflict: 'record_id' }),
        (ids) => client.from('social_links').delete().in('record_id', ids));
      break;
    }
    case 'projects':
      {
      const rows = publishedRows('projects', content.projects, userId, publish, (record) => ({
        title: record.title,
        category: record.category,
        subtitle: record.subtitle,
        status: record.status,
        video_url: record.videoUrl ?? null,
        embed_url: record.embedUrl ?? null,
        drive_url: record.driveUrl ?? null,
        live_url: record.liveUrl ?? null,
        repo_url: record.repoUrl ?? null,
        kind: record.kind ?? null,
        poster: record.poster ?? null,
        description: record.description ?? null,
        tags: record.tags ?? null,
        problem: record.problem ?? null,
        objectives: record.objectives ?? null,
        solution: record.solution ?? null,
        implementation: record.implementation ?? null,
        features: record.features ?? null,
        applications: record.applications ?? null,
      })) as Database['public']['Tables']['projects']['Insert'][];
      const client = getClient();
      await syncRows('projects', rows,
        () => client.from('projects').select('record_id'),
        () => client.from('projects').upsert(rows, { onConflict: 'record_id' }),
        (ids) => client.from('projects').delete().in('record_id', ids));
      }
      break;
    case 'skills':
      {
      const rows = publishedRows('skills', addMissingSkillIds(content.skills), userId, publish, (record) => ({
        name: record.name,
        category: record.category,
        level: record.level,
      })) as Database['public']['Tables']['skills']['Insert'][];
      const client = getClient();
      await syncRows('skills', rows,
        () => client.from('skills').select('record_id'),
        () => client.from('skills').upsert(rows, { onConflict: 'record_id' }),
        (ids) => client.from('skills').delete().in('record_id', ids));
      }
      await upsertSiteSettings({
        record_id: 'main',
        display_order: 0,
        published: publish || publicationState.siteSettings,
        updated_by: userId,
        schema_version: 1,
        page_title: content.site.pageTitle,
        loader: { statement: content.loader.statement, redWords: content.loader.redWords } as Json,
        tech_stack: content.techStack,
        stats: content.stats as Json,
        resume_url: content.resumeUrl,
      });
      nextPublicationState.siteSettings = publish || publicationState.siteSettings;
      break;
    case 'education':
      {
      const rows = publishedRows('education', content.education, userId, publish, (record) => ({
        degree: record.degree,
        institution: record.institution,
        period: record.period,
        status: record.status,
      })) as Database['public']['Tables']['education']['Insert'][];
      const client = getClient();
      await syncRows('education', rows,
        () => client.from('education').select('record_id'),
        () => client.from('education').upsert(rows, { onConflict: 'record_id' }),
        (ids) => client.from('education').delete().in('record_id', ids));
      }
      break;
    case 'experience':
      {
      const rows = content.experience.map((record, index) => {
        const sourceDerived = Boolean(record.sourceType && record.sourceRecordId);
        return {
          ...rowMetadata(record, index, userId, publish && !sourceDerived),
          title: record.title,
          description: record.description,
          source_type: record.sourceType ?? null,
          source_record_id: record.sourceRecordId ?? null,
          organization: record.organization ?? null,
          event_date: record.date ?? null,
          category: record.category ?? null,
          technologies: record.technologies ?? [],
          generated_description: record.generatedDescription ?? null,
        };
      }) as Database['public']['Tables']['experience']['Insert'][];
      const client = getClient();
      await syncRows('experience', rows,
        () => client.from('experience').select('record_id'),
        () => client.from('experience').upsert(rows, { onConflict: 'record_id' }),
        (ids) => client.from('experience').delete().in('record_id', ids));
      }
      break;
    case 'achievements':
      {
      const rows = publishedRows('achievements', content.achievements, userId, publish, (record) => ({
        title: record.title,
        issuer: record.issuer,
        date: record.date,
        description: record.description,
        certificate_url: record.certificateUrl ?? null,
        organization: record.organization ?? null,
        category: record.category ?? null,
        proof_url: record.proofUrl ?? null,
        featured: record.featured ?? null,
        credential_id: record.credentialId ?? null,
        credential_url: record.credentialUrl ?? null,
        file_name: record.fileName ?? null,
        file_type: record.fileType ?? null,
        file_size: record.fileSize ?? null,
      })) as Database['public']['Tables']['achievements']['Insert'][];
      const client = getClient();
      await syncRows('achievements', rows,
        () => client.from('achievements').select('record_id'),
        () => client.from('achievements').upsert(rows, { onConflict: 'record_id' }),
        (ids) => client.from('achievements').delete().in('record_id', ids));
      }
      break;
    case 'certifications':
      {
      const rows = publishedRows('certifications', content.certifications, userId, publish, (record) => ({
        title: record.title,
        organization: record.organization,
        issue_date: record.issueDate,
        category: record.category,
        credential_id: record.credentialId,
        credential_url: record.credentialUrl?.trim() || '',
        certificate_url: record.certificateUrl,
        file_name: record.fileName ?? null,
        file_type: record.fileType ?? null,
        file_size: record.fileSize ?? null,
      })) as Database['public']['Tables']['certifications']['Insert'][];
      const client = getClient();
      await syncRows('certifications', rows,
        () => client.from('certifications').select('record_id'),
        () => client.from('certifications').upsert(rows, { onConflict: 'record_id' }),
        (ids) => client.from('certifications').delete().in('record_id', ids));
      }
      break;
    case 'internships':
      {
      const rows = publishedRows('internships', content.internships, userId, publish, (record) => ({
        company: record.company,
        role: record.role,
        duration: record.duration,
        start_date: record.startDate,
        end_date: record.endDate,
        description: record.description,
        skills: record.skills,
        certificate_url: record.certificateUrl,
        file_name: record.fileName ?? null,
        file_type: record.fileType ?? null,
        file_size: record.fileSize ?? null,
      })) as Database['public']['Tables']['internships']['Insert'][];
      const client = getClient();
      await syncRows('internships', rows,
        () => client.from('internships').select('record_id'),
        () => client.from('internships').upsert(rows, { onConflict: 'record_id' }),
        (ids) => client.from('internships').delete().in('record_id', ids));
      }
      break;
    case 'workshops':
      {
      const rows = publishedRows('workshops', content.workshops, userId, publish, (record) => ({
        title: record.title,
        institution: record.institution,
        date: record.date,
        description: record.description,
        certificate_url: record.certificateUrl,
        image_url: record.imageUrl,
        url: record.url,
        file_name: record.fileName ?? null,
        file_type: record.fileType ?? null,
        file_size: record.fileSize ?? null,
        certificate_file_name: record.certificateFileName ?? null,
        certificate_file_type: record.certificateFileType ?? null,
        certificate_file_size: record.certificateFileSize ?? null,
        image_file_name: record.imageFileName ?? null,
        image_file_type: record.imageFileType ?? null,
        image_file_size: record.imageFileSize ?? null,
      })) as Database['public']['Tables']['workshops']['Insert'][];
      const client = getClient();
      await syncRows('workshops', rows,
        () => client.from('workshops').select('record_id'),
        () => client.from('workshops').upsert(rows, { onConflict: 'record_id' }),
        (ids) => client.from('workshops').delete().in('record_id', ids));
      }
      break;
    case 'codingProfiles':
      {
      const rows = publishedRows('coding_profiles', content.codingProfiles, userId, publish, (record) => ({
        platform: record.platform,
        username: record.username,
        profile_url: record.profileUrl,
      })) as Database['public']['Tables']['coding_profiles']['Insert'][];
      const client = getClient();
      await syncRows('coding_profiles', rows,
        () => client.from('coding_profiles').select('record_id'),
        () => client.from('coding_profiles').upsert(rows, { onConflict: 'record_id' }),
        (ids) => client.from('coding_profiles').delete().in('record_id', ids));
      }
      break;
    case 'publications':
      {
      const rows = publishedRows('publications', content.publications, userId, publish, (record) => ({
        title: record.title,
        abstract: record.abstract,
        publication_date: record.publicationDate,
        venue: record.venue,
        doi: record.doi,
        publication_url: record.publicationUrl,
        pdf_url: record.pdfUrl,
        file_name: record.fileName ?? null,
        file_type: record.fileType ?? null,
        file_size: record.fileSize ?? null,
      })) as Database['public']['Tables']['publications']['Insert'][];
      const client = getClient();
      await syncRows('publications', rows,
        () => client.from('publications').select('record_id'),
        () => client.from('publications').upsert(rows, { onConflict: 'record_id' }),
        (ids) => client.from('publications').delete().in('record_id', ids));
      }
      break;
    case 'resume':
      {
      const rows = publishedRows('resume', content.resumes, userId, publish, (record) => ({
        title: record.title,
        file_url: record.fileUrl,
        uploaded_at: record.uploadedAt,
        file_name: record.fileName ?? null,
        file_type: record.fileType ?? null,
        file_size: record.fileSize ?? null,
      })) as Database['public']['Tables']['resume']['Insert'][];
      const client = getClient();
      await syncRows('resume', rows,
        () => client.from('resume').select('record_id'),
        () => client.from('resume').upsert(rows, { onConflict: 'record_id' }),
        (ids) => client.from('resume').delete().in('record_id', ids));
      }
      break;
  }

  return nextPublicationState;
}

export async function saveAdminContactSettings(
  settings: ContactSettings,
  userId: string,
  initialContent: PortfolioContent,
): Promise<boolean> {
  if (!isContactSettings(settings)) {
    throw new Error('Contact settings are invalid. Review phone numbers, email addresses, and profile URLs.');
  }
  const contact: Json = {
    heading: settings.heading,
    description: settings.description,
    iconOnly: settings.iconOnly,
    phone: { value: settings.phone.value, enabled: settings.phone.enabled, published: settings.phone.published },
    whatsapp: { value: settings.whatsapp.value, enabled: settings.whatsapp.enabled, published: settings.whatsapp.published },
    email: { value: settings.email.value, enabled: settings.email.enabled, published: settings.email.published },
    linkedin: { value: settings.linkedin.value, enabled: settings.linkedin.enabled, published: settings.linkedin.published },
    github: { value: settings.github.value, enabled: settings.github.enabled, published: settings.github.published },
    location: { value: settings.location.value, enabled: settings.location.enabled, published: settings.location.published },
  };

  const client = getClient();
  const updateContact = async () => {
    const result = await client
      .from('site_settings')
      .update({ contact, updated_by: userId })
      .eq('record_id', 'main')
      .select('record_id,published')
      .maybeSingle();
    if (result.error) {
      if ((result.error.code === '42703' || result.error.code === 'PGRST204') && /\bcontact\b/i.test(result.error.message)) {
        throw new Error('Apply the contact management migration in Supabase before saving contact settings.');
      }
      throw new Error(`Unable to save contact settings: ${result.error.message}`);
    }
    return result.data;
  };

  let data = await updateContact();
  if (!data) {
    await ensureSiteSettingsMain(initialContent, userId);
    data = await updateContact();
  }
  if (!data) {
    throw new Error('The site_settings record "main" does not exist. Save Home / Hero settings first.');
  }
  return data.published;
}

export async function getAdminMessages(): Promise<AdminMessage[]> {
  const { data, error } = await getClient()
    .from('messages')
    .select('id,name,email,phone,subject,message,status,created_at')
    .order('created_at', { ascending: false });
  if (error) throw new Error(`Unable to load Supabase contact messages: ${error.message}`);
  return (data ?? []).map((row) => ({ ...row, createdAt: row.created_at }));
}

export async function updateAdminMessageStatus(messageId: string, status: AdminMessage['status']) {
  const { error } = await getClient()
    .from('messages')
    .update({ status })
    .eq('id', messageId);
  if (error) throw new Error(`Unable to update contact message: ${error.message}`);
}

export async function deleteAdminMessage(messageId: string) {
  const { error } = await getClient().from('messages').delete().eq('id', messageId);
  if (error) throw new Error(`Unable to delete contact message: ${error.message}`);
}

export async function deleteAdminSingleton(table: 'profile' | 'site_settings') {
  const client = getClient();
  const result = table === 'profile'
    ? await client.from('profile').delete().eq('record_id', 'main')
    : await client.from('site_settings').delete().eq('record_id', 'main');
  if (result.error) throw new Error(`Unable to delete ${table}: ${result.error.message}`);
}

export async function saveFireEffectsSettings(
  settings: FireEffectsSettings,
  userId: string,
  publishSiteSettings: boolean,
  initialContent: PortfolioContent,
): Promise<boolean> {
  if (!isFireEffectsSettings(settings)) {
    throw new Error('Fire effect settings are invalid. Review the selected colors and slider values.');
  }
  const client = getClient();
  const updateFireEffects = async () => {
    const result = await client
      .from('site_settings')
      .update({
      fire_effects: {
        enabled: settings.enabled,
        preset: settings.preset,
        colors: settings.colors,
        particleSize: settings.particleSize,
        density: settings.density,
        speed: settings.speed,
        glow: settings.glow,
        trailLength: settings.trailLength,
        lifetime: settings.lifetime,
      },
      published: publishSiteSettings,
      updated_by: userId,
    })
      .eq('record_id', 'main')
      .select('record_id,published')
      .maybeSingle();
    if (result.error) throw new Error(`Unable to save fire effect settings: ${result.error.message}`);
    return result.data;
  };
  let data = await updateFireEffects();
  if (!data) {
    await ensureSiteSettingsMain(initialContent, userId);
    data = await updateFireEffects();
  }
  if (!data) {
    throw new Error('Unable to initialize the site_settings record "main". Retry or save Home / Hero settings first.');
  }
  return data.published;
}

export async function uploadPortfolioAsset(file: File, folder: string, recordId: string): Promise<string> {
  const client = getClient();
  const isImage = file.type === 'image/jpeg' || file.type === 'image/png';
  const isPdf = file.type === 'application/pdf';
  const maximumSize = isPdf ? 15 * 1024 * 1024 : 10 * 1024 * 1024;
  if ((!isImage && !isPdf) || file.size >= maximumSize) {
    throw new Error(isPdf ? 'Choose a PDF under 15 MB.' : 'Choose a JPG or PNG image under 10 MB.');
  }
  const bucket = isImage ? 'portfolio-images' : 'portfolio-documents';
  const safeFolder = folder.replace(/[^A-Za-z0-9_-]/g, '-');
  const safeRecordId = recordId.replace(/[^A-Za-z0-9_-]/g, '-');
  const safeName = file.name.replace(/[^A-Za-z0-9._-]/g, '-');
  const path = `${safeFolder}/${safeRecordId}/${Date.now()}-${safeName}`;
  const { data, error } = await client.storage.from(bucket).upload(path, file, {
    contentType: file.type,
    upsert: false,
  });
  if (error) throw new Error(`Unable to upload to ${bucket}: ${error.message}`);
  if (isImage) return client.storage.from(bucket).getPublicUrl(data.path).data.publicUrl;

  const signedResult = await client.storage.from(bucket).createSignedUrl(data.path, 60 * 60);
  if (signedResult.error) throw new Error(`The PDF uploaded, but a preview URL could not be created: ${signedResult.error.message}`);
  return signedResult.data.signedUrl;
}

export function subscribeAdminPortfolio(onChange: () => void, onError: (error: Error) => void) {
  const channel = getClient().channel('admin-portfolio-changes');
  for (const table of REALTIME_TABLES) {
    channel.on('postgres_changes', { event: '*', schema: 'public', table }, onChange);
  }
  channel.subscribe((status, error) => {
    if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
      onError(new Error(error?.message ?? `Supabase Realtime subscription failed (${status}).`));
    }
  });
  return () => {
    void getClient().removeChannel(channel);
  };
}

export function subscribeAdminMessages(onChange: () => void, onError: (error: Error) => void) {
  const channel = getClient()
    .channel('admin-message-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, onChange)
    .subscribe((status, error) => {
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        onError(new Error(error?.message ?? `Supabase message subscription failed (${status}).`));
      }
    });
  return () => {
    void getClient().removeChannel(channel);
  };
}
