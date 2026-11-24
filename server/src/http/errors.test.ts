import express from 'express';
import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { errorHandler, HttpError } from './errors.ts';

function appThatThrows(err: unknown) {
  const app = express();
  // Express 5 forwards rejected promises from async handlers to the error handler.
  app.get('/boom', async () => {
    throw err;
  });
  app.use(errorHandler);
  return app;
}

describe('errorHandler', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns an HttpError status, code and message', async () => {
    const res = await request(appThatThrows(new HttpError(422, 'UNKNOWN_PRODUCT', 'No such product'))).get('/boom');

    expect(res.status).toBe(422);
    expect(res.body).toEqual({ error: { code: 'UNKNOWN_PRODUCT', message: 'No such product' } });
  });

  it('hides unexpected errors behind a generic 500 and logs them', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});

    const res = await request(appThatThrows(new Error('db password is hunter2'))).get('/boom');

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: { code: 'INTERNAL', message: 'Something went wrong' } });
    expect(res.text).not.toContain('hunter2');
    expect(log).toHaveBeenCalledOnce();
  });
});
