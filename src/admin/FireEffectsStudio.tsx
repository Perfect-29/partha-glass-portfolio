import { RotateCcw, Save, Sparkles, X } from 'lucide-react';
import { FIRE_COLOR_PRESETS, type FireEffectsSettings } from '../data/fireEffects';
import { SparkCursor } from '../components/SparkCursor';

interface FireEffectsStudioProps {
  settings: FireEffectsSettings;
  siteSettingsPublished: boolean;
  siteSettingsExists: boolean;
  settingsSchemaAvailable: boolean;
  saving: boolean;
  onChange: (settings: FireEffectsSettings) => void;
  onPublicationChange: (published: boolean) => void;
  onReset: () => void;
  onSave: () => void;
}

const RANGE_CONTROLS: {
  key: 'particleSize' | 'density' | 'speed' | 'glow' | 'trailLength' | 'lifetime';
  label: string;
  min: number;
  max: number;
  step: number;
  format: (value: number) => string;
}[] = [
  { key: 'particleSize', label: 'Particle size', min: 0.5, max: 3, step: 0.1, format: (value) => `${value.toFixed(1)}×` },
  { key: 'density', label: 'Particle density', min: 0.25, max: 2, step: 0.05, format: (value) => `${value.toFixed(2)}×` },
  { key: 'speed', label: 'Animation speed', min: 0.5, max: 2, step: 0.05, format: (value) => `${value.toFixed(2)}×` },
  { key: 'glow', label: 'Glow intensity', min: 0, max: 2, step: 0.05, format: (value) => `${value.toFixed(2)}×` },
  { key: 'trailLength', label: 'Trail length', min: 3, max: 24, step: 1, format: (value) => `${value} points` },
  { key: 'lifetime', label: 'Particle lifetime', min: 100, max: 1200, step: 50, format: (value) => `${value} ms` },
];

