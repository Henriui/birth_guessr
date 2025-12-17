import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { render, type RenderOptions } from '@testing-library/react';
import { ThemeLanguageProvider } from '../context/ThemeLanguageProvider';

export function renderWithProviders(
  ui: React.ReactElement,
  {
    route = '/',
    ...options
  }: RenderOptions & {
    route?: string;
  } = {},
) {
  window.history.pushState({}, 'Test', route);

  return render(
    <ThemeLanguageProvider>
      <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
    </ThemeLanguageProvider>,
    options,
  );
}
