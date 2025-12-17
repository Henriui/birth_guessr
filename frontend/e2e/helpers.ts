import type { Page, Route } from '@playwright/test';

type RouteMatcher = string | RegExp;

type RouteHandler = (route: Route) => Promise<void> | void;

export async function mockJson(page: Page, url: RouteMatcher, body: unknown, status = 200) {
  await page.route(url, async (route: Route) => {
    await route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify(body),
    });
  });
}

export async function mockStatus(page: Page, url: RouteMatcher, status: number) {
  await page.route(url, async (route: Route) => {
    await route.fulfill({ status });
  });
}

export async function mockHandler(page: Page, url: RouteMatcher, handler: RouteHandler) {
  await page.route(url, handler);
}
