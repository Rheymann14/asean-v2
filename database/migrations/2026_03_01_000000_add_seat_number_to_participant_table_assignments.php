<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('participant_table_assignments', function (Blueprint $table) {
            $table->unsignedInteger('seat_number')->nullable()->after('participant_table_id');
        });

        DB::statement(<<<'SQL'
            UPDATE participant_table_assignments pta
            JOIN (
                SELECT id, ROW_NUMBER() OVER (PARTITION BY participant_table_id ORDER BY assigned_at, id) AS seat_number
                FROM participant_table_assignments
            ) ranked ON ranked.id = pta.id
            SET pta.seat_number = ranked.seat_number
        SQL
        );

        Schema::table('participant_table_assignments', function (Blueprint $table) {
            $table->unsignedInteger('seat_number')->nullable(false)->change();
            $table->unique(['participant_table_id', 'seat_number'], 'pt_assign_table_seat_unique');
        });
    }

    public function down(): void
    {
        Schema::table('participant_table_assignments', function (Blueprint $table) {
            $table->dropUnique('pt_assign_table_seat_unique');
            $table->dropColumn('seat_number');
        });
    }
};

