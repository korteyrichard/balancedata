<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use App\Models\Setting;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Add the Billben order pusher enabled setting
        Setting::updateOrCreate(
            ['key' => 'billben_order_pusher_enabled'],
            ['value' => 'false']
        );
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Setting::where('key', 'billben_order_pusher_enabled')->delete();
    }
};
