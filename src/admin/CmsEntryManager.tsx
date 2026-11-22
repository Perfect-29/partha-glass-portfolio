import { useState } from 'react';
import { ArrowDown, ArrowUp, ExternalLink, FileImage, FileText, Plus, Save, Trash2, Upload } from 'lucide-react';
import type { ManagedEntry } from '../data/portfolioData';
import { uploadPortfolioAsset } from './supabaseAdminRepository';

export interface CmsField {
  key: string;
  label: string;
  type?: 'text' | 'url' | 'date' | 'textarea' | 'list' | 'checkbox';
  optional?: boolean;
}

export interface CmsAsset {
  field: string;
  label: string;
  folder: string;
  accept: string;
  allowedTypes: string[];
  metadataPrefix?: string;
  required?: boolean;
}

interface CmsEntryManagerProps<T extends ManagedEntry> {
  title: string;
  collectionName: string;
  records: T[];
  fields: CmsField[];
  titleField: string;
  assets?: CmsAsset[];
  createEntry: () => T;
  onChange: (records: T[]) => void;
  onDirtyChange: (dirty: boolean) => void;
  getRecordLabel?: (record: T) => string;
  canEditField?: (record: T, field: CmsField) => boolean;
  canDeleteRecord?: (record: T) => boolean;
  canChangePublished?: (record: T) => boolean;
}

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'entry';
}

function isValidOptionalHttpUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return true;
  if (trimmed.length > 2048) return false;
  try {
    const url = new URL(trimmed);
    return (url.protocol === 'http:' || url.protocol === 'https:') &&
      Boolean(url.hostname) &&
      !url.username &&
      !url.password;
  } catch {
    return false;
  }
}

