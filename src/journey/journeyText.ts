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
  year: string;
  /** which device mock the placeholder frame shows */
  kind: 'web' | 'mobile' | 'both';
  /** per-project accent colour */
  accent: string;
  tilt: string;
  at: number;
  /** staggered billboard height on desktop */
  offset: number;
  /** optional screenshot; a styled placeholder frame renders when absent */
  image?: string;
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
  { num: '01', title: 'WEB APPLICATIONS', body: 'SaaS platforms, dashboards, internal tools. React, Next.js and Node, typed end to end.', at: 0.5 },
  { num: '02', title: 'MOBILE APPLICATIONS', body: 'iOS and Android that feel native. One codebase when it\'s smart, two when it matters.', at: 0.53 },
  { num: '03', title: 'MVP → LAUNCH', body: 'Idea to shipped in weeks. Design, build, deploy. Then iterate with real users.', at: 0.56 },
];

// placeholder projects: swap in real ones (and `image` screenshots) when ready
export const work: WorkItem[] = [
  { id: 'orbit', title: 'ORBIT', blurb: 'Treasury dashboard for seed-stage teams: runway, burn and forecasts in one view.', tags: ['FINTECH', 'WEB'], year: '2026', kind: 'web', accent: '#00E5FF', tilt: 'rotateX(3deg) rotateY(6deg)', at: 0.705, offset: 0 },
  { id: 'pulse', title: 'PULSE', blurb: 'Recovery tracking that pairs wearables with a daily care plan.', tags: ['HEALTH', 'IOS + ANDROID'], year: '2025', kind: 'mobile', accent: '#5CF2B8', tilt: 'rotateX(2deg) rotateY(2deg)', at: 0.73, offset: 36 },
  { id: 'relay', title: 'RELAY', blurb: 'Dispatch console and driver app for last-mile delivery fleets.', tags: ['LOGISTICS', 'WEB + MOBILE'], year: '2025', kind: 'both', accent: '#FFB35C', tilt: 'rotateX(2deg) rotateY(-2deg)', at: 0.755, offset: 36 },
  { id: 'halo', title: 'HALO', blurb: 'An AI guide that turns product docs into interactive onboarding.', tags: ['AI', 'WEB'], year: '2024', kind: 'web', accent: '#A98BFF', tilt: 'rotateX(3deg) rotateY(-6deg)', at: 0.78, offset: 0 },
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
  services: 0.52,
  work: 0.76,
  contact: 0.97,
};
