# Billben Order Pusher - Quick Reference

## Quick Setup (5 minutes)

```bash
# 1. Run migrations
php artisan migrate

# 2. Add to .env
BILLBEN_API_KEY=your_api_key_here

# 3. Enable in settings
php artisan tinker
>>> Setting::set('billben_order_pusher_enabled', true)
>>> exit
```

## Quick Usage

### Push an Order
```php
use App\Services\BillbenOrderPusherService;

$service = new BillbenOrderPusherService();
$order = Order::find(1);
$service->pushOrderToApi($order);
```

### Sync Order Status
```php
use App\Services\BillbenOrderStatusSyncService;

$service = new BillbenOrderStatusSyncService();
$order = Order::find(1);
$service->syncOrderStatus($order);
```

### Batch Sync Pending Orders
```php
use App\Services\BillbenOrderStatusSyncService;

$service = new BillbenOrderStatusSyncService();
$service->syncAllPendingOrders();
```

## Check Order Status

```php
$order = Order::find(1);

// Billben status
echo $order->billben_pusher_status;      // 'success', 'failed', 'disabled'
echo $order->billben_reference_id;       // External order ID from Billben

// Unified status (for comparison)
echo $order->order_pusher_status;        // 'success', 'failed', 'disabled'
echo $order->reference_id;               // External order ID from Unified
```

## Enable/Disable Pushers

```php
// Enable Billben
Setting::set('billben_order_pusher_enabled', true);

// Disable Billben
Setting::set('billben_order_pusher_enabled', false);

// Check status
Setting::get('billben_order_pusher_enabled', false);
```

## Supported Networks

| Network | Code | Package IDs |
|---|---|---|
| MTN | mtn | 1-16 |
| Telecel | telecel | 17-24 |
| AirtelTigo BigTime | airteltigo_bigtime | 25-35 |
| AirtelTigo iShare | airteltigo_ishare | 36-43 |

## Supported Data Sizes by Network

- MTN: 1GB, 2GB, 3GB, 4GB, 5GB, 6GB, 7GB, 8GB, 10GB, 15GB, 20GB, 25GB, 30GB, 40GB, 50GB, 100GB
- Telecel: 5GB, 10GB, 15GB, 20GB, 25GB, 30GB, 40GB, 50GB
- AirtelTigo BigTime: 10GB, 15GB, 20GB, 25GB, 30GB, 40GB, 50GB, 60GB, 80GB, 100GB, 200GB
- AirtelTigo iShare: 1GB, 2GB, 3GB, 4GB, 5GB, 6GB, 7GB, 8GB

## Order Fields

```php
$order->billben_reference_id;    // External order ID from Billben
$order->billben_pusher_status;   // Push status: 'disabled', 'success', 'failed'
$order->reference_id;             // External order ID from Unified
$order->order_pusher_status;      // Push status: 'disabled', 'success', 'failed'
```

## Status Values

### Push Status
- `disabled` - Pusher is disabled
- `success` - Order successfully pushed
- `failed` - Push failed

### Order Status
- `pending` - Order pending
- `processing` - Order processing
- `completed` - Order completed
- `failed` - Order failed
- `cancelled` - Order cancelled

## Logging

All operations logged to `storage/logs/laravel.log`:

```
[2025-02-15 10:30:00] local.INFO: Processing order for Billben API push {"order_id": 123}
[2025-02-15 10:30:01] local.INFO: Order sent to Billben successfully {"order_id": 123, "external_order_id": 456}
```

## Common Issues

### Issue: Orders not being pushed
**Solution:**
1. Check `billben_order_pusher_enabled` is true
2. Verify `BILLBEN_API_KEY` in `.env`
3. Check logs for errors

### Issue: Status not syncing
**Solution:**
1. Verify `billben_reference_id` is set
2. Check `billben_pusher_status` is 'success'
3. Review logs

### Issue: Phone number errors
**Solution:**
1. Ensure phone is 9-10 digits
2. Check formatted phone in logs

## Files

| File | Purpose |
|---|---|
| `app/Services/BillbenOrderPusherService.php` | Push orders to Billben |
| `app/Services/BillbenOrderStatusSyncService.php` | Sync status from Billben |
| `config/services.php` | Configuration |
| `app/Models/Order.php` | Order model |
| `app/Http/Controllers/Api/OrderController.php` | API orders |
| `app/Http/Controllers/OrdersController.php` | Dashboard orders |

## Database

```sql
-- Check Billben columns
SELECT id, billben_reference_id, billben_pusher_status FROM orders;

-- Check setting
SELECT * FROM settings WHERE key = 'billben_order_pusher_enabled';
```

## API Endpoints (Billben)

```
POST /v1/orders/create/
GET /v1/orders/<order_id>/
GET /v1/data-packages/
GET /v1/profile/
GET /v1/wallet/balance/
```

## Environment Variables

```env
BILLBEN_BASE_URL=https://billbenprimehub.com/api/v1
BILLBEN_API_KEY=your_api_key_here
```

## Testing

```bash
# Create test order via API
curl -X POST http://localhost:8000/api/orders \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "network_id": 1,
    "size": "1GB",
    "beneficiary_number": "0501234567"
  }'

# Check order in database
php artisan tinker
>>> Order::latest()->first()
```

## Migrations

```bash
# Run all migrations
php artisan migrate

# Rollback last migration
php artisan migrate:rollback

# Check migration status
php artisan migrate:status
```

## Artisan Commands

```bash
# Tinker shell
php artisan tinker

# View logs
tail -f storage/logs/laravel.log

# Clear cache
php artisan cache:clear
```

## Documentation

- `BILLBEN_ORDER_PUSHER.md` - Full service documentation
- `BILLBEN_ORDER_PUSHER_INTEGRATION.md` - Integration guide
- `BILLBEN_ORDER_PUSHER_IMPLEMENTATION_SUMMARY.md` - Implementation overview

## Support

For issues or questions:
1. Check logs: `storage/logs/laravel.log`
2. Review documentation files
3. Check order fields: `billben_reference_id`, `billben_pusher_status`
4. Verify configuration: `BILLBEN_API_KEY`, `billben_order_pusher_enabled`