export function CmsEntryManager<T extends ManagedEntry>({
  title,
  collectionName,
  records,
  fields,
  titleField,
  assets = [],
  createEntry,
  onChange,
  onDirtyChange,
  getRecordLabel,
  canEditField,
  canDeleteRecord,
  canChangePublished,
}: CmsEntryManagerProps<T>) {
  const [draft, setDraft] = useState<T | null>(null);
  const [selectedId, setSelectedId] = useState('');
  const [isNew, setIsNew] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [notice, setNotice] = useState('');

  const openEntry = (record: T) => {
    if (dirty && !window.confirm('Discard unsaved entry changes?')) return;
    setDraft({ ...record });
    setSelectedId(record.id);
    setIsNew(false);
    setDirty(false);
    onDirtyChange(false);
    setNotice('');
  };

  const addEntry = () => {
    if (dirty && !window.confirm('Discard unsaved entry changes?')) return;
    const entry = createEntry();
    setDraft(entry);
    setSelectedId(entry.id);
    setIsNew(true);
    setDirty(true);
    onDirtyChange(true);
    setNotice('Complete this entry, then save it to the draft.');
  };

  const updateField = (key: string, value: string) => {
    if (!draft) return;
    const field = fields.find((item) => item.key === key);
    const nextValue = field?.type === 'list'
      ? value.split('\n').map((item) => item.trim()).filter(Boolean)
      : field?.type === 'url'
        ? value.trim()
        : value;
    setDraft({ ...draft, [key]: nextValue });
    setDirty(true);
    onDirtyChange(true);
  };

  const updateCheckbox = (key: string, checked: boolean) => {
    if (!draft) return;
    setDraft({ ...draft, [key]: checked });
    setDirty(true);
    onDirtyChange(true);
  };

  const saveEntry = () => {
    if (!draft) return;
    const label = draft[titleField];
    if (typeof label !== 'string' || !label.trim()) {
      setNotice(`Enter a ${fields.find((field) => field.key === titleField)?.label.toLowerCase() ?? 'title'} before saving.`);
      return;
    }
    const missing = fields.find((field) => {
      if (field.optional || field.type === 'checkbox') return false;
      const value = draft[field.key];
      return Array.isArray(value) ? value.length === 0 : typeof value !== 'string' || !value.trim();
    });
    if (missing) {
      setNotice(`Complete the ${missing.label.toLowerCase()} field before saving.`);
      return;
    }
    const invalidUrl = fields.find((field) => {
      if (field.type !== 'url') return false;
      const value = draft[field.key];
      if (typeof value !== 'string') return !field.optional;
      return !isValidOptionalHttpUrl(value);
    });
    if (invalidUrl) {
      setNotice(`Enter a valid http or https URL for ${invalidUrl.label.toLowerCase()}.`);
      return;
    }
    const missingAsset = assets.find((asset) => asset.required && !(typeof draft[asset.field] === 'string' && (draft[asset.field] as string).trim()));
    if (missingAsset) {
      setNotice(`Upload the ${missingAsset.label.toLowerCase()} before saving.`);
      return;
    }
    const baseId = isNew ? slugify(label) : draft.id;
    const existingIds = new Set(records.filter((item) => item.id !== selectedId).map((item) => item.id));
    let id = baseId;
    let suffix = 2;
    while (existingIds.has(id)) id = `${baseId}-${suffix++}`;
    const normalizedDraft = fields.reduce(
      (entry, field) => {
        if (field.type !== 'url') return entry;
        const value = entry[field.key];
        return typeof value === 'string'
          ? { ...entry, [field.key]: value.trim() }
          : entry;
      },
      { ...draft } as T,
    );
    const saved: T = { ...normalizedDraft, id };
    const nextRecords = isNew
      ? [...records, saved]
      : records.map((item) => item.id === selectedId ? saved : item);
    onChange(nextRecords);
    setDraft(saved);
    setSelectedId(saved.id);
    setIsNew(false);
    setDirty(false);
    onDirtyChange(false);
    setNotice('Entry is ready to save. Use Save draft or Publish to sync it with Supabase.');
  };

  const deleteEntry = () => {
    if (!draft || isNew) {
      setDraft(null);
      setSelectedId('');
      setIsNew(false);
      setDirty(false);
      onDirtyChange(false);
      return;
    }
    const nextRecords = records.filter((item) => item.id !== draft.id);
    onChange(nextRecords);
    setDraft(nextRecords[0] ? { ...nextRecords[0] } : null);
    setSelectedId(nextRecords[0]?.id ?? '');
    setDirty(false);
    onDirtyChange(false);
    setNotice('Entry marked for deletion. Confirm when saving or publishing to apply this change.');
  };

  const moveEntry = (offset: -1 | 1) => {
    if (!draft || dirty || isNew) return;
    const from = records.findIndex((item) => item.id === draft.id);
    const to = from + offset;
    if (from < 0 || to < 0 || to >= records.length) return;
    const nextRecords = [...records];
    [nextRecords[from], nextRecords[to]] = [nextRecords[to], nextRecords[from]];
    onChange(nextRecords);
  };

  const togglePublished = () => {
    if (!draft) return;
    setDraft({ ...draft, published: draft.published === false });
    setDirty(true);
    onDirtyChange(true);
  };

  const uploadAsset = async (asset: CmsAsset, file: File) => {
    if (!draft || uploading) return;
    const limit = file.type === 'application/pdf' ? 15 * 1024 * 1024 : 10 * 1024 * 1024;
    if (!asset.allowedTypes.includes(file.type) || file.size >= limit) {
      setNotice(file.type === 'application/pdf'
        ? 'Choose a PDF under 15 MB.'
        : 'Choose a JPG or PNG image under 10 MB.');
      return;
    }

    setUploading(asset.field);
    setNotice('');
    try {
      const url = await uploadPortfolioAsset(file, asset.folder, draft.id);
      const prefix = asset.metadataPrefix ?? '';
      const fieldPrefix = prefix;
      const next: T = {
        ...draft,
        [asset.field]: url,
        [`${fieldPrefix}FileName`]: file.name,
        [`${fieldPrefix}FileType`]: file.type,
        [`${fieldPrefix}FileSize`]: file.size,
        ...(asset.field === 'fileUrl' ? { uploadedAt: new Date().toISOString() } : {}),
      };
      setDraft(next);
      setDirty(true);
      onDirtyChange(true);
      setNotice('File uploaded. Save this entry, then save or publish the Supabase changes.');
    } catch (error) {
      console.error(`Supabase Storage upload failed for ${collectionName}.`, error);
      setNotice(error instanceof Error ? error.message : 'Upload failed. Check Supabase Storage buckets, policies, and network connection.');
    } finally {
      setUploading(null);
    }
  };

  const active = draft ?? records.find((item) => item.id === selectedId) ?? null;

  return (
    <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(220px,.7fr)_minmax(0,1.3fr)]">
      <section className="rounded-2xl border border-white/5 bg-black/20 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="font-black text-white">{title}</h3>
            <p className="mt-1 text-[11px] text-gray-500">{records.length} saved entries</p>
          </div>
          <button type="button" onClick={addEntry} className="inline-flex items-center gap-1.5 rounded-xl border border-red-400/25 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-red-100 hover:bg-red-950/30">
            <Plus size={14} /> Add
          </button>
        </div>
        <div className="mt-4 space-y-2">
          {records.map((record) => {
            const label = record[titleField];
            const recordLabel = getRecordLabel?.(record);
            return (
              <button
                type="button"
                key={record.id}
                onClick={() => openEntry(record)}
                className={`w-full rounded-xl border px-3 py-3 text-left transition ${selectedId === record.id ? 'border-red-400/30 bg-red-950/25' : 'border-white/5 bg-black/20 hover:border-white/15'}`}
              >
                <span className="block truncate text-sm font-bold text-gray-100">{typeof label === 'string' && label ? label : record.id}</span>
                <span className={`mt-1 block text-[9px] font-bold uppercase tracking-wider ${record.published === false ? 'text-amber-300' : 'text-emerald-300'}`}>
                  {record.published === false ? 'Unpublished' : 'Published'}
                </span>
                {recordLabel && <span className="mt-1 block text-[9px] font-bold uppercase tracking-wider text-gray-500">{recordLabel}</span>}
              </button>
            );
          })}
          {records.length === 0 && <p className="rounded-xl border border-white/5 p-4 text-xs leading-relaxed text-gray-500">No entries have been added. Add a verified record to get started.</p>}
        </div>
      </section>

      <section className="min-w-0 rounded-2xl border border-white/5 bg-black/20 p-4 sm:p-5">
        {active ? (
          <>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-black text-white">{isNew ? `New ${title.toLowerCase().replace(/s$/, '')}` : 'Edit entry'}</h3>
                <p className="mt-1 text-[10px] text-gray-500">Save changes to Supabase; published records update publicly when saved.</p>
              </div>
              <div className="flex items-center gap-2">
                {!isNew && (
                  <>
                    <button type="button" onClick={() => moveEntry(-1)} disabled={dirty || records.findIndex((item) => item.id === active.id) <= 0} title="Move up" className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 text-gray-200 disabled:opacity-30"><ArrowUp size={15} /></button>
                    <button type="button" onClick={() => moveEntry(1)} disabled={dirty || records.findIndex((item) => item.id === active.id) >= records.length - 1} title="Move down" className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 text-gray-200 disabled:opacity-30"><ArrowDown size={15} /></button>
                  </>
                )}
                <button type="button" onClick={deleteEntry} disabled={canDeleteRecord ? !canDeleteRecord(active) : false} className="grid h-9 w-9 place-items-center rounded-lg border border-red-400/20 text-red-200 hover:bg-red-950/30 disabled:cursor-not-allowed disabled:opacity-30" aria-label="Delete entry"><Trash2 size={15} /></button>
              </div>
            </div>
            {getRecordLabel?.(active) && (
              <p className="mb-4 rounded-xl border border-white/5 bg-black/20 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                Source: {getRecordLabel(active)}
              </p>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              {fields.map((field) => {
                const value = active[field.key];
                const textValue = Array.isArray(value) ? value.join('\n') : typeof value === 'string' ? value : '';
                const editable = canEditField?.(active, field) ?? true;
                const common = {
                  id: `cms-${collectionName}-${field.key}`,
                  value: textValue,
                  onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => updateField(field.key, event.target.value),
                  required: !field.optional,
                  disabled: !editable,
                  placeholder: field.optional ? 'Optional' : field.label,
                  className: `mt-2 w-full rounded-xl border border-white/10 bg-[#08080a] px-3 py-3 text-sm text-gray-100 placeholder:text-gray-600 outline-none focus:border-red-400/40 disabled:cursor-not-allowed disabled:opacity-50`,
                };
                return (
                  <label key={field.key} htmlFor={common.id} className={`block text-[10px] font-bold uppercase tracking-wider text-gray-400 ${field.type === 'textarea' || field.type === 'list' ? 'sm:col-span-2' : ''}`}>
                    {field.label}
                    {field.type === 'checkbox' ? (
                      <input
                        id={common.id}
                        type="checkbox"
                        checked={value === true}
                        onChange={(event) => updateCheckbox(field.key, event.target.checked)}
                        className="mt-3 h-4 w-4 accent-red-500"
                      />
                    ) : field.type === 'textarea' || field.type === 'list' ? (
                      <textarea {...common} rows={field.type === 'list' ? 3 : 5} placeholder={field.type === 'list' ? 'One item per line' : common.placeholder} />
                    ) : (
                      <input {...common} type={field.type === 'url' ? 'url' : field.type === 'date' ? 'date' : 'text'} />
                    )}
                  </label>
                );
              })}
            </div>

            <label className="mt-4 flex items-center gap-3 rounded-xl border border-white/5 bg-black/20 p-3 text-xs font-bold text-gray-300">
              <input
                type="checkbox"
                checked={active.published !== false}
                onChange={togglePublished}
                disabled={canChangePublished ? !canChangePublished(active) : false}
                className="h-4 w-4 accent-red-500 disabled:cursor-not-allowed"
              />
              {canChangePublished?.(active) === false
                ? 'Publication status follows the source record.'
                : 'Publish this entry when the portfolio is published'}
            </label>

            {assets.map((asset) => {
              const url = typeof active[asset.field] === 'string' ? active[asset.field] as string : '';
              const previewType = typeof active[`${asset.metadataPrefix ?? ''}FileType`] === 'string'
                ? active[`${asset.metadataPrefix ?? ''}FileType`] as string
                : '';
              const isPdf = previewType === 'application/pdf' || (!previewType && url.toLowerCase().includes('.pdf'));
              const inputId = `cms-upload-${collectionName}-${asset.field}`;
              return (
                <div key={asset.field} className="mt-4 rounded-xl border border-white/5 bg-black/20 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="flex items-center gap-2 text-xs font-bold text-gray-200">
                      {isPdf ? <FileText size={16} className="text-red-300" /> : <FileImage size={16} className="text-red-300" />}
                      {asset.label}
                    </span>
                    <label htmlFor={inputId} className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-gray-200 hover:border-red-400/30">
                      <Upload size={13} /> {uploading === asset.field ? 'Uploading…' : 'Upload'}
                      <input
                        id={inputId}
                        type="file"
                        accept={asset.accept}
                        disabled={uploading !== null}
                        className="sr-only"
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          event.target.value = '';
                          if (file) void uploadAsset(asset, file);
                        }}
                      />
                    </label>
                  </div>
                  {url && (
                    <div className="mt-3 overflow-hidden rounded-lg border border-white/10 bg-black/40">
                      {isPdf ? (
                        <iframe title={`${asset.label} preview`} src={url} className="h-64 w-full" />
                      ) : (
                        <img src={url} alt={`${asset.label} preview`} loading="lazy" className="max-h-72 w-full object-contain" />
                      )}
                      <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-1.5 border-t border-white/10 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-red-200 hover:text-white">
                        Open preview <ExternalLink size={12} />
                      </a>
                    </div>
                  )}
                  {url && typeof active[`${asset.metadataPrefix ?? ''}FileName`] === 'string' && (
                    <p className="mt-2 truncate text-[10px] text-gray-500">{active[`${asset.metadataPrefix ?? ''}FileName`] as string}</p>
                  )}
                </div>
              );
            })}

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
              <span className="text-[10px] text-gray-500">{dirty ? 'Unsaved entry changes' : 'Entry synced to editor'}</span>
              <button type="button" onClick={saveEntry} disabled={!dirty} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-red-700 to-red-500 px-4 py-2.5 text-xs font-black uppercase tracking-wider text-white disabled:cursor-not-allowed disabled:opacity-40">
                <Save size={14} /> Save entry
              </button>
            </div>
          </>
        ) : (
          <div className="grid min-h-60 place-items-center rounded-xl border border-dashed border-white/10 p-8 text-center">
            <div>
              <FileText className="mx-auto h-8 w-8 text-gray-600" />
              <p className="mt-3 text-sm font-semibold text-gray-300">Select or add an entry</p>
              <p className="mt-1 text-xs text-gray-500">Your changes are saved in the portfolio draft before publication.</p>
            </div>
          </div>
        )}
        {notice && <p role="status" className="mt-4 rounded-xl border border-red-400/15 bg-red-950/20 px-3 py-2.5 text-xs text-red-100">{notice}</p>}
      </section>
    </div>
  );
}
