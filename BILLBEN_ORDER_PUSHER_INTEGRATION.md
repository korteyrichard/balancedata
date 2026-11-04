# Billben Order Pusher Integration Guide

## Overview

The Billben Order Pusher has been integrated into all order creation points in the application:

1. **API Orders** - `app/Http/Controllers/Api/OrderController.php`
2. **Dashboard/Shop Orders** - `app/Http/Controllers/OrdersController.php`
3. **Bulk Orders** - `app/Http/Controllers/Api/BulkOrderController.php` (commented out)
4. **Excel Orders** - `app/Http/Controllers/Api/ExcelOrderController.php` (commented out)

## Integration Points

### 1. API Order Controller (`Api/OrderController.php`)

**Location:** `app/Http/Controllers/Api/OrderController.php`

When an order is created via the API:
- Order is created and wallet is deducted
- If `order_pusher_enabled` setting is true, order is pushed to Unified API
- If `billben_order_pusher_enabled` setting is true, order is pushed to Billben API
- Both pushers run independently and don't affect each other

**Code:**
```php
// Push order to external APIs
try {
    if (Setting::get('order_pusher_enabled', false)) {
        $orderPusher = new UnifiedOrderPusherService();
        $orderPusher->pushOrderToApi($order);
    } else {
        $order->update(['order_pusher_status' => 'disabled']);
        Log::info('Order pusher is disabled', ['orderId' => $order->id]);
    }
} catch (\Exception $e) {
    Log::error('Failed to push order to Unified API', ['orderId' => $order->id, 'network' => $order->network, 'error' => $e->getMessage()]);
}

try {
    if (Setting::get('billben_order_pusher_enabled', false)) {
        $billbenPusher = new BillbenOrderPusherService();
        $billbenPusher->pushOrderToApi($order);
    } else {
        $order->update(['billben_pusher_status' => 'disabled']);
        Log::info('Billben order pusher is disabled', ['orderId' => $order->id]);
    }
} catch (\Exception $e) {
    Log::error('Failed to push order to Billben API', ['orderId' => $order->id, 'network' => $order->network, 'error' => $e->getMessage()]);
}
```

### 2. Dashboard/Shop Order Controller (`OrdersController.php`)

**Location:** `app/Http/Controllers/OrdersController.php`

When orders are created via the dashboard checkout:
- Multiple orders can be created (one per cart item)
- Each order is pushed to both Unified and Billben APIs independently
- Failures in one pusher don't affect the other

**Code:**
```php
// Push orders to external APIs
foreach ($createdOrders as $order) {
    try {
        if (Setting::get('order_pusher_enabled', false)) {
            $orderPusher = new UnifiedOrderPusherService();
            $orderPusher->pushOrderToApi($order);
            Log::info('Order pushed to Unified API', ['orderId' => $order->id, 'network' => $order->network]);
        } else {
            $order->update(['order_pusher_status' => 'disabled']);
            Log::info('Order pusher is disabled', ['orderId' => $order->id]);
        }
    } catch (\Exception $e) {
        $order->update(['order_pusher_status' => 'failed']);
        Log::error('Failed to push order to Unified API', ['orderId' => $order->id, 'network' => $order->network, 'error' => $e->getMessage()]);
    }

    try {
        if (Setting::get('billben_order_pusher_enabled', false)) {
            $billbenPusher = new BillbenOrderPusherService();
            $billbenPusher->pushOrderToApi($order);
            Log::info('Order pushed to Billben API', ['orderId' => $order->id, 'network' => $order->network]);
        } else {
            $order->update(['billben_pusher_status' => 'disabled']);
            Log::info('Billben order pusher is disabled', ['orderId' => $order->id]);
        }
    } catch (\Exception $e) {
        $order->update(['billben_pusher_status' => 'failed']);
        Log::error('Failed to push order to Billben API', ['orderId' => $order->id, 'network' => $order->network, 'error' => $e->getMessage()]);
    }
}
```

### 3. Bulk Orders & Excel Orders

**Status:** Currently commented out in the codebase

When these are enabled, add the same integration pattern:

```php
use App\Services\BillbenOrderPusherService;

// After creating orders in transaction
foreach ($parsedOrders as $orderData) {
    $order = Order::create([...]);
    
    // Push to Unified API
    if (Setting::get('order_pusher_enabled', false)) {
        $orderPusher = new UnifiedOrderPusherService();
        $orderPusher->pushOrderToApi($order);
    }
    
    // Push to Billben API
    if (Setting::get('billben_order_pusher_enabled', false)) {
        $billbenPusher = new BillbenOrderPusherService();
        $billbenPusher->pushOrderToApi($order);
    }
}
```

## Database Changes

### New Columns Added to Orders Table

```sql
ALTER TABLE orders ADD COLUMN billben_reference_id VARCHAR(255) NULL;
ALTER TABLE orders ADD COLUMN billben_pusher_status VARCHAR(50) DEFAULT 'disabled';
```

### New Setting Added

```sql
INSERT INTO settings (key, value) VALUES ('billben_order_pusher_enabled', 'false');
```

