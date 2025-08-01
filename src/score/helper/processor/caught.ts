import { StrictReturn } from 'src/score/helper/processor/strict.return';

export const caught = async <T>(
  fn: Promise<StrictReturn<T>>,
): Promise<StrictReturn<T>> => {
  return fn.catch((error) => {
    if (error instanceof Error) {
      return {
        success: false,
        error: error.message,
      } satisfies StrictReturn<T>;
    }

    return {
      success: false,
      error: JSON.stringify(error),
    } satisfies StrictReturn<T>;
  });
};
