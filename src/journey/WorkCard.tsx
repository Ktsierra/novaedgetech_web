import { CSSProperties } from 'react';
import { WorkItem } from './journeyText';
import SitePlan from './SitePlan';
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

/** a client's AWS data <-> Microsoft Entra ID: identical tiles on an even grid, joined through a governance hub */
const IdentitySync = () => (
  <div className="j-sync" aria-hidden="true">
    <div className="j-sync-cell">
      <div className="j-sync-tile"><img src={awsIcon} alt="" className="j-sync-logo" /></div>
      <span>AWS DATA</span>
    </div>
    <div className="j-sync-cell j-sync-cell--hub">
      <div className="j-sync-link" />
      <div className="j-sync-tile j-sync-tile--hub">
        <svg viewBox="0 0 60 60" className="j-sync-loop">
          <path d="M14 26 A17 17 0 0 1 46 22" className="j-sync-arc" />
          <path d="M46 34 A17 17 0 0 1 14 38" className="j-sync-arc" />
          <path d="M46 22 l-1 -6 M46 22 l-6 1" className="j-sync-arc" />
          <path d="M14 38 l1 6 M14 38 l6 -1" className="j-sync-arc" />
        </svg>
      </div>
      <span>GOVERNANCE</span>
    </div>
    <div className="j-sync-cell">
      <div className="j-sync-tile"><img src={entraIcon} alt="" className="j-sync-logo" /></div>
      <span>ENTRA ID</span>
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
      {w.image && w.phoneImage ? (
        // web + mobile: the real desktop screen in a browser frame, the phone screen in front of it
        <div className="j-mock j-mock--both j-shot-pair">
          <div className="j-mock-grid" />
          <div className="j-mock-browser"><div className="j-mock-bar"><i /><i /><i /><span /></div><img src={w.image} alt={`${w.title} on the web`} loading="lazy" /></div>
          <div className="j-device">
            <div className="j-device-screen">
              <div className="j-device-status"><span>9:41</span><i className="j-device-island" /><span className="j-device-icons"><b /><b /><b /></span></div>
              <img src={w.phoneImage} alt={`${w.title} on a phone`} loading="lazy" />
            </div>
          </div>
        </div>
      ) : w.image ? <img src={w.image} alt={`${w.title} screenshot`} loading="lazy" /> : <MockShot kind={w.kind} seed={index + 1} />}
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
