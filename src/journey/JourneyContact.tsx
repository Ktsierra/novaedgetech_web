import React, { useState } from 'react';

/** what /api/contact returns */
interface ApiResponse { success?: boolean; error?: string }

type Tone = 'idle' | 'warn' | 'ok';

const JourneyContact = () => {
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [status, setStatus] = useState<{ tone: Tone; text: string }>({ tone: 'idle', text: '' });
  const [sending, setSending] = useState(false);

  const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sending) return;
    const name = form.name.trim(), email = form.email.trim(), message = form.message.trim();
    if (!name || !email) { setStatus({ tone: 'warn', text: '> name + email required' }); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setStatus({ tone: 'warn', text: '> that email doesn\'t look right' }); return; }
    if (!message) { setStatus({ tone: 'warn', text: '> tell us the idea first' }); return; }

    setSending(true);
    setStatus({ tone: 'idle', text: '> transmitting…' });
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, message }),
      });
      const result = await res.json() as ApiResponse;
      if (!res.ok || !result.success) throw new Error(result.error ?? 'send failed');
      setStatus({ tone: 'ok', text: '> message queued. we\'ll be in your orbit within 24h' });
      setForm(f => ({ ...f, message: '' }));
    } catch {
      setStatus({ tone: 'warn', text: '> transmission failed. email us directly below' });
    } finally {
      setSending(false);
    }
  };

  return (
    <form data-form className="j-form" onSubmit={e => { void onSubmit(e); }} noValidate>
      <label className="j-field">
        <span className="j-prompt">&gt;</span>
        <input name="name" aria-label="Your name" placeholder="your name" autoComplete="name" value={form.name} onChange={onChange} />
      </label>
      <label className="j-field">
        <span className="j-prompt">&gt;</span>
        <input name="email" type="email" aria-label="Email" placeholder="email" autoComplete="email" value={form.email} onChange={onChange} />
      </label>
      <label className="j-field j-field--wide">
        <span className="j-prompt">&gt;</span>
        <textarea name="message" aria-label="Your idea" rows={2} placeholder="the idea: web app, mobile app, both?" value={form.message} onChange={onChange} />
      </label>
      <div className="j-form-foot">
        <span className={'j-form-status j-form-status--' + status.tone} role="status" aria-live="polite">{status.text}</span>
        <button type="submit" className="j-btn j-btn--solid j-btn--sm" disabled={sending}>
          {sending ? 'SENDING…' : 'TRANSMIT ↗'}
        </button>
      </div>
    </form>
  );
};

export default JourneyContact;
