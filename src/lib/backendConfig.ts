const DEFAULT_FASTAPI_URL = "http://48.202.57.192:8000";

export const FASTAPI_BASE = (
  process.env.FASTAPI_URL ||
  process.env.FASTAPI_BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  DEFAULT_FASTAPI_URL
).replace(/\/+$/, "");
