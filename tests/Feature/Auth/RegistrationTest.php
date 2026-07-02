<?php

use App\Models\Country;
use App\Models\EventRegistrationAttendee;
use App\Models\EventRegistrationSubmission;
use App\Models\Programme;
use App\Models\RegistrationField;
use App\Models\User;
use App\Models\UserType;
use Illuminate\Support\Facades\Mail;
use Inertia\Testing\AssertableInertia as Assert;

test('registration screen can be rendered', function () {
    $response = $this->get(route('register'));

    $response->assertStatus(200);
});

test('registration screen uses ASEMME10 instead of welcome dinner', function () {
    $owner = User::factory()->create();

    Programme::query()->create([
        'user_id' => $owner->id,
        'tag' => 'DINNER',
        'title' => 'Welcome Dinner',
        'description' => 'Welcome dinner registration',
        'starts_at' => now(),
        'ends_at' => now()->addDay(),
        'location' => 'Manila',
        'is_active' => true,
    ]);

    $asemme10 = Programme::query()->create([
        'user_id' => $owner->id,
        'tag' => 'ASEMME10',
        'title' => '10th Asia-Europe Meeting of Ministers for Education (ASEMME10)',
        'description' => 'ASEMME10 registration',
        'starts_at' => now()->addMonth(),
        'ends_at' => now()->addMonth()->addDays(2),
        'location' => 'Manila',
        'is_active' => true,
    ]);

    RegistrationField::query()->create([
        'programme_id' => $asemme10->id,
        'field_key' => 'registration_type',
        'label' => 'I would like to register...',
        'field_type' => 'radio',
        'options' => ['Country Delegation', 'Stakeholder Delegation'],
        'is_required' => true,
        'sort_order' => 1,
    ]);

    $this->get(route('register'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('auth/register')
            ->where('activeProgramme.id', $asemme10->id)
            ->where('programmes.0.id', $asemme10->id)
        );
});

test('registration screen uses event marked as active registration', function () {
    $owner = User::factory()->create();

    Programme::query()->create([
        'user_id' => $owner->id,
        'tag' => 'ASEMME10',
        'title' => '10th Asia-Europe Meeting of Ministers for Education (ASEMME10)',
        'description' => 'ASEMME10 registration',
        'starts_at' => now()->addMonth(),
        'ends_at' => now()->addMonth()->addDays(2),
        'location' => 'Manila',
        'is_active' => true,
    ]);

    $activeRegistration = Programme::query()->create([
        'user_id' => $owner->id,
        'tag' => 'CUSTOM',
        'title' => 'Custom Public Registration Event',
        'description' => 'Custom registration',
        'starts_at' => now()->addWeeks(2),
        'ends_at' => now()->addWeeks(2)->addDay(),
        'location' => 'Manila',
        'is_active' => true,
        'is_registration_active' => true,
    ]);

    $this->get(route('register'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('auth/register')
            ->where('activeProgramme.id', $activeRegistration->id)
            ->where('activeProgramme.is_registration_active', true)
        );
});

test('admin can mark one event as active registration', function () {
    $admin = User::factory()->create();

    $previous = Programme::query()->create([
        'user_id' => $admin->id,
        'tag' => 'OLD',
        'title' => 'Previous Registration Event',
        'description' => 'Previous registration',
        'starts_at' => now()->addWeek(),
        'ends_at' => now()->addWeek()->addDay(),
        'location' => 'Manila',
        'is_active' => true,
        'is_registration_active' => true,
    ]);

    $next = Programme::query()->create([
        'user_id' => $admin->id,
        'tag' => 'NEW',
        'title' => 'Next Registration Event',
        'description' => 'Next registration',
        'starts_at' => now()->addWeeks(2),
        'ends_at' => now()->addWeeks(2)->addDay(),
        'location' => 'Manila',
        'is_active' => false,
    ]);

    $this->actingAs($admin)
        ->patch(route('programmes.active-registration', $next))
        ->assertRedirect();

    expect($previous->refresh()->is_registration_active)->toBeFalse()
        ->and($next->refresh()->is_registration_active)->toBeTrue()
        ->and($next->is_active)->toBeTrue();
});

test('new users can register', function () {
    $country = Country::query()->create([
        'code' => 'PH',
        'name' => 'Philippines',
        'is_active' => true,
    ]);

    $userType = UserType::query()->create([
        'name' => 'Participant',
        'slug' => 'participant',
        'is_active' => true,
    ]);

    $response = $this->post(route('register.store'), [
        'honorific_title' => 'mr',
        'given_name' => 'Test',
        'family_name' => 'User',
        'sex_assigned_at_birth' => 'male',
        'organization_name' => 'Test Organization',
        'position_title' => 'Delegate',
        'email' => 'test@example.com',
        'contact_country_code' => '+63',
        'contact_number' => '09171234567',
        'country_id' => $country->id,
        'user_type_id' => $userType->id,
        'password' => 'password',
        'password_confirmation' => 'password',
    ]);

    $this->assertGuest();
    $response->assertRedirect(route('register', absolute: false));
    $response->assertSessionHas('status', 'registered');
});

test('existing users can join selected event from registration form', function () {
    Mail::fake();

    $country = Country::query()->create([
        'code' => 'PH',
        'name' => 'Philippines',
        'is_active' => true,
    ]);

    $userType = UserType::query()->create([
        'name' => 'Participant',
        'slug' => 'participant',
        'is_active' => true,
    ]);

    $owner = User::factory()->create();
    $programme = Programme::query()->create([
        'user_id' => $owner->id,
        'tag' => 'ASEAN',
        'title' => 'ASEAN Event',
        'description' => 'ASEAN event registration',
        'starts_at' => now()->addDay(),
        'ends_at' => now()->addDays(2),
        'location' => 'Manila',
        'is_active' => true,
    ]);

    $existingUser = User::factory()->create([
        'email' => 'test@example.com',
        'country_id' => $country->id,
        'user_type_id' => $userType->id,
    ]);

    $response = $this->post(route('register.store'), [
        'honorific_title' => 'Mr.',
        'given_name' => 'Test',
        'family_name' => 'User',
        'sex_assigned_at_birth' => 'male',
        'organization_name' => 'Test Organization',
        'position_title' => 'Delegate',
        'email' => 'test@example.com',
        'contact_country_code' => '+63',
        'contact_number' => '09171234567',
        'country_id' => $country->id,
        'user_type_id' => $userType->id,
        'programme_ids' => [$programme->id],
        'password' => 'password',
        'password_confirmation' => 'password',
    ]);

    $this->assertGuest();
    $response->assertRedirect(route('register', absolute: false));
    $response->assertSessionHas('status', 'registered');
    $response->assertSessionHas('registeredParticipant.display_id', $existingUser->display_id);

    $this->assertDatabaseHas('participant_programmes', [
        'user_id' => $existingUser->id,
        'programme_id' => $programme->id,
    ]);
    expect(User::query()->where('email', 'test@example.com')->count())->toBe(1);
});

test('existing users already joined to selected event still receive duplicate email error', function () {
    Mail::fake();

    $country = Country::query()->create([
        'code' => 'PH',
        'name' => 'Philippines',
        'is_active' => true,
    ]);

    $userType = UserType::query()->create([
        'name' => 'Participant',
        'slug' => 'participant',
        'is_active' => true,
    ]);

    $owner = User::factory()->create();
    $programme = Programme::query()->create([
        'user_id' => $owner->id,
        'tag' => 'ASEAN',
        'title' => 'ASEAN Event',
        'description' => 'ASEAN event registration',
        'starts_at' => now()->addDay(),
        'ends_at' => now()->addDays(2),
        'location' => 'Manila',
        'is_active' => true,
    ]);

    $existingUser = User::factory()->create([
        'email' => 'test@example.com',
        'country_id' => $country->id,
        'user_type_id' => $userType->id,
    ]);
    $existingUser->joinedProgrammes()->attach($programme->id);

    $response = $this->post(route('register.store'), [
        'honorific_title' => 'Mr.',
        'given_name' => 'Test',
        'family_name' => 'User',
        'sex_assigned_at_birth' => 'male',
        'organization_name' => 'Test Organization',
        'position_title' => 'Delegate',
        'email' => 'test@example.com',
        'contact_country_code' => '+63',
        'contact_number' => '09171234567',
        'country_id' => $country->id,
        'user_type_id' => $userType->id,
        'programme_ids' => [$programme->id],
        'password' => 'password',
        'password_confirmation' => 'password',
    ]);

    $response->assertInvalid(['email']);
});

test('ASEMME10 delegation registration creates scannable participants', function () {
    Mail::fake();

    $adminType = UserType::query()->create([
        'name' => 'ADMIN',
        'slug' => 'ADMIN',
        'is_active' => true,
    ]);

    $country = Country::query()->create([
        'code' => 'PHL',
        'name' => 'Philippines',
        'is_active' => true,
    ]);

    UserType::query()->create([
        'name' => 'Government Official',
        'slug' => 'government-official',
        'is_active' => true,
    ]);

    $admin = User::factory()->create([
        'user_type_id' => $adminType->id,
    ]);
    $owner = User::factory()->create();
    $programme = Programme::query()->create([
        'user_id' => $owner->id,
        'tag' => 'ASEMME10',
        'title' => '10th Asia-Europe Meeting of Ministers for Education (ASEMME10)',
        'description' => 'ASEMME10 registration',
        'starts_at' => now()->addMonth(),
        'ends_at' => now()->addMonth()->addDays(2),
        'location' => 'Manila',
        'is_active' => true,
    ]);

    $response = $this->actingAs($admin)->post(route('participants.asemme10-registration.store'), [
        'programme_id' => $programme->id,
        'country_id' => $country->id,
        'registration_type' => 'Country Delegation',
        'focal' => [
            'name' => 'CHED LO',
            'email' => 'focal@example.test',
            'phone' => '+639171234567',
            'organization' => 'CHED',
            'position' => 'Focal',
        ],
        'consents' => [
            'data_collection' => true,
            'data_storage' => true,
            'photo_video' => true,
        ],
        'delegation' => [
            'minister_responsibility_type' => 'Minister responsible for Higher Education',
            'speech_topic' => 'No speech wanted',
            'social_activities' => ['Gala Dinner on 25 November'],
        ],
        'attendees' => [
            [
                'role' => 'head',
                'title' => 'Ms',
                'given_name' => 'Maria',
                'family_name' => 'Santos',
                'badge_name' => 'M. Santos',
                'organization_name' => 'Department of Education',
                'position_title' => 'Minister',
                'email' => 'maria.santos@example.test',
                'dietary_requirements' => 'Halal',
                'mobility_or_special_needs' => '',
            ],
            [
                'role' => 'delegate_1',
                'title' => 'Mr',
                'given_name' => 'Juan',
                'family_name' => 'Dela Cruz',
                'badge_name' => 'J. Dela Cruz',
                'organization_name' => 'Department of Education',
                'position_title' => 'Director',
                'email' => 'juan.delacruz@example.test',
                'dietary_requirements' => '',
                'mobility_or_special_needs' => '',
            ],
        ],
    ]);

    $response->assertRedirect();
    $response->assertSessionHas('status', 'asemme10-registered');

    expect(EventRegistrationSubmission::query()->count())->toBe(1);
    expect(EventRegistrationAttendee::query()->count())->toBe(2);

    $participants = User::query()
        ->whereIn('email', ['maria.santos@example.test', 'juan.delacruz@example.test'])
        ->get();

    expect($participants)->toHaveCount(2);

    foreach ($participants as $participant) {
        expect($participant->display_id)->not->toBeNull();
        expect($participant->qr_token)->not->toBeNull();
        expect($participant->joinedProgrammes()->whereKey($programme->id)->exists())->toBeTrue();
    }
});

test('ASEMME10 delegation registration keeps blank attendee emails empty', function () {
    Mail::fake();

    $adminType = UserType::query()->create([
        'name' => 'ADMIN',
        'slug' => 'ADMIN',
        'is_active' => true,
    ]);

    $country = Country::query()->create([
        'code' => 'PHL',
        'name' => 'Philippines',
        'is_active' => true,
    ]);

    UserType::query()->create([
        'name' => 'Government Official',
        'slug' => 'government-official',
        'is_active' => true,
    ]);

    $admin = User::factory()->create([
        'user_type_id' => $adminType->id,
    ]);
    $owner = User::factory()->create();
    $programme = Programme::query()->create([
        'user_id' => $owner->id,
        'tag' => 'ASEMME10',
        'title' => '10th Asia-Europe Meeting of Ministers for Education (ASEMME10)',
        'description' => 'ASEMME10 registration',
        'starts_at' => now()->addMonth(),
        'ends_at' => now()->addMonth()->addDays(2),
        'location' => 'Manila',
        'is_active' => true,
    ]);

    $response = $this->actingAs($admin)->post(route('participants.asemme10-registration.store'), [
        'programme_id' => $programme->id,
        'country_id' => $country->id,
        'registration_type' => 'ASEAN Secretariat',
        'focal' => [
            'name' => 'CHED LO',
            'email' => 'focal@example.test',
            'phone' => '+639171234567',
            'organization' => 'CHED',
            'position' => 'Focal',
        ],
        'consents' => [
            'data_collection' => true,
            'data_storage' => true,
            'photo_video' => true,
        ],
        'delegation' => [
            'social_activities' => [],
        ],
        'attendees' => [
            [
                'role' => 'head',
                'title' => 'Mr',
                'given_name' => 'Test',
                'family_name' => 'Participant',
                'badge_name' => 'Test Participant',
                'organization_name' => 'ASEAN Secretariat',
                'position_title' => 'Head',
                'email' => '',
                'dietary_requirements' => '',
                'mobility_or_special_needs' => '',
            ],
        ],
    ]);

    $response->assertRedirect();
    $response->assertSessionHas('status', 'asemme10-registered');

    $participant = User::query()->where('name', 'Test Participant')->firstOrFail();
    $attendee = EventRegistrationAttendee::query()->where('user_id', $participant->id)->firstOrFail();

    expect($participant->email)->toBeNull();
    expect($attendee->email)->toBeNull();
    expect($participant->display_id)->not->toBeNull();
    expect($participant->qr_token)->not->toBeNull();

    $this->actingAs($admin)
        ->get(route('participant', ['programme_id' => $programme->id]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('participant')
            ->where('participants.0.full_name', 'Test Participant')
            ->where('participants.0.email', '')
        );
});

test('ASEMME10 registration rejects attendee email already joined to selected event', function () {
    Mail::fake();

    $adminType = UserType::query()->create([
        'name' => 'ADMIN',
        'slug' => 'ADMIN',
        'is_active' => true,
    ]);

    $country = Country::query()->create([
        'code' => 'PHL',
        'name' => 'Philippines',
        'is_active' => true,
    ]);

    UserType::query()->create([
        'name' => 'Government Official',
        'slug' => 'government-official',
        'is_active' => true,
    ]);

    $admin = User::factory()->create([
        'user_type_id' => $adminType->id,
    ]);
    $owner = User::factory()->create();
    $programme = Programme::query()->create([
        'user_id' => $owner->id,
        'tag' => 'ASEMME10',
        'title' => '10th Asia-Europe Meeting of Ministers for Education (ASEMME10)',
        'description' => 'ASEMME10 registration',
        'starts_at' => now()->addMonth(),
        'ends_at' => now()->addMonth()->addDays(2),
        'location' => 'Manila',
        'is_active' => true,
    ]);

    $existingUser = User::factory()->create([
        'email' => 'maria.santos@example.test',
        'country_id' => $country->id,
    ]);
    $existingUser->joinedProgrammes()->attach($programme->id);

    $response = $this->actingAs($admin)->post(route('participants.asemme10-registration.store'), [
        'programme_id' => $programme->id,
        'country_id' => $country->id,
        'registration_type' => 'Country Delegation',
        'focal' => [
            'name' => 'CHED LO',
            'email' => 'focal@example.test',
            'phone' => '+639171234567',
            'organization' => 'CHED',
            'position' => 'Focal',
        ],
        'consents' => [
            'data_collection' => true,
            'data_storage' => true,
            'photo_video' => true,
        ],
        'delegation' => [
            'minister_responsibility_type' => 'Minister responsible for Higher Education',
            'speech_topic' => 'No speech wanted',
            'social_activities' => ['Gala Dinner on 25 November'],
        ],
        'attendees' => [
            [
                'role' => 'head',
                'title' => 'Ms',
                'given_name' => 'Maria',
                'family_name' => 'Santos',
                'badge_name' => 'M. Santos',
                'organization_name' => 'Department of Education',
                'position_title' => 'Minister',
                'email' => 'maria.santos@example.test',
                'dietary_requirements' => 'Halal',
                'mobility_or_special_needs' => '',
            ],
        ],
    ]);

    $response->assertInvalid([
        'attendees.0.email' => 'This email is already registered for the selected event.',
    ]);

    expect(EventRegistrationSubmission::query()->count())->toBe(0);
    expect(EventRegistrationAttendee::query()->count())->toBe(0);
});
