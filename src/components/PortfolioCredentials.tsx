import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Award,
  BookOpenText,
  BriefcaseBusiness,
  CalendarDays,
  Code2,
  Download,
  ExternalLink,
  FileText,
  GraduationCap,
  Trophy,
} from 'lucide-react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { usePortfolio } from '../context/PortfolioContext';

gsap.registerPlugin(ScrollTrigger);

const CATEGORY_FILTERS = ['All', 'AI', 'Machine Learning', 'Data Science', 'Python', 'Web Development', 'Other'];

function categoryGroup(category: string) {
  const value = category.toLowerCase();
  if (value.includes('machine learning') || /\bml\b/.test(value) || value.includes('deep learning')) return 'Machine Learning';
  if (value.includes('data science') || value.includes('data analytics')) return 'Data Science';
  if (value.includes('python')) return 'Python';
  if (value.includes('web') || value.includes('frontend') || value.includes('full stack') || /\b(html|css|javascript|react)\b/.test(value)) return 'Web Development';
  if (value.includes('artificial intelligence') || value === 'ai' || value.includes(' ai')) return 'AI';
  return 'Other';
}

function matchesCategory(category: string, selected: string) {
  if (selected === 'All') return true;
  const value = category.toLowerCase();
  if (selected === 'Other') return categoryGroup(category) === 'Other';
  const keywords: Record<string, RegExp> = {
    AI: /(^|[^a-z])ai([^a-z]|$)|artificial intelligence/,
    'Machine Learning': /machine learning|\bml\b|deep learning/,
    'Data Science': /data science|data analytics/,
    Python: /\bpython\b/,
    'Web Development': /web|frontend|full stack|\b(html|css|javascript|react)\b/,
  };
  return keywords[selected]?.test(value) ?? false;
}

