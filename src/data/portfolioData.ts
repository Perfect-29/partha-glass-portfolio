import { FEATURED_PROJECTS } from './projects';
import { DEFAULT_FIRE_EFFECTS_SETTINGS } from './fireEffects';
import type { FireEffectsSettings } from './fireEffects';

export const PORTFOLIO_BRAND_NAME = "PARTHASARATHY'S PORTFOLIO";
export const PORTFOLIO_TAGLINE = 'AI & DATA SCIENCE DEVELOPER';

/* ───────────── 1. BASIC INFO ───────────── */
export const SITE = {
  name: 'PARTHASARATHY A',
  pageTitle: PORTFOLIO_BRAND_NAME,
  role: PORTFOLIO_TAGLINE,
  email: 'parthaanandhan29@gmail.com',
  emailPlaceholder: 'Add your contact email before publishing',
};

/* ───────────── 2. HERO (top of page) ───────────── */
export const HERO = {
  eyebrow: 'ARTIFICIAL INTELLIGENCE · DATA SCIENCE',
  headline: 'PARTHASARATHY A',
  roles: [PORTFOLIO_TAGLINE, ''] as [string, string],
  tagline: 'Building intelligent solutions for a smarter tomorrow.',
  primaryButton: 'ENTER PORTFOLIO',
  secondaryButton: 'CONTACT',
  image: '/assets/hero-red-bg.webp',
  imageAlt: 'Portrait of PARTHASARATHY A in a black court suit',
  imagePosition: '69% center',
};

/* ───────────── 3. LOADING SCREEN ───────────── */
export const LOADER = {
  statement: 'BUILDING INTELLIGENT SOLUTIONS FOR A SMARTER TOMORROW',
  redWords: ['INTELLIGENT', 'TOMORROW'],
};

/* ───────────── 4. ABOUT ───────────── */
export const ABOUT = {
  eyebrow: 'AI & DATA SCIENCE · STUDENT DEVELOPER',
  portrait: '/assets/parthasarathy-portrait.webp',
  portraitAlt: 'Portrait of PARTHASARATHY A in a black court suit',
  paragraphs: [
    'I am pursuing a B.Tech in Artificial Intelligence & Data Science at SVHEC (2024–2028).',
    'I am interested in Artificial Intelligence, Machine Learning, Deep Learning and Data Science, and enjoy exploring how intelligent solutions can address real-world problems.',
  ],
  technologies: [
    'Python',
    'Java',
    'C',
    'Machine Learning',
    'Deep Learning',
    'Artificial Intelligence',
    'Data Science',
    'HTML',
    'CSS',
    'JavaScript',
    'React',
    'Flask',
    'SQL',
    'Firebase',
  ],
  focus: ['Artificial Intelligence', 'Machine Learning', 'Data Science'],
};

/* ───────────── 5. SOCIAL LINKS (footer) ───────────── */
export const SOCIALS = [
  { id: 'github', label: 'GitHub', href: 'https://github.com/perfect-29' },
  { id: 'linkedin', label: 'LinkedIn · URL pending', href: '' },
] as const;

export interface ContactMethodSettings {
  value: string;
  enabled: boolean;
  published: boolean;
}

export interface ContactSettings {
  heading: string;
  description: string;
  iconOnly: boolean;
  phone: ContactMethodSettings;
  whatsapp: ContactMethodSettings;
  email: ContactMethodSettings;
  linkedin: ContactMethodSettings;
  github: ContactMethodSettings;
  location: ContactMethodSettings;
}

export const DEFAULT_CONTACT_SETTINGS: ContactSettings = {
  heading: "LET'S CONNECT",
  description: "Have an idea, opportunity, or project in mind? Let's create something extraordinary together.",
  iconOnly: false,
  phone: { value: '', enabled: false, published: false },
  whatsapp: { value: '', enabled: false, published: false },
  email: { value: SITE.email, enabled: true, published: true },
  linkedin: { value: '', enabled: false, published: false },
  github: { value: SOCIALS.find((item) => item.id === 'github')?.href ?? '', enabled: true, published: true },
  location: { value: '', enabled: false, published: false },
};

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

export function readContactSettings(value: unknown, fallback = DEFAULT_CONTACT_SETTINGS): ContactSettings {
  if (!isObjectRecord(value)) return fallback;
  const readMethod = (key: keyof Pick<ContactSettings, 'phone' | 'whatsapp' | 'email' | 'linkedin' | 'github' | 'location'>) => {
    const method = value[key];
    if (!isObjectRecord(method)) return { ...fallback[key] };
    return {
      value: typeof method.value === 'string' ? method.value : fallback[key].value,
      enabled: typeof method.enabled === 'boolean' ? method.enabled : fallback[key].enabled,
      published: typeof method.published === 'boolean' ? method.published : fallback[key].published,
    };
  };
  const contactSettings: ContactSettings = {
    heading: typeof value.heading === 'string' ? value.heading : fallback.heading,
    description: typeof value.description === 'string' ? value.description : fallback.description,
    iconOnly: typeof value.iconOnly === 'boolean' ? value.iconOnly : fallback.iconOnly,
    phone: readMethod('phone'),
    whatsapp: readMethod('whatsapp'),
    email: readMethod('email'),
    linkedin: readMethod('linkedin'),
    github: readMethod('github'),
    location: readMethod('location'),
  };
  return isContactSettings(contactSettings) ? contactSettings : fallback;
}

