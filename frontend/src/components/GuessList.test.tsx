import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../test/render';
import { GuessList } from './GuessList';
import type { Guess } from './types';

describe('GuessList', () => {
  it('shows edit button only for own guess when edits are allowed', async () => {
    const user = userEvent.setup();

    const guesses: Guess[] = [
      {
        invitee_id: 'a',
        display_name: 'Alice',
        color_hex: '#ff00aa',
        guessed_date: '2030-01-01T12:00:00',
        guessed_weight_kg: 3.2,
      },
      {
        invitee_id: 'b',
        display_name: 'Bob',
        color_hex: '#00ffaa',
        guessed_date: '2030-01-02T12:00:00',
        guessed_weight_kg: 3.3,
      },
    ];

    const onEditGuess = vi.fn();

    renderWithProviders(
      <GuessList
        guesses={guesses}
        myInviteeId="b"
        allowGuessEdits
        onEditGuess={onEditGuess}
      />,
    );

    expect(screen.queryAllByLabelText('Edit')).toHaveLength(1);

    await user.click(screen.getByLabelText('Edit'));
    expect(onEditGuess).toHaveBeenCalledTimes(1);
    expect(onEditGuess).toHaveBeenCalledWith(guesses[1]);
  });

  it('shows delete button for admin and calls handler', async () => {
    const user = userEvent.setup();

    const guesses: Guess[] = [
      {
        invitee_id: 'a',
        display_name: 'Alice',
        color_hex: '#ff00aa',
        guessed_date: '2030-01-01T12:00:00',
        guessed_weight_kg: 3.2,
      },
    ];

    const onDeleteGuess = vi.fn();

    renderWithProviders(
      <GuessList guesses={guesses} isAdmin onDeleteGuess={onDeleteGuess} />,
    );

    await user.click(screen.getByLabelText('Delete'));
    expect(onDeleteGuess).toHaveBeenCalledTimes(1);
    expect(onDeleteGuess).toHaveBeenCalledWith(guesses[0]);
  });
});
