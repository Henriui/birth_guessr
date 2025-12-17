import { test, expect } from '@playwright/test';
import './setup';
import { mockHandler, mockJson } from './helpers';

test('claim admin enables admin controls', async ({ page }) => {
  await mockJson(page, '**/api/events/by-key/abc123', {
    id: 'event-1',
    title: 'Event abc123',
    description: 'Desc',
    event_key: 'abc123',
    due_date: '2030-01-01T12:00:00',
    allow_guess_edits: false,
    min_weight_kg: 2.0,
    max_weight_kg: 4.0,
  });

  await mockJson(page, '**/api/events/event-1/guesses', []);

  await mockHandler(page, '**/api/events/event-1/claim', async (route) => {
    const auth = route.request().headers()['authorization'];
    if (auth !== 'Bearer secret-xyz') {
      await route.fulfill({ status: 403 });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'event-1',
        title: 'Event abc123',
        description: 'Desc',
        event_key: 'abc123',
        due_date: '2030-01-01T12:00:00',
        allow_guess_edits: false,
        min_weight_kg: 2.0,
        max_weight_kg: 4.0,
      }),
    });
  });

  await page.goto('/event?key=abc123');

  await page.getByRole('button', { name: 'Claim Admin' }).click();
  await expect(page.getByText('Claim Event Admin')).toBeVisible();

  await page.getByLabel('Secret Key').fill('secret-xyz');
  await page.getByRole('button', { name: 'Claim' }).click();

  await expect(page.getByRole('button', { name: 'Delete Event' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Set Birth Answer' })).toBeVisible();
});


test('delete event navigates home', async ({ page }) => {
  await page.addInitScript(() => {
    window.alert = () => {};
  });

  await mockJson(page, '**/api/events/by-key/abc123', {
    id: 'event-1',
    title: 'Event abc123',
    description: 'Desc',
    event_key: 'abc123',
    due_date: '2030-01-01T12:00:00',
    allow_guess_edits: true,
    min_weight_kg: 2.0,
    max_weight_kg: 4.0,
  });

  await mockJson(page, '**/api/events/event-1/guesses', []);

  await page.addInitScript(() => {
    localStorage.setItem('event_admin_key_event-1', 'secret-xyz');
  });

  await mockHandler(page, '**/api/events/event-1', async (route) => {
    if (route.request().method() !== 'DELETE') return route.fallback();
    const auth = route.request().headers()['authorization'];
    if (auth !== 'Bearer secret-xyz') {
      await route.fulfill({ status: 403 });
      return;
    }
    await route.fulfill({ status: 204 });
  });

  await page.goto('/event?key=abc123');

  await page.getByRole('button', { name: 'Delete Event' }).click();
  await expect(page.getByText('Delete Event?')).toBeVisible();

  await page.getByLabel('Secret Key').fill('secret-xyz');
  await page.getByRole('dialog').getByRole('button', { name: 'Delete Event' }).click();

  await expect(page).toHaveURL('/');
});
