<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('event_registration_submissions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('programme_id')->constrained()->cascadeOnDelete();
            $table->foreignId('country_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('submitted_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('registration_type', 80);
            $table->string('focal_name');
            $table->string('focal_email');
            $table->string('focal_phone', 50)->nullable();
            $table->string('focal_organization')->nullable();
            $table->string('focal_position')->nullable();
            $table->json('consents')->nullable();
            $table->json('delegation_details')->nullable();
            $table->string('status', 30)->default('submitted');
            $table->timestamp('submitted_at')->nullable();
            $table->timestamps();

            $table->index(['programme_id', 'country_id'], 'ers_programme_country_idx');
            $table->index(['programme_id', 'registration_type'], 'ers_programme_type_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('event_registration_submissions');
    }
};
