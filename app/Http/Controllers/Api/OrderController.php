<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Http\Requests\StoreOrderRequest;
use App\Models\Order;
use App\Models\Product;
use App\Models\ProductVariant;
use Illuminate\Support\Facades\DB;
use App\Services\UnifiedOrderPusherService;
use App\Services\BillbenOrderPusherService;
use Illuminate\Support\Facades\Log;
use App\Models\Setting;

class OrderController extends Controller
{
    /**
     * Get available products for the user's role
     */
    public function getProducts()
    {
        $user = auth()->user();
        
        if ($user->role === 'customer') {
            $productType = 'customer_product';
        } elseif ($user->role === 'dealer') {
            $productType = 'dealer_product';
        } else {
            $productType = 'agent_product';
        }
        
        $products = Product::where('product_type', $productType)
            ->select('id', 'network')
            ->orderBy('network')
            ->get();
        
        return response()->json([
            'success' => true,
            'data' => $products
        ]);
    }

    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $orders = auth()->user()->orders()->with('products')->latest()->get();
        return response()->json($orders);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(StoreOrderRequest $request)
    {
        $user = auth()->user();
        
        // Determine product type based on user role
        $productType = $user->role === 'customer' ? 'customer_product' : 'agent_product';
        
        $product = Product::where('id', $request->network_id)
            ->where('product_type', $productType)
            ->first();
            
        if (!$product) {
            return response()->json(['error' => 'Product not found'], 404);
        }

        $variant = ProductVariant::where('product_id', $product->id)
            ->whereJsonContains('variant_attributes->size', $request->size)
            ->first();
            
        if (!$variant) {
            return response()->json(['error' => 'Size variant not available'], 404);
        }

        // Check if variant is available (status check instead of quantity)
        if ($variant->status !== 'IN STOCK') {
            return response()->json(['error' => 'Product variant is out of stock'], 400);
        }

        try {
            $order = DB::transaction(function() use ($request, $product, $variant) {
                // Lock user row to prevent concurrent overdraw
                $lockedUser = \App\Models\User::where('id', auth()->id())->lockForUpdate()->first();

                if ($lockedUser->wallet_balance < $variant->price) {
                    throw new \Exception('Insufficient wallet balance');
                }

                // Check for existing orders with lock to prevent duplicate orders
                $existingOrder = Order::where('beneficiary_number', $request->beneficiary_number)
                    ->whereIn('status', ['processing', 'pending'])
                    ->lockForUpdate()
                    ->first();

                if ($existingOrder) {
                    throw new \Exception('An order is already being processed for this beneficiary number. Please wait for it to complete before placing a new order.');
                }

                $balanceBefore = $lockedUser->wallet_balance;
                $lockedUser->decrement('wallet_balance', $variant->price);

                $order = Order::create([
                    'user_id' => $lockedUser->id,
                    'total' => $variant->price,
                    'beneficiary_number' => $request->beneficiary_number,
                    'network' => $product->network,
                    'status' => 'pending',
                    'order_source' => 'api'
                ]);

                $order->products()->attach($product->id, [
                    'quantity' => 1,
                    'price' => $variant->price,
                    'beneficiary_number' => $request->beneficiary_number,
                    'product_variant_id' => $variant->id
                ]);

                \App\Models\Transaction::create([
                    'user_id' => $lockedUser->id,
                    'order_id' => $order->id,
                    'amount' => $variant->price,
                    'balance_before' => $balanceBefore,
                    'balance_after' => $lockedUser->wallet_balance,
                    'status' => 'completed',
                    'type' => 'order',
                    'description' => 'API order placed for ' . $product->network . ' data/airtime.',
                ]);

                return $order;
            });
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 400);
        }
        
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
                $order->refresh();
            } else {
                $order->update(['billben_pusher_status' => 'disabled']);
                Log::info('Billben order pusher is disabled', ['orderId' => $order->id]);
            }
        } catch (\Exception $e) {
            $order->update(['billben_pusher_status' => 'failed']);
            Log::error('Failed to push order to Billben API', ['orderId' => $order->id, 'network' => $order->network, 'error' => $e->getMessage()]);
        }

        // Load the order with its products and user for the response
        $order->load(['products' => function($query) {
            $query->withPivot('quantity', 'price', 'beneficiary_number', 'product_variant_id');
        }, 'user']);
        
        return response()->json([
            'message' => 'Order created successfully',
            'order' => [
                'reference_id' => $order->id,
                'total' => $order->total,
                'status' => $order->status,
                'network' => $order->network,
                'beneficiary_number' => $order->beneficiary_number,
                'created_at' => $order->created_at,
                'user' => [
                    'name' => $order->user->name,
                    'email' => $order->user->email
                ],
                'products' => $order->products->map(function($product) {
                    return [
                        'name' => $product->name,
                        'quantity' => $product->pivot->quantity,
                        'price' => $product->pivot->price
                    ];
                })
            ]
        ], 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id)
    {
        //
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        //
    }
}
