<?php

namespace App\Actions\Fortify;

use App\Models\RegistrationField;
use App\Models\User;
use App\Models\UserType;
use App\Services\WelcomeNotificationService;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Laravel\Fortify\Contracts\CreatesNewUsers;

class CreateNewUser implements CreatesNewUsers
{
    use PasswordValidationRules;

    private const FOOD_RESTRICTION_OPTIONS = [
        'vegetarian',
        'vegan',
        'halal',
        'kosher',
        'gluten_free',
        'lactose_intolerant',
        'nut_allergy',
        'seafood_allergy',
        'allergies',
        'other',
    ];

    private const ACCESSIBILITY_NEEDS_OPTIONS = [
        'wheelchair_access',
        'sign_language_interpreter',
        'assistive_technology_support',
        'other',
    ];

    /**
     * Validate and create a newly registered user.
     *
     * @param  array<string, mixed>  $input
     */
    public function create(array $input): User
    {
        Validator::make($input, [
            'honorific_title' => ['required', 'string', 'max:50'],
            'honorific_other' => ['nullable', 'string', 'max:255', 'required_if:honorific_title,other'],
            'given_name' => ['required', 'string', 'max:255'],
            'middle_name' => ['nullable', 'string', 'max:255'],
            'family_name' => ['required', 'string', 'max:255'],
            'suffix' => ['nullable', 'string', 'max:50'],
            'sex_assigned_at_birth' => ['required', 'string', Rule::in(['male', 'female'])],
            'organization_name' => ['required', 'string', 'max:255'],
            'position_title' => ['required', 'string', 'max:255'],
            'email' => [
                'required',
                'string',
                'email',
                'max:255',
            ],
            'contact_country_code' => ['required', 'string', 'max:10'],
            'contact_number' => ['required', 'string', 'max:30'],
            'country_id' => ['required', 'integer', 'exists:countries,id'],
            'user_type_id' => ['required', 'integer', 'exists:user_types,id'],
            'other_user_type' => ['nullable', 'string', 'max:255'],
            'ip_affiliation' => ['nullable', 'boolean'],
            'ip_group_name' => ['nullable', 'string', 'max:255', 'required_if:ip_affiliation,1'],
            'programme_ids' => ['nullable', 'array'],
            'programme_ids.*' => ['integer', 'exists:programmes,id'],
            'consent_contact_sharing' => ['nullable', 'boolean'],
            'consent_photo_video' => ['nullable', 'boolean'],
            'attend_welcome_dinner' => ['nullable', 'boolean'],
            'avail_transport_from_makati_to_peninsula' => ['nullable', 'boolean'],
            'has_food_restrictions' => ['nullable', 'boolean'],
            'food_restrictions' => ['nullable', 'array'],
            'food_restrictions.*' => ['string', Rule::in(self::FOOD_RESTRICTION_OPTIONS)],
            'dietary_allergies' => ['nullable', 'string', 'max:255'],
            'dietary_other' => ['nullable', 'string', 'max:255'],
            'accessibility_needs' => ['nullable', 'array'],
            'accessibility_needs.*' => ['string', Rule::in(self::ACCESSIBILITY_NEEDS_OPTIONS)],
            'accessibility_other' => ['nullable', 'string', 'max:255'],
            'emergency_contact_name' => ['nullable', 'string', 'max:255'],
            'emergency_contact_relationship' => ['nullable', 'string', 'max:255'],
            'emergency_contact_phone' => ['nullable', 'string', 'max:30'],
            'emergency_contact_email' => ['nullable', 'email', 'max:255'],
            'profile_photo' => ['nullable', 'image', 'max:5120'],
            'registration_responses' => ['nullable', 'array'],
            'password' => $this->passwordRules(),
        ])->after(function ($validator) use ($input) {
            $programmeIds = collect($input['programme_ids'] ?? [])
                ->map(fn ($id) => (int) $id)
                ->filter()
                ->unique()
                ->values();

            if ($programmeIds->isEmpty()) {
                return;
            }

            $responses = is_array($input['registration_responses'] ?? null)
                ? $input['registration_responses']
                : [];

            RegistrationField::query()
                ->whereIn('programme_id', $programmeIds)
                ->orderBy('sort_order')
                ->get()
                ->each(function (RegistrationField $field) use ($validator, $responses) {
                    if ($field->field_type === 'section') {
                        return;
                    }

                    $value = $this->registrationResponseValue($responses, $field);
                    $attribute = "registration_responses.{$field->programme_id}.{$field->id}";

                    if ($field->is_required && $this->isBlankDynamicAnswer($value)) {
                        $validator->errors()->add($attribute, "{$field->label} is required.");

                        return;
                    }

                    if ($this->isBlankDynamicAnswer($value)) {
                        return;
                    }

                    $options = collect($field->options ?? [])->map(fn ($option) => (string) $option)->all();

                    if (in_array($field->field_type, ['radio', 'select'], true) && $options && ! in_array((string) $value, $options, true)) {
                        $validator->errors()->add($attribute, "{$field->label} has an invalid selection.");
                    }

                    if ($field->field_type === 'checkbox') {
                        if (! is_array($value)) {
                            $validator->errors()->add($attribute, "{$field->label} has an invalid selection.");

                            return;
                        }

                        foreach ($value as $selected) {
                            if ($options && ! in_array((string) $selected, $options, true)) {
                                $validator->errors()->add($attribute, "{$field->label} has an invalid selection.");

                                return;
                            }
                        }
                    }

                    if ($field->field_type === 'email' && ! filter_var((string) $value, FILTER_VALIDATE_EMAIL)) {
                        $validator->errors()->add($attribute, "{$field->label} must be a valid email address.");
                    }
                });
        })->validate();

        $programmeIds = $this->programmeIdsFromInput($input);
        $existingUser = $this->findUserByEmail((string) ($input['email'] ?? ''));

        if ($existingUser) {
            return $this->registerExistingUserForProgrammes($existingUser, $programmeIds, $input);
        }

        $foodRestrictions = array_values(array_unique($input['food_restrictions'] ?? []));
        $accessibilityNeeds = array_values(array_unique($input['accessibility_needs'] ?? []));
        $userTypeId = isset($input['user_type_id']) ? (int) $input['user_type_id'] : null;
        $otherUserType = $this->isOtherUserTypeId($userTypeId)
            ? trim((string) ($input['other_user_type'] ?? '')) ?: null
            : null;
        $fullName = $this->buildFullName(
            (string) $input['given_name'],
            $input['middle_name'] ?? null,
            (string) $input['family_name'],
            $input['suffix'] ?? null
        );

        $user = User::create([
            'name' => $fullName,
            'honorific_title' => $input['honorific_title'],
            'honorific_other' => $input['honorific_other'] ?? null,
            'given_name' => $input['given_name'],
            'middle_name' => $input['middle_name'] ?? null,
            'family_name' => $input['family_name'],
            'suffix' => $input['suffix'] ?? null,
            'sex_assigned_at_birth' => $input['sex_assigned_at_birth'],
            'organization_name' => $input['organization_name'],
            'position_title' => $input['position_title'],
            'email' => $input['email'],
            'contact_country_code' => $input['contact_country_code'],
            'contact_number' => $input['contact_number'],
            'password' => $input['password'],
            'country_id' => $input['country_id'],
            'user_type_id' => $input['user_type_id'],
            'other_user_type' => $otherUserType,
            'ip_affiliation' => (bool) ($input['ip_affiliation'] ?? false),
            'ip_group_name' => $input['ip_group_name'] ?? null,
            'consent_contact_sharing' => (bool) ($input['consent_contact_sharing'] ?? false),
            'consent_photo_video' => (bool) ($input['consent_photo_video'] ?? false),
            'attend_welcome_dinner' => (bool) ($input['attend_welcome_dinner'] ?? false),
            'avail_transport_from_makati_to_peninsula' => (bool) (
                (bool) ($input['attend_welcome_dinner'] ?? false)
                && (bool) ($input['avail_transport_from_makati_to_peninsula'] ?? false)
            ),
            'has_food_restrictions' => ! empty($foodRestrictions),
            'food_restrictions' => $foodRestrictions,
            'dietary_allergies' => $input['dietary_allergies'] ?? null,
            'dietary_other' => $input['dietary_other'] ?? null,
            'accessibility_needs' => $accessibilityNeeds,
            'accessibility_other' => $input['accessibility_other'] ?? null,
            'emergency_contact_name' => $input['emergency_contact_name'] ?? null,
            'emergency_contact_relationship' => $input['emergency_contact_relationship'] ?? null,
            'emergency_contact_phone' => $input['emergency_contact_phone'] ?? null,
            'emergency_contact_email' => $input['emergency_contact_email'] ?? null,
            'profile_photo_path' => $this->storeProfilePhoto($input['profile_photo'] ?? null),
        ])->refresh();

        if (! empty($programmeIds)) {
            $user->joinedProgrammes()->sync($programmeIds);
            $this->storeRegistrationResponses($user, $programmeIds, $input['registration_responses'] ?? []);
        }

        app(WelcomeNotificationService::class)->dispatch($user);

        return $user;
    }

