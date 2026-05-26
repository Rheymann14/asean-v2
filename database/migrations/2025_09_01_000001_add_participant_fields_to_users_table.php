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
            $table->foreignId('country_id')->nullable()->after('email')->constrained('countries')->nullOnDelete();
            $table->foreignId('user_type_id')->nullable()->after('country_id')->constrained('user_types')->nullOnDelete();
            $table->boolean('is_active')->default(true)->after('user_type_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['country_id']);
            $table->dropForeign(['user_type_id']);
            $table->dropColumn(['country_id', 'user_type_id', 'is_active']);
        });
    }
};
