export class ApiError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'ApiError';
  }
}

export function handleResponse<T>(data: any, error: any): T {
  if (error) throw new ApiError(error.message, error.code);
  return data as T;
}
