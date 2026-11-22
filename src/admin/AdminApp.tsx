import { useEffect, useMemo, useRef, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import {
  Activity,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Award,
  BarChart3,
  BookOpenText,
  BriefcaseBusiness,
  Check,
  CircleAlert,
  Cloud,
  Eye,
  EyeOff,
  FileImage,
  FileText,
  Flame,
  FolderKanban,
  GraduationCap,
  Home,
  Inbox,
  Linkedin,
  LogOut,
  Mail,
  Plus,
  RefreshCw,
  Save,
  Search,
  Send,
  Settings2,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
  UserRound,
  Wrench,
} from 'lucide-react';
import { DEFAULT_PORTFOLIO_CONTENT } from '../data/portfolioData';
import { DEFAULT_FIRE_EFFECTS_SETTINGS } from '../data/fireEffects';
import type { CustomSectionContentRecord, PortfolioSectionConfig } from '../data/portfolioSections';
import type {
  AchievementEntry,
  CertificationEntry,
  CodingProfileEntry,
  ContactSettings,
  ExperienceEntry,
  ExperienceSourceType,
  InternshipEntry,
  PortfolioContent,
  Project,
  PublicationEntry,
  ResumeEntry,
  WorkshopEntry,
} from '../data/portfolioData';
import { isPortfolioContent } from '../lib/portfolioValidation';
import { getAdminPortfolio } from '../lib/supabasePortfolioRepository';
import { isSupabaseConfigured, supabase, supabaseAuthCallbackAtInitialization } from '../lib/supabase';
import { CmsEntryManager } from './CmsEntryManager';
import { ContactSettingsManager } from './ContactSettingsManager';
import { FireEffectsStudio } from './FireEffectsStudio';
import { SectionManagementPanel } from './SectionManagementPanel';
import type { CmsAsset, CmsField } from './CmsEntryManager';
import {
  deleteAdminSingleton,
  deleteAdminMessage,
  getAdminMessages,
  saveAdminSection,
  saveAdminContactSettings,
  saveFireEffectsSettings,
  subscribeAdminMessages,
  subscribeAdminPortfolio,
  updateAdminMessageStatus,
  uploadPortfolioAsset,
  type AdminMessage,
  type AdminPublicationState,
} from './supabaseAdminRepository';

type SectionId =
  | 'home'
  | 'about'
  | 'projects'
  | 'skills'
  | 'experience'
  | 'education'
  | 'certifications'
  | 'achievements'
  | 'internships'
  | 'workshops'
  | 'codingProfiles'
  | 'publications'
  | 'resume'
  | 'fireEffects'
  | 'contact'
  | 'socials'
  | 'messages'
  | 'sectionManagement';
type SectionConfig = { id: SectionId; label: string; icon: typeof Home; fields: string[] };

const SECTIONS: SectionConfig[] = [
  { id: 'home', label: 'Home / Hero', icon: Home, fields: ['site', 'hero', 'loader'] },
  { id: 'about', label: 'About & Profile', icon: UserRound, fields: ['about'] },
  { id: 'projects', label: 'Projects', icon: FolderKanban, fields: ['projects'] },
  { id: 'skills', label: 'Skills', icon: Wrench, fields: ['skills', 'techStack'] },
  { id: 'experience', label: 'Experience', icon: BriefcaseBusiness, fields: ['experience'] },
  { id: 'education', label: 'Education', icon: GraduationCap, fields: ['education'] },
  { id: 'certifications', label: 'Certifications', icon: Award, fields: ['certifications'] },
  { id: 'achievements', label: 'Achievements', icon: Award, fields: ['achievements'] },
  { id: 'internships', label: 'Internships', icon: BriefcaseBusiness, fields: ['internships'] },
  { id: 'workshops', label: 'Workshops & Events', icon: GraduationCap, fields: ['workshops'] },
  { id: 'codingProfiles', label: 'Coding Profiles', icon: Activity, fields: ['codingProfiles'] },
  { id: 'publications', label: 'Publications', icon: BookOpenText, fields: ['publications'] },
  { id: 'resume', label: 'Resume / CV', icon: FileText, fields: ['resumes', 'resumeUrl'] },
  { id: 'fireEffects', label: 'Fire Effects Studio', icon: Flame, fields: ['fireEffects'] },
  { id: 'contact', label: 'Contact Settings', icon: Mail, fields: ['contactSettings'] },
  { id: 'socials', label: 'Footer Social Links', icon: Linkedin, fields: ['socials'] },
  { id: 'messages', label: 'Messages / Inquiries', icon: Inbox, fields: [] },
  { id: 'sectionManagement', label: 'Section Management', icon: Settings2, fields: [] },
];

const IMAGE_TYPES = ['image/jpeg', 'image/png'];
const IMAGE_AND_PDF_TYPES = [...IMAGE_TYPES, 'application/pdf'];
const IMAGE_ACCEPT = 'image/jpeg,image/png,.jpg,.jpeg,.png';
const IMAGE_AND_PDF_ACCEPT = `${IMAGE_ACCEPT},application/pdf,.pdf`;
const PDF_ACCEPT = 'application/pdf,.pdf';

const CMS_FIELDS: Record<'experience' | 'certifications' | 'achievements' | 'internships' | 'workshops' | 'codingProfiles' | 'publications' | 'resume', CmsField[]> = {
  experience: [
    { key: 'title', label: 'Experience title' },
    { key: 'organization', label: 'Organization or project', optional: true },
    { key: 'date', label: 'Date or period', optional: true },
    { key: 'category', label: 'Category', optional: true },
    { key: 'description', label: 'Description', type: 'textarea' },
    { key: 'technologies', label: 'Technologies or skills', type: 'list', optional: true },
  ],
  certifications: [
    { key: 'title', label: 'Certificate title' },
    { key: 'organization', label: 'Issuing organization' },
    { key: 'issueDate', label: 'Issue date', type: 'date' },
    { key: 'category', label: 'Category' },
    { key: 'credentialId', label: 'Credential ID', optional: true },
    { key: 'credentialUrl', label: 'Verification URL', type: 'url', optional: true },
  ],
  achievements: [
    { key: 'title', label: 'Achievement or award' },
    { key: 'issuer', label: 'Organization' },
    { key: 'date', label: 'Date', type: 'date' },
    { key: 'category', label: 'Category', optional: true },
    { key: 'description', label: 'Description', type: 'textarea' },
    { key: 'featured', label: 'Feature this achievement', type: 'checkbox', optional: true },
  ],
  internships: [
    { key: 'company', label: 'Company' },
    { key: 'role', label: 'Role' },
    { key: 'duration', label: 'Duration' },
    { key: 'startDate', label: 'Start date', type: 'date', optional: true },
    { key: 'endDate', label: 'End date', type: 'date', optional: true },
    { key: 'description', label: 'Description', type: 'textarea' },
    { key: 'skills', label: 'Skills learned', type: 'list' },
  ],
  workshops: [
    { key: 'title', label: 'Workshop or event title' },
    { key: 'institution', label: 'Institution' },
    { key: 'date', label: 'Date', type: 'date' },
    { key: 'description', label: 'Description', type: 'textarea' },
    { key: 'url', label: 'Related link', type: 'url', optional: true },
  ],
  codingProfiles: [
    { key: 'platform', label: 'Platform' },
    { key: 'username', label: 'Username' },
    { key: 'profileUrl', label: 'Profile URL', type: 'url' },
  ],
  publications: [
    { key: 'title', label: 'Paper title' },
    { key: 'abstract', label: 'Abstract', type: 'textarea' },
    { key: 'publicationDate', label: 'Publication date', type: 'date' },
    { key: 'venue', label: 'Journal or conference' },
    { key: 'doi', label: 'DOI', optional: true },
    { key: 'publicationUrl', label: 'Publication URL', type: 'url', optional: true },
  ],
  resume: [{ key: 'title', label: 'Resume title' }],
};

const EXPERIENCE_SOURCE_LABELS: Record<ExperienceSourceType, string> = {
  projects: 'Project-derived',
  achievements: 'Achievement-derived',
  skills: 'Skill-derived',
  internships: 'Internship-derived',
  workshops: 'Workshop-derived',
  certifications: 'Certification-derived',
  publications: 'Publication-derived',
  education: 'Education-derived',
};

const CMS_ASSETS: Record<'certifications' | 'achievements' | 'internships' | 'workshops' | 'publications' | 'resume', CmsAsset[]> = {
  certifications: [{ field: 'certificateUrl', label: 'Certificate image or PDF', folder: 'certifications', accept: IMAGE_AND_PDF_ACCEPT, allowedTypes: IMAGE_AND_PDF_TYPES, required: true }],
  achievements: [{ field: 'certificateUrl', label: 'Proof image or certificate', folder: 'achievements', accept: IMAGE_AND_PDF_ACCEPT, allowedTypes: IMAGE_AND_PDF_TYPES }],
  internships: [{ field: 'certificateUrl', label: 'Internship certificate', folder: 'internships', accept: IMAGE_AND_PDF_ACCEPT, allowedTypes: IMAGE_AND_PDF_TYPES, required: true }],
  workshops: [
    { field: 'certificateUrl', label: 'Participation certificate', folder: 'workshops', accept: IMAGE_AND_PDF_ACCEPT, allowedTypes: IMAGE_AND_PDF_TYPES, metadataPrefix: 'certificate' },
    { field: 'imageUrl', label: 'Event image', folder: 'workshops', accept: IMAGE_ACCEPT, allowedTypes: IMAGE_TYPES, metadataPrefix: 'image' },
  ],
  publications: [{ field: 'pdfUrl', label: 'Publication PDF', folder: 'publications', accept: PDF_ACCEPT, allowedTypes: ['application/pdf'] }],
  resume: [{ field: 'fileUrl', label: 'Resume PDF', folder: 'resume', accept: PDF_ACCEPT, allowedTypes: ['application/pdf'], required: true }],
};

type ActivityItem = {
  action: string;
  section: string;
  createdAt?: string;
};

type ContactMessage = AdminMessage;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function editorValue(content: PortfolioContent, section: SectionConfig) {
  const value: Record<string, unknown> = {};
  section.fields.forEach((field) => {
    value[field] = content[field as keyof PortfolioContent];
  });
  return JSON.stringify(value, null, 2);
}

function formatDate(value?: string) {
  if (!value) return 'Not published yet';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

type RecoveryView = 'none' | 'reset' | 'invalid' | 'success';

const RECOVERY_SESSION_KEY = 'portfolio-admin-password-recovery';

function getPasswordRecoveryLinkError(): string | null {
  const query = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const errorCode = query.get('error_code') ?? hash.get('error_code');
  const hasAuthError = Boolean(
    query.has('error') || query.has('error_description') || errorCode ||
    hash.has('error') || hash.has('error_description')
  );
  if (!hasAuthError) return null;
  if (errorCode === 'otp_expired') {
    return 'This password reset link has expired. Request a new one.';
  }
  return 'This password reset link is invalid or has already been used. Request a new one.';
}

function hasAuthCallbackUrl(): boolean {
  const query = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  return Boolean(
    query.has('code') || query.has('access_token') || query.get('type') === 'recovery' ||
    hash.has('code') || hash.has('access_token') || hash.get('type') === 'recovery' ||
    query.has('error') || hash.has('error')
  );
}

function clearAuthCallbackUrl() {
  window.history.replaceState(window.history.state, '', window.location.pathname);
}

export function AdminApp() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authError, setAuthError] = useState('');
  const [recoveryView, setRecoveryView] = useState<RecoveryView>('none');
  const [recoveryMessage, setRecoveryMessage] = useState('');
  const [recoveryBusy, setRecoveryBusy] = useState(false);

  useEffect(() => {
    const client = supabase;
    if (!client) {
      setAuthReady(true);
      return;
    }

    let active = true;
    let initializing = true;
    let recoveryEventSeen = false;
    let recoveryCallbackPending = hasAuthCallbackUrl() || supabaseAuthCallbackAtInitialization;
    let recoveryTimeout: number | undefined;
    const recoveryLinkError = getPasswordRecoveryLinkError();

    const markRecoveryLinkInvalid = (message: string) => {
      window.sessionStorage.removeItem(RECOVERY_SESSION_KEY);
      recoveryCallbackPending = false;
      clearAuthCallbackUrl();
      setRecoveryView('invalid');
      setRecoveryMessage(message);
      setAuthReady(true);
    };

    const verifyRecoverySession = async (session: Session | null) => {
      recoveryEventSeen = true;
      if (recoveryTimeout !== undefined) window.clearTimeout(recoveryTimeout);
      if (!session?.user) {
        markRecoveryLinkInvalid('This password reset link could not be verified. Request a new one.');
        return;
      }
      try {
        const { data, error } = await client.auth.getUser();
        if (error) throw error;
        if (!data.user || data.user.id !== session.user.id) {
          throw new Error('Recovery session user mismatch.');
        }
        if (!active) return;
        recoveryCallbackPending = false;
        window.sessionStorage.setItem(RECOVERY_SESSION_KEY, 'verified');
        setRecoveryView('reset');
        setRecoveryMessage('');
        setAuthReady(true);
        clearAuthCallbackUrl();
      } catch {
        if (!active) return;
        const { error: signOutError } = await client.auth.signOut({ scope: 'local' });
        if (!active) return;
        markRecoveryLinkInvalid(
          signOutError
            ? 'The password reset link could not be verified. Close this tab and request a new one.'
            : 'The password reset link is invalid or has expired. Request a new one.'
        );
      }
    };

    const authorize = async (nextUser: User | null) => {
      if (!active) return;
      if (!nextUser) {
        setUser(null);
        setAuthReady(true);
        return;
      }
      const { data: isAdmin, error } = await client.rpc('is_portfolio_admin');
      if (!active) return;
      if (error || isAdmin !== true) {
        setAuthError(error
          ? 'Unable to verify administrator access. Check the is_portfolio_admin function and RLS configuration.'
          : 'This account is not authorized to access the portfolio dashboard.');
        setUser(null);
        const { error: signOutError } = await client.auth.signOut();
        if (signOutError) console.error('Unable to sign out an unauthorized Supabase session.', signOutError);
      } else {
        setAuthError('');
        setUser(nextUser);
      }
      setAuthReady(true);
    };

    const { data: { subscription } } = client.auth.onAuthStateChange((event, session) => {
      window.setTimeout(() => {
        if (!active) return;
        if (event === 'PASSWORD_RECOVERY') {
          initializing = false;
          void verifyRecoverySession(session);
          return;
        }
        if (!initializing && !recoveryCallbackPending) void authorize(session?.user ?? null);
      }, 0);
    });

    const initializeAuth = async () => {
      try {
        const { data, error } = await client.auth.getSession();
        if (!active) return;
        if (error) {
          setAuthError(`Unable to restore the Supabase session: ${error.message}`);
          initializing = false;
          setAuthReady(true);
          return;
        }

        if (recoveryLinkError) {
          window.sessionStorage.removeItem(RECOVERY_SESSION_KEY);
          let message = recoveryLinkError;
          if (data.session) {
            const { error: signOutError } = await client.auth.signOut({ scope: 'local' });
            if (signOutError) message += ' Close this tab before signing in again.';
          }
          if (!active) return;
          clearAuthCallbackUrl();
          markRecoveryLinkInvalid(message);
          initializing = false;
          return;
        }

        if (window.sessionStorage.getItem(RECOVERY_SESSION_KEY) === 'verified') {
          if (!data.session) {
            clearAuthCallbackUrl();
            markRecoveryLinkInvalid('Your password reset session has expired. Request a new one.');
            initializing = false;
            return;
          }
          const { data: verifiedData, error: verificationError } = await client.auth.getUser();
          if (!active) return;
          if (verificationError || !verifiedData.user || verifiedData.user.id !== data.session.user.id) {
            window.sessionStorage.removeItem(RECOVERY_SESSION_KEY);
            const { error: signOutError } = await client.auth.signOut({ scope: 'local' });
            if (!active) return;
            clearAuthCallbackUrl();
            markRecoveryLinkInvalid(
              signOutError
                ? 'Your password reset session could not be verified or cleared. Close this tab and request a new link.'
                : 'Your password reset session has expired. Request a new one.'
            );
            initializing = false;
            return;
          }
          setRecoveryView('reset');
          setRecoveryMessage('');
          setAuthReady(true);
          initializing = false;
          return;
        }

        if (recoveryCallbackPending) {
          recoveryTimeout = window.setTimeout(() => {
            if (!active || recoveryEventSeen) return;
            void client.auth.signOut({ scope: 'local' }).then(({ error: signOutError }) => {
              if (!active) return;
              markRecoveryLinkInvalid(
                signOutError
                  ? 'The reset link could not be verified. Close this tab and request a new one.'
                  : 'The reset link could not be verified or has expired. Request a new one.'
              );
            });
          }, 10_000);
          initializing = false;
          return;
        }

        if (data.session) {
          const { error: signOutError } = await client.auth.signOut();
          if (!active) return;
          if (signOutError) {
            setAuthError(`Unable to clear the previous admin session: ${signOutError.message}`);
          }
        }
        initializing = false;
        setAuthReady(true);
      } catch (error) {
        if (!active) return;
        setAuthError(error instanceof Error
          ? `Unable to restore the Supabase session: ${error.message}`
          : 'Unable to restore the Supabase session.');
        initializing = false;
        setAuthReady(true);
      }
    };
    void initializeAuth();

    return () => {
      active = false;
      if (recoveryTimeout !== undefined) window.clearTimeout(recoveryTimeout);
      subscription.unsubscribe();
    };
  }, []);

  const client = supabase;
  if (!isSupabaseConfigured || !client) {
    return <AdminSetupNotice />;
  }
  if (recoveryView === 'reset') {
    return (
      <AdminPasswordRecovery
        busy={recoveryBusy}
        message={recoveryMessage}
        onSubmit={async (password) => {
          setRecoveryBusy(true);
          setRecoveryMessage('');
          try {
            const { data: sessionData, error: sessionError } = await client.auth.getSession();
            if (sessionError) throw sessionError;
            if (!sessionData.session) throw new Error('Your password reset session has expired. Request a new reset link.');
            const { data: verifiedData, error: verificationError } = await client.auth.getUser();
            if (verificationError) throw verificationError;
            if (!verifiedData.user || verifiedData.user.id !== sessionData.session.user.id) {
              throw new Error('Your password reset session could not be verified. Request a new reset link.');
            }
            const { error } = await client.auth.updateUser({ password });
            if (error) throw error;
            window.sessionStorage.removeItem(RECOVERY_SESSION_KEY);
            const { error: signOutError } = await client.auth.signOut({ scope: 'local' });
            setRecoveryMessage(signOutError
              ? 'Your password was updated. Close this tab before signing in with the new password.'
              : '');
            setRecoveryView('success');
          } catch (error) {
            setRecoveryMessage(error instanceof Error
              ? error.message
              : 'Unable to update your password. Request a new reset link and try again.');
          } finally {
            setRecoveryBusy(false);
          }
        }}
        onBackToLogin={async () => {
          window.sessionStorage.removeItem(RECOVERY_SESSION_KEY);
          const { error } = await client.auth.signOut({ scope: 'local' });
          if (error) {
            setRecoveryMessage(`Unable to clear the recovery session: ${error.message}`);
            return;
          }
          setRecoveryView('none');
          setRecoveryMessage('');
          setUser(null);
          setAuthError('');
          setAuthReady(true);
        }}
      />
    );
  }
  if (recoveryView === 'invalid' || recoveryView === 'success') {
    return (
      <AdminRecoveryStatus
        successful={recoveryView === 'success'}
        message={recoveryMessage}
        onBackToLogin={async () => {
          window.sessionStorage.removeItem(RECOVERY_SESSION_KEY);
          const { error } = await client.auth.signOut({ scope: 'local' });
          if (error) {
            setRecoveryMessage(`Unable to clear the recovery session: ${error.message}`);
            return;
          }
          setRecoveryView('none');
          setRecoveryMessage('');
          setUser(null);
          setAuthError('');
          setAuthReady(true);
        }}
      />
    );
  }
  if (!authReady) return <AdminLoading />;
  if (user) return <AdminDashboard user={user} onLogout={async () => {
    const { error } = await client.auth.signOut();
    if (error) throw error;
  }} />;
  return <AdminLogin error={authError} />;
}

