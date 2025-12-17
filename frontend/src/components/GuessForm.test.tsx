import { describe, expect, it, beforeEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { server } from '../test/msw/server';
import { renderWithProviders } from '../test/render';
import { GuessForm } from './GuessForm';
import type { EventData } from './types';

describe('GuessForm', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('shows validation error when weight is outside range', async () => {
    const user = userEvent.setup();

    const event: EventData = {
      id: 'event-1',
      title: 'Event',
      event_key: 'key',
      due_date: '2030-01-01T12:00:00',
      min_weight_kg: 2.0,
      max_weight_kg: 4.0,
    };

    renderWithProviders(<GuessForm event={event} />);

    await user.type(screen.getByLabelText('Your Name'), 'Alice');
    await user.type(screen.getByLabelText('Birthdate guess'), '2030-01-02');
    await user.type(screen.getByLabelText('Weight (kg)'), '10');
    await user.click(screen.getByRole('button', { name: 'Submit Guess' }));

    expect(await screen.findByText('Weight is outside the allowed range for this event.')).toBeInTheDocument();
  });

  it('submits guess and stores guess token', async () => {
    const user = userEvent.setup();

    const event: EventData = {
      id: 'event-1',
      title: 'Event',
      event_key: 'key',
      due_date: '2030-01-01T12:00:00',
      min_weight_kg: 2.0,
      max_weight_kg: 4.0,
    };

    server.use(
      http.post('/api/events/event-1/guesses', async () => {
        return HttpResponse.json([
          { id: 'invitee-1', event_id: 'event-1', display_name: 'Alice', color_hex: '#ff00aa' },
          { id: 'guess-1', invitee_id: 'invitee-1', guessed_date: '2030-01-02T12:00:00', guessed_weight_kg: 3.2 },
        ]);
      }),
    );

    renderWithProviders(<GuessForm event={event} />);

    await user.type(screen.getByLabelText('Your Name'), 'Alice');
    await user.type(screen.getByLabelText('Birthdate guess'), '2030-01-02');
    await user.type(screen.getByLabelText('Weight (kg)'), '3.2');

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Submit Guess' })).toBeEnabled();
    });

    await user.click(screen.getByRole('button', { name: 'Submit Guess' }));

    await waitFor(() => {
      expect(localStorage.getItem('guess_token_event-1')).toBe('invitee-1');
    });

    expect(await screen.findByText('You have already guessed! 🎉')).toBeInTheDocument();
  });
});
