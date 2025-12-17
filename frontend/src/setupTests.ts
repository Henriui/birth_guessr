import '@testing-library/jest-dom/vitest';
import { afterAll, afterEach, beforeAll, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import { server } from './test/msw/server';
import './i18n';
import i18n from './i18n';
import React, { useEffect } from 'react';
import dayjs, { type Dayjs } from 'dayjs';

beforeAll(() => {
  localStorage.setItem('i18nextLng', 'en');
  i18n.changeLanguage('en');

  server.listen({ onUnhandledRequest: 'error' });

  class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }

  vi.stubGlobal('ResizeObserver', ResizeObserver as unknown as typeof window.ResizeObserver);

  const originalWarn = console.warn;
  vi.spyOn(console, 'warn').mockImplementation((...args: unknown[]) => {
    const msg = args.map(String).join(' ');
    if (msg.includes('React Router Future Flag Warning')) return;
    if (msg.includes('The width(0) and height(0) of chart should be greater than 0')) return;
    originalWarn(...args);
  });

  class MockEventSource {
    url: string;
    onmessage: ((ev: MessageEvent) => void) | null = null;
    onerror: ((ev: Event) => void) | null = null;

    constructor(url: string) {
      this.url = url;
    }

    close() {}
  }

  vi.stubGlobal('EventSource', MockEventSource as unknown as typeof EventSource);
});

vi.mock('@marsidev/react-turnstile', () => {
  return {
    Turnstile: ({ onSuccess }: { onSuccess: (token: string) => void }) => {
      useEffect(() => {
        onSuccess('test-turnstile-token');
      }, [onSuccess]);
      return React.createElement('div', { 'data-testid': 'turnstile' });
    },
  };
});

vi.mock('@mui/x-date-pickers', async () => {
  const actual = await vi.importActual<typeof import('@mui/x-date-pickers')>('@mui/x-date-pickers');
  return {
    ...actual,
    DatePicker: ({
      label,
      value,
      onChange,
    }: {
      label: string;
      value: Dayjs | null;
      onChange: (v: Dayjs | null) => void;
    }) => {
      const currentValue = value ? dayjs(value) : null;
      const [textValue, setTextValue] = React.useState(
        currentValue && currentValue.isValid() ? currentValue.format('YYYY-MM-DD') : '',
      );

      React.useEffect(() => {
        const nextText = currentValue && currentValue.isValid() ? currentValue.format('YYYY-MM-DD') : '';
        setTextValue(nextText);
      }, [currentValue]);

      return React.createElement('input', {
        'aria-label': label,
        value: textValue,
        onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
          const nextText = e.target.value;
          setTextValue(nextText);
          if (nextText === '') {
            onChange(null);
            return;
          }
          if (/^\d{4}-\d{2}-\d{2}$/.test(nextText)) {
            const nextDate = dayjs(nextText);
            onChange(nextDate.isValid() ? nextDate : null);
          }
        },
      });
    },
  };
});

afterEach(() => {
  server.resetHandlers();
  cleanup();
});

afterAll(() => {
  server.close();
});
