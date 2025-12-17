import { describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { Route, Routes } from 'react-router-dom';
import { renderWithProviders } from '../test/render';
import { server } from '../test/msw/server';
import EventPage from './EventPage';
import type { EventData } from './types';

describe('EventPage', () => {
  it('fetches event and renders header', async () => {
    server.use(
      http.get('/api/events/by-key/:key', ({ params }: { params: { key: string } }) => {
        const key = String(params.key);
        return HttpResponse.json({
          id: 'event-1',
          title: `Event ${key}`,
          description: 'Desc',
          event_key: key,
          due_date: '2030-01-01T12:00:00',
          allow_guess_edits: true,
        } satisfies EventData);
      }),
      http.get('/api/events/event-1/guesses', () => {
        return HttpResponse.json([]);
      }),
    );

    renderWithProviders(<EventPage />, { route: '/event?key=abc123' });

    await waitFor(() => {
      expect(screen.getByText('Event abc123')).toBeInTheDocument();
    });
  });

  it('navigates to home when event is missing', async () => {
    server.use(
      http.get('/api/events/by-key/:key', () => {
        return new HttpResponse(null, { status: 404 });
      }),
    );

    renderWithProviders(
      <Routes>
        <Route path="/" element={<div>HOME</div>} />
        <Route path="/event" element={<EventPage />} />
      </Routes>,
      { route: '/event?key=missing' },
    );

    await waitFor(() => {
      expect(screen.getByText('HOME')).toBeInTheDocument();
    });
  });
});
