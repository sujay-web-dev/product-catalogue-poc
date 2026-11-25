import type { RequestHandler } from 'express';

const MAX_URL_LENGTH = 200;

/**
 * One line per request: method, URL, status, duration and, on failure, the error
 * code. Bodies are never logged, so enquiry contact details stay out of logs (E7).
 */
export const requestLogger: RequestHandler = (req, res, next) => {
  const started = performance.now();
  res.on('finish', () => {
    const ms = Math.round(performance.now() - started);
    const url =
      req.originalUrl.length > MAX_URL_LENGTH ? `${req.originalUrl.slice(0, MAX_URL_LENGTH)}…` : req.originalUrl;
    const errorCode: unknown = res.locals.errorCode;
    const error = typeof errorCode === 'string' ? ` ${errorCode}` : '';
    console.info(`${req.method} ${url} -> ${res.statusCode}${error} (${ms} ms)`);
  });
  next();
};
