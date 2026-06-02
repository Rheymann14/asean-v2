<?php

use App\Models\Programme;
use App\Models\User;
use App\Models\UserType;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

test('ched role sees participant van assignment view', function () {
    $chedType = UserType::query()->create([
        'name' => 'CHED',
        'slug' => 'CHED',
        'is_active' => true,
    ]);

    $owner = User::factory()->create();

    $programme = Programme::query()->create([
        'user_id' => $owner->id,
        'tag' => 'EVT-1',
        'title' => 'Summit Day 1',
        'description' => 'Programme description',
        'location' => 'Manila',
        'starts_at' => now(),
        'ends_at' => now()->addHour(),
        'is_active' => true,
    ]);

    $user = User::factory()->create([
        'user_type_id' => $chedType->id,
    ]);

    $user->joinedProgrammes()->attach($programme->id);

    $this->actingAs($user)
        ->get(route('vehicle-assignment'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('participant-vehicle-assignment')
            ->where('events.0.id', $programme->id)
        );
});

test('admin sees all joined event participants in vehicle assignment list', function () {
    $adminType = UserType::query()->create([
        'name' => 'ADMIN',
        'slug' => 'ADMIN',
        'is_active' => true,
    ]);

    $participantType = UserType::query()->create([
        'name' => 'PARTICIPANT',
        'slug' => 'PARTICIPANT',
        'is_active' => true,
    ]);

    $chedType = UserType::query()->create([
        'name' => 'CHED',
        'slug' => 'CHED',
        'is_active' => true,
    ]);

    $owner = User::factory()->create();

    $programme = Programme::query()->create([
        'user_id' => $owner->id,
        'tag' => 'EVT-2',
        'title' => 'Summit Day 2',
        'description' => 'Programme description',
        'location' => 'Manila',
        'starts_at' => now(),
        'ends_at' => now()->addHour(),
        'is_active' => true,
    ]);

    $admin = User::factory()->create([
        'user_type_id' => $adminType->id,
    ]);

    $regularParticipant = User::factory()->create([
        'user_type_id' => $participantType->id,
    ]);

    $chedParticipant = User::factory()->create([
        'user_type_id' => $chedType->id,
    ]);

    $programme->users()->attach([$regularParticipant->id, $chedParticipant->id]);

    $this->actingAs($admin)
        ->get(route('vehicle-assignment', ['event_id' => $programme->id]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('vehicle-assignment')
            ->where('participants', fn ($participants) => count($participants) === 2)
        );
});


test('admin vehicle assignment defaults to active event participants when no event filter is provided', function () {
    $adminType = UserType::query()->create([
        'name' => 'ADMIN',
        'slug' => 'ADMIN',
        'is_active' => true,
    ]);

    $participantType = UserType::query()->create([
        'name' => 'PARTICIPANT',
        'slug' => 'PARTICIPANT',
        'is_active' => true,
    ]);

    $owner = User::factory()->create();

    $earlierProgramme = Programme::query()->create([
        'user_id' => $owner->id,
        'tag' => 'EVT-EARLY',
        'title' => 'Earlier Event',
        'description' => 'Programme description',
        'location' => 'Manila',
        'starts_at' => now()->subDay(),
        'ends_at' => now()->subDay()->addHour(),
        'is_active' => false,
    ]);

    $activeProgramme = Programme::query()->create([
        'user_id' => $owner->id,
        'tag' => 'EVT-ACTIVE',
        'title' => 'Active Event',
        'description' => 'Programme description',
        'location' => 'Manila',
        'starts_at' => now()->addDay(),
        'ends_at' => now()->addDay()->addHour(),
        'is_active' => true,
    ]);

    $admin = User::factory()->create([
        'user_type_id' => $adminType->id,
    ]);

    $earlierParticipants = User::factory()->count(4)->create([
        'user_type_id' => $participantType->id,
    ]);

    $activeParticipants = User::factory()->count(75)->create([
        'user_type_id' => $participantType->id,
    ]);

    $earlierProgramme->users()->attach($earlierParticipants->pluck('id'));
    $activeProgramme->users()->attach($activeParticipants->pluck('id'));

    $this->actingAs($admin)
        ->get(route('vehicle-assignment'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('vehicle-assignment')
            ->where('selected_event_id', $activeProgramme->id)
            ->where('participants', fn ($participants) => count($participants) === 75)
        );
});

test('admin vehicle assignment defaults to active registration event when available', function () {
    $adminType = UserType::query()->create([
        'name' => 'ADMIN',
        'slug' => 'ADMIN',
        'is_active' => true,
    ]);

    $participantType = UserType::query()->create([
        'name' => 'PARTICIPANT',
        'slug' => 'PARTICIPANT',
        'is_active' => true,
    ]);

    $owner = User::factory()->create();

    $activeProgramme = Programme::query()->create([
        'user_id' => $owner->id,
        'tag' => 'EVT-ACTIVE',
        'title' => 'Active Event',
        'description' => 'Programme description',
        'location' => 'Manila',
        'starts_at' => now()->addDay(),
        'ends_at' => now()->addDay()->addHour(),
        'is_active' => true,
    ]);

    $registrationProgramme = Programme::query()->create([
        'user_id' => $owner->id,
        'tag' => 'EVT-REG',
        'title' => 'Registration Event',
        'description' => 'Programme description',
        'location' => 'Manila',
        'starts_at' => now()->addDays(2),
        'ends_at' => now()->addDays(2)->addHour(),
        'is_active' => true,
        'is_registration_active' => true,
    ]);

    $admin = User::factory()->create([
        'user_type_id' => $adminType->id,
    ]);

    $activeParticipants = User::factory()->count(3)->create([
        'user_type_id' => $participantType->id,
    ]);

    $registrationParticipants = User::factory()->count(5)->create([
        'user_type_id' => $participantType->id,
    ]);

    $activeProgramme->users()->attach($activeParticipants->pluck('id'));
    $registrationProgramme->users()->attach($registrationParticipants->pluck('id'));

    $this->actingAs($admin)
        ->get(route('vehicle-assignment'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('vehicle-assignment')
            ->where('selected_event_id', $registrationProgramme->id)
            ->where('participants', fn ($participants) => count($participants) === 5)
        );
});
