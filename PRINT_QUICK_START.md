# Print Request Management - Quick Start Guide

## 5-Minute Setup

### 1. Initialize in Your App
Add this to `resources/js/app.tsx`:

```typescript
import { setupPrintCancellationOnNavigation } from '@/lib/inertiaWithPrintCancellation';

// Initialize print cancellation on navigation
setupPrintCancellationOnNavigation();

createInertiaApp({
  // ... rest of your config
});
```

### 2. Replace Print Calls
Find all `window.print()` in your codebase:

```bash
grep -r "window.print" resources/js/
```

Replace with:

```typescript
import { safePrint } from '@/lib/printManager';

// Simple print
safePrint(JSON.stringify(pageData));

// Print with preparation
safePrint(JSON.stringify(pageData), () => {
  document.title = 'Invoice #123';
});
```

### 3. Test It
1. Open a page with print functionality
2. Leave tab idle for 15+ minutes
3. Return and trigger print
4. Verify only current page prints ✅

## Common Use Cases

### Invoice Printing
```typescript
import { safePrint } from '@/lib/printManager';

function InvoiceComponent({ invoice }) {
  const handlePrint = () => {
    safePrint(JSON.stringify(invoice), () => {
      document.title = `Invoice #${invoice.id}`;
    });
  };

  return <button onClick={handlePrint}>Print Invoice</button>;
}
```

### Order Receipt
```typescript
import { useSafePrint } from '@/hooks/useSafePrint';

function OrderReceipt({ order }) {
  const { safePrint } = useSafePrint();

  const handlePrint = () => {
    safePrint(() => {
      // Prepare document
      const style = document.createElement('style');
      style.textContent = '@media print { body { margin: 0; } }';
      document.head.appendChild(style);
    });
  };

  return <button onClick={handlePrint}>Print Receipt</button>;
}
```

### Report Generation
```typescript
import { safePrint } from '@/lib/printManager';
import { router } from '@inertiajs/react';

function ReportPage({ report }) {
  const handlePrint = () => {
    safePrint(JSON.stringify(report));
  };

  const handleNavigate = () => {
    // Print cancellation happens automatically
    router.visit('/dashboard');
  };

  return (
    <>
      <button onClick={handlePrint}>Print Report</button>
      <button onClick={handleNavigate}>Back to Dashboard</button>
    </>
  );
}
```

## Debugging

### Check if print manager is working
```typescript
import { printManager } from '@/lib/printManager';

// In browser console
printManager.getPendingJobs()
printManager.getCurrentJobInfo()
```

### Enable detailed logging
```typescript
// Add to printManager.ts for debugging
console.log('[PrintManager] Job created:', jobId);
console.log('[PrintManager] Executing job:', jobId);
console.log('[PrintManager] Job cancelled:', jobId);
```

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Print doesn't work | Check console for errors, verify `safePrint` is imported |
| Multiple prints | Ensure all `window.print()` replaced, check for duplicate listeners |
| Stale prints still fire | Verify `setupPrintCancellationOnNavigation()` called in app.tsx |
| Print fires on wrong page | Check page state is unique, verify navigation cancels prints |

## Files Reference

| File | Purpose |
|------|---------|
| `resources/js/lib/printManager.ts` | Core print management |
| `resources/js/hooks/useSafePrint.ts` | React hook for components |
| `resources/js/lib/inertiaWithPrintCancellation.ts` | Inertia integration |
| `PRINT_REQUEST_MANAGEMENT.md` | Detailed documentation |
| `PRINT_SOLUTION_SUMMARY.md` | Implementation summary |

## Next Steps

1. ✅ Add initialization to app.tsx
2. ✅ Find and replace all print calls
3. ✅ Test idle scenarios
4. ✅ Deploy to production
5. ✅ Monitor for issues

## Need Help?

- Check `PRINT_REQUEST_MANAGEMENT.md` for detailed docs
- Review `PRINT_SOLUTION_SUMMARY.md` for implementation details
- Check browser console for `[PrintManager]` messages
- Verify all `window.print()` calls are replaced

---

**That's it!** Your print requests are now safe from idle session issues. 🎉
