import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

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

// Cloudflare's answer to "is this token good?" (the handler's only use of fetch)
const verify = vi.fn<(url: string, init: RequestInit) => Promise<Response>>();
const cloudflareSays = (answer: unknown, status = 200) => verify.mockResolvedValue(new Response(JSON.stringify(answer), { status }));
const asked = () => JSON.parse(verify.mock.calls[0][1].body as string) as Record<string, string>;
const ADA = { name: 'Ada', email: 'ada@example.com', message: 'A booking app for my clinic' };

describe('api/contact', () => {
  beforeEach(() => {
    send.mockReset().mockResolvedValue({ data: { id: 'em_1' }, error: null });
    verify.mockReset();
    vi.stubGlobal('fetch', verify);
    vi.stubEnv('RESEND_API_KEY', 'test');
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });
  afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

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

  it('says which field was wrong, so the form can show its own line for it', async () => {
    const code = async (body: unknown) => ((await post(body)).body as { code?: string }).code;
    expect(await code({ ...ADA, name: '' })).toBe('name');
    expect(await code({ ...ADA, email: 'nope' })).toBe('email');
    expect(await code({ ...ADA, message: '' })).toBe('message');
  });

  describe('keeping bots out', () => {
    it('drops whatever fills in the hidden field, and tells it the message was sent', async () => {
      const res = await post({ ...ADA, subject: 'cheap seo' });
      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual({ success: true });
      expect(send).not.toHaveBeenCalled();
      expect(verify).not.toHaveBeenCalled();
      // (an empty one is what every real visitor sends, if their browser sends it at all)
      expect((await post({ ...ADA, subject: '  ' })).statusCode).toBe(200);
      expect(send).toHaveBeenCalledTimes(1);
    });

    it('turns away a message that is only a number, with a reason a person can act on', async () => {
      for (const message of ['8362910374', '836 291 0374', '+1 (305) 707-8670']) {
        const res = await post({ ...ADA, message });
        expect(res.statusCode).toBe(400);
        expect((res.body as { code: string }).code).toBe('words');
      }
      expect(send).not.toHaveBeenCalled();
      for (const message of ['Call me at 305 707 8670', 'Нужен сайт, бюджет 5000', '?']) expect((await post({ ...ADA, message })).statusCode).toBe(200);
    });

    it('asks Cloudflare nothing while this deployment has no Turnstile keys, or only one of them', async () => {
      expect((await post(ADA)).statusCode).toBe(200);
      vi.stubEnv('TURNSTILE_SECRET_KEY', 'secret');
      expect((await post(ADA)).statusCode).toBe(200); // (the page has no widget: nobody could pass)
      vi.unstubAllEnvs();
      vi.stubEnv('RESEND_API_KEY', 'test');
      vi.stubEnv('VITE_TURNSTILE_SITE_KEY', 'site');
      expect((await post({ ...ADA, token: 'tok' })).statusCode).toBe(200);
      expect(verify).not.toHaveBeenCalled();
      expect(send).toHaveBeenCalledTimes(3);
    });

    describe('with both Turnstile keys', () => {
      beforeEach(() => {
        vi.stubEnv('VITE_TURNSTILE_SITE_KEY', 'site');
        vi.stubEnv('TURNSTILE_SECRET_KEY', 'secret');
      });

      it('sends once Cloudflare confirms the token', async () => {
        cloudflareSays({ success: true });
        const res = await post({ ...ADA, token: 'tok-1' }, { 'x-forwarded-for': '203.0.113.7, 10.0.0.1' });
        expect(res.statusCode).toBe(200);
        expect(verify.mock.calls[0][0]).toBe('https://challenges.cloudflare.com/turnstile/v0/siteverify');
        expect(asked()).toEqual({ secret: 'secret', response: 'tok-1', remoteip: '203.0.113.7' });
        const mail = send.mock.calls[0][0] as Sent;
        expect(mail.text).not.toContain('Spam check');
        expect(mail.html).not.toContain('Spam check');
      });

      it('turns away a message with no token, without asking Cloudflare', async () => {
        for (const token of [undefined, '', 42, 'x'.repeat(2049)]) {
          const res = await post({ ...ADA, token });
          expect(res.statusCode).toBe(403);
          expect((res.body as { code: string }).code).toBe('human');
        }
        expect(verify).not.toHaveBeenCalled();
        expect(send).not.toHaveBeenCalled();
      });

      it('turns away a token Cloudflare does not accept: forged, expired, used before, or anything it has no name for', async () => {
        for (const codes of [['invalid-input-response'], ['timeout-or-duplicate'], ['bad-request'], ['something-new'], [], ['internal-error', 'invalid-input-response']]) {
          cloudflareSays({ success: false, 'error-codes': codes });
          const res = await post({ ...ADA, token: 'tok' });
          expect(res.statusCode).toBe(403);
          expect((res.body as { code: string }).code).toBe('human');
        }
        expect(send).not.toHaveBeenCalled();
      });

      it('still delivers when the check could not be settled, and says so in the email', async () => {
        const unsettled = [
          () => verify.mockRejectedValue(new Error('network')),
          () => verify.mockResolvedValue(new Response('<html>bad gateway</html>', { status: 502 })),
          () => cloudflareSays({ success: false, 'error-codes': ['internal-error'] }),
          () => cloudflareSays({ success: false, 'error-codes': ['invalid-input-secret'] }),
        ];
        for (const cloudflare of unsettled) {
          cloudflare();
          expect((await post({ ...ADA, token: 'tok' })).statusCode).toBe(200);
        }
        expect(send).toHaveBeenCalledTimes(unsettled.length);
        for (const call of send.mock.calls) {
          const mail = call[0] as Sent;
          expect(mail.text).toContain('Spam check: Not completed');
          expect(mail.html).toContain('Spam check');
        }
      });

      it('checks the fields first, so a mistyped email does not use the token up', async () => {
        const res = await post({ ...ADA, email: 'nope', token: 'tok' });
        expect(res.statusCode).toBe(400);
        expect(verify).not.toHaveBeenCalled();
      });
    });
  });
});
