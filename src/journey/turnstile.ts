/**
 * Cloudflare Turnstile for the contact form: a check, run by Cloudflare in the visitor's browser, that the form is
 * being filled in by a person. It hands back a token, which goes out with the message for /api/contact to verify.
 *
 * Nothing here runs, and nothing is loaded from Cloudflare, until the visitor touches the form: the check has
 * the time they spend typing to finish, and visitors who never write to us never meet it.
 *
 * It is off unless the build was given a site key (VITE_TURNSTILE_SITE_KEY). The server makes the same decision
 * from the same deployment's keys (api/contact.js), so the two cannot disagree.
 */

const SCRIPT = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
/** how long the script may take to arrive */
const LOAD_MS = 10000;
/** how long a submit waits for a check that is still running by itself */
const WAIT_MS = 12000;
/** ... and for one that asked the visitor to tick its box */
const ASK_MS = 120000;

interface Options {
  sitekey: string;
  action: string;
  theme: 'dark';
  size: 'flexible';
  /** the widget stays out of sight unless it needs the visitor to do something */
  appearance: 'interaction-only';
  callback: (token: string) => void;
  'error-callback': (code?: string) => boolean;
  'expired-callback': () => void;
  'timeout-callback': () => void;
  'before-interactive-callback': () => void;
  'after-interactive-callback': () => void;
  'unsupported-callback': () => void;
}
interface Turnstile {
  render: (box: HTMLElement, options: Options) => string | null | undefined;
  reset: (widget?: string) => void;
  remove: (widget?: string) => void;
}
declare global {
  interface Window { turnstile?: Turnstile }
}

/** the public half of the key pair, when this build has one */
export const siteKey = () => ((import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined) ?? '').trim();

let script: Promise<Turnstile> | null = null;
const load = () => window.turnstile ? Promise.resolve(window.turnstile) : script ??= new Promise<Turnstile>((resolve, reject) => {
  const el = document.createElement('script');
  let timer = 0;
  const fail = (why: string) => {
    script = null; // (the next visit to the form tries again)
    window.clearTimeout(timer);
    el.remove();
    reject(new Error(why));
  };
  timer = window.setTimeout(() => { fail('timed out'); }, LOAD_MS);
  el.src = SCRIPT;
  el.async = true;
  el.onload = () => {
    if (!window.turnstile) { fail('not there'); return; }
    window.clearTimeout(timer);
    resolve(window.turnstile);
  };
  // a content blocker, or no way to reach Cloudflare
  el.onerror = () => { fail('blocked'); };
  document.head.appendChild(el);
});

export interface Human {
  /**
   * The token to send with the message: waits for the check while it is still running. '' when there is none to
   * be had (the script was blocked, the check failed, or it was left waiting too long).
   */
  token: () => Promise<string>;
  /** After a token has gone out with a message: it only counts once, so start the next check. */
  renew: () => void;
  remove: () => void;
}

/**
 * Starts the check in `box` (the widget shows up there only when it wants the visitor to tick it). `onAsk` hears
 * when that is the case.
 */
export function checkForHuman(box: HTMLElement, key: string, onAsk?: (asking: boolean) => void): Human {
  let api: Turnstile | null = null;
  let widget: string | null = null;
  let token = '';
  let dead = false; // no token is coming: the script never arrived, or this browser can't run the check
  let asking = false;
  let gone = false;
  let waiting: (() => void)[] = [];
  const wake = () => {
    const all = waiting;
    waiting = [];
    all.forEach(go => { go(); });
  };
  const ask = (on: boolean) => {
    asking = on;
    onAsk?.(on);
    wake();
  };

  load().then(turnstile => {
    if (gone) return;
    api = turnstile;
    widget = turnstile.render(box, {
      sitekey: key,
      action: 'contact',
      theme: 'dark',
      size: 'flexible',
      appearance: 'interaction-only',
      callback: t => { token = t; wake(); },
      // (true: handled here. Turnstile tries again by itself, so a later callback can still bring a token)
      'error-callback': () => { token = ''; return true; },
      'expired-callback': () => { token = ''; },
      'timeout-callback': () => { token = ''; },
      'before-interactive-callback': () => { ask(true); },
      'after-interactive-callback': () => { ask(false); },
      'unsupported-callback': () => { dead = true; wake(); },
    }) ?? null;
    if (widget == null) { dead = true; wake(); }
  }).catch(() => {
    dead = true;
    wake();
  });

  return {
    token: async () => {
      let since = performance.now();
      let asked = asking;
      for (;;) {
        if (token || dead || gone) return token;
        // (the clock starts again when the widget turns to the visitor: ticking a box takes a person a moment)
        if (asking !== asked) { asked = asking; since = performance.now(); }
        const left = (asking ? ASK_MS : WAIT_MS) - (performance.now() - since);
        if (left <= 0) return '';
        await new Promise<void>(resolve => {
          const timer = setTimeout(resolve, left);
          waiting.push(() => { clearTimeout(timer); resolve(); });
        });
      }
    },
    renew: () => {
      token = '';
      if (api && widget != null) api.reset(widget);
    },
    remove: () => {
      gone = true;
      wake();
      if (api && widget != null) api.remove(widget);
    },
  };
}