export function FireEffectsStudio({
  settings,
  siteSettingsPublished,
  siteSettingsExists,
  settingsSchemaAvailable,
  saving,
  onChange,
  onPublicationChange,
  onReset,
  onSave,
}: FireEffectsStudioProps) {
  const update = <Key extends keyof FireEffectsSettings>(key: Key, value: FireEffectsSettings[Key]) => {
    onChange({ ...settings, [key]: value });
  };

  const selectPreset = (preset: (typeof FIRE_COLOR_PRESETS)[number]) => {
    onChange({ ...settings, preset: preset.id, colors: [...preset.colors] });
  };

  const updateColor = (index: number, color: string) => {
    const colors = [...settings.colors];
    colors[index] = color.toUpperCase();
    onChange({ ...settings, preset: 'custom', colors });
  };

  const addColor = (color: string) => {
    if (settings.colors.length >= 8) return;
    onChange({ ...settings, preset: 'custom', colors: [...settings.colors, color.toUpperCase()] });
  };

  const removeColor = (index: number) => {
    if (settings.colors.length <= 1) return;
    onChange({
      ...settings,
      preset: 'custom',
      colors: settings.colors.filter((_, colorIndex) => colorIndex !== index),
    });
  };

  const selectedPresetLabel =
    FIRE_COLOR_PRESETS.find((preset) => preset.id === settings.preset)?.label ?? 'Custom colors';

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-white/10 bg-black/25 p-4 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-red-300">Effect control</p>
            <h3 className="mt-1 text-base font-black text-white">Cursor sparks</h3>
            <p className="mt-1 max-w-xl text-xs leading-relaxed text-gray-500">
              Applies to mouse and touch sparks. Reduced-motion preferences are always respected.
            </p>
          </div>
          <label className="flex cursor-pointer items-center gap-3 self-start rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 sm:self-auto">
            <span className="text-xs font-bold text-gray-200">Effect {settings.enabled ? 'enabled' : 'disabled'}</span>
            <input
              type="checkbox"
              checked={settings.enabled}
              onChange={(event) => update('enabled', event.target.checked)}
              className="h-5 w-5 accent-red-500"
              aria-label="Enable cursor spark effect"
            />
          </label>
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-black/25 p-4 sm:p-5">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-red-300">Color system</p>
            <h3 className="mt-1 text-base font-black text-white">Presets & custom palette</h3>
          </div>
          <p className="rounded-full border border-red-400/20 bg-red-950/30 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-red-100">
            Selected: {selectedPresetLabel}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {FIRE_COLOR_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => selectPreset(preset)}
              aria-pressed={settings.preset === preset.id}
              className={`group rounded-xl border p-3 text-left transition hover:-translate-y-0.5 ${
                settings.preset === preset.id
                  ? 'border-red-300/60 bg-red-950/30 shadow-[0_0_22px_rgba(239,68,68,0.12)]'
                  : 'border-white/10 bg-white/[0.02] hover:border-white/25'
              }`}
            >
              <span className="mb-2 flex h-5 overflow-hidden rounded-md">
                {preset.colors.map((color) => (
                  <span key={color} className="h-full flex-1" style={{ backgroundColor: color }} />
                ))}
              </span>
              <span className="text-[11px] font-bold text-gray-200">{preset.label}</span>
            </button>
          ))}
        </div>

        <div className="mt-5 border-t border-white/5 pt-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h4 className="text-xs font-bold text-gray-200">Custom spark colors</h4>
              <p className="mt-1 text-[10px] text-gray-500">Choose 1–8 colors. Editing a swatch selects the custom palette.</p>
            </div>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-gray-300 hover:border-red-400/30">
              <span>Add color</span>
              <input
                type="color"
                value="#ff334b"
                disabled={settings.colors.length >= 8}
                onChange={(event) => addColor(event.target.value)}
                className="h-5 w-7 cursor-pointer rounded border-0 bg-transparent disabled:cursor-not-allowed"
                aria-label="Add a spark color"
              />
            </label>
          </div>
          <div className="flex flex-wrap gap-2">
            {settings.colors.map((color, index) => (
              <div key={`spark-color-${index}`} className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] p-2">
                <input
                  type="color"
                  value={color}
                  onChange={(event) => updateColor(index, event.target.value)}
                  className="h-7 w-8 cursor-pointer rounded border-0 bg-transparent"
                  aria-label={`Edit spark color ${index + 1}`}
                />
                <span className="font-mono text-[10px] text-gray-400">{color}</span>
                <button
                  type="button"
                  onClick={() => removeColor(index)}
                  disabled={settings.colors.length <= 1}
                  aria-label={`Remove spark color ${index + 1}`}
                  className="rounded p-1 text-gray-500 hover:bg-red-950/50 hover:text-red-200 disabled:opacity-30"
                >
                  <X size={13} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-2">
        <section className="rounded-2xl border border-white/10 bg-black/25 p-4 sm:p-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-red-300">Particle tuning</p>
          <h3 className="mb-5 mt-1 text-base font-black text-white">Effect parameters</h3>
          <div className="space-y-5">
            {RANGE_CONTROLS.map((control) => (
              <label key={control.key} className="block">
                <span className="mb-2 flex items-center justify-between gap-3 text-xs">
                  <span className="font-semibold text-gray-300">{control.label}</span>
                  <span className="font-mono text-red-200">{control.format(settings[control.key])}</span>
                </span>
                <input
                  type="range"
                  min={control.min}
                  max={control.max}
                  step={control.step}
                  value={settings[control.key]}
                  onChange={(event) => update(control.key, Number(event.target.value))}
                  className="w-full accent-red-500"
                  aria-label={control.label}
                />
              </label>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-black/25 p-4 sm:p-5">
          <div className="mb-3 flex items-center gap-2">
            <Sparkles size={16} className="text-red-300" />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-red-300">Live preview</p>
              <h3 className="mt-1 text-base font-black text-white">Move or touch inside the frame</h3>
            </div>
          </div>
          <div className="fire-spark-preview-frame">
            <SparkCursor settings={settings} preview />
            {!settings.enabled && <span className="pointer-events-none absolute inset-0 grid place-items-center text-xs text-gray-500">Effect is disabled</span>}
            {settings.enabled && (
              <span className="pointer-events-none absolute bottom-3 left-3 rounded-full bg-black/60 px-3 py-1 text-[9px] uppercase tracking-wider text-gray-400">
                Interactive preview
              </span>
            )}
          </div>
        </section>
      </div>

      <section className="rounded-2xl border border-white/10 bg-black/25 p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-red-300">Public visibility</p>
            <h3 className="mt-1 text-base font-black text-white">Publish effect settings with Site Settings</h3>
            <p className="mt-1 text-xs leading-relaxed text-gray-500">
              The public portfolio reads effects only from the published <code>site_settings/main</code> record.
              Turning this on publishes that record’s existing settings as well; it does not change their values.
            </p>
            {!siteSettingsExists && (
              <p className="mt-2 text-xs text-amber-200">
                No <code>site_settings/main</code> record exists. Saving will initialize it without replacing an existing row.
              </p>
            )}
            {!settingsSchemaAvailable && (
              <p className="mt-2 text-xs text-amber-200">
                The database migration <code>20261120133002_add_fire_effect_settings.sql</code> is required before saving. Public visitors will keep using the default effect until it is applied.
              </p>
            )}
          </div>
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-white/10 px-4 py-3 text-xs font-bold text-gray-200">
            <input
              type="checkbox"
              checked={siteSettingsPublished}
              onChange={(event) => onPublicationChange(event.target.checked)}
              className="h-4 w-4 accent-red-500"
            />
            Publish site settings
          </label>
        </div>
      </section>

      <div className="flex flex-col-reverse gap-3 border-t border-white/5 pt-4 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onReset}
          disabled={saving}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 px-4 py-3 text-xs font-bold uppercase tracking-wider text-gray-300 hover:border-white/25 disabled:opacity-50"
        >
          <RotateCcw size={15} /> Reset to default
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={saving || !settingsSchemaAvailable}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-red-700 to-red-500 px-5 py-3 text-xs font-black uppercase tracking-wider text-white hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Save size={15} /> {saving ? 'Saving…' : 'Save settings'}
        </button>
      </div>
    </div>
  );
}
