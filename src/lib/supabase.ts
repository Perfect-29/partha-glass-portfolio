import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './supabaseDatabase.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim() ?? '';
const supabasePublishableKey = (
  import.meta.env.VITE_SUPABASE_ANON_KEY ??
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  ''
).trim();

function hasAuthCallbackAtInitialization(): boolean {
  if (typeof window === 'undefined') return false;
  const query = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  return Boolean(
    query.has('code') || query.has('access_token') || query.get('type') === 'recovery' ||
    hash.has('code') || hash.has('access_token') || hash.get('type') === 'recovery' ||
    query.has('error') || query.has('error_code') || hash.has('error') || hash.has('error_code')
  );
}

export const supabaseAuthCallbackAtInitialization = hasAuthCallbackAtInitialization();

function validateConfiguration(url: string, key: string): string | null {
  if (!url || !key) {
    const missing = [
      !url && 'VITE_SUPABASE_URL',
      !key && 'VITE_SUPABASE_ANON_KEY',
    ].filter(Boolean);
    return `Missing Supabase environment variable(s): ${missing.join(', ')}.`;
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    return 'VITE_SUPABASE_URL must be a valid absolute URL.';
  }

  const isLocalhost = parsedUrl.hostname === 'localhost' || parsedUrl.hostname === '127.0.0.1';
  if (parsedUrl.protocol !== 'https:' && !(isLocalhost && parsedUrl.protocol === 'http:')) {
    return 'VITE_SUPABASE_URL must use HTTPS except for local development.';
  }

  if (/^(sb_secret_|service_role)/i.test(key)) {
    return 'A server-side Supabase secret key cannot be used in the browser client.';
  }

  if (!key.startsWith('sb_publishable_')) {
    return 'VITE_SUPABASE_ANON_KEY must contain a Supabase publishable key.';
  }

  return null;
}

export const supabaseConfigurationError = validateConfiguration(supabaseUrl, supabasePublishableKey);
export const isSupabaseConfigured = supabaseConfigurationError === null;

if (supabaseConfigurationError) {
  console.error(`[Supabase] ${supabaseConfigurationError}`);
}

export const supabase: SupabaseClient<Database> | null = isSupabaseConfigured
  ? createClient<Database>(supabaseUrl, supabasePublishableKey)
  : null;

export type SupabaseConnectionTestResult =
  | { connected: true }
  | { connected: false; error: string };

export async function testSupabaseConnection(): Promise<SupabaseConnectionTestResult> {
  if (supabaseConfigurationError) {
    return { connected: false, error: supabaseConfigurationError };
  }

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 10_000);

  try {
    const response = await fetch(`${supabaseUrl}/auth/v1/settings`, {
      headers: { apikey: supabasePublishableKey },
      signal: controller.signal,
    });

    if (!response.ok) {
      return {
        connected: false,
        error: `Supabase connection check failed with HTTP ${response.status}.`,
      };
    }

    return { connected: true };
  } catch (error) {
    const message = error instanceof Error && error.name === 'AbortError'
      ? 'Supabase connection check timed out.'
      : 'Unable to reach Supabase. Check the project URL and network connection.';
    return { connected: false, error: message };
  } finally {
    window.clearTimeout(timeoutId);
  }
}
