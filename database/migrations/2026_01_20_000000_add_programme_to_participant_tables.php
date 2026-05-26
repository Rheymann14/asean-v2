<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('participant_tables', function (Blueprint $table) {
            $table->dropUnique('participant_tables_table_number_unique');
            $table->foreignId('programme_id')->nullable()->after('id')->constrained('programmes')->nullOnDelete();
            $table->unique(['programme_id', 'table_number'], 'participant_tables_programme_table_unique');
        });

        Schema::table('participant_table_assignments', function (Blueprint $table) {
            $table->dropForeign(['user_id']);
            $table->foreignId('programme_id')->nullable()->after('id')->constrained('programmes')->nullOnDelete();
            $table->dropUnique('pt_assign_user_unique');
            $table->index('user_id', 'pt_assign_user_index');
            $table->unique(['programme_id', 'user_id'], 'pt_assign_programme_user_unique');
            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
        });

        DB::statement('
            UPDATE participant_table_assignments
            INNER JOIN participant_tables ON participant_tables.id = participant_table_assignments.participant_table_id
            SET participant_table_assignments.programme_id = participant_tables.programme_id
        ');
    }

    public function down(): void
    {
        Schema::table('participant_table_assignments', function (Blueprint $table) {
            $table->dropForeign(['user_id']);
            $table->dropUnique('pt_assign_programme_user_unique');
            $table->dropConstrainedForeignId('programme_id');
            $table->dropIndex('pt_assign_user_index');
            $table->unique('user_id', 'pt_assign_user_unique');
            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
        });

        Schema::table('participant_tables', function (Blueprint $table) {
            $table->dropUnique('participant_tables_programme_table_unique');
            $table->dropConstrainedForeignId('programme_id');
            $table->unique('table_number', 'participant_tables_table_number_unique');
        });
    }
};
