# Shop Orders Not Going Through Unified Order Pusher Service - Fix

## Problem
Shop orders were not being pushed to the unified order pusher service because they were created with `status: 'completed'` instead of `status: 'pending'`. The order pusher service expects orders to be in 'pending' status when they're being pushed to external APIs.

## Root Cause
Dashboard orders are created with `status: 'pending'` and then pushed to external APIs. However, shop orders (created via Paystack payments) were being created with `status: 'completed'` directly, bypassing the order pusher service.

## Affected Code Locations
1. **ShopController::createOrderFromPayment()** - Line 237
   - Creates shop orders from Paystack payments
   - Was creating orders with `status: 'completed'`

2. **PaystackGuestService::createGuestOrder()** - Line 108
   - Creates guest orders from Paystack payments
   - Was creating orders with `status: 'completed'`

## Solution
Change shop orders to be created with `status: 'pending'` so they can be processed by the unified order pusher service. The order status will be updated by the unified order status sync service based on the API response.

### ShopController.php
```php
// Create order with pending status
$order = Order::create([
    'user_id' => $agentProduct->agentShop->user_id,
    'agent_id' => $agentProduct->agentShop->user_id,
    'total' => $paymentAmount,
    'total_amount' => $paymentAmount,
    'status' => 'pending',  // ← Changed from 'completed'
    'payment_method' => 'paystack',
    'payment_reference' => $request->payment_reference,
    'buyer_email' => $paymentData['customer']['email'],
    'beneficiary_number' => $request->beneficiary_number,
    'network' => $agentProduct->product->network,
    'is_guest_order' => true,
    'order_source' => 'shop'
]);

// Push to external APIs
$this->pushOrderToExternalApis($order);
```

### PaystackGuestService.php
```php
// Create order with pending status
$order = Order::create([
    'user_id' => $agentProduct->agentShop->user_id,
    'agent_id' => $agentProduct->agentShop->user_id,
    'total' => $orderAmount,
    'total_amount' => $orderAmount,
    'status' => 'pending',  // ← Changed from 'completed'
    'payment_method' => 'paystack',
    'payment_reference' => $paymentData['reference'],
    'buyer_email' => $metadata['buyer_email'],
    'beneficiary_number' => $metadata['beneficiary_number'],
    'network' => $agentProduct->product->network,
    'is_guest_order' => true,
    'order_source' => 'shop'
]);

// Push to external APIs
if ($result['status'] && isset($result['order']) && $result['message'] === 'Order created successfully') {
    $this->pushOrderToExternalApis($result['order']);
}
```

## How It Works
1. Shop orders are now created with `status: 'pending'` (matching dashboard orders)
2. The order is immediately pushed to external APIs (Unified Order Pusher, CodeCraft, Jesco, etc.)
3. The unified order status sync service monitors the order and updates its status based on the API response
4. This matches the flow of dashboard orders and ensures shop orders go through the unified order pusher service

## Testing
To verify the fix:
1. Create a shop order through the payment flow
2. Check the `orders` table - the `status` should be 'pending'
3. Check the application logs for order pusher activity
4. Verify the order appears in the external API system
5. Confirm `order_pusher_status` is set to 'success', 'failed', or 'disabled' based on the push result
6. The status will be updated by the unified order status sync service
