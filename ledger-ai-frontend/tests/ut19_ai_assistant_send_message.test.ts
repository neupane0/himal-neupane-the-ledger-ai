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

describe('api service auth endpoints', () => {
  it('wires auth endpoints to the expected paths', async () => {
    const { auth } = await import('../services/api');

    await auth.login({ username: 'alice', password: 'secret' });
    await auth.register({ username: 'alice', email: 'alice@example.com', password: 'secret' });
    await auth.verify2fa('123456');

    expect(mocks.get).toHaveBeenCalledWith('/auth/csrf/');
    expect(mocks.post).toHaveBeenCalledWith('/auth/login/', { username: 'alice', password: 'secret' });
    expect(mocks.post).toHaveBeenCalledWith('/auth/register/', {
      username: 'alice',
      email: 'alice@example.com',
      password: 'secret',
    });
    expect(mocks.post).toHaveBeenCalledWith('/auth/verify-2fa/', { code: '123456' });
  });
});
