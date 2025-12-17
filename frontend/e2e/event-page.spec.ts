import { test, expect } from '@playwright/test';
import './setup';
import { mockHandler, mockJson } from './helpers';

test('event page loads and allows guessing', async ({ page }) => {
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

  await mockHandler(page, '**/api/events/event-1/guesses', async (route) => {
    if (route.request().method() !== 'POST') return route.fallback();

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { id: 'invitee-1', event_id: 'event-1', display_name: 'Alice', color_hex: '#ff00aa' },
        { id: 'guess-1', invitee_id: 'invitee-1', guessed_date: '2030-01-02T12:00:00', guessed_weight_kg: 3.2 },
      ]),
    });
  });

  await page.goto('/event?key=abc123');

  await expect(page.getByText('Event abc123')).toBeVisible();

  await page.getByLabel('Your Name', { exact: true }).fill('Alice');
  await page.getByLabel('Date', { exact: true }).fill('02/01/2030');
  await page.getByLabel('Weight (kg)', { exact: true }).fill('3.2');

  await page.getByRole('button', { name: 'Submit Guess' }).click();

  await expect(page.getByText('You have already guessed! 🎉')).toBeVisible();
});

test('event 404 navigates home', async ({ page }) => {
  await mockHandler(page, '**/api/events/by-key/missing', async (route) => {
    await route.fulfill({ status: 404 });
  });

  await page.goto('/event?key=missing');

  await expect(page).toHaveURL('/');
});
