import type { Request, Response, NextFunction, RequestHandler } from 'express'

// Express 4 ບໍ່ຈັບ error ຈາກ async handler ເອງ — ຫຸ້ມໃຫ້ສົ່ງໄປ error middleware
export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    fn(req, res, next).catch(next)
  }
