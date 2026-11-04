<?php

namespace App\Services;

use App\Models\Order;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class BillbenOrderStatusSyncService
{
    private $baseUrl = 'https://billdenprimehub.com/api/v1';
    private $apiKey = '';

    public function __construct()
    {
        $this->apiKey = config('services.billben.api_key', '');
        $this->baseUrl = config('services.billben.base_url', $this->baseUrl);
    }

    public function syncOrderStatus(Order $order): ?array
    {
        Log::info('Checking order for Billben status sync', [
            'order_id' => $order->id,
            'status' => $order->status,
            'billben_reference_id' => $order->billben_reference_id,
            'billben_pusher_status' => $order->billben_pusher_status
        ]);

        if (!$order->billben_reference_id) {
            Log::warning('Cannot sync order status - no billben_reference_id', [
                'order_id' => $order->id,
                'status' => $order->status
            ]);
            return null;
        }

        Log::info('Syncing order status from Billben API', [
            'order_id' => $order->id,
            'billben_reference_id' => $order->billben_reference_id,
            'current_status' => $order->status
        ]);

        try {
            if (empty($this->apiKey)) {
                Log::warning('Billben API key not configured for status sync', [
                    'order_id' => $order->id,
                    'billben_reference_id' => $order->billben_reference_id
                ]);
                return null;
            }

            $endpoint = $this->baseUrl . '/orders/' . $order->billben_reference_id . '/';
            
            Log::info('Calling Billben API', [
                'order_id' => $order->id,
                'billben_reference_id' => $order->billben_reference_id,
                'endpoint' => $endpoint,
                'api_key_set' => !empty($this->apiKey)
            ]);

            $response = Http::withHeaders([
                'X-API-Key' => $this->apiKey,
                'Content-Type' => 'application/json',
                'Accept' => 'application/json'
            ])->timeout(30)->get($endpoint);

            Log::info('Billben API status response', [
                'order_id' => $order->id,
                'billben_reference_id' => $order->billben_reference_id,
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
                    $externalOrderData = $responseData['data']['order'] ?? $responseData['data'];
                    
                    Log::info('External order data from Billben', [
                        'order_id' => $order->id,
                        'external_id' => $externalOrderData['id'] ?? 'not_set',
                        'external_status' => $externalOrderData['status'] ?? 'not_set',
                        'external_price' => $externalOrderData['price'] ?? 'not_set'
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
                            
                            Log::info('Order status updated from Billben API', [
                                'order_id' => $order->id,
                                'old_status' => $oldStatus,
                                'new_status' => $localStatus,
                                'billben_reference' => $order->billben_reference_id
                            ]);
                        } else {
                            Log::info('Order status unchanged', [
                                'order_id' => $order->id,
                                'status' => $localStatus
                            ]);
                        }
                    } else {
                        Log::warning('Could not map Billben status to local status', [
                            'order_id' => $order->id,
                            'external_status' => $externalOrderData['status'] ?? null
                        ]);
                    }

                    return $externalOrderData;
                } else {
                    Log::warning('Invalid Billben API response format', [
                        'order_id' => $order->id,
                        'response_success' => $responseData['success'] ?? 'not_set',
                        'has_data' => isset($responseData['data'])
                    ]);
                }
            } else {
                Log::error('Failed to fetch order status from Billben API', [
                    'order_id' => $order->id,
                    'billben_reference_id' => $order->billben_reference_id,
                    'status_code' => $response->status(),
                    'response' => $response->body()
                ]);
            }

        } catch (\Exception $e) {
            Log::error('Error syncing order status from Billben', [
                'order_id' => $order->id,
                'billben_reference_id' => $order->billben_reference_id,
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
        }

        return null;
    }

    public function syncAllPendingOrders(): void
    {
        Log::info('Starting sync of all pending Billben orders');

        $allWithReference = Order::whereNotNull('billben_reference_id')
            ->where('billben_pusher_status', 'success')
            ->count();
        Log::info('Total orders with billben_reference_id and successful push', ['count' => $allWithReference]);

        $pendingOrders = Order::whereNotNull('billben_reference_id')
            ->where('billben_pusher_status', 'success')
            ->limit(50)
            ->get();

        Log::info('Found pending Billben orders to sync', [
            'count' => $pendingOrders->count(),
            'order_ids' => $pendingOrders->pluck('id')->toArray()
        ]);

        foreach ($pendingOrders as $order) {
            $this->syncOrderStatus($order);
        }

        Log::info('Completed sync of all pending Billben orders');
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
            'complete' => 'completed',
            'completed' => 'completed',
            'failed' => 'failed',
            'cancelled' => 'cancelled',
            'success' => 'completed',
            'error' => 'failed'
        ];

        $mappedStatus = $statusMap[strtolower($externalStatus)] ?? null;

        Log::debug('Billben status mapping', [
            'external_status' => $externalStatus,
            'mapped_status' => $mappedStatus
        ]);

        return $mappedStatus;
    }
}
