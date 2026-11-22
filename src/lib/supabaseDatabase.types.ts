import type { ExperienceSourceType } from '../data/portfolioData';

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

interface RecordMetadata {
  id: string;
  record_id: string;
  display_order: number;
  published: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  updated_by: string | null;
}

type Table<Row extends object> = {
  Row: Row & Record<string, unknown>;
  Insert: Partial<Row> & Record<string, unknown>;
  Update: Partial<Row> & Record<string, unknown>;
  Relationships: [];
};

interface ProfileRow extends RecordMetadata {
  record_id: 'main';
  site: Json;
  hero: Json;
  about: Json;
}

interface ProjectRow extends RecordMetadata {
  title: string;
  category: string;
  subtitle: string;
  status: 'Completed' | 'In Development' | 'Concept' | 'Academic Project';
  video_url: string | null;
  embed_url: string | null;
  drive_url: string | null;
  live_url: string | null;
  repo_url: string | null;
  kind: 'video' | 'software' | null;
  poster: string | null;
  description: string | null;
  tags: string[] | null;
  problem: string | null;
  objectives: string[] | null;
  solution: string | null;
  implementation: string | null;
  features: string[] | null;
  applications: string[] | null;
}

interface SkillRow extends RecordMetadata {
  name: string;
  category: string;
  level: string;
}

interface EducationRow extends RecordMetadata {
  degree: string;
  institution: string;
  period: string;
  status: string;
}

interface ExperienceRow extends RecordMetadata {
  title: string;
  description: string;
  source_type: ExperienceSourceType | null;
  source_record_id: string | null;
  organization: string | null;
  event_date: string | null;
  category: string | null;
  technologies: string[];
  generated_description: string | null;
}

interface AchievementRow extends RecordMetadata {
  title: string;
  issuer: string;
  date: string;
  description: string;
  certificate_url: string | null;
  organization: string | null;
  category: string | null;
  proof_url: string | null;
  featured: boolean | null;
  credential_id: string | null;
  credential_url: string | null;
  file_name: string | null;
  file_type: string | null;
  file_size: number | null;
}

interface CertificationRow extends RecordMetadata {
  title: string;
  organization: string;
  issue_date: string;
  category: string;
  credential_id: string;
  credential_url: string;
  certificate_url: string;
  file_name: string | null;
  file_type: string | null;
  file_size: number | null;
}

interface InternshipRow extends RecordMetadata {
  company: string;
  role: string;
  duration: string;
  start_date: string;
  end_date: string;
  description: string;
  skills: string[];
  certificate_url: string;
  file_name: string | null;
  file_type: string | null;
  file_size: number | null;
}

interface WorkshopRow extends RecordMetadata {
  title: string;
  institution: string;
  date: string;
  description: string;
  certificate_url: string;
  image_url: string;
  url: string;
  file_name: string | null;
  file_type: string | null;
  file_size: number | null;
  certificate_file_name: string | null;
  certificate_file_type: string | null;
  certificate_file_size: number | null;
  image_file_name: string | null;
  image_file_type: string | null;
  image_file_size: number | null;
}

interface CodingProfileRow extends RecordMetadata {
  platform: string;
  username: string;
  profile_url: string;
}

interface PublicationRow extends RecordMetadata {
  title: string;
  abstract: string;
  publication_date: string;
  venue: string;
  doi: string;
  publication_url: string;
  pdf_url: string;
  file_name: string | null;
  file_type: string | null;
  file_size: number | null;
}

interface ResumeRow extends RecordMetadata {
  title: string;
  file_url: string;
  uploaded_at: string;
  file_name: string | null;
  file_type: string | null;
  file_size: number | null;
}

interface SocialLinkRow extends RecordMetadata {
  label: string;
  href: string;
}

interface SiteSettingsRow extends RecordMetadata {
  record_id: 'main';
  schema_version: number;
  page_title: string;
  loader: Json;
  tech_stack: string[];
  stats: Json;
  resume_url: string;
  fire_effects: Json;
  contact: Json | null;
}

interface PortfolioSectionRow {
  id: string;
  section_key: string;
  section_name: string;
  description: string;
  section_type: 'system' | 'text' | 'gallery' | 'cards' | 'links' | 'blocks';
  is_enabled: boolean;
  display_order: number;
  is_system: boolean;
  is_public: boolean;
  show_in_navigation: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
  updated_by: string | null;
}

interface CustomSectionContentRow {
  id: string;
  section_id: string;
  content: Json;
  display_order: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
  updated_by: string | null;
}

interface AdminUserRow {
  user_id: string;
  created_at: string;
}

interface MessageRow {
  id: string;
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  status: 'new' | 'read' | 'replied' | 'archived';
  created_at: string;
}

export interface Database {
  public: {
    Tables: {
      admin_users: Table<AdminUserRow>;
      profile: Table<ProfileRow>;
      projects: Table<ProjectRow>;
      skills: Table<SkillRow>;
      education: Table<EducationRow>;
      experience: Table<ExperienceRow>;
      achievements: Table<AchievementRow>;
      certifications: Table<CertificationRow>;
      internships: Table<InternshipRow>;
      workshops: Table<WorkshopRow>;
      coding_profiles: Table<CodingProfileRow>;
      publications: Table<PublicationRow>;
      resume: Table<ResumeRow>;
      social_links: Table<SocialLinkRow>;
      site_settings: Table<SiteSettingsRow>;
      portfolio_sections: Table<PortfolioSectionRow>;
      custom_section_content: Table<CustomSectionContentRow>;
      messages: Table<MessageRow>;
    };
    Views: { [_ in never]: never };
    Functions: {
      is_portfolio_admin: { Args: Record<PropertyKey, never>; Returns: boolean };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
}
