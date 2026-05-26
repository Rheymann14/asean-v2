<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->boolean('attend_welcome_dinner')->nullable()->after('consent_photo_video');
            $table->boolean('avail_transport_from_makati_to_peninsula')->nullable()->after('attend_welcome_dinner');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['attend_welcome_dinner', 'avail_transport_from_makati_to_peninsula']);
        });
    }
};
