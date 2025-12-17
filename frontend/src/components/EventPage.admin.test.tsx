import { describe, expect, it, vi, beforeEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { Route, Routes } from 'react-router-dom';
import { screen, waitFor } from '@testing-library/react';
import { within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { server } from '../test/msw/server';
import { renderWithProviders } from '../test/render';
import EventPage from './EventPage';
import type { EventData } from './types';

describe('EventPage admin flows', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal('alert', vi.fn());
    vi.stubGlobal('confirm', vi.fn().mockReturnValue(true));
  });

  it('claims admin and enables admin controls', async () => {
    const user = userEvent.setup();

    const baseEvent: EventData = {
      id: 'event-1',
      title: 'Event abc123',
      description: 'Desc',
      event_key: 'abc123',
      due_date: '2030-01-01T12:00:00',
      allow_guess_edits: false,
      min_weight_kg: 2.0,
      max_weight_kg: 4.0,
    };

    server.use(
      http.get('/api/events/by-key/:key', () => HttpResponse.json(baseEvent)),
      http.get('/api/events/event-1/guesses', () => HttpResponse.json([])),
      http.post('/api/events/event-1/claim', ({ request }) => {
        const auth = request.headers.get('authorization');
        if (auth !== 'Bearer secret-xyz') return new HttpResponse(null, { status: 403 });
        return HttpResponse.json(baseEvent);
      }),
    );

    renderWithProviders(
      <Routes>
        <Route path="/" element={<div>HOME</div>} />
        <Route path="/event" element={<EventPage />} />
      </Routes>,
      { route: '/event?key=abc123' },
    );

    expect(await screen.findByText('Event abc123')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Claim Admin' }));
    expect(await screen.findByText('Claim Event Admin')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Secret Key'), 'secret-xyz');
    await user.click(screen.getByRole('button', { name: 'Claim' }));

    await waitFor(() => {
      expect(localStorage.getItem('event_admin_key_event-1')).toBe('secret-xyz');
    });

    expect(await screen.findByRole('button', { name: 'Delete Event' })).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'Set Birth Answer' })).toBeInTheDocument();
    expect(screen.getByText('Allow guess edits')).toBeInTheDocument();
  });

  it('edits description after claim', async () => {
    const user = userEvent.setup();

    const baseEvent: EventData = {
      id: 'event-1',
      title: 'Event abc123',
      description: 'Old',
      event_key: 'abc123',
      due_date: '2030-01-01T12:00:00',
      allow_guess_edits: true,
      min_weight_kg: 2.0,
      max_weight_kg: 4.0,
    };

    localStorage.setItem('event_admin_key_event-1', 'secret-xyz');

    server.use(
      http.get('/api/events/by-key/:key', () => HttpResponse.json(baseEvent)),
      http.get('/api/events/event-1/guesses', () => HttpResponse.json([])),
      http.put('/api/events/event-1/description', async ({ request }) => {
        const auth = request.headers.get('authorization');
        if (auth !== 'Bearer secret-xyz') return new HttpResponse(null, { status: 403 });
        const body = (await request.json()) as { description: string | null };
        return HttpResponse.json({ ...baseEvent, description: body.description });
      }),
    );

    renderWithProviders(<EventPage />, { route: '/event?key=abc123' });

    expect(await screen.findByText('Event abc123')).toBeInTheDocument();

    await user.click(screen.getByLabelText('Edit description'));
    expect(await screen.findByText('Edit Description')).toBeInTheDocument();

    const field = screen.getByLabelText('Description');
    await user.clear(field);
    await user.type(field, 'New description');

    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('New description')).toBeInTheDocument();
  });

  it('sets answer and shows ended section', async () => {
    const user = userEvent.setup();

    const baseEvent: EventData = {
      id: 'event-1',
      title: 'Event abc123',
      description: 'Desc',
      event_key: 'abc123',
      due_date: '2030-01-01T12:00:00',
      allow_guess_edits: true,
      min_weight_kg: 2.0,
      max_weight_kg: 4.0,
    };

    localStorage.setItem('event_admin_key_event-1', 'secret-xyz');

    server.use(
      http.get('/api/events/by-key/:key', () => HttpResponse.json(baseEvent)),
      http.get('/api/events/event-1/guesses', () => HttpResponse.json([])),
      http.post('/api/events/event-1/answer', async ({ request }) => {
        const auth = request.headers.get('authorization');
        if (auth !== 'Bearer secret-xyz') return new HttpResponse(null, { status: 403 });
        const body = (await request.json()) as { birth_date: string; birth_weight_kg: number };
        return HttpResponse.json({
          event_id: 'event-1',
          birth_date: body.birth_date,
          birth_weight_kg: body.birth_weight_kg,
          ended_at: '2030-01-02T12:00:00',
          closest_date_top: [],
          closest_weight_top: [],
        });
      }),
    );

    renderWithProviders(<EventPage />, { route: '/event?key=abc123' });

    expect(await screen.findByText('Event abc123')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Set Birth Answer' }));
    expect(await screen.findByText('Complete Game')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Birth Date'), '2030-01-02');
    await user.type(screen.getByLabelText('Birth Weight (kg)'), '3.25');

    await user.click(screen.getByRole('button', { name: 'End Game' }));

    expect(await screen.findByText('Baby is here! 🎉')).toBeInTheDocument();
  });

  it('deletes event after claim and navigates home', async () => {
    const user = userEvent.setup();

    const baseEvent: EventData = {
      id: 'event-1',
      title: 'Event abc123',
      description: 'Desc',
      event_key: 'abc123',
      due_date: '2030-01-01T12:00:00',
      allow_guess_edits: true,
      min_weight_kg: 2.0,
      max_weight_kg: 4.0,
    };

    localStorage.setItem('event_admin_key_event-1', 'secret-xyz');

    server.use(
      http.get('/api/events/by-key/:key', () => HttpResponse.json(baseEvent)),
      http.get('/api/events/event-1/guesses', () => HttpResponse.json([])),
      http.delete('/api/events/event-1', ({ request }) => {
        const auth = request.headers.get('authorization');
        if (auth !== 'Bearer secret-xyz') return new HttpResponse(null, { status: 403 });
        return new HttpResponse(null, { status: 204 });
      }),
    );

    renderWithProviders(
      <Routes>
        <Route path="/" element={<div>HOME</div>} />
        <Route path="/event" element={<EventPage />} />
      </Routes>,
      { route: '/event?key=abc123' },
    );

    expect(await screen.findByText('Event abc123')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Delete Event' }));

    expect(await screen.findByText('Delete Event?')).toBeInTheDocument();
    const dialog = screen.getByRole('dialog');
    const secretField = within(dialog).getByLabelText('Secret Key');
    await user.clear(secretField);
    await user.type(secretField, 'secret-xyz');
    await user.click(within(dialog).getByRole('button', { name: 'Delete Event' }));

    expect(await screen.findByText('HOME')).toBeInTheDocument();
  });
});