    /**
     * @return array<int, int>
     */
    private function programmeIdsFromInput(array $input): array
    {
        return collect($input['programme_ids'] ?? [])
            ->map(fn ($id) => (int) $id)
            ->filter()
            ->unique()
            ->values()
            ->all();
    }

    private function findUserByEmail(string $email): ?User
    {
        $email = Str::lower(trim($email));

        if ($email === '') {
            return null;
        }

        return User::query()
            ->whereRaw('LOWER(email) = ?', [$email])
            ->first();
    }

    /**
     * @param  array<int, int>  $programmeIds
     * @param  array<string, mixed>  $input
     */
    private function registerExistingUserForProgrammes(User $user, array $programmeIds, array $input): User
    {
        if (empty($programmeIds)) {
            throw ValidationException::withMessages([
                'email' => 'The email has already been taken.',
            ]);
        }

        $joinedProgrammeIds = $user->joinedProgrammes()
            ->whereIn('programmes.id', $programmeIds)
            ->pluck('programmes.id')
            ->map(fn ($id) => (int) $id)
            ->all();

        $newProgrammeIds = collect($programmeIds)
            ->diff($joinedProgrammeIds)
            ->values()
            ->all();

        if (empty($newProgrammeIds)) {
            throw ValidationException::withMessages([
                'email' => 'This email is already registered for the selected event.',
            ]);
        }

        $user->joinedProgrammes()->syncWithoutDetaching($newProgrammeIds);
        $this->storeRegistrationResponses($user, $newProgrammeIds, $input['registration_responses'] ?? []);

        app(WelcomeNotificationService::class)->dispatch($user);

        return $user->refresh();
    }

