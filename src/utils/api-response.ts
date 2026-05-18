import type { ApiErrorResponse, ApiSuccessResponse } from "../types/http";

export const successResponse = <T>(
  message: string,
  data: T,
): ApiSuccessResponse<T> => ({
  status: "success",
  message,
  data,
});

export const errorResponse = (
  message: string,
  details?: unknown,
): ApiErrorResponse => ({
  status: "error",
  message,
  details,
});
