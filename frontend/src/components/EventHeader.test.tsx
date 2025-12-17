import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderWithProviders } from '../test/render';
import { EventHeader } from './EventHeader';
import type { EventData } from './types';
import { fireEvent, screen } from '@testing-library/react';

describe('EventHeader', () => {
  beforeEach(() => {
    vi.stubGlobal('navigator', {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  it('copies share URL to clipboard when clicking invite key chip', () => {
    const event: EventData = {
      id: 'e1',
      title: 'My Event',
      description: 'Hello',
      event_key: 'abc123',
      allow_guess_edits: true,
    };

    renderWithProviders(<EventHeader event={event} />);

    fireEvent.click(screen.getByText('abc123'));

    expect(navigator.clipboard.writeText).toHaveBeenCalledTimes(1);
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      `${window.location.origin}/share/${encodeURIComponent('abc123')}`,
    );
  });
});
