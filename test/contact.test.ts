import { describe, it, expect, vi, beforeEach } from 'vitest';

const send = vi.fn();
vi.mock('resend', () => ({ Resend: class { emails = { send }; } }));

// the Vercel function is plain ESM without type declarations: import it through a path variable
const contactPath = '../api/contact.js';
const { default: handler, escapeHtml } = await import(/* @vite-ignore */ contactPath) as {
  default: (req: unknown, res: unknown) => Promise<unknown>;
  escapeHtml: (s: string) => string;
};

interface Sent { to: string[]; replyTo: string; subject: string; html: string; text: string }

const mockRes = () => {
  const res = { statusCode: 0, body: undefined as unknown, headers: {} as Record<string, unknown> };
  return Object.assign(res, {
    status(c: number) { res.statusCode = c; return this; },
    json(b: unknown) { res.body = b; return this; },
    setHeader(k: string, v: unknown) { res.headers[k] = v; },
  });
};
const post = async (body: unknown, headers: Record<string, string> = {}) => {
  const res = mockRes();
  await handler({ method: 'POST', body, headers }, res);
  return res;
};

describe('api/contact', () => {
  beforeEach(() => {
    send.mockReset().mockResolvedValue({ data: { id: 'em_1' }, error: null });
    vi.stubEnv('RESEND_API_KEY', 'test');
  });

  it('sends ONE email, to NovaEdge only, with reply-to set to the visitor (no auto-reply)', async () => {
    const res = await post({ name: 'Ada', email: 'ada@example.com', message: 'Hi' });
    expect(res.statusCode).toBe(200);
    expect(send).toHaveBeenCalledTimes(1);
    const mail = send.mock.calls[0][0] as Sent;
    expect(mail.to).toEqual(['jose.sierra@novaedgetechnology.com']);
    expect(mail.replyTo).toBe('ada@example.com');
  });

  it('escapes what the visitor typed: no markup or links reach the email', async () => {
    await post({ name: '<b>Ada</b>', email: 'ada@example.com', message: '<a href="https://evil.example">click</a>\nline 2' });
    const { html } = send.mock.calls[0][0] as Sent;
    expect(html).not.toContain('<a href="https://evil.example');
    expect(html).not.toContain('<b>Ada</b>');
    expect(html).toContain('&lt;a href=&quot;https://evil.example&quot;&gt;click&lt;/a&gt;<br>line 2');
    expect(escapeHtml(`<>&"'`)).toBe('&lt;&gt;&amp;&quot;&#39;');
  });

  it('adds the visitor\'s location and the time received (Eastern) to both parts', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-27T17:41:00Z')); // 1:41 PM in Miami (EDT)
    try {
      await post({ name: 'Ada', email: 'ada@example.com', message: 'Hi' }, {
        'x-vercel-ip-city': 'S%C3%A3o%20Paulo', 'x-vercel-ip-country-region': 'SP', 'x-vercel-ip-country': 'BR',
      });
    } finally { vi.useRealTimers(); }
    const { text, html } = send.mock.calls[0][0] as Sent;
    expect(text).toContain('From: São Paulo, SP, BR');
    expect(html).toContain('São Paulo, SP, BR');
    for (const part of [text, html]) expect(part).toContain('Oct 27, 2026, 1:41 PM ET');
  });

  it('URI-encodes the reply links, so a ? in a valid address stays part of it', async () => {
    await post({ name: 'Ada', email: 'a?b@example.com', message: 'Hi' });
    const { html } = send.mock.calls[0][0] as Sent;
    expect(html).toContain('href="mailto:a%3Fb@example.com"');
    expect(html).toContain('href="mailto:a%3Fb@example.com?subject=');
    expect(html).not.toContain('mailto:a?b');
  });

  it('keeps the subject to a single line', async () => {
    await post({ name: 'Ada\r\nBcc: victim@example.com', email: 'ada@example.com', message: 'Hi' });
    expect((send.mock.calls[0][0] as Sent).subject).not.toMatch(/[\r\n]/);
  });

  it('rejects bad input without sending anything', async () => {
    for (const body of [
      { name: '', email: 'ada@example.com', message: 'Hi' },
      { name: 'Ada', email: 'not-an-email', message: 'Hi' },
      { name: 'Ada', email: 'a@b.co', message: '' },
      { name: 'x'.repeat(101), email: 'a@b.co', message: 'Hi' },
      { name: 'Ada', email: 'a@b.co', message: 'x'.repeat(5001) },
    ]) expect((await post(body)).statusCode).toBe(400);
    expect(send).not.toHaveBeenCalled();
  });
});
