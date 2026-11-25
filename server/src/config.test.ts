import { describe, expect, it } from 'vitest';
import { loadConfig } from './config.ts';

const validEnv = {
  SMTP_HOST: 'localhost',
  SMTP_PORT: '1025',
  EMAIL_FROM: 'no-reply@example.com',
  SALES_INBOX_EMAIL: 'sales@example.com',
};

describe('loadConfig', () => {
  it('parses a valid environment and applies defaults', () => {
    expect(loadConfig(validEnv)).toEqual({
      PORT: 3000,
      FAKE_STORE_BASE_URL: 'https://fakestoreapi.com',
      SMTP_HOST: 'localhost',
      SMTP_PORT: 1025,
      EMAIL_FROM: 'no-reply@example.com',
      SALES_INBOX_EMAIL: 'sales@example.com',
    });
  });

  it('names missing variables', () => {
    expect(() => loadConfig({})).toThrow(/SMTP_HOST.*SMTP_PORT.*EMAIL_FROM.*SALES_INBOX_EMAIL/);
  });

  it('names an invalid variable without echoing its value', () => {
    let message = '';
    try {
      loadConfig({ ...validEnv, SALES_INBOX_EMAIL: 'not-an-email-secret' });
    } catch (err) {
      message = err instanceof Error ? err.message : '';
    }

    expect(message).toContain('SALES_INBOX_EMAIL');
    expect(message).not.toContain('not-an-email-secret');
  });

  it('rejects a non-numeric port', () => {
    expect(() => loadConfig({ ...validEnv, PORT: 'abc' })).toThrow(/PORT/);
  });
});
