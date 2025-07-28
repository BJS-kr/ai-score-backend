type Success<T = any> = {
  success: true;
  data: T;
  message?: string;
};

type Failure = {
  success: false;
  error: string;
  message?: string;
};

export type StrictReturn<T = any> = Success<T> | Failure;

export function isSuccess<T>(result: StrictReturn<T>): result is Success<T> {
  return result.success;
}
