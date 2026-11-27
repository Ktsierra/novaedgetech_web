import React, { useEffect, useRef, useState } from 'react';
import { Human, checkForHuman, siteKey } from './turnstile';

/** what /api/contact returns: `code` names what was wrong, when the visitor can do something about it */
interface ApiResponse { success?: boolean; error?: string; code?: string }

type Tone = 'idle' | 'warn' | 'ok';
interface Status { tone: Tone; text: string }

const warn = (text: string): Status => ({ tone: 'warn', text });
const NEEDS = {
  both: warn('> name + email required'),
  email: warn('> that email doesn\'t look right'),
  message: warn('> tell us the idea first'),
  words: warn('> add a few words about the idea'),
  // (the email address and the phone number are right below the form)
  check: warn('> couldn\'t run the bot check. email or call us below'),
  human: warn('> bot check didn\'t pass. try again, or email us below'),
  failed: warn('> transmission failed. email us directly below'),
};
/** the server's own checks say the same things as the form's */
const FROM_SERVER: Partial<Record<string, Status>> = {
  name: NEEDS.both, email: NEEDS.email, message: NEEDS.message, words: NEEDS.words, human: NEEDS.human,
};

/** a number and nothing in words (a phone number, say): the form spam so far, and nothing we could answer */
const onlyNumbers = (message: string) => /\d/.test(message) && !/\p{L}/u.test(message);

const JourneyContact = () => {
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [status, setStatus] = useState<Status>({ tone: 'idle', text: '' });
  const [sending, setSending] = useState(false);
  // a field people never see or reach: only a script fills it in (the server drops what comes with it). Read
  // from the page itself when sending, so nothing React does to its own state can fill or empty it
  const trap = useRef<HTMLInputElement>(null);
  // the bot check (Cloudflare Turnstile), where this build has a key for it: started by the first touch of the form
  const box = useRef<HTMLDivElement>(null);
  const human = useRef<Human | null>(null);
  const [asking, setAsking] = useState(false);
  const key = siteKey();

  const arm = () => {
    if (!key || human.current || !box.current) return human.current;
    human.current = checkForHuman(box.current, key, setAsking);
    return human.current;
  };
  useEffect(() => () => { human.current?.remove(); human.current = null; }, []);

  const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sending) return;
    const name = form.name.trim(), email = form.email.trim(), message = form.message.trim();
    if (!name || !email) { setStatus(NEEDS.both); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setStatus(NEEDS.email); return; }
    if (!message) { setStatus(NEEDS.message); return; }
    if (onlyNumbers(message)) { setStatus(NEEDS.words); return; }

    setSending(true);
    const check = arm();
    let sent = false;
    try {
      let token = '';
      if (check) {
        setStatus({ tone: 'idle', text: '> checking you\'re not a bot…' });
        token = await check.token();
        if (!token) { setStatus(NEEDS.check); return; }
      }
      setStatus({ tone: 'idle', text: '> transmitting…' });
      const subject = trap.current?.value ?? '';
      sent = true;
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, message, ...(subject ? { subject } : {}), ...(token ? { token } : {}) }),
      });
      const result = await res.json() as ApiResponse;
      if (!res.ok || !result.success) { setStatus(FROM_SERVER[result.code ?? ''] ?? NEEDS.failed); return; }
      setStatus({ tone: 'ok', text: '> message queued. we\'ll be in your orbit within 24h' });
      setForm({ name: '', email: '', message: '' }); // sent: start clean (fields are read-only while sending, so nothing new is lost)
    } catch {
      setStatus(NEEDS.failed);
    } finally {
      // a token counts once: whatever came of this attempt, the next one needs its own
      if (sent) check?.renew();
      setSending(false);
    }
  };

  return (
    <form data-form className="j-form" onSubmit={e => { void onSubmit(e); }} onFocus={arm} noValidate>
      <label className="j-field">
        <span className="j-prompt">&gt;</span>
        <input name="name" aria-label="Your name" placeholder="your name" autoComplete="name" maxLength={100} readOnly={sending} value={form.name} onChange={onChange} />
      </label>
      <label className="j-field">
        <span className="j-prompt">&gt;</span>
        <input name="email" type="email" aria-label="Email" placeholder="email" autoComplete="email" maxLength={254} readOnly={sending} value={form.email} onChange={onChange} />
      </label>
      <label className="j-field j-field--wide">
        <span className="j-prompt">&gt;</span>
        <textarea name="message" aria-label="Your idea" rows={2} placeholder="the idea: web app, mobile app, both?" maxLength={5000} readOnly={sending} value={form.message} onChange={onChange} />
      </label>
      <div className="j-form-trap" aria-hidden="true">
        <label>
          Subject (leave this one empty)
          <input ref={trap} type="text" name="subject" tabIndex={-1} autoComplete="off" data-1p-ignore data-lpignore="true" data-bwignore="true" defaultValue="" />
        </label>
      </div>
      <div className="j-form-end">
        {key && <div ref={box} className={'j-form-human' + (asking ? ' j-form-human--asking' : '')} />}
        <div className="j-form-foot">
          <span className={'j-form-status j-form-status--' + status.tone} role="status" aria-live="polite">
            {sending && asking ? '> tick the box above to send' : status.text}
          </span>
          <button type="submit" className="j-btn j-btn--solid j-btn--sm" disabled={sending}>
            {sending ? 'SENDING…' : 'TRANSMIT ↗'}
          </button>
        </div>
      </div>
    </form>
  );
};

export default JourneyContact;
