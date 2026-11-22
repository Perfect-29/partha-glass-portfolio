import React from 'react';
import { TECH_ICONS } from './techIcons';
import { usePortfolio } from '../context/PortfolioContext';

/** Software and tools shown as tall capsules, populated from live portfolio content. */

export const SoftwareStrip: React.FC = () => {
  const { content } = usePortfolio();
  const tools = content.techStack.map((label) => {
    const icon = TECH_ICONS.find((i) => i.label.toLowerCase() === label.toLowerCase());
    return { label, color: icon?.color ?? '#ff2a3b', path: icon?.path ?? '' };
  });

  return (
    <div className="relative z-10 mt-24 flex w-full max-w-7xl flex-col items-center">
      <div className="red-halo" aria-hidden="true" />
      <span className="relative mb-4 text-sm font-bold uppercase tracking-[0.2em] text-[#a31515] md:text-base">
        Languages &amp; Tools
      </span>
      <h3 className="relative mb-12 text-4xl font-black uppercase tracking-tight text-white md:text-6xl">
        MY TECH STACK.
      </h3>
      {tools.length ? (
        <ul className="grid-blur relative m-0 flex list-none flex-wrap justify-center gap-4 p-0 md:gap-6">
          {tools.map((tool) => (
            <li
              key={tool.label}
              className="matrix-item glass glass-grid-card group flex h-[190px] w-[132px] flex-col items-center justify-center gap-5 rounded-3xl px-2 md:h-[216px] md:w-[148px] xl:h-[224px] xl:w-[152px]"
            >
              <svg
                viewBox="0 0 24 24"
                role="img"
                aria-label={tool.label}
                className="h-14 w-14 shrink-0 transition-transform duration-300 group-hover:scale-110 md:h-16 md:w-16"
                style={{ fill: tool.color, filter: `drop-shadow(0 0 10px ${tool.color}55)` }}
              >
                {tool.path ? (
                  <path d={tool.path} />
                ) : (
                  <text x="12" y="17" textAnchor="middle" fontSize="16" fontWeight="800">
                    {tool.label.charAt(0).toUpperCase()}
                  </text>
                )}
              </svg>
              <span className="whitespace-pre-line text-center text-xs font-semibold leading-tight text-gray-400 transition-colors group-hover:text-gray-100 md:text-sm">
                {tool.label}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="glass rounded-2xl p-6 text-center text-sm text-gray-400">
          No languages or tools have been published yet.
        </p>
      )}
    </div>
  );
};
