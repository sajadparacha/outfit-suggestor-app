// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// MSW depends on TextEncoder/TextDecoder in the Jest (Node) environment.
// CRA/Jest doesn't always provide these globals.
// IMPORTANT: use `require` (not `import`) so globals are set BEFORE MSW loads.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { TextDecoder, TextEncoder } = require('util');
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(global as any).TextEncoder = TextEncoder;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(global as any).TextDecoder = TextDecoder;

// MSW (and its fetch interceptors) may require Web Streams globals in older Node/Jest runtimes.
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const webStreams = require('stream/web');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (global as any).ReadableStream = (global as any).ReadableStream || webStreams.ReadableStream;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (global as any).WritableStream = (global as any).WritableStream || webStreams.WritableStream;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (global as any).TransformStream = (global as any).TransformStream || webStreams.TransformStream;
} catch {
  // If not available, MSW may still work depending on the runtime.
}

// MSW (Mock Service Worker) for integration tests that exercise real hooks/components.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { server } = require('./test/msw/server');

beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