function AdminSetupNotice() {
  return (
    <AdminShell>
      <div className="mx-auto max-w-2xl rounded-3xl border border-red-400/20 bg-white/[0.04] p-8 shadow-2xl md:p-12">
        <ShieldCheck className="mb-5 h-10 w-10 text-red-400" />
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-red-300">Supabase setup required</p>
        <h1 className="mt-3 text-3xl font-black text-white">Admin dashboard is not configured.</h1>
        <p className="mt-4 leading-relaxed text-gray-300">
          Configure <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code>, then enable Email
          authentication and the portfolio Storage buckets in Supabase.
        </p>
        <a href="/" className="mt-7 inline-flex items-center gap-2 rounded-full border border-white/15 px-5 py-3 text-sm font-bold text-white hover:border-red-400/50">
          <ArrowLeft size={16} /> Return to portfolio
        </a>
      </div>
    </AdminShell>
  );
}

function AdminLoading() {
  return (
    <AdminShell>
      <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-center text-gray-300">
        Checking administrator access…
      </div>
    </AdminShell>
  );
}

function AdminLogin({ error: initialError }: { error: string }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [message, setMessage] = useState(initialError);
  const [view, setView] = useState<'login' | 'forgot' | 'sent'>('login');
  const [busy, setBusy] = useState(false);

  useEffect(() => setMessage(initialError), [initialError]);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase || busy) return;
    setBusy(true);
    setMessage('');
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw error;
      if (!data.user) throw new Error('Supabase Auth returned no user for this session.');
      const { data: isAdmin, error: authorizationError } = await supabase.rpc('is_portfolio_admin');
      if (authorizationError) throw authorizationError;
      if (isAdmin !== true) {
        const { error: signOutError } = await supabase.auth.signOut();
        if (signOutError) console.error('Unable to sign out a non-admin Supabase user.', signOutError);
        setMessage('This account is not authorized to access the portfolio dashboard.');
      }
    } catch (error) {
      console.error('Supabase admin sign-in failed.', error);
      setMessage('Sign-in failed. Check the email and password, and confirm Supabase Email authentication is enabled.');
    } finally {
      setBusy(false);
    }
  };

  const resetPassword = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase || !email.trim()) {
      setMessage('Enter the registered email address first.');
      return;
    }
    setBusy(true);
    setMessage('');
    try {
      const redirectTo = new URL('/admin', window.location.origin).toString();
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo });
      if (error) throw error;
      setView('sent');
    } catch {
      setMessage('Unable to send the reset email. Check the address and Supabase Auth email settings.');
    } finally {
      setBusy(false);
    }
  };

  const backToLogin = () => {
    setView('login');
    setMessage('');
    setPassword('');
    setPasswordVisible(false);
  };

  return (
    <AdminShell>
      <div className="mx-auto w-full max-w-md rounded-3xl border border-white/10 bg-[#0c0b0e]/90 p-7 shadow-[0_30px_100px_-40px_rgba(220,38,38,.45)] backdrop-blur-2xl sm:p-9">
        <div className="mb-7 grid h-14 w-14 place-items-center rounded-2xl border border-red-400/25 bg-red-950/40 text-red-300">
          <ShieldCheck size={27} />
        </div>
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-red-300">
          {view === 'login' ? 'Secure access' : 'Account recovery'}
        </p>
        <h1 className="mt-2 text-2xl font-black text-white sm:text-3xl">
          {view === 'login' ? 'COMMAND CENTRE' : view === 'forgot' ? 'Forgot Password' : 'Check Your Email'}
        </h1>
        <p className="mt-2 text-sm text-gray-400">
          {view === 'login'
            ? 'Sign in with the account authorized in public.admin_users.'
            : view === 'forgot'
              ? 'Enter the email address registered to your administrator account.'
              : 'If an account exists for that address, password reset instructions are on the way.'}
        </p>

        {message && view !== 'sent' && (
          <p role="alert" className="mt-5 rounded-xl border border-red-400/20 bg-red-950/30 px-4 py-3 text-sm text-red-100">
            {message}
          </p>
        )}

        {view === 'sent' ? (
          <div role="status" aria-live="polite" className="mt-6 rounded-2xl border border-emerald-400/20 bg-emerald-950/20 p-5 text-sm leading-relaxed text-emerald-100">
            Check your inbox and follow the secure link to create a new password.
          </div>
        ) : (
        <form onSubmit={view === 'login' ? submit : resetPassword} className="mt-6 space-y-4">
          <label className="block text-xs font-bold uppercase tracking-wider text-gray-400">
            {view === 'login' ? 'Email address' : 'Registered email'}
            <input
              autoComplete={view === 'login' ? 'username' : 'email'}
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-base text-white outline-none focus:border-red-400/60"
            />
          </label>
          {view === 'login' && (
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-400">
              Password
              <span className="relative mt-2 block">
              <input
                autoComplete="current-password"
                type={passwordVisible ? 'text' : 'password'}
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 pr-12 text-base text-white outline-none focus:border-red-400/60"
              />
              <button
                type="button"
                aria-label={passwordVisible ? 'Hide password' : 'Show password'}
                aria-pressed={passwordVisible}
                onClick={() => setPasswordVisible((visible) => !visible)}
                className="absolute inset-y-0 right-0 inline-flex w-12 items-center justify-center rounded-r-xl text-gray-400 transition hover:text-red-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-red-400/60"
              >
                {passwordVisible
                  ? <EyeOff aria-hidden="true" size={18} />
                  : <Eye aria-hidden="true" size={18} />}
              </button>
              </span>
            </label>
          )}
          <button
            type="submit"
            disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-red-700 to-red-500 px-5 py-3 font-black uppercase tracking-wider text-white transition hover:brightness-110 disabled:opacity-60"
          >
            <ShieldCheck size={17} />
            {busy
              ? view === 'login' ? 'Signing in…' : 'Sending…'
              : view === 'login' ? 'Sign in' : 'Send reset link'}
          </button>
        </form>
        )}
        {view === 'login' ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setView('forgot');
              setMessage('');
            }}
            className="mt-4 w-full text-center text-sm text-gray-400 underline decoration-white/20 underline-offset-4 hover:text-white"
          >
            Forgot password?
          </button>
        ) : (
          <button
            type="button"
            disabled={busy}
            onClick={backToLogin}
            className="mt-5 flex w-full items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-400 hover:text-white disabled:opacity-60"
          >
            <ArrowLeft size={14} /> Back to Login
          </button>
        )}
        {view === 'login' && (
          <a href="/" className="mt-7 flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-500 hover:text-gray-200">
            <ArrowLeft size={14} /> Back to portfolio
          </a>
        )}
      </div>
    </AdminShell>
  );
}

