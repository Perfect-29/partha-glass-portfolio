import type { CustomSectionContentRecord, CustomSectionType, PortfolioSectionConfig } from '../data/portfolioSections';
import type { Database, Json } from '../lib/supabaseDatabase.types';
import { supabase, supabaseConfigurationError } from '../lib/supabase';

type SectionTable = Database['public']['Tables']['portfolio_sections'];
type ContentTable = Database['public']['Tables']['custom_section_content'];

export type SectionUpdate = Pick<
  PortfolioSectionConfig,
  'sectionName' | 'description' | 'isEnabled' | 'displayOrder' | 'showInNavigation'
>;

function getClient() {
  if (!supabase) throw new Error(supabaseConfigurationError ?? 'Supabase is not configured.');
  return supabase;
}

function toConfig(row: SectionTable['Row']): PortfolioSectionConfig {
  return {
    id: row.id,
    sectionKey: row.section_key,
    sectionName: row.section_name,
    description: row.description,
    sectionType: row.section_type,
    isEnabled: row.is_enabled,
    displayOrder: row.display_order,
    isSystem: row.is_system,
    isPublic: row.is_public,
    showInNavigation: row.show_in_navigation,
  };
}

function toContentRecord(row: ContentTable['Row']): CustomSectionContentRecord {
  return {
    id: row.id,
    sectionId: row.section_id,
    content: row.content,
    displayOrder: row.display_order,
    isPublished: row.is_published,
  };
}

function toJson(value: unknown): Json {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (Array.isArray(value)) return value.map(toJson);
  if (value && typeof value === 'object') {
    const result: { [key: string]: Json } = {};
    for (const [key, item] of Object.entries(value)) result[key] = toJson(item);
    return result;
  }
  throw new Error('Custom section content must be valid JSON.');
}

export async function createCustomSection(input: {
  sectionKey: string;
  sectionName: string;
  description: string;
  sectionType: CustomSectionType;
  displayOrder: number;
}) {
  const { data, error } = await getClient()
    .from('portfolio_sections')
    .insert({
      section_key: input.sectionKey,
      section_name: input.sectionName,
      description: input.description,
      section_type: input.sectionType,
      is_enabled: true,
      display_order: input.displayOrder,
      is_system: false,
      is_public: true,
      show_in_navigation: true,
    })
    .select('*')
    .single();
  if (error) throw new Error(`Unable to create portfolio section: ${error.message}`);
  return toConfig(data);
}

export async function updatePortfolioSection(id: string, patch: SectionUpdate) {
  const { data, error } = await getClient()
    .from('portfolio_sections')
    .update({
      section_name: patch.sectionName,
      description: patch.description,
      is_enabled: patch.isEnabled,
      display_order: patch.displayOrder,
      show_in_navigation: patch.showInNavigation,
    })
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw new Error(`Unable to update portfolio section: ${error.message}`);
  return toConfig(data);
}

export async function archiveCustomSection(id: string) {
  const { error } = await getClient()
    .from('portfolio_sections')
    .update({ is_enabled: false, deleted_at: new Date().toISOString() })
    .eq('id', id)
    .eq('is_system', false);
  if (error) throw new Error(`Unable to archive custom portfolio section: ${error.message}`);
}

export async function saveCustomSectionContent(input: {
  id?: string;
  sectionId: string;
  content: unknown;
  displayOrder: number;
  isPublished: boolean;
}) {
  const row: ContentTable['Insert'] = {
    section_id: input.sectionId,
    content: toJson(input.content),
    display_order: input.displayOrder,
    is_published: input.isPublished,
  };
  if (input.id) row.id = input.id;
  const { data, error } = await getClient()
    .from('custom_section_content')
    .upsert(row, { onConflict: 'id' })
    .select('*')
    .single();
  if (error) throw new Error(`Unable to save custom section content: ${error.message}`);
  return toContentRecord(data);
}

export async function deleteCustomSectionContent(id: string) {
  const { error } = await getClient().from('custom_section_content').delete().eq('id', id);
  if (error) throw new Error(`Unable to delete custom section content: ${error.message}`);
}
