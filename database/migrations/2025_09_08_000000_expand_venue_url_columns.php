<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        DB::statement('ALTER TABLE venues MODIFY google_maps_url TEXT NULL');
        DB::statement('ALTER TABLE venues MODIFY embed_url TEXT NULL');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement('ALTER TABLE venues MODIFY google_maps_url VARCHAR(255) NULL');
        DB::statement('ALTER TABLE venues MODIFY embed_url VARCHAR(255) NULL');
    }
};
