<?php

use App\Models\Country;
use App\Models\EventRegistrationAttendee;
use App\Models\EventRegistrationSubmission;
use App\Models\ParticipantAttendance;
use App\Models\Programme;
use App\Models\User;
use App\Models\UserType;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

test('reports count asemme10 registration attendees as selected event participants', function () {
    $adminType = UserType::query()->create([
        'name' => 'Admin',
        'slug' => 'admin',
        'is_active' => true,
    ]);
    $participantType = UserType::query()->create([
        'name' => 'Delegate',
        'slug' => 'delegate',
        'is_active' => true,
    ]);
    $country = Country::query()->create([
        'code' => 'PHL',
        'name' => 'Philippines',
        'is_active' => true,
    ]);
    $admin = User::factory()->create([
        'user_type_id' => $adminType->id,
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
        'registration_type' => 'Country Delegation',
        'focal_name' => 'Focal Person',
        'focal_email' => 'focal@example.test',
        'focal_phone' => '09170000000',
        'status' => 'submitted',
        'submitted_at' => now(),
    ]);

    $participants = User::factory()->count(4)->sequence(
        [
            'name' => 'Alpha Delegate',
            'email' => 'alpha@example.test',
            'user_type_id' => $participantType->id,
            'is_active' => true,
        ],
        [
            'name' => 'Beta Delegate',
            'email' => 'beta@example.test',
            'user_type_id' => $participantType->id,
            'is_active' => true,
        ],
        [
            'name' => 'Gamma Delegate',
            'email' => 'gamma@example.test',
            'user_type_id' => $adminType->id,
            'is_active' => true,
        ],
        [
            'name' => 'Delta Delegate',
            'email' => 'delta@example.test',
            'user_type_id' => $participantType->id,
            'is_active' => false,
        ],
    )->create([
        'country_id' => $country->id,
    ]);

    $participants->each(function (User $participant, int $index) use ($programme, $submission) {
        EventRegistrationAttendee::query()->create([
            'submission_id' => $submission->id,
            'programme_id' => $programme->id,
            'user_id' => $participant->id,
            'role' => $index === 0 ? 'head' : "delegate_{$index}",
            'given_name' => ['Alpha', 'Beta', 'Gamma', 'Delta'][$index],
            'family_name' => 'Delegate',
            'badge_name' => ['Alpha Badge', 'Beta Badge', 'Gamma Badge', 'Delta Badge'][$index],
            'organization_name' => 'CHED',
            'position_title' => 'Representative',
            'email' => $participant->email,
            'dietary_requirements' => 'None',
            'mobility_or_special_needs' => 'None',
        ]);
    });

    ParticipantAttendance::query()->create([
        'user_id' => $participants->first()->id,
        'programme_id' => $programme->id,
        'status' => 'scanned',
        'scanned_at' => now(),
    ]);

    $this->actingAs($admin)
        ->get(route('reports'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('reports')
            ->where('default_event_id', $programme->id)
            ->where('summary.total_registered_participants', 2)
            ->where('summary.total_participants_attended', 1)
            ->where('summary.total_participants_did_not_join', 1)
            ->where('rows', fn ($rows) => collect($rows)->count() === 4
                && collect($rows)->every(fn ($row) => in_array($programme->id, $row['joined_programme_ids'], true))
                && collect($rows)->every(fn ($row) => ($row['asemme10_registration']['registration_type'] ?? null) === 'Country Delegation')
                && collect($rows)->pluck("asemme10_registration_by_programme.{$programme->id}.focal_email")->filter()->count() === 4)
        );
});