function AdminPasswordRecovery({
  busy,
  message,
  onSubmit,
  onBackToLogin,
}: {
  busy: boolean;
  message: string;
  onSubmit: (password: string) => Promise<void>;
  onBackToLogin: () => Promise<void>;
}) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);
  const [validationMessage, setValidationMessage] = useState('');

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setValidationMessage('');
    if (password.length < 8) {
      setValidationMessage('Use at least 8 characters for your new password.');
      return;
    }
    if (password !== confirmPassword) {
      setValidationMessage('The passwords do not match.');
      return;
    }
    void onSubmit(password);
  };

  const toggleClasses = 'absolute inset-y-0 right-0 inline-flex w-12 items-center justify-center rounded-r-xl text-gray-400 transition hover:text-red-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-red-400/60';

  return (
    <AdminShell>
      <div className="mx-auto w-full max-w-md rounded-3xl border border-white/10 bg-[#0c0b0e]/90 p-7 shadow-[0_30px_100px_-40px_rgba(220,38,38,.45)] backdrop-blur-2xl sm:p-9">
        <div className="mb-7 grid h-14 w-14 place-items-center rounded-2xl border border-red-400/25 bg-red-950/40 text-red-300">
          <ShieldCheck size={27} />
        </div>
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-red-300">Secure account recovery</p>
        <h1 className="mt-2 text-2xl font-black text-white sm:text-3xl">Create New Password</h1>
        <p className="mt-2 text-sm text-gray-400">Choose a password with at least 8 characters.</p>
        {(validationMessage || message) && (
          <p role="alert" className="mt-5 rounded-xl border border-red-400/20 bg-red-950/30 px-4 py-3 text-sm text-red-100">
            {validationMessage || message}
          </p>
        )}
        <form onSubmit={submit} className="mt-6 space-y-4">
          <label className="block text-xs font-bold uppercase tracking-wider text-gray-400">
            Create New Password
            <span className="relative mt-2 block">
              <input
                autoComplete="new-password"
                type={passwordVisible ? 'text' : 'password'}
                required
                minLength={8}
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  setValidationMessage('');
                }}
                className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 pr-12 text-base text-white outline-none focus:border-red-400/60"
              />
              <button
                type="button"
                aria-label={passwordVisible ? 'Hide new password' : 'Show new password'}
                aria-pressed={passwordVisible}
                onClick={() => setPasswordVisible((visible) => !visible)}
                className={toggleClasses}
              >
                {passwordVisible ? <EyeOff aria-hidden="true" size={18} /> : <Eye aria-hidden="true" size={18} />}
              </button>
            </span>
          </label>
          <label className="block text-xs font-bold uppercase tracking-wider text-gray-400">
            Confirm Password
            <span className="relative mt-2 block">
              <input
                autoComplete="new-password"
                type={confirmPasswordVisible ? 'text' : 'password'}
                required
                minLength={8}
                value={confirmPassword}
                onChange={(event) => {
                  setConfirmPassword(event.target.value);
                  setValidationMessage('');
                }}
                className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 pr-12 text-base text-white outline-none focus:border-red-400/60"
              />
              <button
                type="button"
                aria-label={confirmPasswordVisible ? 'Hide confirmation password' : 'Show confirmation password'}
                aria-pressed={confirmPasswordVisible}
                onClick={() => setConfirmPasswordVisible((visible) => !visible)}
                className={toggleClasses}
              >
                {confirmPasswordVisible
                  ? <EyeOff aria-hidden="true" size={18} />
                  : <Eye aria-hidden="true" size={18} />}
              </button>
            </span>
          </label>
          <button
            type="submit"
            disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-red-700 to-red-500 px-5 py-3 font-black uppercase tracking-wider text-white transition hover:brightness-110 disabled:opacity-60"
          >
            <ShieldCheck size={17} /> {busy ? 'Updating password…' : 'Update Password'}
          </button>
        </form>
        <button
          type="button"
          disabled={busy}
          onClick={() => void onBackToLogin()}
          className="mt-5 flex w-full items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-400 hover:text-white disabled:opacity-60"
        >
          <ArrowLeft size={14} /> Back to Login
        </button>
      </div>
    </AdminShell>
  );
}

