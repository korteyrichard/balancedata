<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Setting;

class SetOrderPusherStatus extends Command
{
    protected $signature = 'order-pusher:set {status : true or false}';
    protected $description = 'Enable or disable the order pusher';

    public function handle()
    {
        $status = $this->argument('status');
        
        if (!in_array($status, ['true', 'false', '1', '0'])) {
            $this->error('Status must be true, false, 1, or 0');
            return 1;
        }

        $enabled = in_array($status, ['true', '1']);
        Setting::set('order_pusher_enabled', $enabled);
        
        $this->info('Order pusher is now ' . ($enabled ? 'enabled' : 'disabled'));
        return 0;
    }
}
