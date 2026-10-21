import { nanoid } from 'nanoid';
export const newId = (prefix='') => prefix ? prefix + '-' + nanoid(10) : nanoid(12);
export const ok = (res, data) => res.json({ ok: true, ...data });
export const err = (res, code, message) => res.status(code).json({ ok: false, error: message });
export const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req,res,next)).catch(next);
