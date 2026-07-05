<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('agent_shops', function (Blueprint $table) {
            if (!Schema::hasColumn('agent_shops', 'primary_color')) {
                $table->string('primary_color')->default('#3B82F6'); // Blue
            }
            if (!Schema::hasColumn('agent_shops', 'background_color')) {
                $table->string('background_color')->default('#F1F5F9'); // Light gray
            }
        });
    }

    public function down(): void
    {
        Schema::table('agent_shops', function (Blueprint $table) {
            $table->dropColumn(['primary_color', 'background_color']);
        });
    }
};