function AdminRecoveryStatus({
  successful,
  message,
  onBackToLogin,
}: {
  successful: boolean;
  message: string;
  onBackToLogin: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const returnToLogin = async () => {
    setBusy(true);
    await onBackToLogin();
    setBusy(false);
  };

  return (
    <AdminShell>
      <div className="mx-auto w-full max-w-md rounded-3xl border border-white/10 bg-[#0c0b0e]/90 p-7 shadow-[0_30px_100px_-40px_rgba(220,38,38,.45)] backdrop-blur-2xl sm:p-9">
        <div className={`mb-7 grid h-14 w-14 place-items-center rounded-2xl border ${successful ? 'border-emerald-400/25 bg-emerald-950/40 text-emerald-300' : 'border-red-400/25 bg-red-950/40 text-red-300'}`}>
          <ShieldCheck size={27} />
        </div>
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-red-300">Account recovery</p>
        <h1 className="mt-2 text-2xl font-black text-white sm:text-3xl">
          {successful ? 'Password Updated Successfully' : 'Reset Link Invalid or Expired'}
        </h1>
        <p
          role={successful ? 'status' : 'alert'}
          aria-live="polite"
          className={`mt-4 rounded-xl border px-4 py-3 text-sm leading-relaxed ${successful ? 'border-emerald-400/20 bg-emerald-950/20 text-emerald-100' : 'border-red-400/20 bg-red-950/30 text-red-100'}`}
        >
          {message || (successful
            ? 'Your password has been updated. Sign in with your new password to continue.'
            : 'This password reset link is invalid or has expired. Return to login and request a new link.')}
        </p>
        <button
          type="button"
          disabled={busy}
          onClick={() => void returnToLogin()}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-red-700 to-red-500 px-5 py-3 font-black uppercase tracking-wider text-white transition hover:brightness-110 disabled:opacity-60"
        >
          <ArrowLeft size={16} /> {busy ? 'Returning…' : 'Back to Login'}
        </button>
      </div>
    </AdminShell>
  );
}

function AdminDashboard({ user, onLogout }: { user: User; onLogout: () => Promise<void> }) {
  const [content, setContent] = useState<PortfolioContent>(DEFAULT_PORTFOLIO_CONTENT);
  const [portfolioSections, setPortfolioSections] = useState<PortfolioSectionConfig[]>([]);
  const [customSectionContent, setCustomSectionContent] = useState<CustomSectionContentRecord[]>([]);
  const [sectionId, setSectionId] = useState<SectionId>('home');
  const [editorJson, setEditorJson] = useState(() => editorValue(DEFAULT_PORTFOLIO_CONTENT, SECTIONS[0]));
  const [dirty, setDirty] = useState(false);
  const dirtyRef = useRef(false);
  const savingRef = useRef(false);
  const [draftLoading, setDraftLoading] = useState(true);
  const [managerHasUnsavedEdits, setManagerHasUnsavedEdits] = useState(false);
  const [draftUpdatedAt, setDraftUpdatedAt] = useState<string>();
  const [publishedUpdatedAt, setPublishedUpdatedAt] = useState<string>();
  const [activities] = useState<ActivityItem[]>([]);
  const [publicationState, setPublicationState] = useState<AdminPublicationState>({
    profile: false,
    siteSettings: false,
  });
  const [siteSettingsExists, setSiteSettingsExists] = useState(false);
  const [fireEffectsColumnAvailable, setFireEffectsColumnAvailable] = useState(false);
  const [contactSettingsColumnAvailable, setContactSettingsColumnAvailable] = useState(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [working, setWorking] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(true);
  const [messagesRefreshing, setMessagesRefreshing] = useState(false);
  const [messageSearch, setMessageSearch] = useState('');
  const [messageFilter, setMessageFilter] = useState<ContactMessage['status'] | 'all'>('all');
  const [newProjectTitle, setNewProjectTitle] = useState('');
  const [newProjectCategory, setNewProjectCategory] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const selectedSection = SECTIONS.find((section) => section.id === sectionId) ?? SECTIONS[0];
  const selectedSectionRef = useRef(selectedSection);
  selectedSectionRef.current = selectedSection;
  const selectedProject = content.projects.find((project) => project.id === selectedProjectId) ?? content.projects[0];
  const isMessageView = sectionId === 'messages';
  const isManagedSection = ['experience', 'certifications', 'achievements', 'internships', 'workshops', 'codingProfiles', 'publications', 'resume', 'fireEffects', 'contact'].includes(sectionId);
  const unreadMessageCount = messages.filter((message) => message.status === 'new').length;
  const repliedMessageCount = messages.filter((message) => message.status === 'replied').length;
  const canEdit = Boolean(supabase && user.id);
  const hasPublishedContent = publicationState.profile ||
    publicationState.siteSettings ||
    content.projects.some((item) => item.published === true) ||
    content.skills.some((item) => item.published === true) ||
    content.education.some((item) => item.published === true) ||
    content.experience.some((item) => item.published === true) ||
    content.achievements.some((item) => item.published === true) ||
    content.certifications.some((item) => item.published === true) ||
    content.internships.some((item) => item.published === true) ||
    content.workshops.some((item) => item.published === true) ||
    content.codingProfiles.some((item) => item.published === true) ||
    content.publications.some((item) => item.published === true) ||
    content.resumes.some((item) => item.published === true) ||
    content.socials.some((item) => item.published === true);

  useEffect(() => {
    if (!canEdit) return;
    let active = true;
    let portfolioRefreshQueued = false;
    let messageRefreshQueued = false;
    const loadPortfolio = async () => {
      try {
        const result = await getAdminPortfolio();
        if (!active) return;
        setPortfolioSections(result.sections);
        setCustomSectionContent(result.customSectionContent);
        if (!dirtyRef.current && !savingRef.current) {
          setContent(result.content);
          setEditorJson(editorValue(result.content, selectedSectionRef.current));
          setPublicationState({
            profile: result.profilePublished,
            siteSettings: result.siteSettingsPublished,
          });
          setSiteSettingsExists(result.siteSettingsExists);
          setFireEffectsColumnAvailable(result.fireEffectsColumnAvailable);
          setContactSettingsColumnAvailable(result.contactSettingsColumnAvailable);
        } else {
          setNotice({ type: 'error', text: 'A remote update arrived while you were editing. Save your changes before continuing.' });
        }
      } catch (error) {
        if (!active) return;
        console.error('Unable to load admin portfolio records from Supabase.', error);
        setNotice({ type: 'error', text: error instanceof Error ? error.message : 'Unable to load portfolio records from Supabase.' });
      } finally {
        if (active) setDraftLoading(false);
      }
    };
    const loadMessages = async () => {
      if (active) setMessagesLoading(true);
      try {
        const nextMessages = await getAdminMessages();
        if (active) setMessages(nextMessages);
      } catch (error) {
        if (!active) return;
        console.error('Unable to load Supabase contact messages.', error);
        setNotice({ type: 'error', text: error instanceof Error ? error.message : 'The Supabase contact inbox is unavailable.' });
      } finally {
        if (active) setMessagesLoading(false);
      }
    };
    void loadPortfolio();
    void loadMessages();

    let unsubscribePortfolio = () => {};
    let unsubscribeMessages = () => {};
    try {
      unsubscribePortfolio = subscribeAdminPortfolio(() => {
        if (portfolioRefreshQueued) return;
        portfolioRefreshQueued = true;
        window.setTimeout(() => {
          portfolioRefreshQueued = false;
          if (active) void loadPortfolio();
        }, 150);
      }, (error) => {
        console.error('Supabase portfolio Realtime subscription failed.', error);
        if (active) setNotice({ type: 'error', text: 'Live admin updates are unavailable. Enable Realtime for the portfolio tables in Supabase.' });
      });
      unsubscribeMessages = subscribeAdminMessages(() => {
        if (messageRefreshQueued) return;
        messageRefreshQueued = true;
        window.setTimeout(() => {
          messageRefreshQueued = false;
          if (active) void loadMessages();
        }, 150);
      }, (error) => {
        console.error('Supabase message Realtime subscription failed.', error);
        if (active) setNotice({ type: 'error', text: 'Live inbox updates are unavailable. Enable Realtime for the messages table in Supabase.' });
      });
    } catch (error) {
      console.error('Unable to subscribe to Supabase Realtime.', error);
      setNotice({ type: 'error', text: 'Unable to start Supabase live updates. Check Realtime configuration.' });
    }

    return () => {
      active = false;
      unsubscribePortfolio();
      unsubscribeMessages();
    };
  }, [canEdit]);

  useEffect(() => {
    setSelectedProjectId((current) =>
      content.projects.some((project) => project.id === current) ? current : content.projects[0]?.id ?? ''
    );
  }, [content.projects]);

  const updateDirty = (value: boolean) => {
    dirtyRef.current = value;
    setDirty(value);
  };

  const updateContent = (next: PortfolioContent) => {
    setContent(next);
    setEditorJson(editorValue(next, selectedSection));
    updateDirty(true);
    setNotice(null);
  };

  const changeSection = (next: SectionId) => {
    if ((dirtyRef.current || managerHasUnsavedEdits) && !window.confirm('Discard unsaved editor changes and switch sections?')) return;
    setSectionId(next);
    setEditorJson(editorValue(content, SECTIONS.find((section) => section.id === next) ?? SECTIONS[0]));
    updateDirty(false);
    setManagerHasUnsavedEdits(false);
    setNotice(null);
    setMobileMenuOpen(false);
  };

  const parsePatch = (): Record<string, unknown> => {
    const value: unknown = JSON.parse(editorJson);
    if (!isRecord(value)) throw new Error('Editor content must be a JSON object.');
    const allowed = new Set(selectedSection.fields);
    const unexpected = Object.keys(value).find((key) => !allowed.has(key));
    if (unexpected) throw new Error(`The ${unexpected} field is not editable in this section.`);
    return value;
  };

  const mergePatch = (base: PortfolioContent, patch: Record<string, unknown>) => {
    const candidate: Record<string, unknown> = { ...base, ...patch };
    if (!isPortfolioContent(candidate)) {
      throw new Error('Content is incomplete or invalid. Check required fields and array shapes.');
    }
    return candidate;
  };

  const currentEditorContent = () => mergePatch(content, parsePatch());

  const revealNotice = () => {
    window.requestAnimationFrame(() => {
      document.getElementById('admin-dashboard-notice')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  };

  const saveDraft = async (publish: boolean) => {
    if (!supabase || working || sectionId === 'messages' || sectionId === 'fireEffects' || sectionId === 'contact' || sectionId === 'sectionManagement') return;
    if (managerHasUnsavedEdits) {
      setNotice({ type: 'error', text: 'Save the current entry in its editor before saving the portfolio draft.' });
      revealNotice();
      return;
    }
    setWorking(true);
    savingRef.current = true;
    setNotice(null);
    try {
      const next = currentEditorContent();
      const nextPublicationState = await saveAdminSection(
        sectionId,
        next,
        user.id,
        publish,
        publicationState,
      );
      setContent(next);
      setEditorJson(editorValue(next, selectedSection));
      setPublicationState(nextPublicationState);
      if (sectionId === 'home' || sectionId === 'skills') setSiteSettingsExists(true);
      updateDirty(false);
      const now = new Date().toISOString();
      setDraftUpdatedAt(now);
      if (publish) setPublishedUpdatedAt(now);
      setNotice({
        type: 'success',
        text: publish
          ? 'Changes published to Supabase. Connected portfolio pages are updating in real time.'
          : 'Changes saved to Supabase. Unpublished entries remain hidden from public visitors.',
      });
      revealNotice();
    } catch (error) {
      console.error('Supabase portfolio content save failed.', error);
      const detail = error instanceof Error ? error.message : 'Unable to save portfolio content.';
      setNotice({ type: 'error', text: detail });
      revealNotice();
    } finally {
      savingRef.current = false;
      setWorking(false);
    }
  };

  const saveFireEffects = async () => {
    if (!supabase || working) return;
    if (!fireEffectsColumnAvailable) {
      setNotice({ type: 'error', text: 'Apply the fire effects settings migration in Supabase before saving these controls.' });
      return;
    }
    setWorking(true);
    setNotice(null);
    try {
      const siteSettingsPublished = await saveFireEffectsSettings(
        content.fireEffects,
        user.id,
        publicationState.siteSettings,
        content,
      );
      setSiteSettingsExists(true);
      setPublicationState((current) => ({ ...current, siteSettings: siteSettingsPublished }));
      updateDirty(false);
      const now = new Date().toISOString();
      setDraftUpdatedAt(now);
      if (siteSettingsPublished) setPublishedUpdatedAt(now);
      setNotice({
        type: 'success',
        text: siteSettingsPublished
          ? 'Fire effect settings saved. The published portfolio will refresh through Supabase Realtime.'
          : 'Fire effect settings saved. Publish site settings to make the changes visible to visitors.',
      });
    } catch (error) {
      console.error('Unable to save fire effect settings.', error);
      setNotice({ type: 'error', text: error instanceof Error ? error.message : 'Unable to save fire effect settings.' });
    } finally {
      setWorking(false);
    }
  };

  const saveContactSettings = async () => {
    if (!supabase || working) return;
    if (!contactSettingsColumnAvailable) {
      setNotice({ type: 'error', text: 'Apply the contact management migration in Supabase before saving these settings.' });
      return;
    }
    if (managerHasUnsavedEdits) {
      setNotice({ type: 'error', text: 'Finish saving the active contact editor before saving contact settings.' });
      return;
    }
    setWorking(true);
    setNotice(null);
    try {
      if (!isPortfolioContent(content)) throw new Error('Contact settings are invalid. Review the fields before saving.');
      const siteSettingsPublished = await saveAdminContactSettings(content.contactSettings, user.id, content);
      setSiteSettingsExists(true);
      setPublicationState((current) => ({ ...current, siteSettings: siteSettingsPublished }));
      updateDirty(false);
      const now = new Date().toISOString();
      setDraftUpdatedAt(now);
      if (siteSettingsPublished) setPublishedUpdatedAt(now);
      setNotice({
        type: 'success',
        text: siteSettingsPublished
          ? 'Contact settings saved. The public portfolio will update through Supabase Realtime.'
          : 'Contact settings saved. Publish site settings to make them visible to visitors.',
      });
    } catch (error) {
      console.error('Unable to save contact settings.', error);
      setNotice({ type: 'error', text: error instanceof Error ? error.message : 'Unable to save contact settings.' });
    } finally {
      setWorking(false);
    }
  };

  const previewDraft = () => {
    if (managerHasUnsavedEdits) {
      setNotice({ type: 'error', text: 'Save the current entry in its editor before previewing the draft.' });
      revealNotice();
      return;
    }
    let previewWindow: Window | null = null;
    try {
      previewWindow = window.open('about:blank', '_blank');
      if (!previewWindow) throw new Error('The preview tab was blocked. Allow pop-ups and try again.');
      const draft = currentEditorContent();
      window.localStorage.setItem('portfolio-admin-preview', JSON.stringify(draft));
      previewWindow.opener = null;
      previewWindow.location.replace('/?portfolioPreview=1');
      setNotice({ type: 'success', text: 'Opened an unpublished local preview in a new tab.' });
    } catch (error) {
      previewWindow?.close();
      console.error('Unable to create the draft preview.', error);
      setNotice({ type: 'error', text: error instanceof Error ? error.message : 'Unable to preview this draft.' });
      revealNotice();
    }
  };

  const uploadFile = async (file: File, kind: 'profile' | 'project') => {
    if (!supabase || working || uploadingFile) return;
    const allowedType = ['image/jpeg', 'image/png'].includes(file.type);
    const sizeLimit = 10 * 1024 * 1024;
    if (!allowedType || file.size >= sizeLimit) {
      setNotice({
        type: 'error',
        text: 'Choose a JPG or PNG image under 10 MB.',
      });
      return;
    }
    if (kind === 'project' && !selectedProject) {
      setNotice({ type: 'error', text: 'Create or select a project before uploading its thumbnail.' });
      return;
    }
    let updated: PortfolioContent;
    try {
      updated = currentEditorContent();
    } catch (error) {
      setNotice({ type: 'error', text: error instanceof Error ? error.message : 'Fix the editor JSON before uploading.' });
      return;
    }

    setUploadingFile(true);
    setNotice(null);
    const folder = kind === 'profile' ? 'profile' : 'projects';
    try {
      const recordId = kind === 'project' ? selectedProject?.id ?? 'project' : 'main';
      const downloadUrl = await uploadPortfolioAsset(file, folder, recordId);

      if (kind === 'profile') updated.about = { ...updated.about, portrait: downloadUrl };
      if (kind === 'project' && selectedProject) {
        updated.projects = updated.projects.map((project) =>
          project.id === selectedProject.id ? { ...project, poster: downloadUrl } : project
        );
      }
      setContent(updated);
      setEditorJson(editorValue(updated, selectedSection));
      updateDirty(true);
      setNotice({
        type: 'success',
        text: 'File uploaded. Save the current section to store its URL in Supabase.',
      });
    } catch (error) {
      console.error('Supabase Storage upload failed.', error);
      setNotice({ type: 'error', text: error instanceof Error ? error.message : 'Upload failed. Check Supabase Storage buckets, policies, and network connection.' });
    } finally {
      setUploadingFile(false);
    }
  };

  const onFileSelected = (kind: 'profile' | 'project') => (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file) void uploadFile(file, kind);
  };

  const addProject = () => {
    const title = newProjectTitle.trim();
    if (!title) {
      setNotice({ type: 'error', text: 'Enter a project title before adding it.' });
      return;
    }
    try {
      const base = currentEditorContent();
      const baseId = slugify(title) || `project-${Date.now()}`;
      const ids = new Set(base.projects.map((project) => project.id));
      let id = baseId;
      let suffix = 2;
      while (ids.has(id)) id = `${baseId}-${suffix++}`;
      const project: Project = {
        id,
        title,
        subtitle: title,
        category: newProjectCategory.trim() || 'Academic Project',
        status: 'Concept',
        description: '',
        tags: [],
        problem: '',
        objectives: [],
        solution: '',
        implementation: '',
      };
      const next = { ...base, projects: [...base.projects, project] };
      setContent(next);
      setEditorJson(editorValue(next, selectedSection));
      setSelectedProjectId(id);
      setNewProjectTitle('');
      setNewProjectCategory('');
      updateDirty(true);
      setNotice({ type: 'success', text: 'Project added to the draft. Complete its details before publishing.' });
    } catch (error) {
      setNotice({ type: 'error', text: error instanceof Error ? error.message : 'Unable to add this project.' });
    }
  };

  const moveProject = (offset: -1 | 1) => {
    try {
      const base = currentEditorContent();
      const from = base.projects.findIndex((project) => project.id === selectedProject?.id);
      const to = from + offset;
      if (from < 0 || to < 0 || to >= base.projects.length) return;
      const projects = [...base.projects];
      [projects[from], projects[to]] = [projects[to], projects[from]];
      const next = { ...base, projects };
      setContent(next);
      setEditorJson(editorValue(next, selectedSection));
      updateDirty(true);
    } catch (error) {
      setNotice({ type: 'error', text: error instanceof Error ? error.message : 'Unable to reorder projects.' });
    }
  };

  const toggleProjectPublished = () => {
    if (!selectedProject) return;
    const next = {
      ...content,
      projects: content.projects.map((project) => project.id === selectedProject.id
        ? { ...project, published: project.published !== true }
        : project),
    };
    updateContent(next);
  };

  const deleteProject = () => {
    if (!selectedProject) return;
    try {
      const base = currentEditorContent();
      const next = { ...base, projects: base.projects.filter((project) => project.id !== selectedProject.id) };
      setContent(next);
      setEditorJson(editorValue(next, selectedSection));
      setSelectedProjectId(next.projects[0]?.id ?? '');
      updateDirty(true);
      setNotice({ type: 'success', text: 'Project marked for deletion. Confirm when saving or publishing to apply this change.' });
    } catch (error) {
      setNotice({ type: 'error', text: error instanceof Error ? error.message : 'Unable to delete this project.' });
    }
  };

  const refreshMessages = async () => {
    if (!supabase || messagesRefreshing) return;
    setMessagesRefreshing(true);
    try {
      setMessages(await getAdminMessages());
    } catch (error) {
      console.error('Unable to refresh Supabase contact messages.', error);
      setNotice({ type: 'error', text: error instanceof Error ? error.message : 'Unable to refresh the message inbox.' });
    } finally {
      setMessagesRefreshing(false);
    }
  };

  const updateMessageStatus = async (message: ContactMessage, status: ContactMessage['status']) => {
    if (!supabase || working) return;
    setWorking(true);
    try {
      await updateAdminMessageStatus(message.id, status);
      setMessages((current) => current.map((item) => item.id === message.id
        ? { ...item, status }
        : item));
      setNotice({ type: 'success', text: 'Message status updated.' });
    } catch (error) {
      console.error('Unable to update Supabase contact message status.', error);
      setNotice({ type: 'error', text: error instanceof Error ? error.message : 'Unable to update this message.' });
    } finally {
      setWorking(false);
    }
  };

  const deleteMessage = async (message: ContactMessage) => {
    if (!supabase || working || !window.confirm(`Delete the message from ${message.name}?`)) return;
    setWorking(true);
    try {
      await deleteAdminMessage(message.id);
      setMessages((current) => current.filter((item) => item.id !== message.id));
      setNotice({ type: 'success', text: 'Message deleted from the inbox.' });
    } catch (error) {
      console.error('Unable to delete Supabase contact message.', error);
      setNotice({ type: 'error', text: error instanceof Error ? error.message : 'Unable to delete this message.' });
    } finally {
      setWorking(false);
    }
  };

  const deleteSingleton = async (table: 'profile' | 'site_settings') => {
    const label = table === 'profile' ? 'profile record' : 'site settings record';
    if ((dirtyRef.current || managerHasUnsavedEdits) &&
      !window.confirm('Discard unsaved editor changes before deleting this record?')) return;
    if (working || !window.confirm(`Permanently delete the ${label} from Supabase? Public visitors will see built-in fallback content.`)) return;
    setWorking(true);
    try {
      await deleteAdminSingleton(table);
      const result = await getAdminPortfolio();
      setContent(result.content);
      setEditorJson(editorValue(result.content, selectedSection));
      setPublicationState({ profile: result.profilePublished, siteSettings: result.siteSettingsPublished });
      setSiteSettingsExists(result.siteSettingsExists);
      setFireEffectsColumnAvailable(result.fireEffectsColumnAvailable);
      setContactSettingsColumnAvailable(result.contactSettingsColumnAvailable);
      updateDirty(false);
      setDraftUpdatedAt(new Date().toISOString());
      setNotice({ type: 'success', text: `The ${label} was deleted. Built-in fallback content will remain available.` });
    } catch (error) {
      console.error(`Unable to delete Supabase ${table} record.`, error);
      setNotice({ type: 'error', text: error instanceof Error ? error.message : `Unable to delete the ${label}.` });
    } finally {
      setWorking(false);
    }
  };

  const sectionName = sectionId === 'sectionManagement'
    ? 'Section Management'
    : portfolioSections.find((section) => section.sectionKey === sectionId)?.sectionName ?? selectedSection.label;
  const sidebarSections = [...SECTIONS].sort((left, right) => {
    if (left.id === 'sectionManagement') return 1;
    if (right.id === 'sectionManagement') return -1;
    const leftOrder = portfolioSections.find((section) => section.sectionKey === left.id)?.displayOrder ?? Number.MAX_SAFE_INTEGER;
    const rightOrder = portfolioSections.find((section) => section.sectionKey === right.id)?.displayOrder ?? Number.MAX_SAFE_INTEGER;
    return leftOrder - rightOrder;
  }).filter((section) => (
    section.id !== 'messages' ||
    portfolioSections.find((item) => item.sectionKey === 'messages')?.isEnabled !== false
  ));
  const logout = async () => {
    try {
      await onLogout();
    } catch (error) {
      console.error('Admin sign-out failed.', error);
      setNotice({ type: 'error', text: 'Unable to sign out. Retry and close this browser session if the problem continues.' });
    }
  };
  const activeSectionStats = useMemo(
    () => [
      { label: 'Projects', value: content.projects.length, icon: FolderKanban },
      { label: 'Certifications', value: content.certifications.length, icon: Award },
      { label: 'Achievements', value: content.achievements.length, icon: Award },
      { label: 'Internships', value: content.internships.length, icon: BriefcaseBusiness },
      { label: 'Workshops', value: content.workshops.length, icon: GraduationCap },
      { label: 'Publications', value: content.publications.length, icon: BookOpenText },
      { label: 'Contact messages', value: messages.length, icon: Inbox },
      { label: 'Unread messages', value: unreadMessageCount, icon: Mail },
      { label: 'Replied messages', value: repliedMessageCount, icon: Check },
    ],
    [
      content.projects.length,
      content.certifications.length,
      content.achievements.length,
      content.internships.length,
      content.workshops.length,
      content.publications.length,
      messages.length,
      unreadMessageCount,
      repliedMessageCount,
    ]
  );
  const filteredMessages = useMemo(() => {
    const query = messageSearch.trim().toLowerCase();
    return messages.filter((message) => {
      const matchesStatus = messageFilter === 'all' || message.status === messageFilter;
      const matchesQuery = !query || [message.name, message.email, message.subject]
        .some((value) => value.toLowerCase().includes(query));
      return matchesStatus && matchesQuery;
    });
  }, [messageFilter, messageSearch, messages]);

  return (
    <AdminShell wide>
      <div className="mx-auto flex min-h-screen max-w-[1500px] gap-4 px-3 py-3 md:px-6 md:py-6">
        {mobileMenuOpen && (
          <button aria-label="Close admin menu" className="fixed inset-0 z-30 bg-black/70 md:hidden" onClick={() => setMobileMenuOpen(false)} />
        )}
        <aside className={`fixed inset-y-3 left-3 z-40 flex w-[min(84vw,280px)] flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#0c0b0e]/95 p-4 shadow-2xl backdrop-blur-xl transition-transform md:sticky md:top-6 md:h-[calc(100vh-3rem)] md:w-64 md:translate-x-0 ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-[120%]'}`}>
          <a href="/" className="flex items-center gap-3 px-2 py-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl border border-red-400/30 bg-red-950/40 text-red-300"><Sparkles size={21} /></span>
            <span className="min-w-0"><span className="block text-[10px] font-black uppercase tracking-[0.12em] text-white">PARTHASARATHY'S</span><span className="block text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">PORTFOLIO</span></span>
          </a>
          <p className="mb-3 mt-8 px-3 text-[10px] font-bold uppercase tracking-[0.22em] text-gray-600">Manage content</p>
          <nav className="min-h-0 flex-1 space-y-1 overflow-x-hidden overflow-y-auto overscroll-contain pr-1">
            {sidebarSections.map((section) => {
              const Icon = section.icon;
              return (
                <button key={section.id} onClick={() => changeSection(section.id)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold transition ${sectionId === section.id ? 'border border-red-400/20 bg-red-950/35 text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}>
                  <Icon size={17} className={sectionId === section.id ? 'text-red-300' : ''} />
                  <span className="min-w-0 flex-1 truncate">{section.label}</span>
                  {section.id === 'messages' && unreadMessageCount > 0 && (
                    <span className="grid min-h-5 min-w-5 place-items-center rounded-full bg-red-700 px-1.5 text-[9px] font-black text-white">{unreadMessageCount}</span>
                  )}
                </button>
              );
            })}
          </nav>
          <div className="mt-auto rounded-2xl border border-white/5 bg-black/30 p-4">
            <p className="truncate text-xs font-bold text-gray-200">{user.email}</p>
            <p className="mt-1 text-[10px] uppercase tracking-wider text-emerald-300">Authorized administrator</p>
            <button onClick={() => void logout()} className="mt-4 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-500 hover:text-red-200"><LogOut size={14} /> Sign out</button>
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <header className="glass mb-5 flex items-center justify-between gap-3 rounded-2xl px-4 py-4 md:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <button onClick={() => setMobileMenuOpen(true)} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/10 text-white md:hidden" aria-label="Open admin menu"><Settings2 size={18} /></button>
              <div className="min-w-0">
                <p className="truncate text-[10px] font-bold uppercase tracking-[0.2em] text-red-300">{sectionName}</p>
                <h1 className="truncate text-xl font-black text-white sm:text-2xl">COMMAND CENTRE</h1>
              </div>
            </div>
            <div className="hidden items-center gap-2 rounded-full border border-emerald-400/15 bg-emerald-950/20 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-emerald-200 sm:flex">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_10px_#34d399]" /> Supabase live
            </div>
            <button onClick={() => void logout()} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/10 text-gray-400 hover:border-red-400/30 hover:text-white md:hidden" aria-label="Sign out"><LogOut size={17} /></button>
          </header>

          {draftLoading ? (
            <div className="glass rounded-3xl p-10 text-center text-gray-300">Loading saved portfolio content…</div>
          ) : (
            <>
              {notice && (
                <div id="admin-dashboard-notice" role={notice.type === 'error' ? 'alert' : 'status'} className={`mb-5 flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm ${notice.type === 'success' ? 'border-emerald-400/20 bg-emerald-950/20 text-emerald-100' : 'border-red-400/20 bg-red-950/20 text-red-100'}`}>
                  {notice.type === 'success' ? <Check size={17} className="mt-0.5 shrink-0" /> : <CircleAlert size={17} className="mt-0.5 shrink-0" />}
                  <p>{notice.text}</p>
                </div>
              )}
              <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {activeSectionStats.map((stat) => {
                  const Icon = stat.icon;
                  return <div key={stat.label} className="glass rounded-2xl p-4"><div className="flex items-center justify-between text-gray-500"><span className="text-[10px] font-bold uppercase tracking-wider">{stat.label}</span><Icon size={16} className="text-red-300" /></div><p className="mt-3 text-3xl font-black text-white">{stat.value}</p></div>;
                })}
              </div>

              {sectionId === 'sectionManagement' ? (
                <SectionManagementPanel
                  sections={portfolioSections}
                  content={customSectionContent}
                  onSectionsChange={setPortfolioSections}
                  onContentChange={setCustomSectionContent}
                />
              ) : isMessageView ? (
                <MessageInbox
                  messages={filteredMessages}
                  totalMessages={messages.length}
                  search={messageSearch}
                  filter={messageFilter}
                  loading={messagesLoading}
                  refreshing={messagesRefreshing}
                  busy={working}
                  onSearchChange={setMessageSearch}
                  onFilterChange={setMessageFilter}
                  onRefresh={() => void refreshMessages()}
                  onStatusChange={(message, status) => void updateMessageStatus(message, status)}
                  onDelete={(message) => void deleteMessage(message)}
                />
              ) : (
              <section className="glass rounded-3xl p-4 sm:p-6">
                <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                  <div>
                    <h2 className="text-lg font-black text-white">Edit {sectionName}</h2>
                    <p className="mt-1 text-xs text-gray-500">Changes save directly to Supabase. Published records update publicly as soon as they are saved.</p>
                  </div>
                  {sectionId !== 'fireEffects' && sectionId !== 'contact' && (
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={previewDraft} className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2.5 text-xs font-bold uppercase tracking-wider text-gray-200 hover:border-red-400/30"><Eye size={15} /> Preview</button>
                      <button type="button" disabled={working || managerHasUnsavedEdits || !dirty} onClick={() => void saveDraft(false)} className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2.5 text-xs font-bold uppercase tracking-wider text-gray-200 hover:border-white/30 disabled:cursor-not-allowed disabled:opacity-40"><Save size={15} /> {working ? 'Saving…' : 'Save changes'}</button>
                      <button type="button" disabled={working || managerHasUnsavedEdits} onClick={() => void saveDraft(true)} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-red-700 to-red-500 px-4 py-2.5 text-xs font-black uppercase tracking-wider text-white hover:brightness-110 disabled:opacity-50"><Send size={15} /> {working ? 'Saving…' : 'Publish'}</button>
                    </div>
                  )}
                </div>

                <div className="mb-4 flex flex-wrap gap-x-5 gap-y-2 border-y border-white/5 py-3 text-[10px] uppercase tracking-wider text-gray-500">
                  <span className="inline-flex items-center gap-1.5"><Cloud size={13} className={dirty ? 'text-amber-300' : 'text-emerald-300'} /> {dirty ? 'Unsaved changes' : 'Synced to Supabase'}</span>
                  <span>Last saved: {draftUpdatedAt ? formatDate(draftUpdatedAt) : 'No changes this session'}</span>
                  <span>Public records: {publishedUpdatedAt ? formatDate(publishedUpdatedAt) : hasPublishedContent ? 'Published records loaded' : 'None published'}</span>
                </div>

                {sectionId === 'projects' && (
                  <ProjectControls
                    projects={content.projects}
                    selectedProjectId={selectedProject?.id ?? ''}
                    selectedPublished={selectedProject?.published === true}
                    onSelect={setSelectedProjectId}
                    title={newProjectTitle}
                    category={newProjectCategory}
                    onTitleChange={setNewProjectTitle}
                    onCategoryChange={setNewProjectCategory}
                    onAdd={addProject}
                    onMove={moveProject}
                    onDelete={deleteProject}
                    onTogglePublished={toggleProjectPublished}
                    onUpload={onFileSelected('project')}
                  />
                )}
                {sectionId === 'fireEffects' && (
                  <FireEffectsStudio
                    settings={content.fireEffects}
                    siteSettingsPublished={publicationState.siteSettings}
                    siteSettingsExists={siteSettingsExists}
                    settingsSchemaAvailable={fireEffectsColumnAvailable}
                    saving={working}
                    onChange={(fireEffects) => updateContent({ ...content, fireEffects })}
                    onPublicationChange={(published) => {
                      setPublicationState((current) => ({ ...current, siteSettings: published }));
                      updateDirty(true);
                    }}
                    onReset={() => updateContent({
                      ...content,
                      fireEffects: {
                        ...DEFAULT_FIRE_EFFECTS_SETTINGS,
                        colors: [...DEFAULT_FIRE_EFFECTS_SETTINGS.colors],
                      },
                    })}
                    onSave={() => void saveFireEffects()}
                  />
                )}
                {sectionId === 'contact' && (
                  <ContactSettingsManager
                    settings={content.contactSettings}
                    saving={working}
                    schemaAvailable={contactSettingsColumnAvailable}
                    siteSettingsExists={siteSettingsExists}
                    siteSettingsPublished={publicationState.siteSettings}
                    onChange={(contactSettings) => updateContent({ ...content, contactSettings })}
                    onSave={() => void saveContactSettings()}
                  />
                )}
                {(sectionId === 'home' || sectionId === 'about') && (
                  <div className="mb-4 flex flex-wrap gap-3">
                    <label className="flex items-center gap-2 rounded-xl border border-white/5 bg-black/20 px-3 py-2.5 text-xs font-bold text-gray-300">
                      <input
                        type="checkbox"
                        checked={publicationState.profile}
                        onChange={(event) => {
                          setPublicationState((current) => ({ ...current, profile: event.target.checked }));
                          updateDirty(true);
                        }}
                        className="h-4 w-4 accent-red-500"
                      />
                      Publish profile content
                    </label>
                    {sectionId === 'home' && (
                      <>
                        <label className="flex items-center gap-2 rounded-xl border border-white/5 bg-black/20 px-3 py-2.5 text-xs font-bold text-gray-300">
                          <input
                            type="checkbox"
                            checked={publicationState.siteSettings}
                            onChange={(event) => {
                              setPublicationState((current) => ({ ...current, siteSettings: event.target.checked }));
                              updateDirty(true);
                            }}
                            className="h-4 w-4 accent-red-500"
                          />
                          Publish site settings
                        </label>
                        <button
                          type="button"
                          disabled={working}
                          onClick={() => void deleteSingleton('profile')}
                          className="rounded-xl border border-red-400/20 px-3 py-2.5 text-xs font-bold text-red-200 disabled:opacity-40"
                        >
                          Delete profile record
                        </button>
                        <button
                          type="button"
                          disabled={working}
                          onClick={() => void deleteSingleton('site_settings')}
                          className="rounded-xl border border-red-400/20 px-3 py-2.5 text-xs font-bold text-red-200 disabled:opacity-40"
                        >
                          Delete site settings
                        </button>
                      </>
                    )}
                  </div>
                )}

                {sectionId === 'about' && (
                  <UploadCard title="Profile image" description="Upload the portrait used in the About glass frame (image, max 10 MB)." onChange={onFileSelected('profile')} uploading={uploadingFile} />
                )}
                {sectionId === 'experience' && (
                  <>
                    <p className="mt-5 text-xs leading-relaxed text-gray-400">
                      Source-derived entries follow their original records. You can edit their descriptions here; deleting or unpublishing the source updates its Experience entry automatically.
                    </p>
                    <CmsEntryManager<ExperienceEntry>
                      title="Experience timeline"
                      collectionName="experience"
                      records={content.experience}
                      fields={CMS_FIELDS.experience}
                      titleField="title"
                      createEntry={() => ({
                        id: `experience-${Date.now()}`,
                        title: '',
                        description: '',
                        technologies: [],
                        published: false,
                      })}
                      onChange={(experience) => updateContent({ ...content, experience })}
                      onDirtyChange={setManagerHasUnsavedEdits}
                      getRecordLabel={(record) => record.sourceType
                        ? EXPERIENCE_SOURCE_LABELS[record.sourceType]
                        : 'Manual entry'}
                      canEditField={(record, field) => !record.sourceType || field.key === 'description'}
                      canDeleteRecord={(record) => !record.sourceType}
                      canChangePublished={(record) => !record.sourceType}
                    />
                  </>
                )}
                {sectionId === 'certifications' && (
                  <CmsEntryManager<CertificationEntry>
                    title="Certifications"
                    collectionName="certifications"
                    records={content.certifications}
                    fields={CMS_FIELDS.certifications}
                    titleField="title"
                    assets={CMS_ASSETS.certifications}
                    createEntry={() => ({
                      id: `certification-${Date.now()}`, title: '', organization: '', issueDate: '',
                      category: '', credentialId: '', credentialUrl: '', certificateUrl: '', published: false,
                    })}
                    onChange={(certifications) => updateContent({ ...content, certifications })}
                    onDirtyChange={setManagerHasUnsavedEdits}
                  />
                )}
                {sectionId === 'achievements' && (
                  <CmsEntryManager<AchievementEntry>
                    title="Achievements & awards"
                    collectionName="achievements"
                    records={content.achievements}
                    fields={CMS_FIELDS.achievements}
                    titleField="title"
                    assets={CMS_ASSETS.achievements}
                    createEntry={() => ({
                      id: `achievement-${Date.now()}`, title: '', issuer: '', date: '', description: '',
                      certificateUrl: '', published: false,
                    })}
                    onChange={(achievements) => updateContent({ ...content, achievements })}
                    onDirtyChange={setManagerHasUnsavedEdits}
                  />
                )}
                {sectionId === 'internships' && (
                  <CmsEntryManager<InternshipEntry>
                    title="Internships"
                    collectionName="internships"
                    records={content.internships}
                    fields={CMS_FIELDS.internships}
                    titleField="company"
                    assets={CMS_ASSETS.internships}
                    createEntry={() => ({
                      id: `internship-${Date.now()}`, company: '', role: '', duration: '',
                      startDate: '', endDate: '', description: '', skills: [], certificateUrl: '', published: false,
                    })}
                    onChange={(internships) => updateContent({ ...content, internships })}
                    onDirtyChange={setManagerHasUnsavedEdits}
                  />
                )}
                {sectionId === 'workshops' && (
                  <CmsEntryManager<WorkshopEntry>
                    title="Workshops & events"
                    collectionName="workshops"
                    records={content.workshops}
                    fields={CMS_FIELDS.workshops}
                    titleField="title"
                    assets={CMS_ASSETS.workshops}
                    createEntry={() => ({
                      id: `workshop-${Date.now()}`, title: '', institution: '', date: '', description: '',
                      certificateUrl: '', imageUrl: '', url: '', published: false,
                    })}
                    onChange={(workshops) => updateContent({ ...content, workshops })}
                    onDirtyChange={setManagerHasUnsavedEdits}
                  />
                )}
                {sectionId === 'codingProfiles' && (
                  <CmsEntryManager<CodingProfileEntry>
                    title="Coding profiles"
                    collectionName="codingProfiles"
                    records={content.codingProfiles}
                    fields={CMS_FIELDS.codingProfiles}
                    titleField="platform"
                    createEntry={() => ({
                      id: `coding-profile-${Date.now()}`, platform: '', username: '', profileUrl: '', published: false,
                    })}
                    onChange={(codingProfiles) => updateContent({ ...content, codingProfiles })}
                    onDirtyChange={setManagerHasUnsavedEdits}
                  />
                )}
                {sectionId === 'publications' && (
                  <CmsEntryManager<PublicationEntry>
                    title="Research & publications"
                    collectionName="publications"
                    records={content.publications}
                    fields={CMS_FIELDS.publications}
                    titleField="title"
                    assets={CMS_ASSETS.publications}
                    createEntry={() => ({
                      id: `publication-${Date.now()}`, title: '', abstract: '', publicationDate: '',
                      venue: '', doi: '', publicationUrl: '', pdfUrl: '', published: false,
                    })}
                    onChange={(publications) => updateContent({ ...content, publications })}
                    onDirtyChange={setManagerHasUnsavedEdits}
                  />
                )}
                {sectionId === 'resume' && (
                  <CmsEntryManager<ResumeEntry>
                    title="Resume / CV versions"
                    collectionName="resume"
                    records={content.resumes}
                    fields={CMS_FIELDS.resume}
                    titleField="title"
                    assets={CMS_ASSETS.resume}
                    createEntry={() => ({
                      id: `resume-${Date.now()}`, title: '', fileUrl: '', uploadedAt: '', published: false,
                    })}
                    onChange={(resumes) => {
                      const latest = [...resumes]
                        .filter((entry) => entry.published !== false && entry.fileUrl)
                        .sort((left, right) => right.uploadedAt.localeCompare(left.uploadedAt))[0];
                      updateContent({ ...content, resumes, resumeUrl: latest?.fileUrl ?? '' });
                    }}
                    onDirtyChange={setManagerHasUnsavedEdits}
                  />
                )}

                {!isManagedSection && (
                  <>
                    <label htmlFor="portfolio-json-editor" className="mb-2 mt-5 block text-xs font-bold uppercase tracking-wider text-gray-400">Content JSON</label>
                    <textarea
                      id="portfolio-json-editor"
                      spellCheck={false}
                      value={editorJson}
                      onChange={(event) => {
                        setEditorJson(event.target.value);
                        updateDirty(true);
                      }}
                      className="min-h-[420px] w-full resize-y rounded-2xl border border-white/10 bg-[#07070a] p-4 font-mono text-xs leading-6 text-gray-200 outline-none focus:border-red-400/40 sm:text-sm"
                      aria-describedby="portfolio-json-help"
                    />
                    <p id="portfolio-json-help" className="mt-2 text-[11px] leading-relaxed text-gray-500">
                      Edit only the fields in this section. Use valid JSON. Records are loaded from Supabase; fallback content is not saved automatically.
                    </p>
                    {uploadingFile && <p className="mt-3 text-xs font-bold text-red-200">Uploading securely to Supabase…</p>}
                  </>
                )}
              </section>
              )}

              <div className="mt-5 grid gap-5 lg:grid-cols-[1.2fr_.8fr]">
                <section className="glass rounded-3xl p-5">
                  <div className="mb-4 flex items-center gap-2"><BarChart3 size={17} className="text-red-300" /><h2 className="font-black text-white">Publishing status</h2></div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <StatusTile label="Supabase data" value={draftUpdatedAt ? 'Saved' : 'Connected'} detail={draftUpdatedAt ? formatDate(draftUpdatedAt) : 'Records load directly from the database'} />
                    <StatusTile label="Public content" value={hasPublishedContent ? 'Live' : 'Not published yet'} detail={publishedUpdatedAt ? formatDate(publishedUpdatedAt) : 'Publication follows each record’s status'} />
                  </div>
                </section>
                <section className="glass rounded-3xl p-5">
                  <div className="mb-4 flex items-center gap-2"><Activity size={17} className="text-red-300" /><h2 className="font-black text-white">Recent activity</h2></div>
                  {activities.length ? (
                    <ul className="space-y-3">
                      {activities.map((item, index) => <li key={`${item.action}-${index}`} className="border-l border-red-500/30 pl-3"><p className="text-xs font-semibold text-gray-200">{item.action}</p><p className="mt-1 text-[10px] text-gray-500">{item.section} · {formatDate(item.createdAt)}</p></li>)}
                    </ul>
                  ) : <p className="text-xs text-gray-500">Activity history is not available in the applied Supabase schema.</p>}
                </section>
              </div>
            </>
          )}
        </main>
      </div>
    </AdminShell>
  );
}

function ProjectControls({
  projects,
  selectedProjectId,
  selectedPublished,
  onSelect,
  title,
  category,
  onTitleChange,
  onCategoryChange,
  onAdd,
  onMove,
  onDelete,
  onTogglePublished,
  onUpload,
}: {
  projects: Project[];
  selectedProjectId: string;
  selectedPublished: boolean;
  onSelect: (id: string) => void;
  title: string;
  category: string;
  onTitleChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onAdd: () => void;
  onMove: (offset: -1 | 1) => void;
  onDelete: () => void;
  onTogglePublished: () => void;
  onUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className="rounded-2xl border border-white/5 bg-black/20 p-4">
      <div className="grid gap-3 md:grid-cols-[1fr_auto]">
        <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
          Select project
          <select value={selectedProjectId} onChange={(event) => onSelect(event.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-[#111014] px-3 py-3 text-sm text-white">
            {projects.map((project) => <option key={project.id} value={project.id}>{project.title}</option>)}
          </select>
        </label>
        <div className="flex flex-wrap items-end gap-2">
          <button onClick={() => onMove(-1)} disabled={!selectedProjectId || projects.findIndex((project) => project.id === selectedProjectId) <= 0} title="Move project up" className="grid h-11 w-11 place-items-center rounded-xl border border-white/10 text-gray-200 disabled:opacity-30"><ArrowUp size={16} /></button>
          <button onClick={() => onMove(1)} disabled={!selectedProjectId || projects.findIndex((project) => project.id === selectedProjectId) >= projects.length - 1} title="Move project down" className="grid h-11 w-11 place-items-center rounded-xl border border-white/10 text-gray-200 disabled:opacity-30"><ArrowDown size={16} /></button>
          <label className="grid h-11 cursor-pointer place-items-center rounded-xl border border-white/10 px-3 text-xs font-bold text-gray-200 hover:border-red-400/30"><Upload size={15} /><input type="file" accept="image/*" className="sr-only" onChange={onUpload} />Thumbnail</label>
          <button onClick={onDelete} disabled={!selectedProjectId} className="h-11 rounded-xl border border-red-400/20 px-3 text-xs font-bold uppercase tracking-wider text-red-200 disabled:opacity-30">Delete</button>
        </div>
      </div>
      {selectedProjectId && (
        <label className="mt-4 flex items-center gap-2 text-xs font-bold text-gray-300">
          <input type="checkbox" checked={selectedPublished} onChange={onTogglePublished} className="h-4 w-4 accent-red-500" />
          Publish this project
        </label>
      )}
      <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
        <input value={title} onChange={(event) => onTitleChange(event.target.value)} placeholder="New project title" className="rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white placeholder:text-gray-600" />
        <input value={category} onChange={(event) => onCategoryChange(event.target.value)} placeholder="Category (optional)" className="rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white placeholder:text-gray-600" />
        <button onClick={onAdd} className="inline-flex items-center justify-center gap-1 rounded-xl border border-red-400/25 px-4 py-2.5 text-xs font-black uppercase tracking-wider text-red-100 hover:bg-red-950/30"><Plus size={15} /> Add project</button>
      </div>
    </div>
  );
}

function UploadCard({
  title,
  description,
  accept = 'image/*',
  onChange,
  uploading,
}: {
  title: string;
  description: string;
  accept?: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  uploading: boolean;
}) {
  const isResume = accept.includes('pdf');
  const Icon = isResume ? FileText : FileImage;
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-white/5 bg-black/20 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-red-400/15 bg-red-950/20 text-red-300"><Icon size={19} /></span>
        <span><strong className="block text-sm text-white">{title}</strong><span className="mt-1 block text-xs text-gray-500">{description}</span></span>
      </div>
      <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-white/10 px-4 py-3 text-xs font-bold uppercase tracking-wider text-gray-200 hover:border-red-400/35">
        <Upload size={15} /> {uploading ? 'Uploading…' : 'Upload'}
        <input type="file" accept={accept} disabled={uploading} className="sr-only" onChange={onChange} />
      </label>
    </div>
  );
}

function StatusTile({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <div className="rounded-2xl border border-white/5 bg-black/20 p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">{label}</p><p className="mt-2 text-sm font-black text-white">{value}</p><p className="mt-1 text-[10px] text-gray-500">{detail}</p></div>;
}

function MessageInbox({
  messages,
  totalMessages,
  search,
  filter,
  loading,
  refreshing,
  busy,
  onSearchChange,
  onFilterChange,
  onRefresh,
  onStatusChange,
  onDelete,
}: {
  messages: ContactMessage[];
  totalMessages: number;
  search: string;
  filter: ContactMessage['status'] | 'all';
  loading: boolean;
  refreshing: boolean;
  busy: boolean;
  onSearchChange: (value: string) => void;
  onFilterChange: (value: ContactMessage['status'] | 'all') => void;
  onRefresh: () => void;
  onStatusChange: (message: ContactMessage, status: ContactMessage['status']) => void;
  onDelete: (message: ContactMessage) => void;
}) {
  return (
    <section className="glass rounded-3xl p-4 sm:p-6">
      <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h2 className="text-lg font-black text-white">Messages / Inquiries</h2>
          <p className="mt-1 text-xs text-gray-500">Supabase inbox · New messages update in real time.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <label className="relative min-w-0 flex-1 sm:min-w-64">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" aria-hidden="true" />
            <input
              type="search"
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Search name, email or subject"
              aria-label="Search contact messages"
              className="glass-input w-full rounded-xl py-2.5 pl-9 pr-3 text-xs text-white placeholder:text-gray-600"
            />
          </label>
          <select
            value={filter}
            onChange={(event) => onFilterChange(event.target.value as ContactMessage['status'] | 'all')}
            aria-label="Filter messages by status"
            className="glass-input rounded-xl px-3 py-2.5 text-xs text-gray-200"
          >
            <option value="all">All statuses</option>
            <option value="new">New</option>
            <option value="read">Read</option>
            <option value="replied">Replied</option>
            <option value="archived">Archived</option>
          </select>
          <button
            type="button"
            disabled={refreshing}
            onClick={onRefresh}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 px-3 py-2.5 text-xs font-bold text-gray-200 hover:border-red-400/30 disabled:opacity-50"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} aria-hidden="true" />
            Refresh
          </button>
        </div>
      </div>
      {loading ? (
        <div className="rounded-2xl border border-white/5 bg-black/20 p-8 text-center text-sm text-gray-400">Loading messages…</div>
      ) : messages.length ? (
        <ul className="space-y-3">
          {messages.map((message) => (
            <li key={message.id} className="rounded-2xl border border-white/8 bg-black/25 p-4 sm:p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-bold text-white">{message.name}</h3>
                    <span className={`rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-wider ${message.status === 'new' ? 'bg-red-950/50 text-red-200' : 'bg-white/5 text-gray-400'}`}>{message.status}</span>
                  </div>
                  <p className="mt-1 break-words text-sm font-semibold text-gray-300">{message.subject || 'No subject'}</p>
                  <a href={`mailto:${message.email}`} className="mt-1 inline-block break-all text-xs text-red-200 hover:text-white">{message.email}</a>
                  {message.phone && <a href={`tel:${message.phone.replace(/[^\d+]/g, '')}`} className="ml-3 inline-block break-all text-xs text-gray-400 hover:text-white">{message.phone}</a>}
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <label className="sr-only" htmlFor={`message-status-${message.id}`}>Update status for {message.name}'s message</label>
                  <select
                    id={`message-status-${message.id}`}
                    value={message.status}
                    disabled={busy}
                    onChange={(event) => onStatusChange(message, event.target.value as ContactMessage['status'])}
                    className="glass-input rounded-lg px-2.5 py-2 text-[10px] font-bold uppercase tracking-wider text-gray-200 disabled:opacity-40"
                  >
                    <option value="new">New</option>
                    <option value="read">Read</option>
                    <option value="replied">Replied</option>
                    <option value="archived">Archived</option>
                  </select>
                  <button disabled={busy} onClick={() => onDelete(message)} aria-label={`Delete message from ${message.name}`} className="grid h-9 w-9 place-items-center rounded-lg border border-red-400/15 text-red-200 hover:bg-red-950/30 disabled:opacity-40">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <details className="group mt-4 border-t border-white/5 pt-3">
                <summary className="cursor-pointer list-none text-xs font-bold text-red-200 marker:hidden hover:text-white">
                  <span className="group-open:hidden">Open message details</span>
                  <span className="hidden group-open:inline">Close message details</span>
                  <span className="ml-2 text-[10px] font-medium text-gray-600">{formatDate(message.createdAt)}</span>
                </summary>
                <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed text-gray-300">{message.message}</p>
              </details>
            </li>
          ))}
        </ul>
      ) : (
        <div className="rounded-2xl border border-white/5 bg-black/20 p-8 text-center">
          <Mail className="mx-auto h-8 w-8 text-gray-600" />
          <p className="mt-3 text-sm font-semibold text-gray-300">{totalMessages ? 'No messages match these filters.' : 'No contact messages yet.'}</p>
        </div>
      )}
    </section>
  );
}

function AdminShell({ children, wide = false }: { children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="min-h-screen bg-[#07070a] text-gray-100">
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -left-24 top-0 h-[34rem] w-[34rem] rounded-full bg-red-950/20 blur-[120px]" />
        <div className="absolute -right-32 bottom-0 h-[30rem] w-[30rem] rounded-full bg-red-900/10 blur-[130px]" />
      </div>
      <div className={`relative z-10 ${wide ? 'min-h-screen' : 'flex min-h-screen items-center px-4 py-10'}`}>{children}</div>
    </div>
  );
}
