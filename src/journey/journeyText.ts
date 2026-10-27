import portfolioShot from '../assets/work/portfolio.webp';
import skyvaultShot from '../assets/work/skyvault.webp';
import skyvaultPhone from '../assets/work/skyvault-phone.webp';

export interface Service {
  num: string;
  title: string;
  body: string;
  at: number;
}

export interface WorkItem {
  id: string;
  title: string;
  /** one line on what it is */
  blurb: string;
  tags: string[];
  /** IN DEVELOPMENT / DEPLOYED / ... shown in the card's top row */
  status: string;
  /** what the placeholder frame draws until a real screenshot exists */
  kind: 'web' | 'mobile' | 'both' | 'network' | 'cloud';
  /** optional outbound link (opens in a new tab) */
  href?: string;
  /** label of the card's bottom action */
  cta: string;
  /** per-project accent colour */
  accent: string;
  tilt: string;
  at: number;
  /** staggered billboard height on desktop */
  offset: number;
  /** optional screenshot; a styled placeholder frame renders when absent */
  image?: string;
  /** optional phone screenshot, layered in front of `image` (web + mobile projects) */
  phoneImage?: string;
}

export interface Band {
  to: number;
  scale: string;
  status: string;
}

export const CONTACT_EMAIL = 'jose.sierra@novaedgetechnology.com';

export const loaderStatuses = [
  'initializing particle field',
  'compiling universe',
  'igniting the core',
  'charting the route to your desk',
];

export const services: Service[] = [
  { num: '01', title: 'WEB APPLICATIONS', body: 'SaaS platforms, dashboards, internal tools. React, Next.js and Node, typed end to end.', at: 0.495 },
  { num: '02', title: 'MOBILE APPLICATIONS', body: 'iOS and Android that feel native. One codebase when it\'s smart, two when it matters.', at: 0.515 },
  { num: '03', title: 'MVP → LAUNCH', body: 'Idea to shipped in weeks. Design, build, deploy. Then iterate with real users.', at: 0.535 },
  { num: '04', title: 'NETWORK & INFRASTRUCTURE', body: 'Wi-Fi, access control, VoIP and cameras on one stack, plus cloud identity. Designed, deployed, managed.', at: 0.555 },
];

// client work is described without naming clients; add `image` screenshots when ready
export const work: WorkItem[] = [
  { id: 'skyvault', title: 'SKYVAULT', blurb: 'Inventory and parts traceability for aviation repair stations, from receiving to release.', tags: ['AVIATION', 'WEB + MOBILE'], status: 'IN DEVELOPMENT', kind: 'both', accent: '#00E5FF', href: 'https://getskyvault.app', cta: 'GETSKYVAULT.APP', image: skyvaultShot, phoneImage: skyvaultPhone, tilt: 'rotateX(3deg) rotateY(6deg)', at: 0.70, offset: 0 },
  { id: 'portfolio', title: 'FOUNDER PORTFOLIO', blurb: 'The engineering behind NovaEdge: open-source work, experiments and the founder\'s track record.', tags: ['PORTFOLIO', 'WEB'], status: 'LIVE', kind: 'web', accent: '#A98BFF', href: 'https://ktsierra.github.io/', cta: 'VISIT', image: portfolioShot, tilt: 'rotateX(2deg) rotateY(2deg)', at: 0.715, offset: 36 },
  { id: 'unifi', title: 'UNIFIED SITE OPS', blurb: 'End-to-end UniFi rollout: network, door access, intercom and VoIP, environmental sensors and camera security on one console.', tags: ['IT INFRASTRUCTURE', 'ON-SITE'], status: 'DEPLOYED', kind: 'network', accent: '#5CF2B8', cta: 'DETAILS ON REQUEST', tilt: 'rotateX(2deg) rotateY(-2deg)', at: 0.73, offset: 36 },
  { id: 'identity', title: 'MULTICLOUD GOVERNANCE', blurb: 'Links a client\'s AWS data to Microsoft identities and groups, with governance and dynamic workflows built in.', tags: ['MULTICLOUD', 'DATA GOVERNANCE'], status: 'IN PRODUCTION', kind: 'cloud', accent: '#FFB35C', cta: 'DETAILS ON REQUEST', tilt: 'rotateX(3deg) rotateY(-6deg)', at: 0.745, offset: 0 },
];

/** the "your project" side card cycles through these */
export const ideas = [
  'a booking app for your clinic',
  'the dashboard your ops team wants',
  'your MVP, shipped in weeks',
  'an inventory system that scans',
  'Wi-Fi that reaches every corner',
  'a customer portal people like',
  'the app your field crew needs',
  'your SaaS, typed end to end',
  'cameras and door access, one console',
  'a marketplace for your niche',
];

/** HUD chapters, keyed by journey progress */
export const bands: Band[] = [
  { to: 0.315, scale: '10²¹ M · GALACTIC SCALE', status: 'TRAVERSING THE ARM' },
  { to: 0.455, scale: '10¹² M · STELLAR SCALE', status: 'SYSTEM ACQUIRED' },
  { to: 0.62, scale: '10⁷ M · PLANETARY SCALE', status: 'ENTERING LOW ORBIT' },
  { to: 0.889, scale: '10⁴ M · SURFACE SCALE', status: 'TOUCHDOWN CONFIRMED' },
  { to: 9, scale: '10⁰ M · YOUR DESK', status: 'DOCKED · SAY HELLO' },
];

export const terminalCode = `$ novaedge new-project

compiling universe........... done
resolving client orbit....... done
opening secure channel....... done

> ready. tell us what we're building:`;

/** scroll-progress targets for nav links */
export const GO = {
  top: 0,
  /** "take the journey" plays the whole trip, galaxy to desk */
  journey: 0.97,
  /** just past the last service reveal (04 at 0.555), so the anchor lands with all four on screen */
  services: 0.565,
  work: 0.76,
  contact: 0.97,
};
