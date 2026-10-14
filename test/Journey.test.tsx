import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import Journey from '../src/journey/Journey';

// jsdom has no canvas backend; the engine skips drawing when there is no 2d context
HTMLCanvasElement.prototype.getContext = (() => null) as unknown as typeof HTMLCanvasElement.prototype.getContext;

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('Journey', () => {
  it('renders every chapter of the scroll journey', () => {
    render(<Journey skipIntro />);
    expect(screen.getByRole('region', { name: 'Services' })).toBeTruthy();
    expect(screen.getByRole('region', { name: 'Selected work' })).toBeTruthy();
    expect(screen.getByRole('region', { name: 'Contact' })).toBeTruthy();
    expect(screen.getByText('WEB APPLICATIONS')).toBeTruthy();
    expect(screen.getAllByText('ORBIT').length).toBeGreaterThan(0);
  });

  it('requires name and email before transmitting', () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    render(<Journey skipIntro />);
    fireEvent.click(screen.getByRole('button', { name: /transmit/i }));
    expect(screen.getByRole('status').textContent).toContain('name + email required');
    expect(fetchSpy).not.toHaveBeenCalled();
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
    const init = fetchSpy.mock.calls[0][1];
    const body = JSON.parse(init?.body as string) as Record<string, string>;
    expect(body).toEqual({ name: 'Ada', email: 'ada@example.com', message: 'A mobile app' });
  });
});
