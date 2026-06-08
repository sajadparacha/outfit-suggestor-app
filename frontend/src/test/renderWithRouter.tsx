import React from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { MemoryRouter, MemoryRouterProps } from 'react-router-dom';
import App from '../App';

type RenderAppOptions = RenderOptions & {
  routerProps?: MemoryRouterProps;
};

export function renderApp(options?: RenderAppOptions) {
  const { routerProps, ...renderOptions } = options ?? {};
  return render(
    <MemoryRouter initialEntries={['/']} {...routerProps}>
      <App />
    </MemoryRouter>,
    renderOptions
  );
}
