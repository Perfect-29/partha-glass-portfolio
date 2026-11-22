import React, { useMemo } from 'react';
import type { Project } from '../data/portfolioData';
import { resolveFeaturedProjects } from '../data/projects';
import { usePortfolio } from '../context/PortfolioContext';

function getPosterSrcSet(poster: string) {
  if (!poster.startsWith('/assets/thumbnails/') || !poster.endsWith('.webp')) return undefined;
  return `${poster.slice(0, -5)}-640.webp 640w, ${poster} 1280w`;
}

interface ProjectsProps {
  onSelectProject: (project: Project) => void;
}

export const Projects: React.FC<ProjectsProps> = ({ onSelectProject }) => {
  const { content } = usePortfolio();
  const projects = useMemo(
    () => resolveFeaturedProjects(content.projects),
    [content.projects],
  );

  return (
    <section
      id="projects"
      className="relative w-full border-t border-white/5 px-4 py-24 md:px-10 md:py-28"
    >
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-col items-center text-center">
          <span className="mb-2 text-sm font-bold uppercase tracking-[0.2em] text-[#a31515] md:text-base">
            Featured Works
          </span>
          <h2 className="text-5xl font-black uppercase tracking-tight text-white md:text-7xl">
            PROJECTS.
          </h2>
          <div className="mt-3 h-1.5 w-20 rounded-full bg-[#a31515]" />
        </header>

        {projects.length ? (
          <div className="mt-12 grid grid-cols-1 items-start gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <button
                key={project.id}
                type="button"
                onClick={() => onSelectProject(project)}
                aria-label={`View project details for ${project.title}`}
                className="project-card group flex w-full flex-col overflow-hidden rounded-2xl border border-red-950/70 bg-[#0d0b0d] text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-red-400"
              >
                <span className="grid aspect-video w-full shrink-0 place-items-center overflow-hidden bg-[#09080a]">
                  {project.poster ? (
                    <img
                      src={project.poster}
                      srcSet={getPosterSrcSet(project.poster)}
                      sizes="(min-width: 1280px) 33vw, (min-width: 768px) 50vw, 100vw"
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-contain object-center transition-transform duration-500 ease-out group-hover:scale-[1.035]"
                    />
                  ) : (
                    <span className="px-5 text-center text-sm font-bold uppercase tracking-[0.16em] text-red-200">
                      {project.category}
                    </span>
                  )}
                </span>

                <span className="block p-5">
                  <span className="line-clamp-2 text-xl font-black leading-tight text-white">
                    {project.title}
                  </span>
                  <span className="mt-3 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-red-300 transition-colors group-hover:text-white">
                    VIEW PROJECT
                    <span aria-hidden="true" className="transition-transform duration-300 group-hover:translate-x-1">-&gt;</span>
                  </span>
                </span>
              </button>
            ))}
          </div>
        ) : (
          <p className="glass mx-auto mt-12 max-w-2xl rounded-2xl p-6 text-center text-sm text-gray-400">
            No projects have been published yet.
          </p>
        )}
      </div>
    </section>
  );
};
