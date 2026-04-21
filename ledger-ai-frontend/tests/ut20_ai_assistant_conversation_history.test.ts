import { describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  requestUse: vi.fn(),
  get: vi.fn().mockResolvedValue({ data: { csrfToken: 'test-token' } }),
  post: vi.fn(),
  put: vi.fn(),
  del: vi.fn(),
  create: vi.fn(() => ({
    get: (...args: unknown[]) => mocks.get(...args),
    post: (...args: unknown[]) => mocks.post(...args),
    put: (...args: unknown[]) => mocks.put(...args),
    delete: (...args: unknown[]) => mocks.del(...args),
    interceptors: { request: { use: mocks.requestUse } },
  })),
}));

vi.mock('axios', () => ({
  default: { create: mocks.create },
}));

describe('api service csrf interceptor', () => {
  it('attaches the csrf token from cookies for unsafe requests', async () => {
    await import('../services/api');

    document.cookie = 'csrftoken=test-cookie-token';
    const interceptor = mocks.requestUse.mock.calls[0]?.[0];

    const headers = {
      set: vi.fn(),
      delete: vi.fn(),
    };

    await interceptor({ method: 'post', headers, data: { hello: 'world' } });

    expect(headers.set).toHaveBeenCalledWith('X-CSRFToken', 'test-cookie-token');
  });
});
