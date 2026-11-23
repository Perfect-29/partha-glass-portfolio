import { useEffect, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  BrainCircuit,
  Code2,
  Database,
  Globe2,
  Plus,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { DEFAULT_PORTFOLIO_CONTENT } from '../data/portfolioData';
import type { HeroContent, HeroFeature, HeroFeatureIcon } from '../data/portfolioData';

const FEATURE_ICONS: Record<HeroFeatureIcon, { label: string; Icon: LucideIcon }> = {
  sparkles: { label: 'Sparkles', Icon: Sparkles },
  brain: { label: 'Brain', Icon: BrainCircuit },
  code: { label: 'Code', Icon: Code2 },
  database: { label: 'Database', Icon: Database },
  globe: { label: 'Globe', Icon: Globe2 },
  shield: { label: 'Shield', Icon: ShieldCheck },
};

const HERO_IMAGE_SIZE_LIMIT = 10 * 1024 * 1024;
const HERO_IMAGE_MAX_DIMENSION = 1920;

const fieldClassName = 'glass-input w-full rounded-xl px-4 py-3 text-sm font-medium normal-case tracking-normal text-white';
const fieldLabelClassName = 'flex min-w-0 flex-col gap-2 text-xs font-bold uppercase tracking-wider text-gray-400';

async function optimizeHeroImage(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, HERO_IMAGE_MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size <= 2 * 1024 * 1024) return file;

    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('The selected image could not be optimized in this browser.');
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (result) => result
          ? resolve(result)
          : reject(new Error('The selected image could not be optimized in this browser.')),
        file.type,
        file.type === 'image/jpeg' ? 0.86 : undefined,
      );
    });
    return new File([blob], file.name, { type: file.type, lastModified: Date.now() });
  } finally {
    bitmap.close();
  }
}

