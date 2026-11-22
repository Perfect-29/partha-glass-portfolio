import React, { useEffect, useRef, useState } from 'react';

interface GlitchLoaderProps {
  canExit: boolean;
  onStart: () => void;
  onRevealComplete: () => void;
  onTransitionStart: () => void;
  onComplete: () => void;
}

type IntroPhase = 'revealing' | 'waiting' | 'exiting';
const WELCOME_SEQUENCE_MS = 4800;
const EXIT_FADE_MS = 650;

const renderLetters = (text: string, startDelay: number, letterDelay: number) =>
  Array.from(text).map((letter, index) => (
    <span key={`${letter}-${index}`} style={{ animationDelay: `${startDelay + index * letterDelay}ms` }}>
      {letter === ' ' ? '\u00a0' : letter}
    </span>
  ));

export const GlitchLoader: React.FC<GlitchLoaderProps> = ({
  canExit,
  onStart,
  onRevealComplete,
  onTransitionStart,
  onComplete,
}) => {
  const [phase, setPhase] = useState<IntroPhase>('revealing');
  const completedRef = useRef(false);
  const exitStartedRef = useRef(false);
  const onStartRef = useRef(onStart);
  const onRevealCompleteRef = useRef(onRevealComplete);
  const onTransitionStartRef = useRef(onTransitionStart);
  const onCompleteRef = useRef(onComplete);
  const timersRef = useRef<number[]>([]);
  onStartRef.current = onStart;
  onRevealCompleteRef.current = onRevealComplete;
  onTransitionStartRef.current = onTransitionStart;
  onCompleteRef.current = onComplete;

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    onStartRef.current();

    const delay = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      ? 250
      : WELCOME_SEQUENCE_MS;
    const timer = window.setTimeout(() => {
      timersRef.current = timersRef.current.filter((item) => item !== timer);
      if (completedRef.current) return;
      setPhase('waiting');
      onRevealCompleteRef.current();
    }, delay);
    timersRef.current.push(timer);

    return () => {
      timersRef.current.forEach(window.clearTimeout);
      timersRef.current = [];
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  useEffect(() => {
    if (phase !== 'waiting' || !canExit || exitStartedRef.current) return;
    exitStartedRef.current = true;
    onTransitionStartRef.current();
    setPhase('exiting');
  }, [canExit, phase]);

  useEffect(() => {
    if (phase !== 'exiting') return;
    const delay = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : EXIT_FADE_MS;
    const timer = window.setTimeout(() => {
      timersRef.current = timersRef.current.filter((item) => item !== timer);
      if (completedRef.current) return;
      completedRef.current = true;
      onCompleteRef.current();
    }, delay);
    timersRef.current.push(timer);
    return () => {
      window.clearTimeout(timer);
      timersRef.current = timersRef.current.filter((item) => item !== timer);
    };
  }, [phase]);

  return (
    <div
      className={`glitch-loader is-intro${phase === 'exiting' ? ' is-exiting' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label="Portfolio welcome"
    >
      <div className="glitch-loader__veil" aria-hidden="true" />
      <div className="glitch-loader__atmosphere" aria-hidden="true">
        <div className="glitch-loader__smoke" />
        <div className="glitch-loader__embers glitch-loader__embers--one" />
        <div className="glitch-loader__embers glitch-loader__embers--two" />
        <div className="glitch-loader__energy" />
        <div className="glitch-loader__streaks" />
      </div>
      <div className="glitch-loader__glow" aria-hidden="true" />
      <div className="glitch-loader__impact" aria-hidden="true" />
      <div className="glitch-loader__welcome">
        <div className="glitch-loader__text" aria-hidden="true">
          <span className="glitch-loader__line glitch-loader__line--welcome" aria-hidden="true">
            {renderLetters('WELCOME', 760, 72)}
          </span>
          <span className="glitch-loader__line glitch-loader__line--subtitle" aria-hidden="true">
            {renderLetters('TO MY PORTFOLIO', 2200, 38)}
          </span>
        </div>
      </div>
    </div>
  );
};
