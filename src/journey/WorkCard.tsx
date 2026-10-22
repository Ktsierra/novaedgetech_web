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

/** one console fanning out to every system on site; pulses travel the links */
const NetworkMap = () => {
  const nodes: [string, number, number][] = [['NETWORK', 34, 24], ['ACCESS', 166, 24], ['TALK', 26, 92], ['SENSORS', 174, 92], ['PROTECT', 100, 110]];
  return (
    <svg className="j-mock-svg" viewBox="0 0 200 124" aria-hidden="true">
      {nodes.map(([, x, y], i) => <line key={i} x1="100" y1="60" x2={x} y2={y} className="j-flow" style={{ animationDelay: `${String(-i * 0.4)}s` }} />)}
      <rect x="74" y="50" width="52" height="20" rx="4" className="j-node j-node--hub" />
      <text x="100" y="63" className="j-node-label j-node-label--hub">CONSOLE</text>
      {nodes.map(([label, x, y]) => (
        <g key={label}>
          <rect x={x - 22} y={y - 8} width="44" height="16" rx="3" className="j-node" />
          <text x={x} y={y + 3} className="j-node-label">{label}</text>
        </g>
      ))}
    </svg>
  );
};

/** cloud accounts on one side, directory groups on the other, a role-sync engine in between */
const IdentitySync = () => {
  const ys = [26, 62, 98];
  return (
    <svg className="j-mock-svg" viewBox="0 0 200 124" aria-hidden="true">
      <text x="34" y="12" className="j-node-label j-node-label--dim">AWS ORG</text>
      <text x="166" y="12" className="j-node-label j-node-label--dim">ENTRA ID</text>
      {ys.map((y, i) => <line key={'l' + String(i)} x1="56" y1={y} x2="84" y2="62" className="j-flow" style={{ animationDelay: `${String(-i * 0.5)}s` }} />)}
      {ys.map((y, i) => <line key={'r' + String(i)} x1="116" y1="62" x2="144" y2={y} className="j-flow" style={{ animationDelay: `${String(-i * 0.5 - 0.25)}s` }} />)}
      {['ACCT · PROD', 'ACCT · DEV', 'ACCT · DATA'].map((t, i) => (
        <g key={t}><rect x="12" y={ys[i] - 8} width="44" height="16" rx="3" className="j-node" /><text x="34" y={ys[i] + 3} className="j-node-label">{t}</text></g>
      ))}
      {['GRP · ADMINS', 'GRP · DEVS', 'GRP · AUDIT'].map((t, i) => (
        <g key={t}><rect x="144" y={ys[i] - 8} width="44" height="16" rx="3" className="j-node" /><text x="166" y={ys[i] + 3} className="j-node-label">{t}</text></g>
      ))}
      <path d="M100 46 L116 62 L100 78 L84 62 Z" className="j-node j-node--hub" />
      <text x="100" y="90" className="j-node-label j-node-label--hub">ROLE SYNC</text>
    </svg>
  );
};

/** stylised mock used until a real screenshot is provided */
const MockShot = ({ kind, seed }: { kind: WorkItem['kind']; seed: number }) => (
  <div className={'j-mock j-mock--' + kind} aria-hidden="true">
    <div className="j-mock-grid" />
    {kind === 'network' && <NetworkMap />}
    {kind === 'cloud' && <IdentitySync />}
    {(kind === 'web' || kind === 'both') && <Browser seed={seed} />}
    {kind === 'mobile' && <><Phone seed={seed} className="j-mock-phone--back" /><Phone seed={seed + 1} /></>}
    {kind === 'both' && <Phone seed={seed + 1} className="j-mock-phone--front" />}
  </div>
);

const CardBody = ({ w, index, total }: { w: WorkItem; index: number; total: number }) => (
  <>
    <div className="j-wcard-top">
      <span>{pad(index + 1)} / {pad(total)}</span>
      <span className="j-wcard-status">{w.status}</span>
    </div>
    <div className="j-wcard-shot">
      {w.image ? <img src={w.image} alt={`${w.title} screenshot`} loading="lazy" /> : <MockShot kind={w.kind} seed={index + 1} />}
    </div>
    <div className="j-wcard-body">
      <h3 className="j-wcard-title">{w.title}</h3>
      <p className="j-wcard-blurb">{w.blurb}</p>
      <div className="j-wcard-tags">{w.tags.map(t => <span key={t}>{t}</span>)}</div>
    </div>
    <div className="j-wcard-cta">{w.cta} {w.href && <span>↗</span>}</div>
    <div className="j-scanlines" />
    <div className="j-sheen" />
  </>
);

const WorkCard = ({ w, index, total }: { w: WorkItem; index: number; total: number }) => (
  <article data-at={w.at} className="j-rise j-work-item" style={v({ '--rise': '46px', '--offset': `${String(w.offset)}px`, '--acc': w.accent })}>
    {w.href
      ? <a className="j-wcard j-wcard--link" href={w.href} target="_blank" rel="noopener noreferrer" data-hov style={v({ '--tilt': w.tilt })}><CardBody w={w} index={index} total={total} /></a>
      : <div className="j-wcard" style={v({ '--tilt': w.tilt })}><CardBody w={w} index={index} total={total} /></div>}
    <div className="j-beam" />
    <div className="j-beam-glow" />
  </article>
);

export default WorkCard;
