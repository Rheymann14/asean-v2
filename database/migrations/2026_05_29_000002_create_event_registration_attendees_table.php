<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('event_registration_attendees', function (Blueprint $table) {
            $table->id();
            $table->foreignId('submission_id')->constrained('event_registration_submissions')->cascadeOnDelete();
            $table->foreignId('programme_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('role', 80);
            $table->string('title', 50)->nullable();
            $table->string('given_name');
            $table->string('family_name');
            $table->string('badge_name')->nullable();
            $table->string('organization_name')->nullable();
            $table->string('position_title')->nullable();
            $table->string('email')->nullable();
            $table->text('dietary_requirements')->nullable();
            $table->text('mobility_or_special_needs')->nullable();
            $table->json('extra_details')->nullable();
            $table->timestamps();

            $table->unique(['submission_id', 'role']);
            $table->index(['programme_id', 'user_id']);
            $table->index('email');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('event_registration_attendees');
    }
};
