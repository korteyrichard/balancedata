<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('withdrawals', function (Blueprint $table) {
            if (!Schema::hasColumn('withdrawals', 'phone_number')) {
                $table->string('phone_number')->after('amount');
            }
            if (!Schema::hasColumn('withdrawals', 'network')) {
                $table->enum('network', ['MTN', 'TELECEL'])->after('phone_number');
            }
            if (!Schema::hasColumn('withdrawals', 'mobile_money_name')) {
                $table->string('mobile_money_name')->after('network');
            }
        });
    }

    public function down(): void
    {
        Schema::table('withdrawals', function (Blueprint $table) {
            $table->dropColumn(['phone_number', 'network', 'mobile_money_name']);
        });
    }
};