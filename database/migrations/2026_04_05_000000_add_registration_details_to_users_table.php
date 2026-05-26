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
            $table->string('honorific_title', 50)->nullable()->after('other_user_type');
            $table->string('honorific_other')->nullable()->after('honorific_title');
            $table->string('given_name')->nullable()->after('honorific_other');
            $table->string('middle_name')->nullable()->after('given_name');
            $table->string('family_name')->nullable()->after('middle_name');        
            $table->string('suffix', 50)->nullable()->after('family_name');     
            $table->string('sex_assigned_at_birth', 20)->nullable()->after('suffix');
            
            $table->string('organization_name')->nullable()->after('sex_assigned_at_birth');
            $table->string('position_title')->nullable()->after('organization_name');
            $table->string('contact_country_code', 10)->nullable()->after('position_title');
            $table->boolean('ip_affiliation')->default(false)->after('contact_country_code');
            $table->string('ip_group_name')->nullable()->after('ip_affiliation');
            $table->string('dietary_allergies')->nullable()->after('ip_group_name');
            $table->string('dietary_other')->nullable()->after('dietary_allergies');
            $table->json('accessibility_needs')->nullable()->after('dietary_other');
            $table->string('accessibility_other')->nullable()->after('accessibility_needs');
            $table->string('emergency_contact_name')->nullable()->after('accessibility_other');
            $table->string('emergency_contact_relationship')->nullable()->after('emergency_contact_name');
            $table->string('emergency_contact_phone')->nullable()->after('emergency_contact_relationship');
            $table->string('emergency_contact_email')->nullable()->after('emergency_contact_phone');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'honorific_title',
                'honorific_other',
                'given_name',
                'middle_name',
                'family_name',
                'suffix',
                'sex_assigned_at_birth',
                'organization_name',
                'position_title',
                'contact_country_code',
                'ip_affiliation',
                'ip_group_name',
                'dietary_allergies',
                'dietary_other',
                'accessibility_needs',
                'accessibility_other',
                'emergency_contact_name',
                'emergency_contact_relationship',
                'emergency_contact_phone',
                'emergency_contact_email',
            ]);
        });
    }
};
