<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Services\UnifiedOrderStatusSyncService;
use App\Models\Order;
use Illuminate\Support\Facades\Log;

class SyncUnifiedOrderStatus extends Command
{
    protected $signature = 'orders:sync-unified-status';
    protected $description = 'Sync pending order statuses from the Unified API';

    public function handle()
    {
        $this->info('Starting order status sync...');
        $this->line('');

        try {
            // Check database for orders that need syncing
            $totalOrders = Order::count();
            $this->info("Total orders in database: $totalOrders");

            $withReference = Order::whereNotNull('reference_id')->count();
            $this->info("Orders with reference_id: $withReference");

            $successfulPush = Order::where('order_pusher_status', 'success')->count();
            $this->info("Orders with successful push status: $successfulPush");

            $needSync = Order::whereNotNull('reference_id')
                ->where('order_pusher_status', 'success')
                ->count();
            $this->info("Orders that need syncing: $needSync");

            $this->line('');

            if ($needSync === 0) {
                $this->warn('No orders to sync');
                Log::info('SyncUnifiedOrderStatus command: No orders found to sync');
                return 0;
            }

            $syncService = new UnifiedOrderStatusSyncService();
            $syncService->syncAllPendingOrders();
            
            $this->line('');
            $this->info('Order status sync completed successfully');
            Log::info('SyncUnifiedOrderStatus command completed');
            return 0;
        } catch (\Exception $e) {
            $this->error('Order status sync failed: ' . $e->getMessage());
            Log::error('Order status sync command failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return 1;
        }
    }
}
