<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('display_id', 30)->nullable()->unique()->after('id');
            $table->uuid('qr_token')->nullable()->unique()->after('display_id');
            $table->text('qr_payload')->nullable()->after('qr_token');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropUnique(['display_id']);
            $table->dropUnique(['qr_token']);
            $table->dropColumn(['display_id', 'qr_token', 'qr_payload']);
        });
    }
};
