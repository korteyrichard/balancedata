<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Services\BillbenOrderStatusSyncService;
use Illuminate\Support\Facades\Log;

class SyncBillbenOrderStatus extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'billben:sync-orders';

    /**
     * The description of the console command.
     *
     * @var string
     */
    protected $description = 'Sync Billben order statuses from the Billben API';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Starting Billben order status sync...');
        Log::info('Billben order status sync command started');

        try {
            $syncService = new BillbenOrderStatusSyncService();
            $syncService->syncAllPendingOrders();
            
            $this->info('Billben order status sync completed successfully.');
            Log::info('Billben order status sync command completed successfully');
        } catch (\Exception $e) {
            $this->error('Error during Billben order status sync: ' . $e->getMessage());
            Log::error('Billben order status sync command failed', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return 1;
        }

        return 0;
    }
}
