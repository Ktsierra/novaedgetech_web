export interface Service {
  num: string;
  title: string;
  body: string;
  at: number;
}

export interface WorkItem {
  id: string;
  title: string;
  meta: string;
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
  { num: '01', title: 'WEB APPLICATIONS', body: 'SaaS platforms, dashboards, internal tools. React, Next.js and Node — typed end to end.', at: 0.5 },
  { num: '02', title: 'MOBILE APPLICATIONS', body: 'iOS and Android that feel native. One codebase when it\'s smart, two when it matters.', at: 0.53 },
  { num: '03', title: 'MVP → LAUNCH', body: 'Idea to shipped in weeks. Design, build, deploy — then iterate with real users.', at: 0.56 },
];

export const work: WorkItem[] = [
  { id: 'orbit', title: 'ORBIT', meta: 'FINTECH · WEB · 2026', tilt: 'rotateX(3deg) rotateY(6deg)', at: 0.705, offset: 0 },
  { id: 'pulse', title: 'PULSE', meta: 'HEALTH · IOS + ANDROID · 2025', tilt: 'rotateX(2deg) rotateY(2deg)', at: 0.73, offset: 36 },
  { id: 'relay', title: 'RELAY', meta: 'LOGISTICS · WEB + MOBILE · 2025', tilt: 'rotateX(2deg) rotateY(-2deg)', at: 0.755, offset: 36 },
  { id: 'halo', title: 'HALO', meta: 'AI ONBOARDING · WEB · 2024', tilt: 'rotateX(3deg) rotateY(-6deg)', at: 0.78, offset: 0 },
];

/** HUD chapters, keyed by journey progress */
export const bands: Band[] = [
  { to: 0.315, scale: '10²¹ M — GALACTIC SCALE', status: 'TRAVERSING THE ARM' },
  { to: 0.455, scale: '10¹² M — STELLAR SCALE', status: 'SYSTEM ACQUIRED' },
  { to: 0.62, scale: '10⁷ M — PLANETARY SCALE', status: 'ENTERING LOW ORBIT' },
  { to: 0.87, scale: '10⁴ M — SURFACE SCALE', status: 'TOUCHDOWN CONFIRMED' },
  { to: 9, scale: '10⁰ M — YOUR DESK', status: 'DOCKED — SAY HELLO' },
];

export const terminalCode = `$ novaedge new-project

compiling universe........... done
resolving client orbit....... done
opening secure channel....... done

> ready. tell us what we're building:`;

/** scroll-progress targets for nav links */
export const GO = {
  top: 0,
  journey: 0.3,
  services: 0.52,
  work: 0.76,
  contact: 0.97,
};