export function isContactSettings(value: unknown): value is ContactSettings {
  if (!isObjectRecord(value) || typeof value.heading !== 'string' || value.heading.length > 80 ||
    typeof value.description !== 'string' || value.description.length > 360 ||
    typeof value.iconOnly !== 'boolean') return false;
  const isHttpUrl = (urlValue: string) => {
    try {
      const url = new URL(urlValue);
      return (url.protocol === 'http:' || url.protocol === 'https:') &&
        Boolean(url.hostname) && !url.username && !url.password;
    } catch {
      return false;
    }
  };
  const validEmail = /^[A-Za-z0-9!#$%&'*+\/=?^_`{|}~-]+(?:\.[A-Za-z0-9!#$%&'*+\/=?^_`{|}~-]+)*@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)*$/;
  const methodKeys = ['phone', 'whatsapp', 'email', 'linkedin', 'github', 'location'] as const;
  for (const key of methodKeys) {
    const method = value[key];
    if (!isObjectRecord(method) || typeof method.value !== 'string' ||
      typeof method.enabled !== 'boolean' || typeof method.published !== 'boolean') return false;
    const { value: methodValue } = method;
    if (methodValue.length > (key === 'location' ? 180 : key === 'email' ? 254 : 2048)) return false;
    if ((key === 'phone' || key === 'whatsapp') && methodValue &&
      !/^\+?[0-9][0-9 ()-]{5,39}$/.test(methodValue)) return false;
    if (key === 'email' && methodValue && !validEmail.test(methodValue)) return false;
    if ((key === 'linkedin' || key === 'github') && methodValue && !isHttpUrl(methodValue)) return false;
  }
  return true;
}

/* ───────────── 6. TECHNICAL SKILLS ───────────── */
export const SKILL_CARDS: { name: string; category: string; level: string }[] = [
  { name: 'Python', category: 'Programming', level: 'SKILL' },
  { name: 'Java', category: 'Programming', level: 'SKILL' },
  { name: 'C', category: 'Programming', level: 'SKILL' },
  { name: 'Machine Learning', category: 'AI & Data', level: 'SKILL' },
  { name: 'Deep Learning', category: 'AI & Data', level: 'SKILL' },
  { name: 'Artificial Intelligence', category: 'AI & Data', level: 'SKILL' },
  { name: 'Data Science', category: 'AI & Data', level: 'SKILL' },
  { name: 'HTML', category: 'Web', level: 'SKILL' },
  { name: 'CSS', category: 'Web', level: 'SKILL' },
  { name: 'JavaScript', category: 'Web', level: 'SKILL' },
  { name: 'React', category: 'Web', level: 'SKILL' },
  { name: 'Flask', category: 'Web & Backend', level: 'SKILL' },
  { name: 'SQL', category: 'Data', level: 'SKILL' },
  { name: 'Firebase', category: 'Backend & Data', level: 'SKILL' },
];

export const TECH_STACK: string[] = [
  'Python',
  'Java',
  'C',
  'Machine Learning',
  'Deep Learning',
  'Artificial Intelligence',
  'Data Science',
  'HTML',
  'CSS',
  'JavaScript',
  'React',
  'Flask',
  'SQL',
  'Firebase',
];

/* ───────────── 7. PROJECTS ───────────── */
export interface Project {
  id: string;
  published?: boolean;
  displayOrder?: number;
  title: string;
  category: string;
  subtitle: string;
  status: 'Completed' | 'In Development' | 'Concept' | 'Academic Project';
  videoUrl?: string;
  embedUrl?: string;
  driveUrl?: string;
  liveUrl?: string;
  repoUrl?: string;
  kind?: 'video' | 'software';
  poster?: string;
  description?: string;
  tags?: string[];
  problem?: string;
  objectives?: string[];
  solution?: string;
  implementation?: string;
  features?: string[];
  applications?: string[];
}

export interface SkillEntry {
  id?: string;
  published?: boolean;
  displayOrder?: number;
  name: string;
  category: string;
  level: string;
}

export interface EducationEntry {
  id: string;
  published?: boolean;
  displayOrder?: number;
  degree: string;
  institution: string;
  period: string;
  status: string;
}

export type ExperienceSourceType =
  | 'projects'
  | 'achievements'
  | 'skills'
  | 'internships'
  | 'workshops'
  | 'certifications'
  | 'publications'
  | 'education';

export interface ExperienceEntry extends ManagedEntry {
  id: string;
  published?: boolean;
  displayOrder?: number;
  title: string;
  description: string;
  sourceType?: ExperienceSourceType;
  sourceRecordId?: string;
  organization?: string;
  date?: string;
  category?: string;
  technologies?: string[];
  generatedDescription?: string;
}

export interface AchievementEntry extends ManagedEntry {
  id: string;
  [key: string]: unknown;
  title: string;
  issuer: string;
  date: string;
  description: string;
  certificateUrl?: string;
  organization?: string;
  category?: string;
  proofUrl?: string;
  featured?: boolean;
  credentialId?: string;
  credentialUrl?: string;
  fileName?: string;
  fileType?: string;
  fileSize?: number;
  published?: boolean;
}

export interface ManagedEntry {
  id: string;
  published?: boolean;
  displayOrder?: number;
  fileName?: string;
  fileType?: string;
  fileSize?: number;
  [key: string]: unknown;
}

export interface CertificationEntry extends ManagedEntry {
  title: string;
  organization: string;
  issueDate: string;
  category: string;
  credentialId: string;
  credentialUrl: string;
  certificateUrl: string;
}

export interface InternshipEntry extends ManagedEntry {
  company: string;
  role: string;
  duration: string;
  startDate: string;
  endDate: string;
  description: string;
  skills: string[];
  certificateUrl: string;
}

export interface WorkshopEntry extends ManagedEntry {
  title: string;
  institution: string;
  date: string;
  description: string;
  certificateUrl: string;
  imageUrl: string;
  url: string;
  certificateFileName?: string;
  certificateFileType?: string;
  certificateFileSize?: number;
  imageFileName?: string;
  imageFileType?: string;
  imageFileSize?: number;
}

export interface CodingProfileEntry extends ManagedEntry {
  platform: string;
  username: string;
  profileUrl: string;
}

export interface PublicationEntry extends ManagedEntry {
  title: string;
  abstract: string;
  publicationDate: string;
  venue: string;
  doi: string;
  publicationUrl: string;
  pdfUrl: string;
}

export interface ResumeEntry extends ManagedEntry {
  title: string;
  fileUrl: string;
  uploadedAt: string;
}

export { FEATURED_PROJECTS as PORTFOLIO_PROJECTS };

/* ───────────── 8. EDUCATION ───────────── */
export const EDUCATION = {
  degree: 'B.Tech Artificial Intelligence & Data Science',
  institution: 'SVHEC',
  period: '2024–2028',
};

export const SERVICES_PRICING: {
  id: string;
  title: string;
  priceLabel: string;
  price: string;
  featured?: boolean;
}[] = [];

/* ───────────── 9. HEADLINE NUMBERS (under hero) ───────────── */
export const CLIENT_STATS = [
  { id: 'stat-1', value: 7, suffix: '', label: 'Projects listed' },
  { id: 'stat-2', value: 14, suffix: '', label: 'Skills & technologies' },
  { id: 'stat-3', value: 2028, suffix: '', label: 'Expected graduation' },
] as const;

export interface PortfolioContent {
  site: typeof SITE;
  hero: typeof HERO;
  loader: typeof LOADER;
  about: typeof ABOUT;
  socials: { id: string; label: string; href: string; published?: boolean; displayOrder?: number }[];
  contactSettings: ContactSettings;
  skills: SkillEntry[];
  techStack: string[];
  projects: Project[];
  education: EducationEntry[];
  experience: ExperienceEntry[];
  achievements: AchievementEntry[];
  certifications: CertificationEntry[];
  internships: InternshipEntry[];
  workshops: WorkshopEntry[];
  codingProfiles: CodingProfileEntry[];
  publications: PublicationEntry[];
  resumes: ResumeEntry[];
  stats: { id: string; value: number; suffix: string; label: string }[];
  resumeUrl: string;
  fireEffects: FireEffectsSettings;
}

export const DEFAULT_PORTFOLIO_CONTENT: PortfolioContent = {
  site: SITE,
  hero: HERO,
  loader: LOADER,
  about: ABOUT,
  socials: [...SOCIALS],
  contactSettings: {
    ...DEFAULT_CONTACT_SETTINGS,
    phone: { ...DEFAULT_CONTACT_SETTINGS.phone },
    whatsapp: { ...DEFAULT_CONTACT_SETTINGS.whatsapp },
    email: { ...DEFAULT_CONTACT_SETTINGS.email },
    linkedin: { ...DEFAULT_CONTACT_SETTINGS.linkedin },
    github: { ...DEFAULT_CONTACT_SETTINGS.github },
    location: { ...DEFAULT_CONTACT_SETTINGS.location },
  },
  skills: [...SKILL_CARDS],
  techStack: [...TECH_STACK],
  projects: [...FEATURED_PROJECTS],
  education: [{ id: 'svhec-btech', ...EDUCATION, status: 'In progress' }],
  experience: [{
    id: 'project-based',
    title: 'Project-based experience',
    description:
      'Selected work spans AI and deep learning, GIS-based mapping, and software systems. No employment or internship history is listed.',
  }],
  achievements: [],
  certifications: [],
  internships: [],
  workshops: [],
  codingProfiles: [],
  publications: [],
  resumes: [],
  stats: CLIENT_STATS.map((stat) => ({ ...stat })),
  resumeUrl: '',
  fireEffects: { ...DEFAULT_FIRE_EFFECTS_SETTINGS, colors: [...DEFAULT_FIRE_EFFECTS_SETTINGS.colors] },
};
