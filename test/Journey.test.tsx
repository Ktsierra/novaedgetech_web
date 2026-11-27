import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import Journey from '../src/journey/Journey';

// jsdom has no canvas backend; the engine skips drawing when there is no 2d context
HTMLCanvasElement.prototype.getContext = (() => null) as unknown as typeof HTMLCanvasElement.prototype.getContext;

afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllEnvs(); delete window.turnstile; document.head.querySelectorAll('script').forEach(el => { el.remove(); }); });

// the engine also asks /api/geo for the visitor's location; only look at contact submissions
const contactCalls = (spy: { mock: { calls: unknown[][] } }) => spy.mock.calls.filter(c => c[0] === '/api/contact');

describe('Journey', () => {
  it('renders every chapter of the scroll journey', () => {
    render(<Journey skipIntro />);
    expect(screen.getByRole('region', { name: 'Services' })).toBeTruthy();
    expect(screen.getByRole('region', { name: 'Selected work' })).toBeTruthy();
    expect(screen.getByRole('region', { name: 'Contact' })).toBeTruthy();
    expect(screen.getByText('WEB APPLICATIONS')).toBeTruthy();
    expect(screen.getAllByText('SKYVAULT').length).toBeGreaterThan(0);
  });

  it('links to the privacy policy from the footer', () => {
    render(<Journey skipIntro />);
    expect(screen.getByRole('link', { name: 'Privacy' }).getAttribute('href')).toBe('/privacy');
  });

  it('requires name and email before transmitting', () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    render(<Journey skipIntro />);
    fireEvent.click(screen.getByRole('button', { name: /transmit/i }));
    expect(screen.getByRole('status').textContent).toContain('name + email required');
    expect(contactCalls(fetchSpy)).toHaveLength(0);
  });

  it('posts the message to /api/contact', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ success: true }), { status: 200 }),
    );
    render(<Journey skipIntro />);
    fireEvent.change(screen.getByLabelText('Your name'), { target: { value: 'Ada' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'ada@example.com' } });
    fireEvent.change(screen.getByLabelText('Your idea'), { target: { value: 'A mobile app' } });
    fireEvent.click(screen.getByRole('button', { name: /transmit/i }));
    await waitFor(() => { expect(screen.getByRole('status').textContent).toContain('message queued'); });
    expect(fetchSpy).toHaveBeenCalledWith('/api/contact', expect.objectContaining({ method: 'POST' }));
    const init = contactCalls(fetchSpy)[0][1] as RequestInit | undefined;
    const body = JSON.parse(init?.body as string) as Record<string, string>;
    expect(body).toEqual({ name: 'Ada', email: 'ada@example.com', message: 'A mobile app' });
    // a sent form starts clean
    for (const label of ['Your name', 'Email', 'Your idea']) expect(screen.getByLabelText(label)).toHaveProperty('value', '');
  });

  describe('keeping bots out of the contact form', () => {
    const ok = () => vi.spyOn(globalThis, 'fetch').mockImplementation(() => Promise.resolve(new Response(JSON.stringify({ success: true }), { status: 200 })));
    const fill = (message = 'A mobile app') => {
      fireEvent.change(screen.getByLabelText('Your name'), { target: { value: 'Ada' } });
      fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'ada@example.com' } });
      fireEvent.change(screen.getByLabelText('Your idea'), { target: { value: message } });
    };
    // (`hidden`: a few frames in, the engine has the contact stage out of sight until it is scrolled to)
    const transmit = () => { fireEvent.click(screen.getByRole('button', { name: /transmit/i, hidden: true })); };
    const status = () => screen.getByRole('status', { hidden: true }).textContent;
    const posted = (spy: { mock: { calls: unknown[][] } }, n = 0) => JSON.parse((contactCalls(spy)[n][1] as RequestInit).body as string) as Record<string, string>;
    const cloudflareScript = () => document.head.querySelector<HTMLScriptElement>('script[src^="https://challenges.cloudflare.com/turnstile/"]');

    it('asks for words when the message is only a number', () => {
      const fetchSpy = ok();
      render(<Journey skipIntro />);
      fill('8362910374');
      transmit();
      expect(status()).toContain('add a few words');
      expect(contactCalls(fetchSpy)).toHaveLength(0);
    });

    it('has a field no visitor can see or reach, and sends along whatever a script puts in it', async () => {
      const fetchSpy = ok();
      const { container } = render(<Journey skipIntro />);
      const trap = container.querySelector<HTMLInputElement>('input[name="subject"]');
      expect(trap?.tabIndex).toBe(-1);
      expect(trap?.closest('[aria-hidden="true"]')).toBeTruthy();
      expect(trap?.getAttribute('autocomplete')).toBe('off');
      if (trap) trap.value = 'cheap seo';
      fill();
      transmit();
      await waitFor(() => { expect(contactCalls(fetchSpy)).toHaveLength(1); });
      expect(posted(fetchSpy)).toEqual({ name: 'Ada', email: 'ada@example.com', message: 'A mobile app', subject: 'cheap seo' });
    });

    it('shows the server\'s reason when a person can do something about it', async () => {
      const reply = (status: number, code: string) => vi.spyOn(globalThis, 'fetch').mockImplementation(() => Promise.resolve(new Response(JSON.stringify({ error: 'no', code }), { status })));
      render(<Journey skipIntro />);
      fill();
      reply(400, 'words');
      transmit();
      await waitFor(() => { expect(status()).toContain('add a few words'); });
      reply(403, 'human');
      transmit();
      await waitFor(() => { expect(status()).toContain('bot check didn\'t pass'); });
      reply(500, '');
      transmit();
      await waitFor(() => { expect(status()).toContain('transmission failed'); });
      // (what they typed is still there to send again)
      expect(screen.getByLabelText('Your idea')).toHaveProperty('value', 'A mobile app');
    });

    it('loads nothing from Cloudflare when the build has no Turnstile key', async () => {
      const fetchSpy = ok();
      const { container } = render(<Journey skipIntro />);
      fireEvent.focusIn(screen.getByLabelText('Your name'));
      fill();
      transmit();
      await waitFor(() => { expect(status()).toContain('message queued'); });
      expect(cloudflareScript()).toBeNull();
      expect(container.querySelector('.j-form-human')).toBeNull();
      expect(posted(fetchSpy)).toEqual({ name: 'Ada', email: 'ada@example.com', message: 'A mobile app' });
    });

    describe('with a Turnstile key', () => {
      type Callbacks = Record<string, (arg?: string) => unknown>;
      /** stands in for Cloudflare's script: hands out tok-1, tok-2, ... (`auto`: as soon as a check starts) */
      const fakeTurnstile = (auto = true) => {
        const widget = { options: null as (Callbacks & { sitekey?: string }) | null, n: 0 };
        const pass = () => widget.options?.callback('tok-' + String(++widget.n));
        const api = {
          render: vi.fn((_box: HTMLElement, options: Callbacks) => { widget.options = options; if (auto) pass(); return 'w1'; }),
          reset: vi.fn(() => { if (auto) pass(); }),
          remove: vi.fn(),
        };
        window.turnstile = api as unknown as NonNullable<Window['turnstile']>;
        return { api, widget, pass };
      };
      const withKey = () => { vi.stubEnv('VITE_TURNSTILE_SITE_KEY', 'site-key'); };

      it('starts the check on the first touch of the form, not before', async () => {
        withKey();
        const { api, widget } = fakeTurnstile();
        const { container } = render(<Journey skipIntro />);
        expect(api.render).not.toHaveBeenCalled();
        fireEvent.focusIn(screen.getByLabelText('Your name'));
        fireEvent.focusIn(screen.getByLabelText('Email'));
        await waitFor(() => { expect(api.render).toHaveBeenCalledTimes(1); });
        expect(api.render.mock.calls[0][0]).toBe(container.querySelector('.j-form-human'));
        expect(widget.options?.sitekey).toBe('site-key');
        expect(widget.options?.appearance).toBe('interaction-only');
      });

      it('sends the token with the message, and gets a new one for the next message', async () => {
        withKey();
        const fetchSpy = ok();
        const { api } = fakeTurnstile();
        render(<Journey skipIntro />);
        fireEvent.focusIn(screen.getByLabelText('Your name'));
        fill();
        transmit();
        await waitFor(() => { expect(status()).toContain('message queued'); });
        expect(posted(fetchSpy)).toEqual({ name: 'Ada', email: 'ada@example.com', message: 'A mobile app', token: 'tok-1' });
        expect(api.reset).toHaveBeenCalledWith('w1');
        fill('And a website');
        transmit();
        await waitFor(() => { expect(contactCalls(fetchSpy)).toHaveLength(2); });
        expect(posted(fetchSpy, 1).token).toBe('tok-2');
      });

      it('waits for a check that needs the visitor, and says what to do', async () => {
        withKey();
        const fetchSpy = ok();
        const { widget, pass } = fakeTurnstile(false);
        render(<Journey skipIntro />);
        fill();
        transmit(); // (never focused: sending starts the check too)
        await waitFor(() => { expect(widget.options).toBeTruthy(); });
        expect(status()).toContain('checking');
        widget.options?.['before-interactive-callback']();
        await waitFor(() => { expect(status()).toContain('tick the box above'); });
        expect(contactCalls(fetchSpy)).toHaveLength(0);
        widget.options?.['after-interactive-callback']();
        pass();
        await waitFor(() => { expect(status()).toContain('message queued'); });
        expect(posted(fetchSpy).token).toBe('tok-1');
      });

      it('sends nothing when the check cannot run, and points to the email and phone instead', async () => {
        withKey();
        const fetchSpy = ok();
        render(<Journey skipIntro />);
        expect(cloudflareScript()).toBeNull();
        fireEvent.focusIn(screen.getByLabelText('Your name'));
        expect(cloudflareScript()?.src).toBe('https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit');
        cloudflareScript()?.dispatchEvent(new Event('error')); // a content blocker
        fill();
        transmit();
        await waitFor(() => { expect(status()).toContain('couldn\'t run the bot check'); });
        expect(contactCalls(fetchSpy)).toHaveLength(0);
        expect(screen.getByLabelText('Your idea')).toHaveProperty('value', 'A mobile app');
      });
    });
  });
});
