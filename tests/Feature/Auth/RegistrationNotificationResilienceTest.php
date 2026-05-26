<?php

use App\Actions\Fortify\CreateNewUser;
use App\Services\SemaphoreSms;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;

uses(RefreshDatabase::class);

test('registration still succeeds when semaphore sms provider fails', function () {
    Mail::fake();

    DB::table('countries')->insert([
        'code' => 'PH',
        'name' => 'Philippines',
        'is_active' => true,
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    DB::table('user_types')->insert([
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
        'name' => 'Test User',
        'email' => 'test@example.com',
        'contact_number' => '09171234567',
        'country_id' => 1,
        'user_type_id' => 1,
        'consent_contact_sharing' => '1',
        'consent_photo_video' => '1',
        'password' => 'password',
        'password_confirmation' => 'password',
    ]);

    expect($user->email)->toBe('test@example.com');
    $this->assertDatabaseHas('users', ['email' => 'test@example.com']);
});