function FilePreview({ url, label, fileType }: { url: string; label: string; fileType?: string }) {
  if (!url) return null;
  const isPdf = fileType === 'application/pdf' || (!fileType && /\.pdf(?:$|[?#])/i.test(url));
  return (
    <div className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-black/40">
      {isPdf ? (
        <iframe title={`${label} preview`} src={url} loading="lazy" className="h-56 w-full" />
      ) : (
        <img src={url} alt={label} loading="lazy" className="max-h-64 w-full object-contain" />
      )}
      <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 border-t border-white/10 px-4 py-3 text-[10px] font-black uppercase tracking-wider text-red-200 transition-colors hover:text-white">
        View {label} <ExternalLink size={13} />
      </a>
    </div>
  );
}

function SectionHeading({ eyebrow, title, icon: Icon }: { eyebrow: string; title: string; icon: typeof Award }) {
  return (
    <div data-credential-reveal className="mb-10 text-center">
      <span className="mb-2 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-red-300">
        <Icon size={15} aria-hidden="true" /> {eyebrow}
      </span>
      <h2 className="text-4xl font-black uppercase tracking-tight text-white sm:text-6xl">{title}</h2>
      <div className="mx-auto mt-3 h-1.5 w-20 rounded-full bg-[#a31515]" />
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return <p className="glass rounded-2xl p-6 text-center text-sm text-gray-400">No {label} have been published yet.</p>;
}

type CredentialSectionKey = 'certifications' | 'achievements' | 'internships' | 'workshops' | 'codingProfiles' | 'publications' | 'resume';

export function PortfolioCredentials({ sectionKey }: { sectionKey?: CredentialSectionKey }) {
  const { content } = usePortfolio();
  const rootRef = useRef<HTMLDivElement>(null);
  const [category, setCategory] = useState('All');

  const certifications = useMemo(() => content.certifications.filter((item) => {
    return matchesCategory(item.category, category);
  }), [category, content.certifications]);

  const latestResume = useMemo(
    () => [...content.resumes]
      .filter((entry) => entry.published !== false)
      .sort((left, right) => right.uploadedAt.localeCompare(left.uploadedAt))[0],
    [content.resumes]
  );
  const resumeUrl = latestResume?.fileUrl ?? content.resumeUrl;

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const root = rootRef.current;
    if (!root) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        root.querySelectorAll('[data-credential-reveal]'),
        { y: 24, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.65,
          stagger: 0.07,
          ease: 'power3.out',
          scrollTrigger: { trigger: root, start: 'top 88%', toggleActions: 'play none none reverse' },
        }
      );
    }, root);
    return () => ctx.revert();
  }, [
    content.certifications.length,
    content.achievements.length,
    content.internships.length,
    content.workshops.length,
    content.codingProfiles.length,
    content.publications.length,
    content.resumes.length,
  ]);

  return (
    <div ref={rootRef}>
      {(!sectionKey || sectionKey === 'certifications') && (
      <section id="certifications" className="relative w-full border-t border-white/5 px-5 py-24 text-gray-100 md:px-12 lg:px-20">
        <div className="relative z-10 mx-auto max-w-7xl">
          <SectionHeading eyebrow="Verified learning" title="Certifications." icon={Award} />
          <div className="mb-7 flex flex-wrap justify-center gap-2" aria-label="Filter certifications by category">
            {CATEGORY_FILTERS.map((item) => (
              <button
                type="button"
                key={item}
                onClick={() => setCategory(item)}
                aria-pressed={category === item}
                className={`rounded-full border px-4 py-2 text-[10px] font-black uppercase tracking-wider transition ${category === item ? 'border-red-400/50 bg-red-950/50 text-white' : 'border-white/10 bg-black/20 text-gray-400 hover:border-red-400/30 hover:text-white'}`}
              >
                {item}
              </button>
            ))}
          </div>
          {certifications.length ? (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {certifications.map((item) => (
                <article key={item.id} data-credential-reveal className="glass glass-grid-card rounded-3xl p-5 sm:p-6">
                  <div className="flex items-start justify-between gap-4">
                    <span className="glass-chip grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-red-300"><Award size={21} /></span>
                    <span className="rounded-full border border-red-400/20 bg-red-950/30 px-3 py-1 text-[9px] font-black uppercase tracking-wider text-red-200">{item.category}</span>
                  </div>
                  <h3 className="mt-5 text-lg font-black text-white">{item.title}</h3>
                  <p className="mt-1 text-sm font-semibold text-gray-300">{item.organization}</p>
                  <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-gray-500"><CalendarDays size={13} /> {item.issueDate}</p>
                  {item.credentialId && <p className="mt-2 break-all text-[10px] text-gray-500">Credential ID · {item.credentialId}</p>}
                  <FilePreview url={item.certificateUrl} label="certificate" fileType={item.fileType} />
                  <div className="mt-5 flex flex-wrap gap-2">
                    {item.certificateUrl && <a href={item.certificateUrl} target="_blank" rel="noopener noreferrer" className="glass-chip inline-flex items-center gap-1.5 rounded-full px-4 py-2.5 text-[10px] font-black uppercase tracking-wider text-gray-200 hover:text-white"><FileText size={13} /> View Certificate</a>}
                    {item.credentialUrl && <a href={item.credentialUrl} target="_blank" rel="noopener noreferrer" className="glass-red inline-flex items-center gap-1.5 rounded-full px-4 py-2.5 text-[10px] font-black uppercase tracking-wider text-white">Verify Certificate <ExternalLink size={13} /></a>}
                  </div>
                </article>
              ))}
            </div>
          ) : content.certifications.length ? (
            <p className="glass rounded-2xl p-6 text-center text-sm text-gray-400">No certifications in this category.</p>
          ) : <EmptyState label="certifications" />}
        </div>
      </section>
      )}

      {(!sectionKey || sectionKey === 'achievements') && (
      <section id="achievements" className="relative w-full border-t border-white/5 px-5 py-24 text-gray-100 md:px-12 lg:px-20">
        <div className="relative z-10 mx-auto max-w-6xl">
          <SectionHeading eyebrow="Competition wins & recognition" title="Achievements." icon={Trophy} />
          {content.achievements.length ? (
            <div className="grid gap-5 md:grid-cols-2">
              {[...content.achievements].sort((a, b) => Number(Boolean(b.featured)) - Number(Boolean(a.featured))).map((item) => (
                <article key={item.id} data-credential-reveal className={`glass glass-panel-card rounded-3xl p-6 md:p-8 ${item.featured ? 'border-red-400/40 shadow-[0_0_45px_-22px_rgba(255,32,55,.65)] md:col-span-2' : ''}`}>
                  <div className="flex items-start justify-between gap-4">
                    <Award className="h-7 w-7 shrink-0 text-red-300" aria-hidden="true" />
                    {item.featured && <span className="glass-chip-red rounded-full px-3 py-1 text-[9px] font-black uppercase tracking-wider text-white">Featured achievement</span>}
                  </div>
                  <h3 className="mt-4 text-xl font-black text-white">{item.title}</h3>
                  <p className="mt-2 text-xs font-bold uppercase tracking-wider text-red-200">{[item.organization || item.issuer, item.date].filter(Boolean).join(' · ')}</p>
                  {item.description && <p className="mt-4 leading-relaxed text-gray-300">{item.description}</p>}
                  <FilePreview url={item.proofUrl || item.certificateUrl || ''} label="achievement proof" fileType={item.fileType} />
                  {item.credentialUrl && <a href={item.credentialUrl} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-red-200 hover:text-white">Verify achievement <ExternalLink size={13} /></a>}
                </article>
              ))}
            </div>
          ) : <EmptyState label="achievements" />}
        </div>
      </section>
      )}

      {(!sectionKey || sectionKey === 'internships') && (
      <section id="internships" className="relative w-full border-t border-white/5 px-5 py-24 text-gray-100 md:px-12 lg:px-20">
        <div className="relative z-10 mx-auto max-w-5xl">
          <SectionHeading eyebrow="Industry experience" title="Internships." icon={BriefcaseBusiness} />
          {content.internships.length ? (
            <div className="relative space-y-5 before:absolute before:bottom-8 before:left-5 before:top-8 before:w-px before:bg-gradient-to-b before:from-red-500/60 before:to-transparent md:before:left-7">
              {content.internships.map((item) => (
                <article key={item.id} data-credential-reveal className="glass glass-panel-card relative ml-3 rounded-3xl p-5 pl-10 md:ml-0 md:p-8 md:pl-16">
                  <span className="absolute left-0 top-7 grid h-10 w-10 place-items-center rounded-full border border-red-400/35 bg-[#10090c] text-red-300 md:left-2"><BriefcaseBusiness size={17} /></span>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-red-200">{item.duration || [item.startDate, item.endDate].filter(Boolean).join(' — ')}</p>
                  <h3 className="mt-2 text-xl font-black text-white">{item.role}</h3>
                  <p className="mt-1 font-semibold text-gray-300">{item.company}</p>
                  {item.description && <p className="mt-4 leading-relaxed text-gray-400">{item.description}</p>}
                  {item.skills.length > 0 && <ul className="mt-4 flex flex-wrap gap-2">{item.skills.map((skill) => <li key={skill} className="glass-chip rounded-full px-3 py-1.5 text-[10px] font-bold text-gray-200">{skill}</li>)}</ul>}
                  <FilePreview url={item.certificateUrl} label="internship certificate" fileType={item.fileType} />
                </article>
              ))}
            </div>
          ) : <EmptyState label="internships" />}
        </div>
      </section>
      )}

      {(!sectionKey || sectionKey === 'workshops') && (
      <section id="workshops" className="relative w-full border-t border-white/5 px-5 py-24 text-gray-100 md:px-12 lg:px-20">
        <div className="relative z-10 mx-auto max-w-6xl">
          <SectionHeading eyebrow="Learning in the community" title="Workshops & events." icon={GraduationCap} />
          {content.workshops.length ? (
            <div className="grid gap-5 md:grid-cols-2">
              {content.workshops.map((item) => (
                <article key={item.id} data-credential-reveal className="glass glass-grid-card rounded-3xl p-5 sm:p-7">
                  {item.imageUrl && <img src={item.imageUrl} alt={`${item.title} event`} loading="lazy" className="mb-5 aspect-video w-full rounded-2xl border border-white/10 object-cover" />}
                  <h3 className="text-lg font-black text-white">{item.title}</h3>
                  <p className="mt-1 text-sm font-semibold text-gray-300">{item.institution}</p>
                  <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-gray-500"><CalendarDays size={13} /> {item.date}</p>
                  {item.description && <p className="mt-4 leading-relaxed text-gray-400">{item.description}</p>}
                  <FilePreview url={item.certificateUrl} label="participation certificate" fileType={item.certificateFileType} />
                  {item.url && <a href={item.url} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-red-200 hover:text-white">Event details <ExternalLink size={13} /></a>}
                </article>
              ))}
            </div>
          ) : <EmptyState label="workshops or events" />}
        </div>
      </section>
      )}

      {(!sectionKey || sectionKey === 'codingProfiles') && (
      <section id="coding-profiles" className="relative w-full border-t border-white/5 px-5 py-24 text-gray-100 md:px-12 lg:px-20">
        <div className="relative z-10 mx-auto max-w-6xl">
          <SectionHeading eyebrow="Find me online" title="Coding profiles." icon={Code2} />
          {content.codingProfiles.length ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {content.codingProfiles.map((item) => (
                <a key={item.id} data-credential-reveal href={item.profileUrl} target="_blank" rel="noopener noreferrer" className="glass glass-grid-card group rounded-3xl p-5 transition-transform hover:-translate-y-1">
                  <span className="grid h-12 w-12 place-items-center rounded-2xl border border-red-400/20 bg-red-950/30 text-red-200"><Code2 size={21} /></span>
                  <h3 className="mt-4 font-black text-white">{item.platform}</h3>
                  <p className="mt-1 break-all text-sm text-gray-400">@{item.username}</p>
                  <span className="mt-4 inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-red-200">Visit profile <ExternalLink size={12} /></span>
                </a>
              ))}
            </div>
          ) : <EmptyState label="coding profiles" />}
          <p className="mt-5 text-center text-xs text-gray-500">Profile statistics are not shown unless connected to a verified live data source.</p>
        </div>
      </section>
      )}

      {(!sectionKey || sectionKey === 'publications') && (
      <section id="publications" className="relative w-full border-t border-white/5 px-5 py-24 text-gray-100 md:px-12 lg:px-20">
        <div className="relative z-10 mx-auto max-w-6xl">
          <SectionHeading eyebrow="Research & writing" title="Publications." icon={BookOpenText} />
          {content.publications.length ? (
            <div className="grid gap-5">
              {content.publications.map((item) => (
                <article key={item.id} data-credential-reveal className="glass glass-panel-card rounded-3xl p-5 sm:p-8">
                  <p className="text-xs font-bold uppercase tracking-wider text-red-200">{[item.venue, item.publicationDate].filter(Boolean).join(' · ')}</p>
                  <h3 className="mt-2 text-xl font-black text-white sm:text-2xl">{item.title}</h3>
                  {item.abstract && <p className="mt-4 whitespace-pre-line leading-relaxed text-gray-300">{item.abstract}</p>}
                  {item.doi && <p className="mt-4 break-all text-xs text-gray-500">DOI · {item.doi}</p>}
                  <FilePreview url={item.pdfUrl} label="publication PDF" fileType="application/pdf" />
                  <div className="mt-4 flex flex-wrap gap-3">
                    {item.publicationUrl && <a href={item.publicationUrl} target="_blank" rel="noopener noreferrer" className="glass-chip inline-flex items-center gap-1.5 rounded-full px-4 py-2.5 text-[10px] font-black uppercase tracking-wider text-gray-200 hover:text-white">Open publication <ExternalLink size={13} /></a>}
                    {item.pdfUrl && <a href={item.pdfUrl} target="_blank" rel="noopener noreferrer" className="glass-red inline-flex items-center gap-1.5 rounded-full px-4 py-2.5 text-[10px] font-black uppercase tracking-wider text-white"><Download size={13} /> Download PDF</a>}
                  </div>
                </article>
              ))}
            </div>
          ) : <EmptyState label="publications" />}
        </div>
      </section>
      )}

      {(!sectionKey || sectionKey === 'resume') && (
      <section id="resume" className="relative w-full border-t border-white/5 px-5 py-24 text-gray-100 md:px-12 lg:px-20">
        <div className="relative z-10 mx-auto max-w-5xl">
          <SectionHeading eyebrow="Professional background" title="Resume / CV." icon={FileText} />
          {resumeUrl ? (
            <article data-credential-reveal className="glass glass-panel-card overflow-hidden rounded-3xl p-4 sm:p-7">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="font-black text-white">{latestResume?.title || 'Latest resume'}</h3>
                  {latestResume?.uploadedAt && <p className="mt-1 text-xs text-gray-500">Uploaded {new Date(latestResume.uploadedAt).toLocaleDateString()}</p>}
                </div>
                <a href={resumeUrl} target="_blank" rel="noopener noreferrer" download className="glass-red inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-xs font-black uppercase tracking-wider text-white"><Download size={15} /> Download Resume PDF</a>
              </div>
              <iframe title="Resume PDF preview" src={resumeUrl} className="h-[70vh] min-h-96 w-full rounded-2xl border border-white/10 bg-black/50" />
            </article>
          ) : latestResume ? (
            <article data-credential-reveal className="glass glass-panel-card rounded-3xl p-6 text-center">
              <h3 className="font-black text-white">{latestResume.title}</h3>
              <p role="status" className="mt-2 text-sm text-gray-400">The published resume file is temporarily unavailable.</p>
            </article>
          ) : <EmptyState label="resume files" />}
        </div>
      </section>
      )}
    </div>
  );
}
