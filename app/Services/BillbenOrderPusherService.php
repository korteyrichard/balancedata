<?php

namespace App\Services;

use App\Models\Order;
use App\Models\Setting;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class BillbenOrderPusherService
{
    private $baseUrl = 'https://billbenprimehub.com/api/v1';
    private $apiKey = '';

    public function __construct()
    {
        $this->apiKey = config('services.billben.api_key', '');
        $this->baseUrl = rtrim(config('services.billben.base_url', $this->baseUrl), '/');
    }

    public function pushOrderToApi(Order $order): void
    {
        if (!Setting::get('billben_order_pusher_enabled', false)) {
            Log::info('Billben order pusher is disabled, skipping order push', ['order_id' => $order->id]);
            $order->update(['billben_pusher_status' => 'disabled']);
            return;
        }

        Log::info('Processing order for Billben API push', ['order_id' => $order->id]);
        
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
                $reason = "Network not supported: $network (valid: mtn, airteltigo_ishare, airteltigo_bigtime, telecel)";
                Log::warning($reason, ['order_id' => $order->id, 'product_id' => $item->id]);
                $failureReasons[] = $reason;
                continue;
            }

            // Get package ID from Billben API based on network and size
            $packageId = $this->getPackageIdByNetworkAndSize($network, $size);
            
            if (!$packageId) {
                $reason = "Cannot find package for network=$network, size=$size";
                Log::warning($reason, ['order_id' => $order->id, 'product_id' => $item->id]);
                $failureReasons[] = $reason;
                continue;
            }

            $processedItems++;

            $payload = [
                'package_id' => $packageId,
                'phone_number' => $this->formatPhone($beneficiaryPhone)
            ];
            
            Log::info('Sending to Billben API', [
                'order_id' => $order->id,
                'endpoint' => $this->baseUrl . '/orders/create/',
                'payload' => $payload,
                'api_key_set' => !empty($this->apiKey),
                'base_url_configured' => $this->baseUrl !== 'https://billbenprimehub.com/api/v1',
                'network' => $network,
                'size' => $size,
                'package_id' => $packageId
            ]);

            try {
                if (empty($this->apiKey)) {
                    Log::warning('Billben API key not configured', ['order_id' => $order->id]);
                    $order->update(['billben_pusher_status' => 'disabled']);
                    continue;
                }

                $response = Http::withHeaders([
                    'X-API-Key' => $this->apiKey,
                    'Content-Type' => 'application/json',
                    'Accept' => 'application/json'
                ])->timeout(30)->post($this->baseUrl . '/orders/create/', $payload);

                Log::info('Billben API Response', [
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

                    // Extract the external order ID from Billben response
                    $externalOrderId = null;
                    
                    if (isset($responseData['data']['order']['id'])) {
                        $externalOrderId = $responseData['data']['order']['id'];
                    } elseif (isset($responseData['id'])) {
                        $externalOrderId = $responseData['id'];
                    }
                    
                    Log::info('Extracted external order ID', [
                        'order_id' => $order->id,
                        'external_order_id' => $externalOrderId
                    ]);

                    if ($externalOrderId) {
                        $order->update([
                            'billben_reference_id' => $externalOrderId,
                            'billben_pusher_status' => 'success'
                        ]);
                        
                        Log::info('Order sent to Billben successfully', [
                            'order_id' => $order->id,
                            'external_order_id' => $externalOrderId,
                            'billben_reference_id_saved' => $order->billben_reference_id
                        ]);
                    } else {
                        $order->update(['billben_pusher_status' => 'failed']);
                        Log::warning('Billben API response missing order ID', [
                            'order_id' => $order->id,
                            'response' => $responseData
                        ]);
                    }
                } else {
                    $updated = $order->update(['billben_pusher_status' => 'failed']);
                    $order->refresh();
                    Log::error('Billben API call failed', [
                        'order_id' => $order->id,
                        'status_code' => $response->status(),
                        'response' => $response->body(),
                        'status_updated_to' => 'failed',
                        'update_result' => $updated,
                        'current_status_in_db' => $order->billben_pusher_status
                    ]);
                }

            } catch (\Exception $e) {
                $order->update(['billben_pusher_status' => 'failed']);
                Log::error('Billben API Error', [
                    'order_id' => $order->id,
                    'message' => $e->getMessage(),
                    'trace' => $e->getTraceAsString(),
                    'status_updated_to' => 'failed'
                ]);
            }
        }
        
        if ($processedItems === 0) {
            $order->update(['billben_pusher_status' => 'disabled']);
            Log::info('No items were processed for order, setting status as disabled', [
                'order_id' => $order->id,
                'total_items' => $items->count(),
                'failure_reasons' => $failureReasons
            ]);
        }
    }

    private function getPackageIdByNetworkAndSize(string $network, string $size): ?int
    {
        $sizeValue = preg_replace('/\s*gb$/i', '', trim($size));
        if (!is_numeric($sizeValue)) {
            return null;
        }

        $normalizedSize = (string) (float) $sizeValue . 'gb';
        $normalizedNetwork = strtolower(trim($network));

        if ($normalizedNetwork === 'mtn') {
            $mtnMapping = [
                '1gb' => 1,
                '2gb' => 2,
                '3gb' => 3,
                '4gb' => 4,
                '5gb' => 5,
                '6gb' => 6,
                '7gb' => 7,
                '8gb' => 8,
                '10gb' => 9,
                '15gb' => 10,
                '20gb' => 11,
                '25gb' => 12,
                '30gb' => 13,
                '40gb' => 14,
                '50gb' => 15,
                '100gb' => 16
            ];
            return $mtnMapping[$normalizedSize] ?? null;
        }

        if ($normalizedNetwork === 'airteltigo_ishare' || $normalizedNetwork === 'at' || $normalizedNetwork === 'ishare') {
            $atMapping = [
                '1gb' => 36,
                '2gb' => 37,
                '3gb' => 38,
                '4gb' => 39,
                '5gb' => 40,
                '6gb' => 41,
                '7gb' => 42,
                '8gb' => 43
            ];
            return $atMapping[$normalizedSize] ?? null;
        }

        if ($normalizedNetwork === 'airteltigo_bigtime' || $normalizedNetwork === 'bigtime') {
            $atBigMapping = [
                '10gb' => 25,
                '15gb' => 26,
                '20gb' => 27,
                '25gb' => 28,
                '30gb' => 29,
                '40gb' => 30,
                '50gb' => 31,
                '60gb' => 32,
                '80gb' => 33,
                '100gb' => 34,
                '200gb' => 35
            ];
            return $atBigMapping[$normalizedSize] ?? null;
        }

        if ($normalizedNetwork === 'telecel') {
            $telecelMapping = [
                '5gb' => 17,
                '10gb' => 18,
                '15gb' => 19,
                '20gb' => 20,
                '25gb' => 21,
                '30gb' => 22,
                '40gb' => 23,
                '50gb' => 24
            ];
            return $telecelMapping[$normalizedSize] ?? null;
        }

        return null;
    }

    private function isValidNetwork(string $network): bool
    {
        $validNetworks = ['mtn', 'airteltigo_ishare', 'airteltigo_bigtime', 'telecel', 'at', 'ishare', 'bigtime'];
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
