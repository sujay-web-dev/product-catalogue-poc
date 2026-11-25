import type { ErrorRequestHandler, RequestHandler } from 'express';
import { EmailDeliveryError, ProductSourceError } from '../domain/errors.ts';

export type ErrorBody = { error: { code: string; message: string } };

/** An error that is safe to show to the client as-is. */
export class HttpError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.code = code;
  }
}

export const notFoundHandler: RequestHandler = (_req, _res, next) => {
  next(new HttpError(404, 'NOT_FOUND', 'Route not found'));
};

/** Errors raised by express.json(): malformed JSON or a body over the size limit. */
function bodyParserStatus(err: unknown): number | undefined {
  if (typeof err !== 'object' || err === null || !('type' in err) || !('status' in err)) {
    return undefined;
  }
  const { type, status } = err;
  return typeof type === 'string' && type.startsWith('entity.') && typeof status === 'number'
    ? status
    : undefined;
}

/** One JSON error shape for every failure. No stack traces or upstream details leave the server. */
export const errorHandler: ErrorRequestHandler = (err: unknown, _req, res, _next) => {
  let status = 500;
  let body: ErrorBody = { error: { code: 'INTERNAL', message: 'Something went wrong' } };

  const parserStatus = bodyParserStatus(err);
  if (err instanceof HttpError) {
    status = err.status;
    body = { error: { code: err.code, message: err.message } };
  } else if (err instanceof ProductSourceError) {
    // G2: the client shows a friendly "try again" message; details stay in the log.
    console.warn(`Product source error: ${err.message}`);
    status = 503;
    body = {
      error: {
        code: 'PRODUCT_SOURCE_UNAVAILABLE',
        message: 'Products are temporarily unavailable. Please try again shortly.',
      },
    };
  } else if (err instanceof EmailDeliveryError) {
    // E5: already logged without contact details; the customer can retry.
    status = 502;
    body = {
      error: {
        code: 'EMAIL_SEND_FAILED',
        message: "We couldn't send your enquiry. Please try again.",
      },
    };
  } else if (parserStatus === 413) {
    status = 413;
    body = { error: { code: 'PAYLOAD_TOO_LARGE', message: 'Request body is too large' } };
  } else if (parserStatus !== undefined) {
    status = 400;
    body = { error: { code: 'BAD_REQUEST', message: 'Malformed request body' } };
  } else {
    // E7: log the error itself, never the request body.
    console.error(err);
  }

  res.locals.errorCode = body.error.code; // picked up by the request logger
  res.status(status).json(body);
};
