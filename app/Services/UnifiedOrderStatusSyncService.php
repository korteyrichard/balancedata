<?php

namespace App\Services;

use App\Models\Order;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class UnifiedOrderStatusSyncService
{
    private $baseUrl = 'https://your-api.com';
    private $apiKey = '';

    public function __construct()
    {
        $this->apiKey = config('services.unified_order.api_key', '');
        $this->baseUrl = config('services.unified_order.base_url', $this->baseUrl);
    }

    public function syncOrderStatus(Order $order): ?array
    {
        Log::info('Checking order for status sync', [
            'order_id' => $order->id,
            'status' => $order->status,
            'reference_id' => $order->reference_id,
            'order_pusher_status' => $order->order_pusher_status
        ]);

        if (!$order->reference_id) {
            Log::warning('Cannot sync order status - no reference_id', [
                'order_id' => $order->id,
                'status' => $order->status
            ]);
            return null;
        }

        Log::info('Syncing order status from external API', [
            'order_id' => $order->id,
            'reference_id' => $order->reference_id,
            'current_status' => $order->status
        ]);

        try {
            if ($this->baseUrl === 'https://your-api.com' || empty($this->apiKey)) {
                Log::warning('API not configured for status sync', [
                    'order_id' => $order->id,
                    'reference_id' => $order->reference_id,
                    'base_url_default' => $this->baseUrl === 'https://your-api.com',
                    'api_key_empty' => empty($this->apiKey)
                ]);
                return null;
            }

            $endpoint = $this->baseUrl . '/api/orders/' . $order->reference_id;
            
            Log::info('Calling external API', [
                'order_id' => $order->id,
                'reference_id' => $order->reference_id,
                'endpoint' => $endpoint,
                'api_key_set' => !empty($this->apiKey)
            ]);

            $response = Http::withHeaders([
                'Authorization' => 'Bearer ' . $this->apiKey,
                'Content-Type' => 'application/json',
                'Accept' => 'application/json'
            ])->timeout(30)->get($endpoint);

            Log::info('External API status response', [
                'order_id' => $order->id,
                'reference_id' => $order->reference_id,
                'status_code' => $response->status(),
                'body' => $response->body()
            ]);

            if ($response->successful()) {
                $responseData = $response->json();

                Log::info('Parsed response data', [
                    'order_id' => $order->id,
                    'has_success_key' => isset($responseData['success']),
                    'success_value' => $responseData['success'] ?? 'not_set',
                    'has_data_key' => isset($responseData['data']),
                ]);

                if (isset($responseData['success']) && $responseData['success'] === true && isset($responseData['data'])) {
                    $externalOrderData = $responseData['data'];
                    
                    Log::info('External order data', [
                        'order_id' => $order->id,
                        'external_id' => $externalOrderData['id'] ?? 'not_set',
                        'external_status' => $externalOrderData['status'] ?? 'not_set',
                        'external_total' => $externalOrderData['total'] ?? 'not_set'
                    ]);
                    
                    // Map external status to local status
                    $localStatus = $this->mapExternalStatus($externalOrderData['status'] ?? null);
                    
                    Log::info('Status mapping result', [
                        'order_id' => $order->id,
                        'external_status' => $externalOrderData['status'] ?? null,
                        'mapped_local_status' => $localStatus
                    ]);

                    if ($localStatus) {
                        // Only update status if it has changed
                        if ($order->status !== $localStatus) {
                            $oldStatus = $order->status;
                            $order->update([
                                'status' => $localStatus
                            ]);
                            
                            Log::info('Order status updated from external API', [
                                'order_id' => $order->id,
                                'old_status' => $oldStatus,
                                'new_status' => $localStatus,
                                'external_reference' => $order->reference_id
                            ]);
                        } else {
                            Log::info('Order status unchanged', [
                                'order_id' => $order->id,
                                'status' => $localStatus
                            ]);
                        }
                    } else {
                        Log::warning('Could not map external status to local status', [
                            'order_id' => $order->id,
                            'external_status' => $externalOrderData['status'] ?? null
                        ]);
                    }

                    return $externalOrderData;
                } else {
                    Log::warning('Invalid external API response format', [
                        'order_id' => $order->id,
                        'response_success' => $responseData['success'] ?? 'not_set',
                        'has_data' => isset($responseData['data'])
                    ]);
                }
            } else {
                Log::error('Failed to fetch order status from API', [
                    'order_id' => $order->id,
                    'reference_id' => $order->reference_id,
                    'status_code' => $response->status(),
                    'response' => $response->body()
                ]);
            }

        } catch (\Exception $e) {
            Log::error('Error syncing order status', [
                'order_id' => $order->id,
                'reference_id' => $order->reference_id,
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
        }

        return null;
    }

    public function syncAllPendingOrders(): void
    {
        Log::info('Starting sync of all pending orders');

        // Find all orders that have been pushed to external API (have reference_id and successful pusher status)
        $allWithReference = Order::whereNotNull('reference_id')
            ->where('order_pusher_status', 'success')
            ->count();
        Log::info('Total orders with reference_id and successful push', ['count' => $allWithReference]);

        // Find orders that haven't been synced yet
        $needSyncing = Order::whereNotNull('reference_id')
            ->where('order_pusher_status', 'success')
            ->where('order_pusher_status', '!=', 'synced')
            ->count();
        Log::info('Orders that need status syncing', ['count' => $needSyncing]);

        // Get orders to sync (all with reference_id and not yet synced)
        $pendingOrders = Order::whereNotNull('reference_id')
            ->where('order_pusher_status', 'success')
            ->limit(50)
            ->get();

        Log::info('Found pending orders to sync', [
            'count' => $pendingOrders->count(),
            'order_ids' => $pendingOrders->pluck('id')->toArray()
        ]);

        foreach ($pendingOrders as $order) {
            $this->syncOrderStatus($order);
        }

        Log::info('Completed sync of all pending orders');
    }

    private function mapExternalStatus(?string $externalStatus): ?string
    {
        if (!$externalStatus) {
            Log::warning('mapExternalStatus called with null status');
            return null;
        }

        $statusMap = [
            'pending' => 'pending',
            'processing' => 'processing',
            'completed' => 'completed',
            'failed' => 'failed',
            'cancelled' => 'cancelled',
            'success' => 'completed',
            'error' => 'failed'
        ];

        $mappedStatus = $statusMap[strtolower($externalStatus)] ?? null;

        Log::debug('Status mapping', [
            'external_status' => $externalStatus,
            'mapped_status' => $mappedStatus
        ]);

        return $mappedStatus;
    }
}
