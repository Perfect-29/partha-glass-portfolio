import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Check, Plus, Save, Search, Trash2 } from 'lucide-react';
import { CUSTOM_SECTION_TYPES, emptyCustomSectionContent, isCustomSectionType, isValidCustomSectionContent } from '../data/portfolioSections';
import type { CustomSectionContentRecord, CustomSectionType, PortfolioSectionConfig } from '../data/portfolioSections';
import {
  archiveCustomSection,
  createCustomSection,
  deleteCustomSectionContent,
  saveCustomSectionContent,
  updatePortfolioSection,
} from './supabaseSectionRepository';

type Props = {
  sections: PortfolioSectionConfig[];
  content: CustomSectionContentRecord[];
  onSectionsChange: (sections: PortfolioSectionConfig[]) => void;
  onContentChange: (content: CustomSectionContentRecord[]) => void;
};

type Filter = 'all' | 'enabled' | 'disabled';

function sortedSections(sections: PortfolioSectionConfig[]) {
  return [...sections].sort((left, right) =>
    left.displayOrder - right.displayOrder || left.sectionName.localeCompare(right.sectionName),
  );
}

function sectionKeyFromName(name: string) {
  const slug = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'section';
  return `custom-${slug}-${Date.now().toString(36)}`;
}

export function SectionManagementPanel({ sections, content, onSectionsChange, onContentChange }: Props) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [selectedId, setSelectedId] = useState('');
  const [editingId, setEditingId] = useState('');
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editNavigation, setEditNavigation] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newType, setNewType] = useState<CustomSectionType>('text');
  const [newOrder, setNewOrder] = useState(sections.length + 1);
  const [contentId, setContentId] = useState('');
  const [contentJson, setContentJson] = useState('');
  const [contentOrder, setContentOrder] = useState(0);
  const [contentPublished, setContentPublished] = useState(false);
  const [notice, setNotice] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [working, setWorking] = useState(false);

  const orderedSections = useMemo(() => sortedSections(sections), [sections]);
  const selectedSection = sections.find((section) => section.id === selectedId) ?? null;
  const selectedContent = selectedSection && !selectedSection.isSystem
    ? content.filter((item) => item.sectionId === selectedSection.id).sort((left, right) => left.displayOrder - right.displayOrder)
    : [];
  const visibleSections = orderedSections.filter((section) => {
    const matchesText = !query.trim() ||
      `${section.sectionName} ${section.description}`.toLowerCase().includes(query.trim().toLowerCase());
    const matchesFilter = filter === 'all' || (filter === 'enabled' ? section.isEnabled : !section.isEnabled);
    return matchesText && matchesFilter;
  });
  const orderingFiltered = Boolean(query.trim()) || filter !== 'all';

  const setNoticeFromError = (error: unknown) => {
    setNotice({ type: 'error', text: error instanceof Error ? error.message : 'Unable to save section settings.' });
  };

  const updateLocalSection = (updated: PortfolioSectionConfig) => {
    onSectionsChange(sections.map((section) => section.id === updated.id ? updated : section));
  };

  const toggleSection = async (section: PortfolioSectionConfig) => {
    setWorking(true);
    setNotice(null);
    try {
      const updated = await updatePortfolioSection(section.id, {
        sectionName: section.sectionName,
        description: section.description,
        isEnabled: !section.isEnabled,
        displayOrder: section.displayOrder,
        showInNavigation: section.showInNavigation,
      });
      updateLocalSection(updated);
      setNotice({ type: 'success', text: `${updated.sectionName} is now ${updated.isEnabled ? 'ON' : 'OFF'}.` });
    } catch (error) {
      setNoticeFromError(error);
    } finally {
      setWorking(false);
    }
  };

  const moveSection = async (section: PortfolioSectionConfig, direction: -1 | 1) => {
    const index = orderedSections.findIndex((item) => item.id === section.id);
    const neighbor = orderedSections[index + direction];
    if (!neighbor) return;
    setWorking(true);
    setNotice(null);
    try {
      const updatedCurrent = await updatePortfolioSection(section.id, {
        sectionName: section.sectionName,
        description: section.description,
        isEnabled: section.isEnabled,
        displayOrder: neighbor.displayOrder,
        showInNavigation: section.showInNavigation,
      });
      const updatedNeighbor = await updatePortfolioSection(neighbor.id, {
        sectionName: neighbor.sectionName,
        description: neighbor.description,
        isEnabled: neighbor.isEnabled,
        displayOrder: section.displayOrder,
        showInNavigation: neighbor.showInNavigation,
      });
      onSectionsChange(sections.map((item) => {
        if (item.id === updatedCurrent.id) return updatedCurrent;
        if (item.id === updatedNeighbor.id) return updatedNeighbor;
        return item;
      }));
      setNotice({ type: 'success', text: 'Section order saved.' });
    } catch (error) {
      setNoticeFromError(error);
    } finally {
      setWorking(false);
    }
  };

  const beginEdit = (section: PortfolioSectionConfig) => {
    setSelectedId(section.id);
    setEditingId(section.id);
    setEditName(section.sectionName);
    setEditDescription(section.description);
    setEditNavigation(section.showInNavigation);
    setNotice(null);
  };

  const saveSectionDetails = async () => {
    if (!selectedSection || !editName.trim()) {
      setNotice({ type: 'error', text: 'Enter a section name before saving.' });
      return;
    }
    setWorking(true);
    setNotice(null);
    try {
      const updated = await updatePortfolioSection(selectedSection.id, {
        sectionName: editName.trim(),
        description: editDescription.trim(),
        isEnabled: selectedSection.isEnabled,
        displayOrder: selectedSection.displayOrder,
        showInNavigation: editNavigation,
      });
      updateLocalSection(updated);
      setEditingId('');
      setNotice({ type: 'success', text: 'Section details saved.' });
    } catch (error) {
      setNoticeFromError(error);
    } finally {
      setWorking(false);
    }
  };

  const addSection = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!newName.trim()) {
      setNotice({ type: 'error', text: 'Enter a section name.' });
      return;
    }
    setWorking(true);
    setNotice(null);
    try {
      const created = await createCustomSection({
        sectionKey: sectionKeyFromName(newName),
        sectionName: newName.trim(),
        description: newDescription.trim(),
        sectionType: newType,
        displayOrder: Math.max(1, Math.floor(newOrder)),
      });
      onSectionsChange([...sections, created]);
      setSelectedId(created.id);
      setAdding(false);
      setNewName('');
      setNewDescription('');
      setNewType('text');
      setNewOrder(sections.length + 2);
      setNotice({ type: 'success', text: 'Custom section created. Add content below, then publish it.' });
    } catch (error) {
      setNoticeFromError(error);
    } finally {
      setWorking(false);
    }
  };

  const beginContentEdit = (record?: CustomSectionContentRecord) => {
    if (!selectedSection || selectedSection.isSystem || !isCustomSectionType(selectedSection.sectionType)) return;
    const initial = record?.content ?? emptyCustomSectionContent(selectedSection.sectionType);
    setContentId(record?.id ?? '');
    setContentJson(JSON.stringify(initial, null, 2));
    setContentOrder(record?.displayOrder ?? selectedContent.length);
    setContentPublished(record?.isPublished ?? false);
    setNotice(null);
  };

  const saveContent = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedSection || selectedSection.isSystem || !isCustomSectionType(selectedSection.sectionType)) return;
    let parsed: unknown;
    try {
      parsed = JSON.parse(contentJson);
    } catch {
      setNotice({ type: 'error', text: 'Content must be valid JSON.' });
      return;
    }
    if (!isValidCustomSectionContent(selectedSection.sectionType, parsed)) {
      setNotice({ type: 'error', text: `Content does not match the ${selectedSection.sectionType} section format.` });
      return;
    }

    setWorking(true);
    setNotice(null);
    try {
      const saved = await saveCustomSectionContent({
        ...(contentId ? { id: contentId } : {}),
        sectionId: selectedSection.id,
        content: parsed,
        displayOrder: Math.max(0, Math.floor(contentOrder)),
        isPublished: contentPublished,
      });
      onContentChange([
        ...content.filter((record) => record.id !== saved.id),
        saved,
      ]);
      setContentId(saved.id);
      setNotice({ type: 'success', text: contentPublished ? 'Content saved and published.' : 'Content saved as a draft.' });
    } catch (error) {
      setNoticeFromError(error);
    } finally {
      setWorking(false);
    }
  };

  const removeContent = async (record: CustomSectionContentRecord) => {
    if (!window.confirm('Delete this custom content item? Uploaded files are not removed.')) return;
    setWorking(true);
    setNotice(null);
    try {
      await deleteCustomSectionContent(record.id);
      onContentChange(content.filter((item) => item.id !== record.id));
      if (contentId === record.id) setContentId('');
      setNotice({ type: 'success', text: 'Content item deleted.' });
    } catch (error) {
      setNoticeFromError(error);
    } finally {
      setWorking(false);
    }
  };

  const removeSection = async (section: PortfolioSectionConfig) => {
    if (section.isSystem || !window.confirm(`Archive “${section.sectionName}”? It will disappear publicly, but its content and uploaded files will be retained.`)) return;
    setWorking(true);
    setNotice(null);
    try {
      await archiveCustomSection(section.id);
      onSectionsChange(sections.filter((item) => item.id !== section.id));
      onContentChange(content.filter((item) => item.sectionId !== section.id));
      if (selectedId === section.id) setSelectedId('');
      setNotice({ type: 'success', text: 'Custom section archived. Its database content and files are preserved.' });
    } catch (error) {
      setNoticeFromError(error);
    } finally {
      setWorking(false);
    }
  };

  return (
    <section className="glass rounded-3xl p-4 sm:p-6">
      <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-white">Dynamic section management</h2>
          <p className="mt-1 text-sm text-gray-400">Control visibility and order without deleting portfolio records.</p>
        </div>
        <button type="button" onClick={() => setAdding((value) => !value)} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-red-700 to-red-500 px-4 py-3 text-xs font-black uppercase tracking-wider text-white">
          <Plus size={16} /> Add New Section
        </button>
      </header>

      {notice && (
        <div role={notice.type === 'error' ? 'alert' : 'status'} className={`mb-4 rounded-xl border px-4 py-3 text-sm ${notice.type === 'error' ? 'border-red-400/20 bg-red-950/20 text-red-100' : 'border-emerald-400/20 bg-emerald-950/20 text-emerald-100'}`}>
          {notice.text}
        </div>
      )}

      {adding && (
        <form onSubmit={(event) => void addSection(event)} className="mb-5 grid gap-3 rounded-2xl border border-red-400/20 bg-black/20 p-4 md:grid-cols-2">
          <label className="text-xs font-bold text-gray-300">
            Section Name
            <input value={newName} onChange={(event) => setNewName(event.target.value)} maxLength={120} required className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-white" />
          </label>
          <label className="text-xs font-bold text-gray-300">
            Section Type
            <select value={newType} onChange={(event) => setNewType(event.target.value as CustomSectionType)} className="mt-2 w-full rounded-xl border border-white/10 bg-[#111014] px-3 py-2.5 text-white">
              {CUSTOM_SECTION_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
            </select>
          </label>
          <label className="text-xs font-bold text-gray-300 md:col-span-2">
            Section Description
            <textarea value={newDescription} onChange={(event) => setNewDescription(event.target.value)} maxLength={1000} rows={2} className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-white" />
          </label>
          <label className="text-xs font-bold text-gray-300">
            Display Order
            <input type="number" min={1} required value={newOrder} onChange={(event) => setNewOrder(Number(event.target.value))} className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-white" />
          </label>
          <div className="flex items-end gap-2">
            <button type="submit" disabled={working} className="rounded-xl bg-red-700 px-4 py-2.5 text-xs font-black uppercase text-white disabled:opacity-50">Create Section</button>
            <button type="button" onClick={() => setAdding(false)} className="rounded-xl border border-white/10 px-4 py-2.5 text-xs font-bold text-gray-300">Cancel</button>
          </div>
        </form>
      )}

      <div className="mb-4 grid gap-3 sm:grid-cols-[1fr_auto]">
        <label className="relative block">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search sections" className="w-full rounded-xl border border-white/10 bg-black/30 py-2.5 pl-10 pr-3 text-sm text-white placeholder:text-gray-500" />
        </label>
        <select value={filter} onChange={(event) => setFilter(event.target.value as Filter)} aria-label="Filter sections by visibility" className="rounded-xl border border-white/10 bg-[#111014] px-3 py-2.5 text-sm text-white">
          <option value="all">All sections</option>
          <option value="enabled">Enabled</option>
          <option value="disabled">Disabled</option>
        </select>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
        <div className="space-y-2">
          {visibleSections.map((section) => {
            const orderIndex = orderedSections.findIndex((item) => item.id === section.id);
            return (
              <article key={section.id} className={`rounded-2xl border p-3 ${selectedId === section.id ? 'border-red-400/35 bg-red-950/15' : 'border-white/5 bg-black/20'}`}>
                <div className="flex items-center gap-3">
                  <button type="button" onClick={() => setSelectedId(section.id)} className="min-w-0 flex-1 text-left">
                    <span className="block truncate text-sm font-bold text-white">{section.sectionName}</span>
                    <span className="mt-1 block text-[10px] uppercase tracking-wider text-gray-500">
                      {section.isSystem ? 'System section' : section.sectionType}
                      {!section.isPublic && ' · Admin only'}
                      {' · Order '}{section.displayOrder}
                    </span>
                  </button>
                  <div className="flex items-center gap-1">
                    <button type="button" aria-label={`Move ${section.sectionName} up`} title={orderingFiltered ? 'Clear search and filters to reorder sections.' : undefined} disabled={working || orderingFiltered || orderIndex === 0} onClick={() => void moveSection(section, -1)} className="rounded-lg p-2 text-gray-400 hover:text-white disabled:opacity-30"><ArrowUp size={15} /></button>
                    <button type="button" aria-label={`Move ${section.sectionName} down`} title={orderingFiltered ? 'Clear search and filters to reorder sections.' : undefined} disabled={working || orderingFiltered || orderIndex === orderedSections.length - 1} onClick={() => void moveSection(section, 1)} className="rounded-lg p-2 text-gray-400 hover:text-white disabled:opacity-30"><ArrowDown size={15} /></button>
                    <button type="button" disabled={working} onClick={() => beginEdit(section)} className="rounded-lg border border-white/10 px-2.5 py-2 text-[10px] font-bold uppercase text-gray-300">Edit</button>
                    {!section.isSystem && <button type="button" disabled={working} aria-label={`Archive ${section.sectionName}`} onClick={() => void removeSection(section)} className="rounded-lg p-2 text-red-300 hover:bg-red-950/30"><Trash2 size={15} /></button>}
                  </div>
                </div>
                <label className="mt-3 flex items-center justify-between gap-3 text-xs text-gray-300">
                  <span>Visibility <strong className={section.isEnabled ? 'text-emerald-300' : 'text-gray-500'}>{section.isEnabled ? 'ON' : 'OFF'}</strong></span>
                  <input type="checkbox" checked={section.isEnabled} disabled={working} onChange={() => void toggleSection(section)} aria-label={`Toggle ${section.sectionName} visibility`} className="h-5 w-5 accent-red-500" />
                </label>
              </article>
            );
          })}
          {!visibleSections.length && <p className="rounded-2xl border border-white/5 p-5 text-sm text-gray-400">No sections match this search/filter.</p>}
        </div>

        <div className="space-y-4">
          {selectedSection && editingId === selectedSection.id && (
            <form onSubmit={(event) => { event.preventDefault(); void saveSectionDetails(); }} className="space-y-3 rounded-2xl border border-white/10 bg-black/20 p-4">
              <h3 className="font-bold text-white">Edit section details</h3>
              <label className="block text-xs font-bold text-gray-300">Section Name
                <input value={editName} onChange={(event) => setEditName(event.target.value)} maxLength={120} required className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-white" />
              </label>
              <label className="block text-xs font-bold text-gray-300">Description
                <textarea value={editDescription} onChange={(event) => setEditDescription(event.target.value)} maxLength={1000} rows={3} className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-white" />
              </label>
              <label className="flex items-center gap-2 text-xs text-gray-300">
                <input type="checkbox" checked={editNavigation} onChange={(event) => setEditNavigation(event.target.checked)} className="h-4 w-4 accent-red-500" />
                Show in public navigation
              </label>
              <button type="submit" disabled={working} className="inline-flex items-center gap-2 rounded-xl bg-red-700 px-4 py-2.5 text-xs font-black uppercase text-white disabled:opacity-50"><Save size={14} /> Save details</button>
            </form>
          )}

          {selectedSection && !selectedSection.isSystem && isCustomSectionType(selectedSection.sectionType) && (
            <div className="space-y-4 rounded-2xl border border-white/10 bg-black/20 p-4">
              <div>
                <h3 className="font-bold text-white">Manage {selectedSection.sectionName} content</h3>
                <p className="mt-1 text-xs text-gray-400">Use JSON matching the selected content type. Raw HTML is not rendered.</p>
              </div>
              <div className="space-y-2">
                {selectedContent.map((record, index) => (
                  <div key={record.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/5 px-3 py-2">
                    <span className="min-w-0 truncate text-xs text-gray-300">Item {index + 1} · {record.isPublished ? 'Published' : 'Draft'}</span>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => beginContentEdit(record)} className="rounded-lg border border-white/10 px-2 py-1 text-[10px] font-bold text-gray-300">Edit</button>
                      <button type="button" disabled={working} onClick={() => void removeContent(record)} className="rounded-lg p-1 text-red-300"><Trash2 size={14} /></button>
                    </div>
                  </div>
                ))}
              </div>
              <button type="button" onClick={() => beginContentEdit()} className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs font-bold text-gray-200"><Plus size={14} /> Add content item</button>
              {contentJson && (
                <form onSubmit={(event) => void saveContent(event)} className="space-y-3 border-t border-white/10 pt-4">
                  <label className="block text-xs font-bold text-gray-300">Content JSON
                    <textarea value={contentJson} onChange={(event) => setContentJson(event.target.value)} spellCheck={false} rows={14} className="mt-2 w-full rounded-xl border border-white/10 bg-[#07070a] p-3 font-mono text-xs leading-relaxed text-gray-200" />
                  </label>
                  <label className="block text-xs font-bold text-gray-300">Display Order
                    <input type="number" min={0} value={contentOrder} onChange={(event) => setContentOrder(Number(event.target.value))} className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-white" />
                  </label>
                  <label className="flex items-center gap-2 text-xs text-gray-300">
                    <input type="checkbox" checked={contentPublished} onChange={(event) => setContentPublished(event.target.checked)} className="h-4 w-4 accent-red-500" />
                    Publish this content item
                  </label>
                  <button type="submit" disabled={working} className="inline-flex items-center gap-2 rounded-xl bg-red-700 px-4 py-2.5 text-xs font-black uppercase text-white disabled:opacity-50"><Check size={14} /> Save content</button>
                </form>
              )}
            </div>
          )}

          {!selectedSection && <p className="rounded-2xl border border-white/5 p-5 text-sm text-gray-400">Select a section to edit its details or custom content.</p>}
        </div>
      </div>
    </section>
  );
}
