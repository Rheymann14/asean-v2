<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $this->indexIfMissing('participant_programmes', 'pp_programme_user_index', ['programme_id', 'user_id']);
        $this->indexIfMissing('participant_attendances', 'pa_programme_user_index', ['programme_id', 'user_id']);
        $this->indexIfMissing('registration_field_responses', 'rfr_programme_user_index', ['programme_id', 'user_id']);
        $this->indexIfMissing('users', 'users_country_id_index', ['country_id']);
        $this->indexIfMissing('users', 'users_user_type_id_index', ['user_type_id']);
        $this->indexIfMissing('users', 'users_is_active_index', ['is_active']);
    }

    public function down(): void
    {
        $this->dropIndexIfExists('participant_programmes', 'pp_programme_user_index');
        $this->dropIndexIfExists('participant_attendances', 'pa_programme_user_index');
        $this->dropIndexIfExists('registration_field_responses', 'rfr_programme_user_index');
        $this->dropIndexIfExists('users', 'users_country_id_index');
        $this->dropIndexIfExists('users', 'users_user_type_id_index');
        $this->dropIndexIfExists('users', 'users_is_active_index');
    }

    private function indexIfMissing(string $table, string $index, array $columns): void
    {
        if (! Schema::hasTable($table) || $this->hasIndex($table, $index)) {
            return;
        }

        Schema::table($table, function (Blueprint $table) use ($index, $columns) {
            $table->index($columns, $index);
        });
    }

    private function dropIndexIfExists(string $table, string $index): void
    {
        if (! Schema::hasTable($table) || ! $this->hasIndex($table, $index)) {
            return;
        }

        Schema::table($table, function (Blueprint $table) use ($index) {
            $table->dropIndex($index);
        });
    }

    private function hasIndex(string $table, string $index): bool
    {
        return collect(Schema::getIndexes($table))
            ->contains(fn (array $existing) => ($existing['name'] ?? null) === $index);
    }
};
