import type { Response } from 'express';

export function sendSuccess<T>(res: Response, data: T, statusCode = 200, message?: string) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  return res.status(statusCode).json({
    success: true,
    data,
    ...(message && { message }),
  });
}

export function sendPaginated<T>(
  res: Response,
  items: T[],
  total: number,
  page: number,
  pageSize: number,
) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  return res.status(200).json({
    success: true,
    data: {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize) || 1,
    },
  });
}

export function sendError(res: Response, message: string, statusCode = 400) {
  return res.status(statusCode).json({
    success: false,
    error: message,
  });
}
