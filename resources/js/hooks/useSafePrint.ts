import { useEffect, useRef, useCallback } from 'react';
import { usePage } from '@inertiajs/react';

interface PrintRequest {
  id: string;
  timestamp: number;
  callback: () => void;
}

/**
 * Hook to safely handle print requests during idle sessions
 * Prevents stale print jobs from firing out of order
 */
export const useSafePrint = () => {
  const pageProps = usePage().props;
  const printQueueRef = useRef<Map<string, PrintRequest>>(new Map());
  const currentRequestIdRef = useRef<string | null>(null);
  const isPageVisibleRef = useRef(true);

  // Detect when page becomes visible again
  useEffect(() => {
    const handleVisibilityChange = () => {
      isPageVisibleRef.current = !document.hidden;
      
      // When page becomes visible, clear any stale print requests
      if (isPageVisibleRef.current) {
        clearStaleRequests();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Clear print requests that are older than 5 minutes
  const clearStaleRequests = useCallback(() => {
    const now = Date.now();
    const maxAge = 5 * 60 * 1000; // 5 minutes

    for (const [id, request] of printQueueRef.current.entries()) {
      if (now - request.timestamp > maxAge) {
        printQueueRef.current.delete(id);
      }
    }
  }, []);

  // Generate a unique request ID based on current page state
  const generateRequestId = useCallback(() => {
    const timestamp = Date.now();
    const pageId = JSON.stringify(pageProps).substring(0, 50);
    return `print_${timestamp}_${pageId}`;
  }, [pageProps]);

  // Queue a print request
  const queuePrintRequest = useCallback((callback: () => void) => {
    const requestId = generateRequestId();
    currentRequestIdRef.current = requestId;

    printQueueRef.current.set(requestId, {
      id: requestId,
      timestamp: Date.now(),
      callback,
    });

    return requestId;
  }, [generateRequestId]);

  // Execute print only if it's the current/latest request
  const executePrint = useCallback((requestId: string) => {
    // Only execute if this is the current request
    if (requestId !== currentRequestIdRef.current) {
      console.warn(`Print request ${requestId} is stale, ignoring`);
      printQueueRef.current.delete(requestId);
      return;
    }

    // Only execute if page is visible
    if (document.hidden) {
      console.warn('Page is hidden, deferring print');
      return;
    }

    const request = printQueueRef.current.get(requestId);
    if (!request) {
      console.warn(`Print request ${requestId} not found in queue`);
      return;
    }

    try {
      request.callback();
      window.print();
    } catch (error) {
      console.error('Print failed:', error);
    } finally {
      // Clean up
      printQueueRef.current.delete(requestId);
    }
  }, []);

  // Cancel a specific print request
  const cancelPrintRequest = useCallback((requestId: string) => {
    printQueueRef.current.delete(requestId);
    if (currentRequestIdRef.current === requestId) {
      currentRequestIdRef.current = null;
    }
  }, []);

  // Cancel all pending print requests
  const cancelAllPrintRequests = useCallback(() => {
    printQueueRef.current.clear();
    currentRequestIdRef.current = null;
  }, []);

  // Safe print wrapper
  const safePrint = useCallback((callback?: () => void) => {
    // Cancel any previous requests
    cancelAllPrintRequests();

    // Queue new request
    const requestId = queuePrintRequest(callback || (() => {}));

    // Execute immediately if page is visible
    if (!document.hidden) {
      executePrint(requestId);
    } else {
      // Wait for page to become visible
      const handleVisibilityChange = () => {
        if (!document.hidden) {
          document.removeEventListener('visibilitychange', handleVisibilityChange);
          executePrint(requestId);
        }
      };
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }
  }, [queuePrintRequest, executePrint, cancelAllPrintRequests]);

  return {
    safePrint,
    queuePrintRequest,
    executePrint,
    cancelPrintRequest,
    cancelAllPrintRequests,
  };
};
