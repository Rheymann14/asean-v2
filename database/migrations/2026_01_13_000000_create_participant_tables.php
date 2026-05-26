<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('participant_tables', function (Blueprint $table) {
            $table->id();
            $table->string('table_number')->unique();
            $table->unsignedInteger('capacity');
            $table->timestamps();
        });

        Schema::create('participant_table_assignments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('participant_table_id')->constrained('participant_tables')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->timestamp('assigned_at')->nullable();
            $table->timestamps();

            $table->unique(['participant_table_id', 'user_id'], 'pt_assign_table_user_unique');
            $table->unique('user_id', 'pt_assign_user_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('participant_table_assignments');
        Schema::dropIfExists('participant_tables');
    }
};
