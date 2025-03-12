export class ResponseError<T = any> extends Error {
  code: number;
  payload?: T;

  constructor({ message, code, payload }: { message: string; code?: number; payload?: T }) {
    super(message);
    this.code = code || 400;
    this.payload = payload;
  }
}
