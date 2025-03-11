import { NextFunction, Request, Response } from 'express';
import process from 'node:process';

export function log(...args: any[]) {
  if (process.env.NODE_ENV !== 'production') {
    console.log(...args);
  }
}

export function logJson(obj: any) {
  log(JSON.stringify(obj, null, 2));
}

export const logger = (req: Request, res: Response, next: NextFunction): void => {
  log(`${req.method} ${req.url}`);
  next();
};

export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction): void => {
  res.status(500).send({ message: err.message });
};
