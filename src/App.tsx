import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { Stats } from './components/Stats';
import { Projects } from './components/Projects';
import { About } from './components/About';
import { EducationExperience } from './components/EducationExperience';
import { PortfolioCredentials } from './components/PortfolioCredentials';
import { Skills } from './components/Skills';
import { Contact } from './components/Contact';
import { Footer } from './components/Footer';
import { SocialLinksSection } from './components/SocialLinksSection';
import { CustomPortfolioSection } from './components/CustomPortfolioSection';
import { GlitchLoader } from './components/GlitchLoader';
import { ParticleField } from './components/ParticleField';
import { SparkCursor } from './components/SparkCursor';
import type { Project } from './data/portfolioData';
import { resolveFeaturedProjects } from './data/projects';
import { portfolioSectionAnchorId } from './data/portfolioSections';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { PortfolioProvider, usePortfolio } from './context/PortfolioContext';

const AdminApp = lazy(() => import('./admin/AdminApp').then((module) => ({ default: module.AdminApp })));
const VideoModal = lazy(() => import('./components/VideoModal').then((module) => ({ default: module.VideoModal })));

function PortfolioSite() {
  const { content, sections, customSectionContent, isPreview } = usePortfolio();
  const visibleSections = useMemo(
    () => sections
      .filter((section) => section.isEnabled && section.isPublic)
      .sort((left, right) => left.displayOrder - right.displayOrder),
    [sections],
  );
  const fireEffectsEnabled = sections.some((section) => section.sectionKey === 'fireEffects' && section.isEnabled);
  const homeEnabled = visibleSections.some((section) => section.sectionKey === 'home');
  const PORTFOLIO_PROJECTS = useMemo(
    () => resolveFeaturedProjects(content.projects),
    [content.projects],
  );
  useEffect(() => {
    document.title = 'Parthasarathy A | AI & Data Science Developer';
  }, []);

  const [introStarted, setIntroStarted] = useState(false);
  const [introCompleted, setIntroCompleted] = useState(false);
  const [homepageVisible, setHomepageVisible] = useState(false);
  const [heroReady, setHeroReady] = useState(false);
  const [welcomeRevealComplete, setWelcomeRevealComplete] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    if (!homeEnabled) setHeroReady(true);
  }, [homeEnabled]);

  const enterPortfolio = () => {
    const firstSection = visibleSections.find((section) => section.sectionKey !== 'home');
    if (firstSection) {
      document.getElementById(portfolioSectionAnchorId(firstSection.sectionKey))?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  useEffect(() => {
    if (!selectedProject) return;
    const updatedProject = PORTFOLIO_PROJECTS.find((project) => project.id === selectedProject.id);
    if (updatedProject) {
      setSelectedProject(updatedProject);
    } else {
      setSelectedProject(null);
      setIsModalOpen(false);
    }
  }, [PORTFOLIO_PROJECTS, selectedProject]);

  const handleIntroComplete = () => {
    setIntroCompleted(true);
    window.setTimeout(() => {
      ScrollTrigger.refresh();
    }, 100);
  };

  const handleSelectProject = (project: Project) => {
    setSelectedProject(project);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleNavigate = (direction: 1 | -1) => {
    if (!selectedProject) return;
    const idx = PORTFOLIO_PROJECTS.findIndex((p) => p.id === selectedProject.id);
    if (idx === -1) return;
    const nextIdx = (idx + direction + PORTFOLIO_PROJECTS.length) % PORTFOLIO_PROJECTS.length;
    setSelectedProject(PORTFOLIO_PROJECTS[nextIdx]);
  };

  const handleInquire = () => {
    setIsModalOpen(false);
    const contactSection = visibleSections.some((section) => section.sectionKey === 'contact')
      ? document.getElementById('contact')
      : null;
    contactSection?.scrollIntoView({ behavior: 'smooth' });
  };

  const sectionRenderers: Record<string, ReactNode> = {
    home: homeEnabled ? <><Hero onEnter={enterPortfolio} onReady={() => setHeroReady(true)} /><Stats /></> : null,
    about: <About />,
    projects: <Projects onSelectProject={handleSelectProject} />,
    skills: <Skills />,
    experience: <EducationExperience sectionKey="experience" />,
    education: <EducationExperience sectionKey="education" />,
    certifications: <PortfolioCredentials sectionKey="certifications" />,
    achievements: <PortfolioCredentials sectionKey="achievements" />,
    internships: <PortfolioCredentials sectionKey="internships" />,
    workshops: <PortfolioCredentials sectionKey="workshops" />,
    codingProfiles: <PortfolioCredentials sectionKey="codingProfiles" />,
    publications: <PortfolioCredentials sectionKey="publications" />,
    resume: <PortfolioCredentials sectionKey="resume" />,
    contact: <Contact />,
    socials: <SocialLinksSection />,
  };

  const renderedSections = visibleSections.map((section) => {
    const builtInSection = sectionRenderers[section.sectionKey];
    if (builtInSection !== undefined) return <div key={section.id}>{builtInSection}</div>;
    if (!section.isSystem) {
      return (
        <CustomPortfolioSection
          key={section.id}
          section={section}
          records={customSectionContent}
        />
      );
    }
    return null;
  });

  return (
    <div className="relative isolate min-h-screen text-gray-100 flex flex-col font-sans selection:bg-[#a31515] selection:text-white bg-[#07070a]">
      {introCompleted && isPreview && (
        <div className="fixed left-1/2 top-3 z-[100] -translate-x-1/2 rounded-full border border-red-400/40 bg-black/90 px-5 py-2 text-xs font-bold uppercase tracking-wider text-red-100">
          Local draft preview
        </div>
      )}
      {/* 3D WebGL Starfield with forward scroll travel and click shockwaves */}
      <ParticleField />

      {/* Ambient colour behind the glass: red glow orbs */}
      <div className="ambient" aria-hidden="true">
        <i className="o1" />
        <i className="o3" />
      </div>

      {/* Interactive 2D spark & lightning cursor */}
      {fireEffectsEnabled && <SparkCursor settings={content.fireEffects} onTop={!introCompleted} />}

      {introStarted && (
        <div className={homepageVisible ? 'contents' : 'invisible'}>
          {/* Dynamic Navbar with blur on scroll */}
          <Navbar />

          {/* Main Portfolio Sections */}
          <main className="relative z-10 w-full flex-1">
            {renderedSections}
          </main>

          {/* Footer */}
          <div className="relative z-10">
            <Footer />
          </div>

          {/* Video Modal Player */}
          {isModalOpen && (
            <Suspense fallback={null}>
              <VideoModal
                project={selectedProject}
                onClose={handleCloseModal}
                onNavigate={handleNavigate}
                onInquire={handleInquire}
              />
            </Suspense>
          )}
        </div>
      )}
      {!introCompleted && (
        <GlitchLoader
          canExit={heroReady && welcomeRevealComplete}
          onStart={() => setIntroStarted(true)}
          onRevealComplete={() => setWelcomeRevealComplete(true)}
          onTransitionStart={() => setHomepageVisible(true)}
          onComplete={handleIntroComplete}
        />
      )}
    </div>
  );
}

function AppRoute() {
  return window.location.pathname.replace(/\/+$/, '') === '/admin' ? (
    <Suspense fallback={<div className="min-h-screen bg-[#07070a] p-10 text-center text-gray-300">Loading admin…</div>}>
      <AdminApp />
    </Suspense>
  ) : (
    <PortfolioProvider>
      <PortfolioSite />
    </PortfolioProvider>
  );
}

export function App() {
  return <AppRoute />;
}

export default App;
