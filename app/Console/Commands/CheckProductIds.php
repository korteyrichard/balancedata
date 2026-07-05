<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Product;

class CheckProductIds extends Command
{
    protected $signature = 'products:check-ids';
    protected $description = 'Check product IDs and show which are in valid ranges for unified API';

    public function handle()
    {
        $this->info('Checking product IDs...');
        
        $products = Product::all();
        
        if ($products->isEmpty()) {
            $this->warn('No products found in database');
            return;
        }

        $this->info("Total products: {$products->count()}\n");

        // Group by valid ranges
        $mtn = $products->whereBetween('id', [85, 98]);
        $atInstant = $products->whereBetween('id', [99, 108]);
        $atBig = $products->whereBetween('id', [109, 114]);
        $telecel = $products->whereBetween('id', [116, 123]);
        $invalid = $products->filter(function($p) {
            $id = $p->id;
            return !($id >= 85 && $id <= 98) 
                && !($id >= 99 && $id <= 108)
                && !($id >= 109 && $id <= 114)
                && !($id >= 116 && $id <= 123);
        });

        $this->line('MTN (85-98): ' . $mtn->count() . ' products');
        foreach ($mtn as $p) {
            $this->line("  - ID {$p->id}: {$p->name}");
        }

        $this->line("\nAT Data/Instant (99-108): " . $atInstant->count() . ' products');
        foreach ($atInstant as $p) {
            $this->line("  - ID {$p->id}: {$p->name}");
        }

        $this->line("\nAT Big Packages (109-114): " . $atBig->count() . ' products');
        foreach ($atBig as $p) {
            $this->line("  - ID {$p->id}: {$p->name}");
        }

        $this->line("\nTelecel (116-123): " . $telecel->count() . ' products');
        foreach ($telecel as $p) {
            $this->line("  - ID {$p->id}: {$p->name}");
        }

        if ($invalid->count() > 0) {
            $this->error("\nInvalid products (NOT in any valid range): " . $invalid->count());
            foreach ($invalid as $p) {
                $this->error("  - ID {$p->id}: {$p->name} (Network: {$p->network})");
            }
            $this->line("\nTo fix, either:");
            $this->line("1. Rename/reassign products to have IDs in the valid ranges");
            $this->line("2. Update the UnifiedOrderPusherService to include these ID ranges");
        }
    }
}
