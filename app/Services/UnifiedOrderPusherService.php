<?php

namespace App\Services;

use App\Models\Order;
use App\Models\Product;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class UnifiedOrderPusherService
{
    private $baseUrl = '';
    private $apiKey = '';

    public function __construct()
    {
        $this->apiKey = config('services.unified_order.api_key', '');
        $this->baseUrl = config('services.unified_order.base_url', $this->baseUrl);
    }

    public function pushOrderToApi(Order $order): void
    {
        Log::info('Processing order for Unified API push', ['order_id' => $order->id]);
        
        $items = $order->products()->withPivot('quantity', 'price', 'beneficiary_number', 'product_variant_id')->get();
        Log::info('Order has items', ['count' => $items->count(), 'order_id' => $order->id]);
        
        $processedItems = 0;
        $failureReasons = [];

        foreach ($items as $item) {
            Log::info('Processing item', ['name' => $item->name, 'product_id' => $item->id, 'order_id' => $order->id]);
            
            $beneficiaryPhone = $item->pivot->beneficiary_number;
            $variant = \App\Models\ProductVariant::find($item->pivot->product_variant_id);
            $size = $variant && isset($variant->variant_attributes['size']) 
                ? (string)$variant->variant_attributes['size'] 
                : null;

            Log::info('Item details extracted', [
                'order_id' => $order->id,
                'product_id' => $item->id,
                'product_name' => $item->name,
                'product_network' => $item->network,
                'beneficiary' => $beneficiaryPhone,
                'size' => $size,
                'variant_id' => $item->pivot->product_variant_id
            ]);

            if (empty($beneficiaryPhone)) {
                $reason = 'Missing beneficiary phone';
                Log::warning($reason, ['order_id' => $order->id, 'product_id' => $item->id]);
                $failureReasons[] = $reason;
                continue;
            }

            if (!$size) {
                $reason = 'Missing size/quantity';
                Log::warning($reason, ['order_id' => $order->id, 'product_id' => $item->id]);
                $failureReasons[] = $reason;
                continue;
            }

            $network = strtolower($item->network);
            
            if (!$this->isValidNetwork($network)) {
                $reason = "Network not supported: $network (valid: mtn, at, telecel)";
                Log::warning($reason, ['order_id' => $order->id, 'product_id' => $item->id]);
                $failureReasons[] = $reason;
                continue;
            }

            // Map to external product ID based on network and size
            $externalProductId = $this->getExternalProductIdBySize($network, $size);
            
            if (!$externalProductId) {
                $reason = "Cannot map product to external API: network=$network, size=$size";
                Log::warning($reason, ['order_id' => $order->id, 'product_id' => $item->id]);
                $failureReasons[] = $reason;
                continue;
            }

            $processedItems++;

            // Convert size to uppercase (e.g., 1gb -> 1GB)
            $quantity = strtoupper($size);

            $payload = [
                'product_id' => $externalProductId,
                'quantity' => $quantity,
                'beneficiary_number' => $this->formatPhone($beneficiaryPhone)
            ];
            
            Log::info('Sending to Unified API', [
                'order_id' => $order->id,
                'endpoint' => $this->baseUrl . '/api/orders',
                'payload' => $payload,
                'api_key_set' => !empty($this->apiKey),
                'base_url_configured' => $this->baseUrl !== 'https://your-api.com',
                'network' => $network,
                'size' => $size,
                'external_product_id' => $externalProductId
            ]);

            try {
                if ($this->baseUrl === 'https://your-api.com' || empty($this->apiKey)) {
                    Log::warning('API not configured', [
                        'order_id' => $order->id,
                        'base_url_default' => $this->baseUrl === 'https://your-api.com',
                        'api_key_empty' => empty($this->apiKey)
                    ]);
                    $order->update(['order_pusher_status' => 'disabled']);
                    continue;
                }

                $response = Http::withHeaders([
                    'Authorization' => 'Bearer ' . $this->apiKey,
                    'Content-Type' => 'application/json',
                    'Accept' => 'application/json'
                ])->timeout(30)->post($this->baseUrl . '/api/orders', $payload);

                Log::info('Unified API Response', [
                    'order_id' => $order->id,
                    'status_code' => $response->status(),
                    'body' => $response->body()
                ]);

                if ($response->successful()) {
                    $responseData = $response->json();
                    
                    Log::info('Parsed API response', [
                        'order_id' => $order->id,
                        'has_success' => isset($responseData['success']),
                        'has_data' => isset($responseData['data']),
                        'has_data_order' => isset($responseData['data']['order']) ? true : false
                    ]);

                    // Extract the external order ID from the nested structure
                    $externalOrderId = null;
                    
                    if (isset($responseData['data']['order']['id'])) {
                        $externalOrderId = $responseData['data']['order']['id'];
                    } elseif (isset($responseData['id'])) {
                        $externalOrderId = $responseData['id'];
                    } elseif (isset($responseData['reference_id'])) {
                        $externalOrderId = $responseData['reference_id'];
                    }
                    
                    Log::info('Extracted external order ID', [
                        'order_id' => $order->id,
                        'external_order_id' => $externalOrderId
                    ]);

                    if ($externalOrderId) {
                        $order->update([
                            'reference_id' => $externalOrderId,
                            'order_pusher_status' => 'success'
                        ]);
                        
                        Log::info('Order sent successfully', [
                            'order_id' => $order->id,
                            'external_order_id' => $externalOrderId,
                            'reference_id_saved' => $order->reference_id
                        ]);
                    } else {
                        $order->update(['order_pusher_status' => 'failed']);
                        Log::warning('API response missing order ID', [
                            'order_id' => $order->id,
                            'response' => $responseData
                        ]);
                    }
                } else {
                    $order->update(['order_pusher_status' => 'failed']);
                    Log::error('API call failed', [
                        'order_id' => $order->id,
                        'status_code' => $response->status(),
                        'response' => $response->body()
                    ]);
                }

            } catch (\Exception $e) {
                $order->update(['order_pusher_status' => 'failed']);
                Log::error('API Error', [
                    'order_id' => $order->id,
                    'message' => $e->getMessage(),
                    'trace' => $e->getTraceAsString()
                ]);
            }
        }
        
        if ($processedItems === 0) {
            $order->update(['order_pusher_status' => 'disabled']);
            Log::info('No items were processed for order, setting status as disabled', [
                'order_id' => $order->id,
                'total_items' => $items->count(),
                'failure_reasons' => $failureReasons
            ]);
        }
    }

    private function getExternalProductIdBySize(string $network, string $size): ?int
    {
        $normalizedSize = strtolower($size);

        // MTN: IDs 85-98 (sizes: 1GB, 2GB, 3GB, 4GB, 5GB, 6GB, 8GB, 10GB, 15GB, 20GB, 25GB, 30GB, 40GB, 50GB)
        if ($network === 'mtn') {
            $mtnMapping = [
                '1gb' => 85,
                '2gb' => 86,
                '3gb' => 87,
                '4gb' => 88,
                '5gb' => 89,
                '6gb' => 90,
                '8gb' => 91,
                '10gb' => 92,
                '15gb' => 93,
                '20gb' => 94,
                '25gb' => 95,
                '30gb' => 96,
                '40gb' => 97,
                '50gb' => 98
            ];
            return $mtnMapping[$normalizedSize] ?? null;
        }

        // AT Data (instant): IDs 99-108 (sizes: 1GB, 2GB, 3GB, 4GB, 5GB, 6GB, 8GB, 10GB, 15GB, 20GB)
        if ($network === 'at' || $network === 'ishare') {
            $atMapping = [
                '1gb' => 99,
                '2gb' => 100,
                '3gb' => 101,
                '4gb' => 102,
                '5gb' => 103,
                '6gb' => 104,
                '8gb' => 105,
                '10gb' => 106,
                '15gb' => 107,
                '20gb' => 108
            ];
            return $atMapping[$normalizedSize] ?? null;
        }

        // AT Big Packages: IDs 109-114 (sizes: 20GB, 25GB, 30GB, 40GB, 50GB)
        if ($network === 'bigtime') {
            $atBigMapping = [
                '20gb' => 109,
                '25gb' => 110,
                '30gb' => 111,
                '40gb' => 112,
                '50gb' => 113
            ];
            return $atBigMapping[$normalizedSize] ?? null;
        }

        // Telecel: IDs 115-122 (sizes: 5GB, 10GB, 15GB, 20GB, 25GB, 30GB, 40GB, 50GB)
        if ($network === 'telecel') {
            $telecelMapping = [
                '5gb' => 115,
                '10gb' => 116,
                '15gb' => 117,
                '20gb' => 118,
                '25gb' => 119,
                '30gb' => 120,
                '40gb' => 121,
                '50gb' => 122
            ];
            return $telecelMapping[$normalizedSize] ?? null;
        }

        return null;
    }

    private function isValidNetwork(string $network): bool
    {
        $validNetworks = ['mtn', 'at', 'telecel', 'ishare', 'bigtime'];
        return in_array(strtolower($network), $validNetworks, true);
    }

    private function formatPhone(string $phone): string
    {
        $phone = preg_replace('/[^0-9]/', '', $phone);
        
        if (strlen($phone) === 10 && substr($phone, 0, 1) === '0') {
            return $phone;
        }
        
        if (strlen($phone) === 9) {
            return '0' . $phone;
        }
        
        return $phone;
    }
}
