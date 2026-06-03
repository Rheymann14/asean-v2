<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('email')->nullable()->change();
        });

        DB::table('users')
            ->where('email', 'like', '%@no-email.local')
            ->update([
                'email' => null,
                'email_verified_at' => null,
            ]);
    }

    public function down(): void
    {
        DB::table('users')
            ->whereNull('email')
            ->orderBy('id')
            ->pluck('id')
            ->each(function ($userId) {
                DB::table('users')
                    ->where('id', $userId)
                    ->update(['email' => "missing-email-{$userId}@no-email.local"]);
            });

        Schema::table('users', function (Blueprint $table) {
            $table->string('email')->nullable(false)->change();
        });
    }
};