## Configuration

### Environment Variables

Add to `.env`:
```env
BILLBEN_BASE_URL=https://billbenprimehub.com/api/v1
BILLBEN_API_KEY=<your_billben_api_key>
```

### Service Configuration

Already configured in `config/services.php`:
```php
'billben' => [
    'base_url' => env('BILLBEN_BASE_URL', 'https://billbenprimehub.com/api/v1'),
    'api_key' => env('BILLBEN_API_KEY'),
],
```

## Enabling/Disabling Pushers

### Via Settings

```php
// Enable Billben pusher
Setting::set('billben_order_pusher_enabled', true);

// Disable Billben pusher
Setting::set('billben_order_pusher_enabled', false);

// Check if enabled
if (Setting::get('billben_order_pusher_enabled', false)) {
    // Billben pusher is enabled
}
```

### Via Database

```sql
-- Enable
UPDATE settings SET value = 'true' WHERE key = 'billben_order_pusher_enabled';

-- Disable
UPDATE settings SET value = 'false' WHERE key = 'billben_order_pusher_enabled';
```

## Order Status Tracking

Each order now tracks status for both pushers:

| Field | Purpose |
|---|---|
| `reference_id` | Unified API external order ID |
| `order_pusher_status` | Unified API push status (disabled, success, failed) |
| `billben_reference_id` | Billben API external order ID |
| `billben_pusher_status` | Billben API push status (disabled, success, failed) |

## Status Sync

### Syncing Unified Orders

```php
use App\Services\UnifiedOrderStatusSyncService;

$service = new UnifiedOrderStatusSyncService();
$service->syncOrderStatus($order);
$service->syncAllPendingOrders();
```

### Syncing Billben Orders

```php
use App\Services\BillbenOrderStatusSyncService;

$service = new BillbenOrderStatusSyncService();
$service->syncOrderStatus($order);
$service->syncAllPendingOrders();
```

## Logging

All operations are logged with context:

```
[2025-02-15 10:30:00] local.INFO: Order pushed to Billben API {"orderId": 123, "network": "mtn"}
[2025-02-15 10:30:01] local.ERROR: Failed to push order to Billben API {"orderId": 123, "network": "mtn", "error": "API key not configured"}
```

## Error Handling

Both pushers handle errors gracefully:

1. **Missing API Key** - Sets status to 'disabled'
2. **Invalid Network** - Logs warning and skips item
3. **API Connection Error** - Sets status to 'failed'
4. **Invalid Response** - Sets status to 'failed'

Errors in one pusher don't affect the other.

## Testing

### Test API Order Creation

```bash
curl -X POST http://localhost:8000/api/orders \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "network_id": 1,
    "size": "1GB",
    "beneficiary_number": "0501234567"
  }'
```

### Check Order Status

```php
$order = Order::find(1);
echo "Unified Status: " . $order->order_pusher_status;
echo "Billben Status: " . $order->billben_pusher_status;
echo "Unified Reference: " . $order->reference_id;
echo "Billben Reference: " . $order->billben_reference_id;
```

## Migration Steps

1. Run migrations:
   ```bash
   php artisan migrate
   ```

2. Add Billben API key to `.env`:
   ```env
   BILLBEN_API_KEY=your_api_key_here
   ```

3. Enable Billben pusher in settings (or via database)

4. Test order creation

5. Monitor logs for any issues

## Troubleshooting

### Orders not being pushed to Billben

1. Check if `billben_order_pusher_enabled` is true
2. Verify `BILLBEN_API_KEY` is set in `.env`
3. Check logs for specific errors
4. Verify network is supported (mtn, airteltigo_ishare, airteltigo_bigtime, telecel)

### Status not syncing

1. Verify `billben_reference_id` is set on order
2. Check if `billben_pusher_status` is 'success'
3. Review logs for API errors

### Phone number formatting issues

1. Ensure phone numbers are 9-10 digits
2. Check formatted phone in logs

## Files Modified/Created

### Created Files
- `app/Services/BillbenOrderPusherService.php`
- `app/Services/BillbenOrderStatusSyncService.php`
- `database/migrations/2026_02_15_000000_add_billben_columns_to_orders_table.php`
- `database/migrations/2026_02_15_000001_add_billben_order_pusher_enabled_setting.php`
- `BILLBEN_ORDER_PUSHER.md`
- `BILLBEN_ORDER_PUSHER_INTEGRATION.md` (this file)

### Modified Files
- `config/services.php` - Added Billben configuration
- `.env` - Added Billben environment variables
- `app/Models/Order.php` - Added Billben fields to fillable array
- `app/Http/Controllers/Api/OrderController.php` - Added Billben pusher integration
- `app/Http/Controllers/OrdersController.php` - Added Billben pusher integration

## Next Steps

1. Update package ID mappings with actual Billben package IDs
2. Implement webhook handling for real-time status updates
3. Add retry logic for failed pushes
4. Consider caching package list from Billben API
5. Add admin UI for enabling/disabling pushers
