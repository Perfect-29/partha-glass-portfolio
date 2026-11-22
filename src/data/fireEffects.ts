export type FireColorPreset =
  | 'classic-fire'
  | 'neon-red'
  | 'electric-blue'
  | 'purple'
  | 'golden'
  | 'emerald-green'
  | 'ice-blue'
  | 'rainbow'
  | 'custom';

export interface FireEffectsSettings {
  enabled: boolean;
  preset: FireColorPreset;
  colors: string[];
  particleSize: number;
  density: number;
  speed: number;
  glow: number;
  trailLength: number;
  lifetime: number;
}

export const FIRE_COLOR_PRESETS: {
  id: Exclude<FireColorPreset, 'custom'>;
  label: string;
  colors: string[];
}[] = [
  { id: 'classic-fire', label: 'Classic Fire', colors: ['#FFD648', '#FF7018', '#FF2020'] },
  { id: 'neon-red', label: 'Neon Red', colors: ['#FF1238', '#FF3D5A', '#FF8A9B'] },
  { id: 'electric-blue', label: 'Electric Blue', colors: ['#75F2FF', '#188BFF', '#514BFF'] },
  { id: 'purple', label: 'Purple', colors: ['#E1A3FF', '#9B5CFF', '#FF58D2'] },
  { id: 'golden', label: 'Golden', colors: ['#FFF0A3', '#FFC247', '#FF8A00'] },
  { id: 'emerald-green', label: 'Emerald Green', colors: ['#A6FFD9', '#2EE59D', '#058C62'] },
  { id: 'ice-blue', label: 'Ice Blue', colors: ['#F0FCFF', '#8CEBFF', '#42A5FF'] },
  { id: 'rainbow', label: 'Rainbow', colors: ['#FF3B30', '#FF9F0A', '#FFD60A', '#30D158', '#0A84FF', '#BF5AF2'] },
];

export const DEFAULT_FIRE_EFFECTS_SETTINGS: FireEffectsSettings = {
  enabled: true,
  preset: 'classic-fire',
  colors: [...FIRE_COLOR_PRESETS[0].colors],
  particleSize: 1,
  density: 1,
  speed: 1,
  glow: 1,
  trailLength: 14,
  lifetime: 650,
};

const PRESET_IDS = new Set<FireColorPreset>([
  ...FIRE_COLOR_PRESETS.map((preset) => preset.id),
  'custom',
]);

export function isFireEffectsSettings(value: unknown): value is FireEffectsSettings {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const settings = value as Partial<FireEffectsSettings>;
  return (
    typeof settings.enabled === 'boolean' &&
    typeof settings.preset === 'string' &&
    PRESET_IDS.has(settings.preset as FireColorPreset) &&
    Array.isArray(settings.colors) &&
    settings.colors.length >= 1 &&
    settings.colors.length <= 8 &&
    settings.colors.every((color) => typeof color === 'string' && /^#[\da-f]{6}$/i.test(color)) &&
    typeof settings.particleSize === 'number' &&
    Number.isFinite(settings.particleSize) &&
    settings.particleSize >= 0.5 &&
    settings.particleSize <= 3 &&
    typeof settings.density === 'number' &&
    Number.isFinite(settings.density) &&
    settings.density >= 0.25 &&
    settings.density <= 2 &&
    typeof settings.speed === 'number' &&
    Number.isFinite(settings.speed) &&
    settings.speed >= 0.5 &&
    settings.speed <= 2 &&
    typeof settings.glow === 'number' &&
    Number.isFinite(settings.glow) &&
    settings.glow >= 0 &&
    settings.glow <= 2 &&
    typeof settings.trailLength === 'number' &&
    Number.isInteger(settings.trailLength) &&
    settings.trailLength >= 3 &&
    settings.trailLength <= 24 &&
    typeof settings.lifetime === 'number' &&
    Number.isInteger(settings.lifetime) &&
    settings.lifetime >= 100 &&
    settings.lifetime <= 1200
  );
}

export function readFireEffectsSettings(value: unknown): FireEffectsSettings {
  if (!isFireEffectsSettings(value)) return { ...DEFAULT_FIRE_EFFECTS_SETTINGS, colors: [...DEFAULT_FIRE_EFFECTS_SETTINGS.colors] };
  return { ...value, colors: [...value.colors] };
}
