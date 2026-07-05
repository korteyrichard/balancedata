<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Settings are stored in the settings table as key-value pairs
        // No schema changes needed, just documenting the new keys:
        // - whatsapp_community_link
        // - whatsapp_contact_link
        // - telegram_channel_link
    }

    public function down(): void
    {
        // No rollback needed as we're using the existing settings table
    }
};