export function HeroSettingsManager({
  settings,
  uploading,
  onChange,
  onUpload,
}: {
  settings: HeroContent;
  uploading: boolean;
  onChange: (settings: HeroContent) => void;
  onUpload: (file: File) => void;
}) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [localPreview, setLocalPreview] = useState('');
  const [optimizing, setOptimizing] = useState(false);
  const [imageError, setImageError] = useState('');

  useEffect(() => {
    if (!selectedFile) {
      setLocalPreview('');
      return;
    }
    const url = URL.createObjectURL(selectedFile);
    setLocalPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [selectedFile]);

  const updateFeature = (id: string, patch: Partial<HeroFeature>) => {
    onChange({
      ...settings,
      features: settings.features.map((feature) => feature.id === id ? { ...feature, ...patch } : feature),
    });
  };

  const moveFeature = (index: number, offset: -1 | 1) => {
    const destination = index + offset;
    if (destination < 0 || destination >= settings.features.length) return;
    const features = [...settings.features];
    [features[index], features[destination]] = [features[destination], features[index]];
    onChange({ ...settings, features });
  };

  const addFeature = () => {
    const baseId = `hero-feature-${Date.now()}`;
    const ids = new Set(settings.features.map((feature) => feature.id));
    let id = baseId;
    let suffix = 2;
    while (ids.has(id)) id = `${baseId}-${suffix++}`;
    onChange({
      ...settings,
      features: [...settings.features, { id, icon: 'sparkles', name: 'New feature', enabled: true }],
    });
  };

  const uploadSelectedImage = async () => {
    if (!selectedFile) return;
    setOptimizing(true);
    setImageError('');
    try {
      onUpload(await optimizeHeroImage(selectedFile));
    } catch (error) {
      setImageError(error instanceof Error ? error.message : 'The selected image could not be prepared for upload.');
    } finally {
      setOptimizing(false);
    }
  };

  return (
    <div className="mt-5 space-y-6">
      <section className="glass rounded-2xl p-4 sm:p-5" aria-labelledby="hero-image-heading">
        <div className="mb-4">
          <h3 id="hero-image-heading" className="text-sm font-black text-white">Profile image</h3>
          <p className="mt-1 text-xs leading-relaxed text-gray-400">
            Choose a JPG or PNG under 10 MB. The public image changes only after you save or publish.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
          <div className="overflow-hidden rounded-xl border border-white/10 bg-black/30">
            <img
              src={localPreview || settings.image || DEFAULT_PORTFOLIO_CONTENT.hero.image}
              alt={settings.imageAlt}
              className="h-48 w-full object-cover sm:h-60"
              style={{ objectPosition: settings.imagePosition }}
              decoding="async"
            />
          </div>
          <div className="flex flex-wrap gap-2 md:flex-col">
            <label className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-gray-200 hover:border-red-400/30">
              <Upload size={15} aria-hidden="true" />
              Choose image
              <input
                type="file"
                accept="image/jpeg,image/png,.jpg,.jpeg,.png"
                className="sr-only"
                onChange={(event) => {
                  const file = event.currentTarget.files?.[0] ?? null;
                  setImageError('');
                  if (file && (!['image/jpeg', 'image/png'].includes(file.type) || file.size >= HERO_IMAGE_SIZE_LIMIT)) {
                    setSelectedFile(null);
                    setImageError('Choose a JPG or PNG image under 10 MB.');
                  } else {
                    setSelectedFile(file);
                  }
                  event.currentTarget.value = '';
                }}
              />
            </label>
            <button
              type="button"
              disabled={!selectedFile || uploading || optimizing}
              onClick={() => void uploadSelectedImage()}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-red-700 to-red-500 px-4 py-2.5 text-xs font-black uppercase tracking-wider text-white hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Upload size={15} aria-hidden="true" />
              {optimizing ? 'Optimizing…' : uploading ? 'Uploading…' : 'Upload image'}
            </button>
            <button
              type="button"
              disabled={uploading}
              onClick={() => {
                setSelectedFile(null);
                onChange({ ...settings, image: DEFAULT_PORTFOLIO_CONTENT.hero.image });
              }}
              className="min-h-11 rounded-xl border border-white/10 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-gray-300 hover:border-red-400/30 disabled:opacity-50"
            >
              Restore default photo
            </button>
          </div>
        </div>
        {selectedFile && (
          <p className="mt-3 text-xs text-gray-400">
            Selected: <span className="text-gray-200">{selectedFile.name}</span>. Upload it before saving to use it on the public page.
          </p>
        )}
        {imageError && <p role="alert" className="mt-3 text-xs text-red-200">{imageError}</p>}
      </section>

      <section className="glass rounded-2xl p-4 sm:p-5" aria-labelledby="hero-details-heading">
        <h3 id="hero-details-heading" className="mb-4 text-sm font-black text-white">Hero details</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className={fieldLabelClassName}>
            Main name
            <input
              value={settings.headline}
              onChange={(event) => onChange({ ...settings, headline: event.target.value })}
              className={fieldClassName}
            />
          </label>
          <label className={fieldLabelClassName}>
            Professional title
            <input
              value={settings.roles[0]}
              onChange={(event) => onChange({ ...settings, roles: [event.target.value, settings.roles[1]] })}
              className={fieldClassName}
            />
          </label>
          <label className={fieldLabelClassName}>
            Small heading / eyebrow
            <input
              value={settings.eyebrow}
              onChange={(event) => onChange({ ...settings, eyebrow: event.target.value })}
              className={fieldClassName}
            />
          </label>
          <label className={`${fieldLabelClassName} sm:col-span-2`}>
            Short description
            <textarea
              rows={3}
              value={settings.tagline}
              onChange={(event) => onChange({ ...settings, tagline: event.target.value })}
              className={`${fieldClassName} resize-y`}
            />
          </label>
          <label className={fieldLabelClassName}>
            Primary button text
            <input
              value={settings.primaryButton}
              onChange={(event) => onChange({ ...settings, primaryButton: event.target.value })}
              className={fieldClassName}
            />
          </label>
          <label className={fieldLabelClassName}>
            Primary button link
            <input
              value={settings.primaryButtonLink}
              onChange={(event) => onChange({ ...settings, primaryButtonLink: event.target.value })}
              className={fieldClassName}
              placeholder="#projects or https://example.com"
            />
          </label>
          <label className={fieldLabelClassName}>
            Secondary button text
            <input
              value={settings.secondaryButton}
              onChange={(event) => onChange({ ...settings, secondaryButton: event.target.value })}
              className={fieldClassName}
            />
          </label>
          <label className={fieldLabelClassName}>
            Secondary button link
            <input
              value={settings.secondaryButtonLink}
              onChange={(event) => onChange({ ...settings, secondaryButtonLink: event.target.value })}
              className={fieldClassName}
              placeholder="#contact or https://example.com"
            />
          </label>
        </div>
      </section>

      <section className="glass rounded-2xl p-4 sm:p-5" aria-labelledby="hero-features-heading">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 id="hero-features-heading" className="text-sm font-black text-white">Optional hero features</h3>
            <p className="mt-1 text-xs text-gray-400">Feature labels appear in the public hero only when display is enabled.</p>
          </div>
          <label className="inline-flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-white/10 bg-black/30 px-4 py-2 text-xs font-bold uppercase tracking-wider text-gray-200">
            <input
              type="checkbox"
              checked={settings.showFeatures}
              onChange={(event) => onChange({ ...settings, showFeatures: event.target.checked })}
              className="h-4 w-4 accent-red-500"
            />
            Display features
          </label>
        </div>
        <div className="mt-4 space-y-3">
          {settings.features.map((feature, index) => {
            const { Icon } = FEATURE_ICONS[feature.icon];
            return (
              <div key={feature.id} className="grid gap-3 rounded-xl border border-white/8 bg-black/20 p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_180px]">
                  <label className={fieldLabelClassName}>
                    Feature name
                    <input
                      value={feature.name}
                      onChange={(event) => updateFeature(feature.id, { name: event.target.value })}
                      className={fieldClassName}
                    />
                  </label>
                  <label className={fieldLabelClassName}>
                    Icon
                    <span className="relative">
                      <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-red-300" aria-hidden="true" />
                      <select
                        value={feature.icon}
                        onChange={(event) => updateFeature(feature.id, { icon: event.target.value as HeroFeatureIcon })}
                        className={`${fieldClassName} pl-10`}
                      >
                        {Object.entries(FEATURE_ICONS).map(([value, option]) => (
                          <option key={value} value={value}>{option.label}</option>
                        ))}
                      </select>
                    </span>
                  </label>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <label className="inline-flex items-center gap-2 text-xs font-semibold text-gray-300">
                    <input
                      type="checkbox"
                      checked={feature.enabled}
                      onChange={(event) => updateFeature(feature.id, { enabled: event.target.checked })}
                      className="h-4 w-4 accent-red-500"
                    />
                    Enabled
                  </label>
                  <button
                    type="button"
                    disabled={index === 0}
                    onClick={() => moveFeature(index, -1)}
                    aria-label={`Move ${feature.name} up`}
                    className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 text-gray-300 disabled:opacity-30"
                  >
                    <ArrowUp size={15} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    disabled={index === settings.features.length - 1}
                    onClick={() => moveFeature(index, 1)}
                    aria-label={`Move ${feature.name} down`}
                    className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 text-gray-300 disabled:opacity-30"
                  >
                    <ArrowDown size={15} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onChange({
                      ...settings,
                      features: settings.features.filter((item) => item.id !== feature.id),
                    })}
                    aria-label={`Remove ${feature.name}`}
                    className="grid h-9 w-9 place-items-center rounded-lg border border-red-400/20 text-red-200"
                  >
                    <Trash2 size={15} aria-hidden="true" />
                  </button>
                </div>
              </div>
            );
          })}
          <button
            type="button"
            onClick={addFeature}
            className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-red-400/25 px-4 py-2 text-xs font-bold uppercase tracking-wider text-red-100 hover:bg-red-950/30"
          >
            <Plus size={15} aria-hidden="true" />
            Add feature
          </button>
        </div>
      </section>

      <section className="glass rounded-2xl p-4 sm:p-5" aria-labelledby="hero-live-preview-heading">
        <h3 id="hero-live-preview-heading" className="mb-4 text-sm font-black text-white">Live preview</h3>
        <div className="relative min-h-64 overflow-hidden rounded-2xl border border-white/10 bg-[#08080b] sm:min-h-80">
          <img
            src={localPreview || settings.image || DEFAULT_PORTFOLIO_CONTENT.hero.image}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            style={{ objectPosition: settings.imagePosition }}
            decoding="async"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#050507]/90 via-[#050507]/55 to-transparent" />
          <div className="relative z-10 flex min-h-64 max-w-2xl flex-col justify-end gap-2 p-5 sm:min-h-80 sm:p-8">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-red-300">{settings.eyebrow || 'Eyebrow'}</span>
            <strong className="text-2xl font-black uppercase tracking-tight text-white sm:text-4xl">{settings.headline || 'Main name'}</strong>
            <span className="text-xs font-extrabold uppercase tracking-wider text-gray-200 sm:text-sm">{settings.roles[0]}</span>
            <p className="max-w-lg text-xs leading-relaxed text-gray-300 sm:text-sm">{settings.tagline}</p>
            {settings.showFeatures && settings.features.some((feature) => feature.enabled) && (
              <div className="flex flex-wrap gap-x-4 gap-y-2 text-[10px] font-semibold uppercase tracking-wider text-gray-200">
                {settings.features.filter((feature) => feature.enabled).map((feature) => {
                  const { Icon } = FEATURE_ICONS[feature.icon];
                  return (
                    <span key={feature.id} className="inline-flex items-center gap-1.5">
                      <Icon className="h-3.5 w-3.5 text-red-300" aria-hidden="true" />
                      {feature.name}
                    </span>
                  );
                })}
              </div>
            )}
            <div className="mt-2 flex flex-wrap gap-2">
              <span className="rounded-full bg-red-700 px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-white">{settings.primaryButton || 'Primary button'}</span>
              <span className="rounded-full border border-white/20 px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-gray-200">{settings.secondaryButton || 'Secondary button'}</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
