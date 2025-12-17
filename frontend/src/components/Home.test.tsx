import { describe, expect, it, vi, beforeEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { Route, Routes } from 'react-router-dom';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { server } from '../test/msw/server';
import { renderWithProviders } from '../test/render';
import Home from './Home';

describe('Home', () => {
  beforeEach(() => {
    vi.stubGlobal('navigator', {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });

    vi.stubGlobal('alert', vi.fn());
    localStorage.clear();
  });

  it('joins event by key', async () => {
    const user = userEvent.setup();

    renderWithProviders(
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/event" element={<div>EVENT</div>} />
      </Routes>,
      { route: '/' },
    );

    await user.type(screen.getByPlaceholderText('XXXXXX-XXXXXX-XXXXXX'), 'abc123');
    await user.click(screen.getByRole('button', { name: 'Join' }));

    expect(await screen.findByText('EVENT')).toBeInTheDocument();
  });

  it('creates event and navigates to event page on dialog close', async () => {
    const user = userEvent.setup();

    type CreateEventBody = {
      title: string;
      description: string | null;
      due_date: string | null;
      guess_close_date: string | null;
      turnstile_token: string;
      min_weight_kg: number | null;
      max_weight_kg: number | null;
      allow_guess_edits: boolean;
    };

    server.use(
      http.post('/api/events', async ({ request }) => {
        const body = (await request.json()) as CreateEventBody;
        return HttpResponse.json({
          id: 'event-1',
          event_key: 'abc123',
          secret_key: 'secret-xyz',
          title: body.title,
          description: body.description,
          due_date: body.due_date,
          guess_close_date: body.guess_close_date,
          min_weight_kg: body.min_weight_kg,
          max_weight_kg: body.max_weight_kg,
          allow_guess_edits: body.allow_guess_edits,
        });
      }),
    );

    renderWithProviders(
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/event" element={<div>EVENT</div>} />
      </Routes>,
      { route: '/' },
    );

    await user.type(screen.getByLabelText('Event Title'), 'Baby Smith');
    await user.type(screen.getByLabelText('Expected Due Date'), '2030-01-01');

    const createBtn = screen.getByRole('button', { name: 'Create Event' });

    await waitFor(() => {
      expect(createBtn).toBeEnabled();
    });

    await user.click(createBtn);

    expect(await screen.findByText('Event Created! 🔑')).toBeInTheDocument();
    expect(screen.getByText('secret-xyz')).toBeInTheDocument();

    expect(localStorage.getItem('event_admin_key_event-1')).toBe('secret-xyz');

    await user.click(screen.getByRole('button', { name: 'Got it!' }));

    expect(await screen.findByText('EVENT')).toBeInTheDocument();
  });
});
