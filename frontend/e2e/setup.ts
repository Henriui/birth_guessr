import { test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('cookie_consent', 'true');

    class FakeEventSource {
      url: string;
      withCredentials = false;
      readyState = 1;
      onopen: ((event: Event) => void) | null = null;
      onmessage: ((event: MessageEvent) => void) | null = null;
      onerror: ((event: Event) => void) | null = null;

      constructor(url: string) {
        this.url = url;
      }

      close() {
        this.readyState = 2;
      }

      addEventListener() {}

      removeEventListener() {}

      dispatchEvent() {
        return false;
      }
    }

    const w = window as unknown as {
      EventSource: typeof EventSource;
      alert: (message?: unknown) => void;
      confirm: (message?: string) => boolean;
    };

    w.EventSource = FakeEventSource as unknown as typeof EventSource;
    w.alert = () => {};
    w.confirm = () => true;
  });
});
