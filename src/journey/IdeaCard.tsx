import { CSSProperties, useEffect, useRef, useState } from 'react';
import { GO, ideas } from './journeyText';

const CH = '!<>-_\\/[]{}=+*^?#';
const v = (vars: Record<string, string>) => vars as CSSProperties;

/**
 * "Your project" side card: keeps cycling through possible projects, each one glitching into the next
 * (same code-scramble language as the hero's NOVA -> NEXT). Reduced motion swaps them without the effect.
 */
const IdeaCard = ({ at }: { at: number }) => {
  const [text, setText] = useState(ideas[0]);
  const [glitch, setGlitch] = useState(false);
  const idx = useRef(0);

  useEffect(() => {
    const reduced = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let raf = 0;
    const morph = (from: string, to: string) => {
      const st = performance.now(), dur = 900, n = Math.max(from.length, to.length);
      setGlitch(true);
      const tick = () => {
        const k = Math.min(1, (performance.now() - st) / dur);
        let out = '';
        for (let i = 0; i < n; i++) {
          const lock = 0.25 + 0.75 * (i / n); // locks in left to right
          const c = to[i] ?? '';
          out += k >= lock ? c : (c === ' ' ? ' ' : CH[Math.floor(Math.random() * CH.length)]);
        }
        setText(k >= 1 ? to : out.trimEnd());
        if (k < 1) raf = requestAnimationFrame(tick); else setGlitch(false);
      };
      raf = requestAnimationFrame(tick);
    };
    const id = window.setInterval(() => {
      const from = ideas[idx.current];
      idx.current = (idx.current + 1) % ideas.length;
      const to = ideas[idx.current];
      if (reduced) setText(to); else morph(from, to);
    }, 3400);
    return () => { clearInterval(id); cancelAnimationFrame(raf); };
  }, []);

  return (
    <article data-at={at} className="j-rise j-work-item j-idea" style={v({ '--rise': '46px', '--acc': '#00E5FF' })}>
      <div className="j-wcard j-idea-card">
        <div className="j-wcard-top"><span>05 / YOURS</span><span className="j-wcard-status">OPEN SLOT</span></div>
        <div className="j-idea-body">
          <div className="j-idea-label">NEXT ON THE LIST:</div>
          <div className={'j-idea-text' + (glitch ? ' j-idea-text--glitch' : '')} aria-live="off">{text}</div>
        </div>
        <a href="#contact" data-go={GO.contact} data-hov className="j-btn j-btn--solid j-btn--sm j-idea-cta">START YOURS ↗</a>
        <div className="j-scanlines" />
      </div>
      <div className="j-beam" />
      <div className="j-beam-glow" />
    </article>
  );
};

export default IdeaCard;
