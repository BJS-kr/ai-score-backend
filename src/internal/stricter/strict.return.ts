export type StrictReturn<T = any> = {
  success: boolean;
  message?: string;
  error?: string;
  data: T;
};
