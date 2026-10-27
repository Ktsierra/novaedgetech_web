import { useEffect, useRef, useState } from 'react';
import { GO, ideas } from './journeyText';

const CH = '!<>-_\\/[]{}=+*^?#';

/**
 * Reserved slot under the four projects: a slim, full-width "empty display" frame that says the visitor's
 * project is next. The idea keeps glitching from one possibility to the next (same code-scramble as the
 * hero's NOVA -> NEXT); reduced motion just swaps them.
 */
const IdeaSlot = ({ at }: { at: number }) => {
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
    <div data-at={at} className="j-rise j-slot" style={{ ['--rise' as string]: '30px' }}>
      <div className="j-slot-label">
        <span className="j-slot-num">05</span>
        <span>RESERVED FOR<br />YOUR PROJECT</span>
      </div>
      <div className="j-slot-idea">
        <span className="j-slot-next">NEXT ON DISPLAY</span>
        <span className={'j-slot-text' + (glitch ? ' j-slot-text--glitch' : '')}>{text}<i className="j-slot-caret" /></span>
      </div>
      <a href="#contact" data-go={GO.contact} data-hov className="j-btn j-btn--solid j-btn--sm j-slot-cta">START YOURS ↗</a>
    </div>
  );
};

export default IdeaSlot;
