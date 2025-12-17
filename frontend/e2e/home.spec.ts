import { test, expect } from '@playwright/test';
import './setup';
import { mockHandler, mockJson } from './helpers';

test('create event flow shows secret key dialog', async ({ page }) => {
  await mockHandler(page, '**/api/events', async (route) => {
    const req = route.request();
    const body = await req.postDataJSON();

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
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
      }),
    });
  });

  await page.goto('/');

  await page.getByLabel('Event Title').fill('Baby Smith');
  await page.getByLabel('Expected Due Date', { exact: true }).fill('01/01/2030');

  await page.getByRole('button', { name: 'Create Event' }).click();

  await expect(page.getByText('Event Created! 🔑')).toBeVisible();
  await expect(page.getByText('secret-xyz')).toBeVisible();
});

test('join event navigates to event page', async ({ page }) => {
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

  await mockHandler(page, '**/api/events/live?*', async (route) => {
    await route.fulfill({ status: 200, contentType: 'text/event-stream', body: '' });
  });

  await page.goto('/');

  await page.getByPlaceholder('XXXXXX-XXXXXX-XXXXXX').fill('abc123');
  await page.getByRole('button', { name: 'Join' }).click();

  await expect(page).toHaveURL(/\/event\?key=abc123/);
  await expect(page.getByText('Event abc123')).toBeVisible();
});
