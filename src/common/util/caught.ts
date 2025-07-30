export const caught = async <T>(fn: Promise<T | Error>) => {
  return fn.catch((error) => {
    if (error instanceof Error) {
      return error;
    }
    return new Error(JSON.stringify(error));
  });
};
