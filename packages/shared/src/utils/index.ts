// packages/shared/src/utils/index.ts
/** Shared utility functions - add as needed */
export const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));
