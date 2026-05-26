<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('vehicle_assignments', function (Blueprint $table) {
            $table->foreignId('programme_id')->nullable()->after('user_id')->constrained('programmes')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('vehicle_assignments', function (Blueprint $table) {
            $table->dropForeign(['programme_id']);
            $table->dropColumn('programme_id');
        });
    }
};
