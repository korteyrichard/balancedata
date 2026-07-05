# Unified Order Pusher Service Setup

## Overview
The new `UnifiedOrderPusherService` consolidates all network orders (MTN, AT Data, AT Big Packages, and Telecel) into a single service that pushes orders to your unified API endpoint.

## Changes Made

### 1. New Service Created
**File:** `app/Services/UnifiedOrderPusherService.php`

This service handles:
- MTN products (IDs 85-98) with sizes: 1GB, 2GB, 3GB, 4GB, 5GB, 6GB, 8GB, 10GB, 15GB, 20GB, 25GB, 30GB, 40GB, 50GB
- AT Data/Instant (IDs 99-108) with sizes: 1GB, 2GB, 3GB, 4GB, 5GB, 6GB, 8GB, 10GB, 15GB, 20GB
- AT Big Packages (IDs 109-114) with sizes: 20GB, 25GB, 30GB, 40GB, 50GB
- Telecel (IDs 116-123) with sizes: 5GB, 10GB, 15GB, 20GB, 25GB, 30GB, 40GB, 50GB, 100GB

### 2. Updated Controller
**File:** `app/Http/Controllers/OrdersController.php`

- Replaced `OrderPusherService` with `UnifiedOrderPusherService`
- Updated import statement
- Orders now use the unified API endpoint

### 3. Configuration Added
**File:** `config/services.php`

Added new configuration section:
```php
'unified_order' => [
    'base_url' => env('UNIFIED_ORDER_API_URL', 'https://your-api.com'),
    'api_key' => env('UNIFIED_ORDER_API_KEY'),
],
```

## Environment Variables Required

Add these to your `.env` file:

```
UNIFIED_ORDER_API_URL=https://your-api-endpoint.com
UNIFIED_ORDER_API_KEY=YOUR_API_KEY_HERE
```

## API Integration Details

### Endpoint
- **POST** `/api/orders`

### Request Headers
```
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json
Accept: application/json
```

### Request Body Format
```json
{
  "product_id": 1,
  "quantity": "5GB",
  "beneficiary_number": "0241234567"
}
```

### Request Fields
- `product_id` (integer): Product ID from the valid ranges (85-98, 99-108, 109-114, 116-123)
- `quantity` (string): The size in GB format (e.g., "1GB", "5GB", "20GB")
- `beneficiary_number` (string): Phone number of the beneficiary (formatted to 10 digits starting with 0)

## Product ID Mapping

| Network | ID Range | Sizes |
|---------|----------|-------|
| MTN | 85-98 | 1GB, 2GB, 3GB, 4GB, 5GB, 6GB, 8GB, 10GB, 15GB, 20GB, 25GB, 30GB, 40GB, 50GB |
| AT Data (Instant) | 99-108 | 1GB, 2GB, 3GB, 4GB, 5GB, 6GB, 8GB, 10GB, 15GB, 20GB |
| AT Big Packages | 109-114 | 20GB, 25GB, 30GB, 40GB, 50GB |
| Telecel | 116-123 | 5GB, 10GB, 15GB, 20GB, 25GB, 30GB, 40GB, 50GB, 100GB |

## Validation

The service validates:
- Product ID is within accepted ranges
- Beneficiary number is provided
- Size/quantity is provided
- Phone number formatting (converts to 10-digit format with leading 0)

## Response Handling

The service expects the API to return a successful response with one of:
- `id` field - order ID
- `reference_id` field - order reference

The order's `reference_id` will be updated with this value, and `order_pusher_status` will be set to 'success'.

## Logging

All API interactions are logged at `storage/logs/laravel.log` with details:
- Order processing start
- Item details
- API request payload
- API response status and body
- Success/failure status
- Error messages

## Testing

To test the service:

1. Ensure `.env` variables are set with correct API URL and key
2. Create an order through the checkout process
3. Check logs for API call details
4. Verify order's `reference_id` is populated on success

## Migration Notes

If you previously used other order pusher services (OrderPusherService, CodeCraftOrderPusherService, etc.), those services are still available in the codebase but are no longer used by the checkout process. You can safely keep them for backwards compatibility or remove them if not needed elsewhere.
