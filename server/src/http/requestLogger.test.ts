import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';
import { createTestApp } from '../testing/testApp.ts';

let info: MockInstance;
beforeEach(() => {
  info = vi.spyOn(console, 'info').mockImplementation(() => {});
});
afterEach(() => {
  vi.restoreAllMocks();
});

const lines = () => info.mock.calls.map((call) => String(call[0]));

describe('request logging', () => {
  it('logs method, URL, status and duration', async () => {
    await request(createTestApp({ logRequests: true })).get('/api/search?q=jacket');

    expect(lines()).toContainEqual(expect.stringMatching(/^GET \/api\/search\?q=jacket -> 200 \(\d+ ms\)$/));
  });

  it('adds the error code for failed requests', async () => {
    await request(createTestApp({ logRequests: true })).get('/api/products/999');

    expect(lines()).toContainEqual(expect.stringMatching(/^GET \/api\/products\/999 -> 404 NOT_FOUND \(\d+ ms\)$/));
  });

  it('never logs the request body, so contact details stay out (E7)', async () => {
    await request(createTestApp({ logRequests: true }))
      .post('/api/enquiries')
      .send({ productId: '1', name: 'Ada Lovelace', email: 'ada@example.com' });

    const logged = lines().join('\n');
    expect(logged).toContain('POST /api/enquiries -> 201');
    expect(logged).not.toContain('Ada Lovelace');
    expect(logged).not.toContain('ada@example.com');
  });

  it('is off unless asked for', async () => {
    await request(createTestApp()).get('/api/health');

    expect(lines().filter((line) => line.startsWith('GET'))).toEqual([]);
  });
});
