<?php

use App\Models\Country;
use App\Models\EventRegistrationAttendee;
use App\Models\EventRegistrationSubmission;
use App\Models\Programme;
use App\Models\User;
use App\Models\UserType;
use Inertia\Testing\AssertableInertia as Assert;

test('guests are redirected to the login page', function () {
    $this->get(route('dashboard'))->assertRedirect(route('login'));
});

test('authenticated users can visit the dashboard', function () {
    $this->actingAs($user = User::factory()->create());

    $this->get(route('dashboard'))->assertOk();
});

test('dashboard defaults to active registration event', function () {
    $user = User::factory()->create();

    Programme::query()->create([
        'user_id' => $user->id,
        'tag' => 'ACTIVE',
        'title' => 'Active Event',
        'description' => 'Programme description',
        'location' => 'Manila',
        'starts_at' => now()->addDay(),
        'ends_at' => now()->addDay()->addHour(),
        'is_active' => true,
    ]);

    $registrationProgramme = Programme::query()->create([
        'user_id' => $user->id,
        'tag' => 'REG',
        'title' => 'Registration Event',
        'description' => 'Programme description',
        'location' => 'Manila',
        'starts_at' => now()->addDays(2),
        'ends_at' => now()->addDays(2)->addHour(),
        'is_active' => true,
        'is_registration_active' => true,
    ]);

    $this->actingAs($user)
        ->get(route('dashboard'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('default_event_id', $registrationProgramme->id)
        );
});

test('asemme10 dashboard participant count matches registration attendees', function () {
    $admin = User::factory()->create();
    $participantType = UserType::query()->create([
        'name' => 'Delegate',
        'slug' => 'delegate',
        'is_active' => true,
        'sequence_order' => 1,
    ]);
    $country = Country::query()->create([
        'code' => 'PHL',
        'name' => 'Philippines',
        'is_active' => true,
    ]);

    $programme = Programme::query()->create([
        'user_id' => $admin->id,
        'tag' => 'ASEMME10',
        'title' => '10th Asia-Europe Meeting of Ministers for Education',
        'description' => 'Programme description',
        'location' => 'Manila',
        'starts_at' => now()->addDay(),
        'ends_at' => now()->addDay()->addHour(),
        'is_active' => true,
        'is_registration_active' => true,
    ]);

    $submission = EventRegistrationSubmission::query()->create([
        'programme_id' => $programme->id,
        'country_id' => $country->id,
        'registration_type' => 'delegation',
        'focal_name' => 'Focal Person',
        'focal_email' => 'focal@example.test',
        'status' => 'submitted',
        'submitted_at' => now(),
    ]);

    for ($index = 1; $index <= 4; $index++) {
        $participant = User::factory()->create([
            'user_type_id' => $participantType->id,
            'country_id' => $country->id,
            'email' => "participant-{$index}@example.test",
        ]);

        if ($index <= 2) {
            $participant->joinedProgrammes()->attach($programme->id);
        }

        EventRegistrationAttendee::query()->create([
            'submission_id' => $submission->id,
            'programme_id' => $programme->id,
            'user_id' => $participant->id,
            'role' => "delegate-{$index}",
            'given_name' => "Participant {$index}",
            'family_name' => 'Example',
            'email' => $participant->email,
        ]);
    }

    $this->actingAs($admin)
        ->get(route('dashboard'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('default_event_id', $programme->id)
            ->where('events.0.joined_count', 4)
            ->where("events.0.joined_by_country.{$country->id}", 4)
        );
});
