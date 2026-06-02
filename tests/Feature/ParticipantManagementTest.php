<?php

use App\Models\Country;
use App\Models\Programme;
use App\Models\RegistrationField;
use App\Models\User;
use App\Models\UserType;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

function adminUser(): User
{
    $adminType = UserType::query()->create([
        'name' => 'ADMIN',
        'slug' => 'ADMIN',
        'is_active' => true,
    ]);

    return User::factory()->create([
        'user_type_id' => $adminType->id,
    ]);
}

function participantFixture(): array
{
    $country = Country::query()->create([
        'code' => 'PH',
        'name' => 'Philippines',
        'is_active' => true,
    ]);

    $participantType = UserType::query()->create([
        'name' => 'Participant',
        'slug' => 'participant',
        'is_active' => true,
    ]);

    $owner = User::factory()->create();

    $programme = Programme::query()->create([
        'user_id' => $owner->id,
        'tag' => 'EVT',
        'title' => 'ASEAN Event',
        'description' => 'Programme description',
        'location' => 'Manila',
        'starts_at' => now()->addDay(),
        'ends_at' => now()->addDay()->addHour(),
        'is_active' => true,
    ]);

    return [$country, $participantType, $programme];
}

function participantPayload(Country $country, UserType $participantType, array $overrides = []): array
{
    return array_replace_recursive([
        'full_name' => 'Test Participant',
        'email' => fake()->unique()->safeEmail(),
        'contact_number' => '09171234567',
        'contact_country_code' => '+63',
        'country_id' => $country->id,
        'user_type_id' => $participantType->id,
        'given_name' => 'Test',
        'family_name' => 'Participant',
        'is_active' => true,
    ], $overrides);
}

