<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('registration_field_responses')) {
            if (! $this->hasIndex('registration_field_responses', 'reg_field_resp_user_field_unique')) {
                Schema::table('registration_field_responses', function (Blueprint $table) {
                    $table->unique(['user_id', 'registration_field_id'], 'reg_field_resp_user_field_unique');
                });
            }

            return;
        }

        Schema::create('registration_field_responses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('programme_id')->constrained()->cascadeOnDelete();
            $table->foreignId('registration_field_id')->constrained()->cascadeOnDelete();
            $table->json('answer')->nullable();
            $table->timestamps();

            $table->unique(['user_id', 'registration_field_id'], 'reg_field_resp_user_field_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('registration_field_responses');
    }

    private function hasIndex(string $table, string $index): bool
    {
        return collect(Schema::getIndexes($table))
            ->contains(fn (array $existing) => ($existing['name'] ?? null) === $index);
    }
};
