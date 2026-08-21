import React from 'react';
import { render, screen } from '@testing-library/react';
import OAuthButtons, { scaleGoogleIdentityIframeToCover } from './OAuthButtons';

function setBox(el: HTMLElement, width: number, height: number) {
  Object.defineProperty(el, 'clientWidth', { configurable: true, value: width });
  Object.defineProperty(el, 'clientHeight', { configurable: true, value: height });
  Object.defineProperty(el, 'offsetWidth', { configurable: true, value: width });
  Object.defineProperty(el, 'offsetHeight', { configurable: true, value: height });
}

describe('scaleGoogleIdentityIframeToCover', () => {
  it('scales the GIS iframe to cover the custom button so the full surface is clickable', () => {
    const container = document.createElement('div');
    const iframe = document.createElement('iframe');
    setBox(container, 400, 44);
    setBox(iframe, 400, 40);

    scaleGoogleIdentityIframeToCover(iframe, container);

    expect(iframe.style.transform).toBe('scale(1, 1.1)');
    expect(iframe.style.transformOrigin).toBe('0 0');
    expect(iframe.style.position).toBe('absolute');
  });

  it('does not apply a transform when layout size is missing', () => {
    const container = document.createElement('div');
    const iframe = document.createElement('iframe');
    setBox(container, 0, 44);
    setBox(iframe, 400, 40);

    scaleGoogleIdentityIframeToCover(iframe, container);

    expect(iframe.style.transform).toBe('');
  });
});

describe('OAuthButtons', () => {
  it('highlights Continue with Google like Sign in', () => {
    render(<OAuthButtons onOAuthLogin={jest.fn()} loading={false} />);

    expect(screen.getByRole('button', { name: /Continue with Google/i })).toHaveClass('btn-brand');
  });
});