test('participant index is paginated and filterable by event and search', function () {
    $admin = adminUser();
    [$country, $participantType, $programme] = participantFixture();

    $alpha = User::factory()->create([
        'name' => 'Alpha Delegate',
        'email' => 'alpha@example.test',
        'country_id' => $country->id,
        'user_type_id' => $participantType->id,
    ]);

    $participants = User::factory()->count(11)->create([
        'country_id' => $country->id,
        'user_type_id' => $participantType->id,
    ])->push($alpha);

    $programme->participants()->attach($participants->pluck('id'));

    $this->actingAs($admin)
        ->get(route('participant', ['programme_id' => $programme->id, 'per_page' => 10]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('participant')
            ->where('participantPagination.total', 12)
            ->where('participantPagination.per_page', 10)
            ->where('participants', fn ($rows) => count($rows) === 10)
        );

    $this->actingAs($admin)
        ->get(route('participant', [
            'programme_id' => $programme->id,
            'search' => 'Alpha Delegate',
            'per_page' => 10,
        ]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('participantPagination.total', 1)
            ->where('participants.0.full_name', 'Alpha Delegate')
        );
});

test('participant index defaults to active registration event when no event filter is provided', function () {
    $admin = adminUser();
    [$country, $participantType, $activeProgramme] = participantFixture();

    $owner = User::factory()->create();
    $registrationProgramme = Programme::query()->create([
        'user_id' => $owner->id,
        'tag' => 'REG',
        'title' => 'Registration Event',
        'description' => 'Programme description',
        'location' => 'Manila',
        'starts_at' => now()->addDays(2),
        'ends_at' => now()->addDays(2)->addHour(),
        'is_active' => true,
        'is_registration_active' => true,
    ]);

    $activeParticipant = User::factory()->create([
        'country_id' => $country->id,
        'user_type_id' => $participantType->id,
    ]);
    $registrationParticipant = User::factory()->create([
        'country_id' => $country->id,
        'user_type_id' => $participantType->id,
    ]);

    $activeProgramme->participants()->attach($activeParticipant->id);
    $registrationProgramme->participants()->attach($registrationParticipant->id);

    $this->actingAs($admin)
        ->get(route('participant'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('participant')
            ->where('filters.programme_id', (string) $registrationProgramme->id)
            ->where('participantPagination.total', 1)
        );
});

test('participant create stores selected event and dynamic registration responses', function () {
    $admin = adminUser();
    [$country, $participantType, $programme] = participantFixture();

    $field = RegistrationField::query()->create([
        'programme_id' => $programme->id,
        'field_key' => 'delegation_role',
        'label' => 'Delegation role',
        'field_type' => 'select',
        'options' => ['Head', 'Member'],
        'is_required' => true,
        'sort_order' => 1,
    ]);

    $this->actingAs($admin)
        ->post(route('participants.store'), participantPayload($country, $participantType, [
            'programme_id' => $programme->id,
            'registration_responses' => [
                $programme->id => [
                    $field->id => 'Head',
                ],
            ],
        ]))
        ->assertRedirect();

    $user = User::query()->where('email', '!=', $admin->email)->where('name', 'Test Participant')->firstOrFail();

    expect($user->joinedProgrammes()->whereKey($programme->id)->exists())->toBeTrue();
    expect($user->registrationFieldResponses()
        ->where('programme_id', $programme->id)
        ->where('registration_field_id', $field->id)
        ->firstOrFail()
        ->answer)->toBe('Head');
});

test('participant update upserts and deletes dynamic registration responses', function () {
    $admin = adminUser();
    [$country, $participantType, $programme] = participantFixture();

    $field = RegistrationField::query()->create([
        'programme_id' => $programme->id,
        'field_key' => 'badge_name',
        'label' => 'Badge name',
        'field_type' => 'text',
        'options' => [],
        'is_required' => false,
        'sort_order' => 1,
    ]);

    $participant = User::factory()->create([
        'name' => 'Existing Participant',
        'country_id' => $country->id,
        'user_type_id' => $participantType->id,
    ]);

    $participant->registrationFieldResponses()->create([
        'programme_id' => $programme->id,
        'registration_field_id' => $field->id,
        'answer' => 'Old badge',
    ]);

    $this->actingAs($admin)
        ->patch(route('participants.update', $participant), participantPayload($country, $participantType, [
            'full_name' => 'Existing Participant',
            'email' => $participant->email,
            'programme_id' => $programme->id,
            'registration_responses' => [
                $programme->id => [
                    $field->id => 'New badge',
                ],
            ],
        ]))
        ->assertRedirect();

    expect($participant->registrationFieldResponses()
        ->where('registration_field_id', $field->id)
        ->firstOrFail()
        ->answer)->toBe('New badge');

    $this->actingAs($admin)
        ->patch(route('participants.update', $participant), participantPayload($country, $participantType, [
            'full_name' => 'Existing Participant',
            'email' => $participant->email,
            'programme_id' => $programme->id,
            'registration_responses' => [
                $programme->id => [
                    $field->id => '',
                ],
            ],
        ]))
        ->assertRedirect();

    expect($participant->registrationFieldResponses()
        ->where('registration_field_id', $field->id)
        ->exists())->toBeFalse();
});

test('dynamic registration responses are validated for required fields and option types', function () {
    $admin = adminUser();
    [$country, $participantType, $programme] = participantFixture();

    $required = RegistrationField::query()->create([
        'programme_id' => $programme->id,
        'field_key' => 'required_text',
        'label' => 'Required text',
        'field_type' => 'text',
        'options' => [],
        'is_required' => true,
        'sort_order' => 1,
    ]);

    $radio = RegistrationField::query()->create([
        'programme_id' => $programme->id,
        'field_key' => 'role',
        'label' => 'Role',
        'field_type' => 'radio',
        'options' => ['Speaker', 'Guest'],
        'is_required' => false,
        'sort_order' => 2,
    ]);

    $checkbox = RegistrationField::query()->create([
        'programme_id' => $programme->id,
        'field_key' => 'sessions',
        'label' => 'Sessions',
        'field_type' => 'checkbox',
        'options' => ['Morning', 'Afternoon'],
        'is_required' => false,
        'sort_order' => 3,
    ]);

    $email = RegistrationField::query()->create([
        'programme_id' => $programme->id,
        'field_key' => 'assistant_email',
        'label' => 'Assistant email',
        'field_type' => 'email',
        'options' => [],
        'is_required' => false,
        'sort_order' => 4,
    ]);

    $this->actingAs($admin)
        ->post(route('participants.store'), participantPayload($country, $participantType, [
            'programme_id' => $programme->id,
            'registration_responses' => [
                $programme->id => [
                    $required->id => '',
                    $radio->id => 'Invalid',
                    $checkbox->id => ['Morning', 'Invalid'],
                    $email->id => 'not-an-email',
                ],
            ],
        ]))
        ->assertSessionHasErrors([
            "registration_responses.{$programme->id}.{$required->id}",
            "registration_responses.{$programme->id}.{$radio->id}",
            "registration_responses.{$programme->id}.{$checkbox->id}",
            "registration_responses.{$programme->id}.{$email->id}",
        ]);
});