    private function buildFullName(string $givenName, ?string $middleName, string $familyName, ?string $suffix): string
    {
        $parts = [
            trim($givenName),
            trim((string) $middleName),
            trim($familyName),
            trim((string) $suffix),
        ];

        return collect($parts)
            ->filter(fn ($value) => $value !== '')
            ->implode(' ');
    }

    private function isOtherUserTypeId(?int $userTypeId): bool
    {
        if (! $userTypeId) {
            return false;
        }

        $type = UserType::find($userTypeId);
        if (! $type) {
            return false;
        }

        return Str::lower((string) $type->slug) === 'other' || Str::lower($type->name) === 'other';
    }

    private function storeProfilePhoto(mixed $profilePhoto): ?string
    {
        if (! $profilePhoto instanceof UploadedFile) {
            return null;
        }

        $extension = $profilePhoto->getClientOriginalExtension() ?: 'jpg';
        $filename = sprintf('%s.%s', Str::uuid(), $extension);
        $directory = public_path('profile-image');

        if (! File::exists($directory)) {
            File::makeDirectory($directory, 0755, true);
        }

        $profilePhoto->move($directory, $filename);

        return 'profile-image/'.$filename;
    }

    private function storeRegistrationResponses(User $user, array $programmeIds, mixed $responses): void
    {
        if (! is_array($responses)) {
            return;
        }

        $fields = RegistrationField::query()
            ->whereIn('programme_id', $programmeIds)
            ->where('field_type', '!=', 'section')
            ->get();

        foreach ($fields as $field) {
            $value = $this->registrationResponseValue($responses, $field);

            if ($this->isBlankDynamicAnswer($value)) {
                continue;
            }

            $answer = is_array($value)
                ? array_values(array_filter($value, fn ($item) => trim((string) $item) !== ''))
                : trim((string) $value);

            $user->registrationFieldResponses()->updateOrCreate(
                [
                    'registration_field_id' => $field->id,
                ],
                [
                    'programme_id' => $field->programme_id,
                    'answer' => $answer,
                ],
            );
        }
    }

    private function registrationResponseValue(array $responses, RegistrationField $field): mixed
    {
        return $responses[$field->programme_id][$field->id]
            ?? $responses[(string) $field->programme_id][(string) $field->id]
            ?? $responses[(string) $field->programme_id][$field->id]
            ?? $responses[$field->programme_id][(string) $field->id]
            ?? null;
    }

    private function isBlankDynamicAnswer(mixed $value): bool
    {
        if (is_array($value)) {
            return collect($value)->filter(fn ($item) => trim((string) $item) !== '')->isEmpty();
        }

        return trim((string) $value) === '';
    }
}
