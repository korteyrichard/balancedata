# Billben Order Pusher Service

This document describes the Billben Order Pusher integration for the BalanceData application.

## Overview

The Billben Order Pusher Service integrates with the Billben PrimeHub API to automatically push orders to their system and sync order statuses back. It follows the same pattern as the existing UnifiedOrderPusherService.

## Components

### 1. BillbenOrderPusherService
**Location:** `app/Services/BillbenOrderPusherService.php`

Handles pushing orders to the Billben API. Key features:
- Validates order items and beneficiary information
- Maps network and data size to Billben package IDs
- Formats phone numbers to Billben's expected format
- Handles API authentication with X-API-Key header
- Logs all operations for debugging
- Updates order with Billben reference ID on success

**Key Methods:**
- `pushOrderToApi(Order $order)` - Main method to push an order to Billben
- `getPackageIdByNetworkAndSize()` - Maps network/size to Billben package ID
- `isValidNetwork()` - Validates supported networks
- `formatPhone()` - Formats phone numbers to Billben format

### 2. BillbenOrderStatusSyncService
**Location:** `app/Services/BillbenOrderStatusSyncService.php`

Syncs order statuses from Billben API back to the local system. Key features:
- Fetches order status from Billben using reference ID
- Maps Billben status to local status
- Updates order status only if changed
- Handles batch syncing of pending orders
- Comprehensive error handling and logging

**Key Methods:**
- `syncOrderStatus(Order $order)` - Sync a single order's status
- `syncAllPendingOrders()` - Batch sync all pending orders
- `mapExternalStatus()` - Maps Billben status to local status

## Configuration

### Environment Variables

Add these to your `.env` file:

```env
# Billben Order Pusher API credentials
BILLBEN_BASE_URL=https://billdenprimehub.com/api/v1
BILLBEN_API_KEY=<your_billben_api_key>
```

### Service Configuration

The configuration is automatically loaded from `config/services.php`:

```php
'billben' => [
    'base_url' => env('BILLBEN_BASE_URL', 'https://billdenprimehub.com/api/v1'),
    'api_key' => env('BILLBEN_API_KEY'),
],
```

### Database Migration

Run the migration to add Billben columns to the orders table:

```bash
php artisan migrate
```

This adds:
- `billben_reference_id` - Stores the external order ID from Billben
- `billben_pusher_status` - Tracks the push status (disabled, success, failed)

## Supported Networks

The service supports the following networks:
- **MTN** - Package IDs 1-14
- **AirtelTigo iShare** - Package IDs 15-24
- **AirtelTigo BigTime** - Package IDs 25-29
- **Telecel** - Package IDs 30-37

## Supported Data Sizes

- 1GB, 2GB, 3GB, 4GB, 5GB, 6GB, 8GB, 10GB, 15GB, 20GB, 25GB, 30GB, 40GB, 50GB

## Usage

### Pushing an Order

```php
use App\Services\BillbenOrderPusherService;

$service = new BillbenOrderPusherService();
$order = Order::find($orderId);
$service->pushOrderToApi($order);
```

### Syncing Order Status

```php
use App\Services\BillbenOrderStatusSyncService;

$service = new BillbenOrderStatusSyncService();
$order = Order::find($orderId);
$service->syncOrderStatus($order);
```

### Batch Syncing Pending Orders

```php
use App\Services\BillbenOrderStatusSyncService;

$service = new BillbenOrderStatusSyncService();
$service->syncAllPendingOrders();
```

## Status Mapping

Billben API statuses are mapped to local statuses as follows:

| Billben Status | Local Status |
|---|---|
| pending | pending |
| processing | processing |
| complete | completed |
| completed | completed |
| failed | failed |
| cancelled | cancelled |
| success | completed |
| error | failed |

## Error Handling

The service handles various error scenarios:

1. **Missing API Key** - Logs warning and sets status to 'disabled'
2. **Invalid Network** - Logs warning and skips item
3. **Missing Beneficiary Phone** - Logs warning and skips item
4. **Missing Data Size** - Logs warning and skips item
5. **API Connection Error** - Logs error and sets status to 'failed'
6. **Invalid API Response** - Logs warning and sets status to 'failed'

All errors are logged with full context for debugging.

## Phone Number Formatting

Phone numbers are automatically formatted to Billben's expected format:
- 10-digit numbers starting with 0 are kept as-is
- 9-digit numbers are prefixed with 0
- Other formats are passed through as-is

## Logging

All operations are logged to the default Laravel log channel with context information:

```
[2025-02-15 10:30:00] local.INFO: Processing order for Billben API push {"order_id": 123}
[2025-02-15 10:30:01] local.INFO: Order sent to Billben successfully {"order_id": 123, "external_order_id": 456}
```

## Integration with Existing System

The Billben Order Pusher works alongside the existing Unified Order Pusher:

- Both services can be enabled/disabled independently
- Each maintains separate reference IDs and status fields
- Status syncing is independent for each provider
- Orders can be pushed to multiple providers simultaneously

## Package ID Mapping

The current implementation uses placeholder package IDs. To use actual Billben package IDs:

1. Get the list of available packages from Billben API:
   ```
   GET /v1/data-packages/?network=mtn
   ```

2. Update the mapping in `getPackageIdByNetworkAndSize()` method with actual package IDs

3. Consider caching the package list for performance

## Future Enhancements

1. **Dynamic Package Caching** - Cache package list from Billben API
2. **Webhook Support** - Handle Billben webhooks for real-time status updates
3. **Retry Logic** - Implement exponential backoff for failed pushes
4. **Batch Operations** - Support pushing multiple orders in a single API call
5. **Rate Limiting** - Implement rate limiting to respect API quotas

## Troubleshooting

### Orders not being pushed
- Check if `billben_order_pusher_enabled` setting is true
- Verify `BILLBEN_API_KEY` is set in `.env`
- Check logs for specific error messages

### Status not syncing
- Verify `billben_reference_id` is set on the order
- Check if `billben_pusher_status` is 'success'
- Review logs for API errors

### Phone number issues
- Ensure phone numbers are in valid format (9-10 digits)
- Check formatted phone number in logs

## API Reference

### Create Order
```
POST /v1/orders/create/
Headers: X-API-Key: <api_key>
Body: {
  "package_id": 1,
  "phone_number": "0XXXXXXXXX"
}
```

### Get Order Status
```
GET /v1/orders/<order_id>/
Headers: X-API-Key: <api_key>
```

For complete API documentation, see: https://billdenprimehub.com/api/v1/
