export const clamp = (num: number, min: number | null, max: number | null): number => {
  if (min !== null) {
    if (num < min) {
      return min;
    }
  }

  if (max !== null) {
    if (num > max) {
      return max;
    }
  }

  return num;
};
