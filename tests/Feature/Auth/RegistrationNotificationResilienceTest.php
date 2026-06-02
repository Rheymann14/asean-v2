<?php

use App\Actions\Fortify\CreateNewUser;
use App\Services\SemaphoreSms;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;

uses(RefreshDatabase::class);

test('registration still succeeds when semaphore sms provider fails', function () {
    Mail::fake();

    $countryId = DB::table('countries')->insertGetId([
        'code' => 'PH',
        'name' => 'Philippines',
        'is_active' => true,
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    $userTypeId = DB::table('user_types')->insertGetId([
        'name' => 'Participant',
        'slug' => 'participant',
        'is_active' => true,
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    app()->bind(SemaphoreSms::class, function () {
        return new class extends SemaphoreSms
        {
            public function sendWelcome($user): ?\Illuminate\Http\Client\Response
            {
                throw new RuntimeException('Semaphore is unavailable');
            }
        };
    });

    $action = app(CreateNewUser::class);

    $user = $action->create([
        'honorific_title' => 'mr',
        'given_name' => 'Test',
        'family_name' => 'User',
        'sex_assigned_at_birth' => 'male',
        'organization_name' => 'Test Organization',
        'position_title' => 'Delegate',
        'email' => 'test@example.com',
        'contact_country_code' => '+63',
        'contact_number' => '09171234567',
        'country_id' => $countryId,
        'user_type_id' => $userTypeId,
        'consent_contact_sharing' => '1',
        'consent_photo_video' => '1',
        'password' => 'password',
        'password_confirmation' => 'password',
    ]);

    expect($user->email)->toBe('test@example.com');
    $this->assertDatabaseHas('users', ['email' => 'test@example.com']);
});
