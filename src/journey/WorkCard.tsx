import { CSSProperties } from 'react';
import { WorkItem } from './journeyText';

const v = (vars: Record<string, string>) => vars as CSSProperties;
const pad = (n: number) => String(n).padStart(2, '0');

/** a small, deterministic sparkline so each placeholder frame looks different */
const sparkline = (seed: number, w = 100, h = 34) => {
  let y = h * 0.6;
  const pts: string[] = [];
  for (let i = 0; i <= 10; i++) {
    const r = Math.sin(seed * 12.9898 + i * 78.233) * 43758.5453;
    y = Math.min(h - 3, Math.max(4, y + ((r - Math.floor(r)) - 0.58) * h * 0.5));
    pts.push(`${(i * w / 10).toFixed(1)},${y.toFixed(1)}`);
  }
  return pts.join(' ');
};

const Chart = ({ seed }: { seed: number }) => {
  const line = sparkline(seed);
  return (
    <svg className="j-mock-chart" viewBox="0 0 100 34" preserveAspectRatio="none" aria-hidden="true">
      <polygon points={`0,34 ${line} 100,34`} className="j-mock-area" />
      <polyline points={line} className="j-mock-line" />
    </svg>
  );
};

const Browser = ({ seed }: { seed: number }) => (
  <div className="j-mock-browser">
    <div className="j-mock-bar"><i /><i /><i /><span /></div>
    <div className="j-mock-body">
      <div className="j-mock-side"><span /><span /><span /><span /></div>
      <div className="j-mock-main">
        <div className="j-mock-kpis"><span /><span /><span /></div>
        <Chart seed={seed} />
      </div>
    </div>
  </div>
);

const Phone = ({ seed, className = '' }: { seed: number; className?: string }) => (
  <div className={'j-mock-phone ' + className}>
    <div className="j-mock-notch" />
    <div className="j-mock-ring" />
    <div className="j-mock-rows"><span /><span /><span /></div>
    <Chart seed={seed + 3} />
  </div>
);

/** stylised device mock used until a real screenshot is provided */
const MockShot = ({ kind, seed }: { kind: WorkItem['kind']; seed: number }) => (
  <div className={'j-mock j-mock--' + kind} aria-hidden="true">
    <div className="j-mock-grid" />
    {kind !== 'mobile' && <Browser seed={seed} />}
    {kind === 'mobile' && <><Phone seed={seed} className="j-mock-phone--back" /><Phone seed={seed + 1} /></>}
    {kind === 'both' && <Phone seed={seed + 1} className="j-mock-phone--front" />}
  </div>
);

const WorkCard = ({ w, index, total }: { w: WorkItem; index: number; total: number }) => (
  <article data-at={w.at} className="j-rise j-work-item" style={v({ '--rise': '46px', '--offset': `${String(w.offset)}px`, '--acc': w.accent })}>
    <div className="j-wcard" style={v({ '--tilt': w.tilt })}>
      <div className="j-wcard-top">
        <span>{pad(index + 1)} / {pad(total)}</span>
        <span>{w.year}</span>
      </div>
      <div className="j-wcard-shot">
        {w.image ? <img src={w.image} alt={`${w.title} screenshot`} loading="lazy" /> : <MockShot kind={w.kind} seed={index + 1} />}
      </div>
      <div className="j-wcard-body">
        <h3 className="j-wcard-title">{w.title}</h3>
        <p className="j-wcard-blurb">{w.blurb}</p>
        <div className="j-wcard-tags">{w.tags.map(t => <span key={t}>{t}</span>)}</div>
      </div>
      <div className="j-wcard-cta">VIEW CASE <span>↗</span></div>
      <div className="j-scanlines" />
      <div className="j-sheen" />
    </div>
    <div className="j-beam" />
    <div className="j-beam-glow" />
  </article>
);

export default WorkCard;
