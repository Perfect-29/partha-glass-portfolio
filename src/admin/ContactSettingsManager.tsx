import { Eye, Github, Linkedin, Mail, MapPin, MessageCircle, Phone, Save } from 'lucide-react';
import { isContactSettings } from '../data/portfolioData';
import type { ContactMethodSettings, ContactSettings } from '../data/portfolioData';

type ContactMethodKey = keyof Pick<ContactSettings, 'phone' | 'whatsapp' | 'email' | 'linkedin' | 'github' | 'location'>;

const METHODS: { key: ContactMethodKey; label: string; placeholder: string; type: string }[] = [
  { key: 'phone', label: 'Phone number', placeholder: '+1 555 123 4567', type: 'tel' },
  { key: 'whatsapp', label: 'WhatsApp number', placeholder: '+1 555 123 4567', type: 'tel' },
  { key: 'email', label: 'Email address', placeholder: 'you@example.com', type: 'email' },
  { key: 'linkedin', label: 'LinkedIn URL', placeholder: 'https://www.linkedin.com/in/username', type: 'url' },
  { key: 'github', label: 'GitHub URL', placeholder: 'https://github.com/username', type: 'url' },
  { key: 'location', label: 'Location', placeholder: 'Your location', type: 'text' },
];

export function ContactSettingsManager({
  settings,
  saving,
  schemaAvailable,
  siteSettingsExists,
  siteSettingsPublished,
  onChange,
  onSave,
}: {
  settings: ContactSettings;
  saving: boolean;
  schemaAvailable: boolean;
  siteSettingsExists: boolean;
  siteSettingsPublished: boolean;
  onChange: (settings: ContactSettings) => void;
  onSave: () => void;
}) {
  const valid = isContactSettings(settings);
  const updateMethod = (key: ContactMethodKey, patch: Partial<ContactMethodSettings>) => {
    onChange({ ...settings, [key]: { ...settings[key], ...patch } });
  };

  return (
    <div className="space-y-6">
      {!schemaAvailable && (
        <p role="status" className="rounded-xl border border-amber-400/20 bg-amber-950/20 px-4 py-3 text-xs leading-relaxed text-amber-100">
          Apply the contact management migration in Supabase before saving these settings.
        </p>
      )}
      {!siteSettingsExists && (
        <p role="status" className="rounded-xl border border-amber-400/20 bg-amber-950/20 px-4 py-3 text-xs leading-relaxed text-amber-100">
          <code>site_settings/main</code> is missing. Saving will initialize it from the current portfolio settings without replacing an existing row.
        </p>
      )}
      {siteSettingsExists && !siteSettingsPublished && (
        <p role="status" className="rounded-xl border border-amber-400/20 bg-amber-950/20 px-4 py-3 text-xs leading-relaxed text-amber-100">
          The site settings record is not published. Contact settings can be saved, but visitors will not see them until site settings are published.
        </p>
      )}

      <div className="grid gap-4">
        <label className="flex flex-col gap-2 text-xs font-bold uppercase tracking-wider text-gray-400">
          Section heading
          <input
            value={settings.heading}
            maxLength={80}
            onChange={(event) => onChange({ ...settings, heading: event.target.value })}
            className="glass-input rounded-xl px-4 py-3 text-sm font-medium normal-case tracking-normal text-white"
          />
        </label>
        <label className="flex flex-col gap-2 text-xs font-bold uppercase tracking-wider text-gray-400">
          Section description
          <textarea
            value={settings.description}
            maxLength={360}
            rows={3}
            onChange={(event) => onChange({ ...settings, description: event.target.value })}
            className="glass-input resize-y rounded-xl px-4 py-3 text-sm font-medium normal-case tracking-normal text-white"
          />
        </label>
      </div>

      <section className="glass rounded-2xl p-4 sm:p-5" aria-labelledby="contact-display-mode-heading">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 id="contact-display-mode-heading" className="text-sm font-black text-white">Contact Display Mode</h3>
            <p className="mt-1 text-xs leading-relaxed text-gray-400">
              ON shows enabled, published methods as icons only. OFF keeps the full contact cards.
            </p>
          </div>
          <label className="inline-flex min-h-11 shrink-0 cursor-pointer items-center gap-3 rounded-xl border border-white/10 bg-black/30 px-4 py-2 text-xs font-bold uppercase tracking-wider text-gray-200">
            <input
              type="checkbox"
              role="switch"
              checked={settings.iconOnly}
              onChange={(event) => onChange({ ...settings, iconOnly: event.target.checked })}
              className="peer sr-only"
            />
            <span
              aria-hidden="true"
              className="relative h-6 w-11 rounded-full border border-white/15 bg-gray-800 transition-colors after:absolute after:left-1 after:top-1 after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-transform after:content-[''] peer-checked:border-red-400/50 peer-checked:bg-red-700 peer-checked:after:translate-x-5 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-red-400"
            />
            <span>Icon-only mode</span>
            <span className={settings.iconOnly ? 'text-red-300' : 'text-gray-500'}>
              {settings.iconOnly ? 'ON' : 'OFF'}
            </span>
          </label>
        </div>
      </section>

      <div className="space-y-3">
        <div>
          <h3 className="text-sm font-black text-white">Contact methods</h3>
          <p className="mt-1 text-xs text-gray-500">A method appears publicly only when it has a value and both controls are enabled.</p>
        </div>
        {METHODS.map(({ key, label, placeholder, type }) => {
          const method = settings[key];
          return (
            <div key={key} className="grid gap-4 rounded-2xl border border-white/8 bg-black/20 p-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
              <label className="flex min-w-0 flex-col gap-2 text-[10px] font-bold uppercase tracking-wider text-gray-500">
                {label}
                <input
                  type={type}
                  value={method.value}
                  maxLength={key === 'location' ? 180 : key === 'email' ? 254 : 2048}
                  placeholder={placeholder}
                  onChange={(event) => updateMethod(key, { value: event.target.value })}
                  className="glass-input w-full rounded-xl px-3 py-2.5 text-sm font-medium normal-case tracking-normal text-white"
                />
              </label>
              <div className="flex flex-wrap gap-4">
                <label className="inline-flex items-center gap-2 text-xs font-semibold text-gray-300">
                  <input
                    type="checkbox"
                    checked={method.enabled}
                    onChange={(event) => updateMethod(key, { enabled: event.target.checked })}
                    className="h-4 w-4 accent-red-500"
                  />
                  Enabled
                </label>
                <label className="inline-flex items-center gap-2 text-xs font-semibold text-gray-300">
                  <input
                    type="checkbox"
                    checked={method.published}
                    onChange={(event) => updateMethod(key, { published: event.target.checked })}
                    className="h-4 w-4 accent-red-500"
                  />
                  Published
                </label>
              </div>
            </div>
          );
        })}
      </div>

      {!valid && (
        <p role="alert" className="rounded-xl border border-red-400/20 bg-red-950/20 px-4 py-3 text-xs text-red-100">
          Check the entered email, phone numbers, profile URLs, and text lengths before saving.
        </p>
      )}

      <section className="glass rounded-2xl p-4 sm:p-5" aria-label="Contact section preview">
        <div className="mb-4 flex items-center gap-2 text-red-200">
          <Eye size={16} aria-hidden="true" />
          <h3 className="text-xs font-black uppercase tracking-wider">Preview</h3>
        </div>
        <h4 className="text-xl font-black text-white">{settings.heading || 'Contact heading'}</h4>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-gray-400">{settings.description || 'Contact section description'}</p>
        <div
          key={settings.iconOnly ? 'icon-only-preview' : 'full-contact-preview'}
          className={`contact-mode-enter mt-4 ${settings.iconOnly ? 'grid grid-cols-3 gap-3 sm:grid-cols-6' : 'flex flex-wrap gap-2'}`}
        >
          {METHODS.filter(({ key }) => {
            const method = settings[key];
            return method.enabled && method.published && method.value.trim();
          }).map(({ key, label }) => {
            const Icon = settings.iconOnly
              ? key === 'phone'
                ? Phone
                : key === 'whatsapp'
                  ? MessageCircle
                  : key === 'linkedin'
                    ? Linkedin
                    : key === 'github'
                      ? Github
                      : key === 'location'
                        ? MapPin
                        : Mail
              : key === 'phone' || key === 'whatsapp'
                ? Phone
                : key === 'location'
                  ? MapPin
                  : Mail;
            return settings.iconOnly ? (
              <span
                key={key}
                role="img"
                aria-label={label}
                className="glass-chip grid aspect-square place-items-center rounded-2xl text-red-300"
              >
                <Icon size={20} aria-hidden="true" />
              </span>
            ) : (
              <span key={key} className="inline-flex items-center gap-2 rounded-full border border-red-400/15 bg-red-950/20 px-3 py-2 text-xs text-gray-200">
                <Icon size={13} aria-hidden="true" className="text-red-300" />
                {label}
              </span>
            );
          })}
          {!METHODS.some(({ key }) => {
            const method = settings[key];
            return method.enabled && method.published && method.value.trim();
          }) && !settings.iconOnly && <span className="text-xs text-gray-500">No contact methods will be shown publicly.</span>}
        </div>
      </section>

      <div className="flex flex-col gap-3 border-t border-white/5 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-2xl text-[11px] leading-relaxed text-gray-500">
          This updates only the contact settings field. If the main row is missing, it is initialized without overwriting existing settings.
        </p>
        <button
          type="button"
          disabled={saving || !valid || !schemaAvailable}
          onClick={onSave}
          className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-red-700 to-red-500 px-5 py-3 text-xs font-black uppercase tracking-wider text-white hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Save size={15} aria-hidden="true" />
          {saving ? 'Saving…' : 'Save contact settings'}
        </button>
      </div>
    </div>
  );
}
