# Print Request Management Guide

## Problem
When the browser tab is left idle for extended periods, print requests can queue up and fire out of order. This happens because:

1. **Browser Tab Throttling**: Inactive tabs have reduced JS execution frequency
2. **Stale Requests**: Old print callbacks can fire after new ones
3. **Multiple Bindings**: Print events might be bound multiple times
4. **Session Issues**: Expired sessions can cause retried requests with old data

## Solution

We've implemented two approaches to handle this:

### 1. Print Manager (Recommended for most cases)

Located in: `resources/js/lib/printManager.ts`

**Features:**
- Tracks print jobs with unique IDs
- Validates jobs before execution
- Cancels stale jobs (older than 5 minutes)
- Detects page visibility changes
- Prevents duplicate prints

**Usage:**

```typescript
import { safePrint, cancelPrint, printManager } from '@/lib/printManager';

// Simple print
safePrint(JSON.stringify(pageData));

// Print with callback
safePrint(JSON.stringify(pageData), () => {
  // Prepare document before printing
  document.title = 'Invoice #123';
});

// Cancel a specific print job
cancelPrint(jobId);

// Cancel all pending prints
import { cancelAllPrints } from '@/lib/printManager';
cancelAllPrints();

// Debug: Check pending jobs
console.log(printManager.getPendingJobs());
```

### 2. useSafePrint Hook (For React components)

Located in: `resources/js/hooks/useSafePrint.ts`

**Features:**
- React hook for component-level print management
- Automatic cleanup on unmount
- Visibility detection
- Request queuing

**Usage:**

```typescript
import { useSafePrint } from '@/hooks/useSafePrint';

export function InvoiceComponent() {
  const { safePrint, cancelAllPrintRequests } = useSafePrint();

  const handlePrint = () => {
    safePrint(() => {
      // Prepare document
      document.title = 'Invoice';
    });
  };

  useEffect(() => {
    return () => {
      // Clean up on unmount
      cancelAllPrintRequests();
    };
  }, [cancelAllPrintRequests]);

  return (
    <button onClick={handlePrint}>Print Invoice</button>
  );
}
```

## Implementation Checklist

### For Existing Print Functionality

1. **Find all print triggers** in your codebase:
   ```bash
   grep -r "window.print" resources/js/
   grep -r "\.print()" resources/js/
   ```

2. **Replace with safePrint**:
   ```typescript
   // Before
   window.print();

   // After
   import { safePrint } from '@/lib/printManager';
   safePrint(JSON.stringify(currentPageState));
   ```

3. **Add Page Visibility API checks**:
   ```typescript
   // Before navigation, cancel pending prints
   router.visit(url, {
     onBefore: () => {
       import { cancelAllPrints } from '@/lib/printManager';
       cancelAllPrints();
     }
   });
   ```

4. **Test idle scenarios**:
   - Open page
   - Leave tab idle for 15+ minutes
   - Return to tab
   - Trigger print
   - Verify only current page prints

### For New Print Features

1. Always use `safePrint` instead of `window.print()`
2. Pass page state as string to identify the print job
3. Use callbacks for document preparation
4. Cancel prints on page navigation

## Best Practices

### 1. Always Cancel on Navigation
```typescript
import { router } from '@inertiajs/react';
import { cancelAllPrints } from '@/lib/printManager';

router.visit(url, {
  onBefore: () => {
    cancelAllPrints();
  }
});
```

### 2. Use Page Visibility API
```typescript
useEffect(() => {
  const handleVisibilityChange = () => {
    if (document.hidden) {
      // Page hidden - cancel pending prints
      cancelAllPrints();
    }
  };

  document.addEventListener('visibilitychange', handleVisibilityChange);
  return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
}, []);
```

### 3. Validate State Before Printing
```typescript
safePrint(JSON.stringify(currentData), () => {
  // Verify data is still valid
  if (!currentData || currentData.id !== expectedId) {
    throw new Error('Data mismatch - print cancelled');
  }
});
```

### 4. Set Reasonable Timeouts
```typescript
// Don't allow prints older than 5 minutes
// (Already handled in printManager, but be aware)
const maxPrintAge = 5 * 60 * 1000;
```

## Debugging

### Check Pending Jobs
```typescript
import { printManager } from '@/lib/printManager';

console.log('Current job:', printManager.getCurrentJobInfo());
console.log('Pending jobs:', printManager.getPendingJobs());
```

### Enable Debug Logging
The print manager logs warnings and errors to console:
- `[PrintManager] Job X is stale`
- `[PrintManager] Page is hidden, deferring print`
- `[PrintManager] Job X is too old`

### Common Issues

**Issue**: Print still fires out of order
- **Solution**: Ensure you're using `safePrint` everywhere, not `window.print()`
- **Check**: Search for all `window.print()` calls

**Issue**: Print doesn't fire when page becomes visible
- **Solution**: The hook handles this automatically, but verify page visibility API is working
- **Check**: `console.log(document.hidden)` in DevTools

**Issue**: Multiple prints fire
- **Solution**: Ensure `cancelAllPrints()` is called on navigation
- **Check**: Add logging to navigation handlers

## Migration Example

### Before
```typescript
function OrderInvoice() {
  const handlePrint = () => {
    window.print();
  };

  return <button onClick={handlePrint}>Print</button>;
}
```

### After
```typescript
import { safePrint } from '@/lib/printManager';

function OrderInvoice() {
  const { order } = usePage().props;

  const handlePrint = () => {
    safePrint(JSON.stringify(order), () => {
      document.title = `Invoice #${order.id}`;
    });
  };

  return <button onClick={handlePrint}>Print</button>;
}
```

## Testing

### Manual Test Steps
1. Open the page with print functionality
2. Leave tab idle for 20 minutes
3. Return to tab
4. Trigger print
5. Verify only current page prints
6. Check browser console for any warnings

### Automated Test Example
```typescript
import { printManager } from '@/lib/printManager';

describe('Print Manager', () => {
  it('should cancel stale jobs', () => {
    const jobId = printManager.createJob('state1');
    
    // Simulate 6 minutes passing
    jest.advanceTimersByTime(6 * 60 * 1000);
    
    const result = printManager.executeJob(jobId);
    expect(result).toBe(false); // Should fail
  });

  it('should only execute current job', () => {
    const job1 = printManager.createJob('state1');
    const job2 = printManager.createJob('state2');
    
    // Only job2 should execute
    expect(printManager.executeJob(job1)).toBe(false);
    expect(printManager.getCurrentJobInfo()?.id).toBe(job2);
  });
});
```

## Performance Considerations

- **Memory**: Job history is cleared automatically after 5 minutes
- **CPU**: Visibility listener is lightweight
- **Network**: No additional network calls

## Browser Compatibility

- ✅ Chrome/Edge 60+
- ✅ Firefox 55+
- ✅ Safari 12.1+
- ✅ All modern browsers support Page Visibility API

## Support

For issues or questions:
1. Check the debugging section above
2. Review console logs for `[PrintManager]` messages
3. Verify all print calls use `safePrint`
4. Check that navigation cancels pending prints
