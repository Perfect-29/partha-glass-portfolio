import React, { useEffect, useRef } from 'react';
import { BrainCircuit, GraduationCap } from 'lucide-react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { usePortfolio } from '../context/PortfolioContext';

gsap.registerPlugin(ScrollTrigger);

export type EducationExperienceSectionKey = 'experience' | 'education';

export const EducationExperience: React.FC<{ sectionKey?: EducationExperienceSectionKey }> = ({ sectionKey }) => {
  const { content } = usePortfolio();
  const experienceRef = useRef<HTMLElement>(null);
  const educationRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const ctx = gsap.context(() => {
      [experienceRef.current, educationRef.current].forEach((section) => {
        if (!section) return;
        gsap.fromTo(
          section.querySelectorAll('[data-journey-reveal]'),
          { y: 28, opacity: 0, rotateX: -5, transformPerspective: 900 },
          {
            y: 0,
            opacity: 1,
            rotateX: 0,
            duration: 0.75,
            stagger: 0.12,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: section,
              start: 'top 80%',
              toggleActions: 'play none none reverse',
            },
          }
        );
      });
    });

    return () => ctx.revert();
  }, []);

  return (
    <>
      {(!sectionKey || sectionKey === 'experience') && <section
        id="experience"
        ref={experienceRef}
        className="relative w-full overflow-hidden border-t border-white/5 px-6 py-24 text-gray-100 md:px-12 lg:px-20"
      >
        <div className="relative z-10 mx-auto max-w-5xl">
          <div data-journey-reveal className="mb-10 text-center">
            <span className="mb-2 block text-sm font-bold uppercase tracking-[0.2em] text-[#a31515]">
              Learning by building
            </span>
            <h2 className="text-4xl font-black uppercase tracking-tight text-white sm:text-6xl">
              EXPERIENCE.
            </h2>
            <div className="mx-auto mt-3 h-1.5 w-20 rounded-full bg-[#a31515]" />
          </div>

          <div className="grid gap-5">
            {content.experience.length ? content.experience.map((entry) => (
              <article
                key={entry.id}
                data-journey-reveal
                className="glass glass-panel-card relative grid gap-6 rounded-3xl p-6 md:grid-cols-[auto_1fr] md:items-center md:gap-8 md:p-10"
              >
                <div className="glass-chip grid h-16 w-16 place-items-center rounded-2xl text-red-400">
                  <BrainCircuit aria-hidden="true" className="h-8 w-8" />
                </div>
                <div>
                  {entry.date && <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-red-300">{entry.date}</p>}
                  <h3 className="text-xl font-black uppercase tracking-wide text-white md:text-2xl">{entry.title}</h3>
                  {entry.organization && <p className="mt-2 text-sm font-semibold text-gray-400">{entry.organization}</p>}
                  {entry.category && (
                    <span className="mt-3 inline-flex rounded-full border border-red-400/20 bg-red-950/20 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-red-200">
                      {entry.category}
                    </span>
                  )}
                  <p className="mt-3 max-w-3xl leading-relaxed text-gray-300">{entry.description}</p>
                  {entry.technologies && entry.technologies.length > 0 && (
                    <ul className="mt-4 flex flex-wrap gap-2" aria-label="Related technologies">
                      {entry.technologies.map((technology, index) => (
                        <li key={`${technology}-${index}`} className="glass-chip rounded-full px-3 py-1 text-[10px] font-semibold text-gray-300">
                          {technology}
                        </li>
                      ))}
                    </ul>
                  )}
                  {(!entry.sourceType || entry.sourceType === 'projects') && (
                    <a
                      href="#projects"
                      className="mt-5 inline-flex rounded-full border border-red-500/40 px-4 py-2 text-xs font-bold uppercase tracking-wider text-red-200 transition-colors hover:border-red-400 hover:text-white"
                    >
                      Explore projects
                    </a>
                  )}
                </div>
              </article>
            )) : (
              <p data-journey-reveal className="glass rounded-2xl p-6 text-center text-gray-400">No experience entries have been published.</p>
            )}
          </div>
        </div>
      </section>}

      {(!sectionKey || sectionKey === 'education') && <section
        id="education"
        ref={educationRef}
        className="relative w-full overflow-hidden border-t border-white/5 px-6 py-24 text-gray-100 md:px-12 lg:px-20"
      >
        <div className="relative z-10 mx-auto max-w-5xl">
          <div data-journey-reveal className="mb-10 text-center">
            <span className="mb-2 block text-sm font-bold uppercase tracking-[0.2em] text-[#a31515]">
              Academic background
            </span>
            <h2 className="text-4xl font-black uppercase tracking-tight text-white sm:text-6xl">
              EDUCATION.
            </h2>
            <div className="mx-auto mt-3 h-1.5 w-20 rounded-full bg-[#a31515]" />
          </div>

          <div className="grid gap-5">
            {content.education.length ? content.education.map((entry) => (
              <article
                key={entry.id}
                data-journey-reveal
                className="glass glass-panel-card relative flex flex-col gap-6 rounded-3xl p-6 sm:flex-row sm:items-center sm:p-10"
              >
                <div className="glass-chip grid h-16 w-16 shrink-0 place-items-center rounded-2xl text-red-400">
                  <GraduationCap aria-hidden="true" className="h-8 w-8" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-red-300">{entry.period}</p>
                  <h3 className="mt-2 text-xl font-black text-white sm:text-2xl">{entry.degree}</h3>
                  <p className="mt-1 text-base font-semibold text-gray-400">{entry.institution}</p>
                </div>
                <span className="glass-chip self-start rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wider text-gray-200 sm:self-center">
                  {entry.status}
                </span>
              </article>
            )) : (
              <p data-journey-reveal className="glass rounded-2xl p-6 text-center text-gray-400">No education entries have been published.</p>
            )}
          </div>
        </div>
      </section>}
    </>
  );
};
