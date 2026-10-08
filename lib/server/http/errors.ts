/** Errors thrown by services; the route wrapper turns them into JSON responses with Persian messages. */
export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string, public fields?: Record<string, string>) {
    super(message);
  }
}
export const unauthorized = () => new ApiError(401, "unauthorized", "برای ادامه باید وارد شوی.");
export const forbidden = () => new ApiError(403, "forbidden", "به این بخش دسترسی نداری.");
export const notFound = (what = "مورد") => new ApiError(404, "not_found", `${what} پیدا نشد.`);
export const conflict = (msg: string) => new ApiError(409, "conflict", msg);
export const badRequest = (msg: string, fields?: Record<string, string>) => new ApiError(400, "bad_request", msg, fields);
