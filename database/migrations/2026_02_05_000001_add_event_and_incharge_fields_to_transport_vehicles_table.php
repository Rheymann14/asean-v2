<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('transport_vehicles', function (Blueprint $table) {
            $table->foreignId('programme_id')->nullable()->after('id')->constrained('programmes')->nullOnDelete();
            $table->string('driver_name')->nullable()->after('label');
            $table->string('driver_contact_number')->nullable()->after('driver_name');
            $table->foreignId('incharge_user_id')->nullable()->after('driver_contact_number')->constrained('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('transport_vehicles', function (Blueprint $table) {
            $table->dropForeign(['programme_id']);
            $table->dropForeign(['incharge_user_id']);
            $table->dropColumn(['programme_id', 'driver_name', 'driver_contact_number', 'incharge_user_id']);
        });
    }
};
