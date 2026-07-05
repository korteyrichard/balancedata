import { router } from '@inertiajs/react';
import { cancelAllPrints } from './printManager';

/**
 * Setup Inertia navigation hooks to cancel pending print jobs
 * Call this once in your app initialization
 */
export const setupPrintCancellationOnNavigation = () => {
  // Cancel prints before navigation
  router.on('before', () => {
    cancelAllPrints();
  });

  // Also cancel on page change
  router.on('navigate', () => {
    cancelAllPrints();
  });

  // Cancel on error
  router.on('error', () => {
    cancelAllPrints();
  });
};

/**
 * Wrapper for router.visit that automatically cancels prints
 */
export const visitWithPrintCancellation = (
  url: string,
  options?: any
) => {
  cancelAllPrints();
  return router.visit(url, options);
};

/**
 * Wrapper for router.post that automatically cancels prints
 */
export const postWithPrintCancellation = (
  url: string,
  data?: any,
  options?: any
) => {
  cancelAllPrints();
  return router.post(url, data, options);
};

/**
 * Wrapper for router.put that automatically cancels prints
 */
export const putWithPrintCancellation = (
  url: string,
  data?: any,
  options?: any
) => {
  cancelAllPrints();
  return router.put(url, data, options);
};

/**
 * Wrapper for router.delete that automatically cancels prints
 */
export const deleteWithPrintCancellation = (
  url: string,
  options?: any
) => {
  cancelAllPrints();
  return router.delete(url, options);
};
