<?php

use App\Models\User;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Restore the qr_id and qr_payload columns that were dropped in dev.
     * Guarded so it is a no-op where the columns already exist (production,
     * fresh installs), and only backfills qr_payload for rows missing it —
     * existing production ciphertexts are never overwritten.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (! Schema::hasColumn('users', 'qr_id')) {
                $table->string('qr_id', 60)->nullable()->unique()->after('id');
            }

            if (! Schema::hasColumn('users', 'qr_payload')) {
                $table->text('qr_payload')->nullable()->after('qr_token');
            }
        });

        User::query()
            ->whereNull('qr_payload')
            ->whereNotNull('qr_token')
            ->each(function (User $user) {
                $user->qr_payload = Crypt::encryptString((string) $user->qr_token);
                $user->saveQuietly();
            });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (Schema::hasColumn('users', 'qr_id')) {
                $table->dropUnique(['qr_id']);
                $table->dropColumn('qr_id');
            }

            if (Schema::hasColumn('users', 'qr_payload')) {
                $table->dropColumn('qr_payload');
            }
        });
    }
};
