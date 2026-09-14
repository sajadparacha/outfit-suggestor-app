import { reportClientError, setClientErrorReporter, __resetClientErrorDedupeForTests } from './reportClientError';

describe('reportClientError', () => {
  const mockReport = jest.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    __resetClientErrorDedupeForTests();
    mockReport.mockClear();
    setClientErrorReporter(mockReport);
  });

  it('reports once per fingerprint then dedupes', async () => {
    await reportClientError({
      error_code: 'client_render_error',
      message: 'boom',
      route: '/wardrobe',
    });
    await reportClientError({
      error_code: 'client_render_error',
      message: 'boom',
      route: '/wardrobe',
    });
    expect(mockReport).toHaveBeenCalledTimes(1);
    expect(mockReport).toHaveBeenCalledWith(
      expect.objectContaining({
        error_code: 'client_render_error',
        message: 'boom',
        platform: 'web',
      })
    );
  });

  it('swallows reporter failures', async () => {
    mockReport.mockRejectedValueOnce(new Error('offline'));
    await expect(
      reportClientError({ error_code: 'network_error', message: 'Failed to fetch' })
    ).resolves.toBeUndefined();
  });
});
