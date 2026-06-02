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
            if (! Schema::hasColumn('users', 'attend_welcome_dinner')) {
                $table->boolean('attend_welcome_dinner')->nullable()->after('consent_photo_video');
            }

            if (! Schema::hasColumn('users', 'avail_transport_from_makati_to_peninsula')) {
                $table->boolean('avail_transport_from_makati_to_peninsula')->nullable()->after('attend_welcome_dinner');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $columns = collect([
            'attend_welcome_dinner',
            'avail_transport_from_makati_to_peninsula',
        ])->filter(fn ($column) => Schema::hasColumn('users', $column))->all();

        if ($columns === []) {
            return;
        }

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn($columns);
        });
    }
};
