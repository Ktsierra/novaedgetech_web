import { CSSProperties } from 'react';
import { WorkItem } from './journeyText';
import awsIcon from '../assets/brands/aws-cloud.png';
import entraIcon from '../assets/brands/microsoft-entra-id.svg';

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

/**
 * Original isometric floor plan in the spirit of an "innerspace" view (fictional layout, no client data):
 * Wi-Fi coverage, camera view cones, door-access readers, sensors and the rack feeding the APs.
 */
const SitePlan = () => {
  const aps: [number, number][] = [[25, 20], [25, 60], [85, 20], [102, 60]];
  const cams: [number, number, number][] = [[3, 3, 45], [117, 3, 135], [117, 77, 225], [3, 77, 315]];
  const doors: [number, number][] = [[50, 12], [50, 64], [70, 40], [103, 40]];
  const sensors: [number, number][] = [[12, 34], [40, 72], [96, 10], [112, 70], [66, 58]];
  const rack: [number, number] = [62, 48];
  const wedge = ([x, y, deg]: [number, number, number]) => {
    const r = 22, a = deg * Math.PI / 180, s = 0.42;
    return `${String(x)},${String(y)} ${(x + r * Math.cos(a - s)).toFixed(1)},${(y + r * Math.sin(a - s)).toFixed(1)} ${(x + r * Math.cos(a + s)).toFixed(1)},${(y + r * Math.sin(a + s)).toFixed(1)}`;
  };
  return (
    <svg className="j-mock-svg" viewBox="0 0 200 124" aria-hidden="true">
      {/* plan space (120 x 80) projected isometrically */}
      <g transform="matrix(0.8,0.4,-0.8,0.4,84,14)">
        <rect x="0" y="0" width="120" height="80" className="j-plan-floor" />
        <path d="M50 0 V8 M50 16 V60 M50 68 V80 M50 40 H66 M74 40 H99 M107 40 H120 M85 40 V80" className="j-plan-wall" />
        <rect x="0" y="0" width="120" height="80" className="j-plan-wall" fill="none" />
        {aps.map(([x, y], i) => <circle key={'c' + String(i)} cx={x} cy={y} r="17" className="j-plan-cover" style={{ animationDelay: `${String(-i * 0.7)}s` }} />)}
        {cams.map((c, i) => <polygon key={'w' + String(i)} points={wedge(c)} className="j-plan-cone" />)}
        {aps.map(([x, y], i) => <line key={'l' + String(i)} x1={rack[0]} y1={rack[1]} x2={x} y2={y} className="j-flow" style={{ animationDelay: `${String(-i * 0.4)}s` }} />)}
        <rect x={rack[0] - 3} y={rack[1] - 3} width="6" height="6" className="j-node j-node--hub" />
        {aps.map(([x, y], i) => <circle key={'a' + String(i)} cx={x} cy={y} r="2.2" className="j-plan-ap" />)}
        {cams.map(([x, y], i) => <circle key={'k' + String(i)} cx={x} cy={y} r="1.8" className="j-plan-cam" />)}
        {doors.map(([x, y], i) => <rect key={'d' + String(i)} x={x - 1.6} y={y - 1.6} width="3.2" height="3.2" className="j-plan-door" />)}
        {sensors.map(([x, y], i) => <circle key={'s' + String(i)} cx={x} cy={y} r="1.3" className="j-plan-sensor" />)}
      </g>
      <g className="j-plan-legend">
        <circle cx="16" cy="118" r="2" className="j-plan-ap" /><text x="21" y="120">AP</text>
        <circle cx="42" cy="118" r="2" className="j-plan-cam" /><text x="47" y="120">CAMERA</text>
        <rect x="80" y="116" width="4" height="4" className="j-plan-door" /><text x="87" y="120">ACCESS</text>
        <circle cx="120" cy="118" r="2" className="j-plan-sensor" /><text x="125" y="120">SENSOR</text>
        <rect x="156" y="116" width="4" height="4" className="j-node j-node--hub" /><text x="163" y="120">RACK</text>
      </g>
    </svg>
  );
};

/** a client's AWS data <-> Microsoft Entra ID, with a role-sync loop between them (official icons, unmodified) */
const IdentitySync = () => (
  <div className="j-sync" aria-hidden="true">
    <div className="j-sync-side">
      <img src={awsIcon} alt="" className="j-sync-logo" />
      <span>CLIENT AWS</span>
    </div>
    <div className="j-sync-mid">
      <svg viewBox="0 0 60 60" className="j-sync-loop">
        <path d="M14 26 A17 17 0 0 1 46 22" className="j-sync-arc" />
        <path d="M46 34 A17 17 0 0 1 14 38" className="j-sync-arc" />
        <path d="M46 22 l-1 -6 M46 22 l-6 1" className="j-sync-arc" />
        <path d="M14 38 l1 6 M14 38 l6 -1" className="j-sync-arc" />
      </svg>
      <span>ROLE SYNC</span>
    </div>
    <div className="j-sync-side">
      <img src={entraIcon} alt="" className="j-sync-logo" />
      <span>MICROSOFT ENTRA ID</span>
    </div>
  </div>
);

/** stylised mock used until a real screenshot is provided */
const MockShot = ({ kind, seed }: { kind: WorkItem['kind']; seed: number }) => (
  <div className={'j-mock j-mock--' + kind} aria-hidden="true">
    <div className="j-mock-grid" />
    {kind === 'network' && <SitePlan />}
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
