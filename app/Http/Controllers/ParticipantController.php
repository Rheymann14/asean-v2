<?php

namespace App\Http\Controllers;

use App\Models\Country;
use App\Models\ParticipantAttendance;
use App\Models\Programme;
use App\Models\User;
use App\Models\UserType;
use App\Services\WelcomeNotificationService;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class ParticipantController extends Controller
{
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

    public function index()
    {
        $countries = Country::orderBy('name')->get()->map(fn (Country $country) => [
            'id' => $country->id,
            'code' => $country->code,
            'name' => $country->name,
            'is_active' => $country->is_active,
            'flag_url' => $country->flag_url,
        ]);

        $userTypes = UserType::orderBy('sequence_order')->orderBy('id')->get()->map(fn (UserType $type) => [
            'id' => $type->id,
            'name' => $type->name,
            'slug' => $type->slug,
            'is_active' => $type->is_active,
            'sequence_order' => $type->sequence_order,
        ]);

        $attendanceByUser = ParticipantAttendance::query()
            ->select(['user_id', 'programme_id', 'scanned_at'])
            ->get()
            ->groupBy('user_id');

        $participants = User::with(['country', 'userType', 'joinedProgrammes'])
            ->orderBy('name')
            ->get()
            ->map(function (User $user) use ($attendanceByUser) {
                $attendanceEntries = $attendanceByUser->get($user->id, collect());

                return [
                    'id' => $user->id,
                    'full_name' => $user->name,
                    'display_id' => $user->display_id,
                    'qr_payload' => $user->qr_payload,
                    'profile_image_url' => $user->profile_photo_path ? asset($user->profile_photo_path) : null,
                    'profile_photo_url' => $user->profile_photo_path ? asset($user->profile_photo_path) : null,
                    'profile_photo_path' => $user->profile_photo_path,
                    'email' => $user->email,
                    'contact_number' => $user->contact_number,
                    'contact_country_code' => $user->contact_country_code,
                    'country_id' => $user->country_id,
                    'user_type_id' => $user->user_type_id,
                    'other_user_type' => $user->other_user_type,
                    'honorific_title' => $user->honorific_title,
                    'honorific_other' => $user->honorific_other,
                    'given_name' => $user->given_name,
                    'middle_name' => $user->middle_name,
                    'family_name' => $user->family_name,
                    'suffix' => $user->suffix,
                    'sex_assigned_at_birth' => $user->sex_assigned_at_birth,
                    'organization_name' => $user->organization_name,
                    'position_title' => $user->position_title,
                    'ip_affiliation' => $user->ip_affiliation,
                    'ip_group_name' => $user->ip_group_name,
                    'is_active' => $user->is_active,
                    'consent_contact_sharing' => $user->consent_contact_sharing,
                    'consent_photo_video' => $user->consent_photo_video,
                    'has_food_restrictions' => $user->has_food_restrictions,
                    'food_restrictions' => $user->food_restrictions ?? [],
                    'dietary_allergies' => $user->dietary_allergies,
                    'dietary_other' => $user->dietary_other,
                    'accessibility_needs' => $user->accessibility_needs ?? [],
                    'accessibility_other' => $user->accessibility_other,
                    'emergency_contact_name' => $user->emergency_contact_name,
                    'emergency_contact_relationship' => $user->emergency_contact_relationship,
                    'emergency_contact_phone' => $user->emergency_contact_phone,
                    'emergency_contact_email' => $user->emergency_contact_email,
                    'created_at' => $user->created_at?->toISOString(),
                    'joined_programme_ids' => $user->joinedProgrammes
                        ? $user->joinedProgrammes->pluck('id')->values()->all()
                        : [],
                    'checked_in_programme_ids' => $attendanceEntries
                        ->pluck('programme_id')
                        ->values()
                        ->all(),
                    'checked_in_programmes' => $attendanceEntries
                        ->map(fn (ParticipantAttendance $attendance) => [
                            'programme_id' => $attendance->programme_id,
                            'scanned_at' => $attendance->scanned_at?->toISOString(),
                        ])
                        ->values()
                        ->all(),
                    'country' => $user->country
                        ? [
                            'id' => $user->country->id,
                            'code' => $user->country->code,
                            'name' => $user->country->name,
                            'is_active' => $user->country->is_active,
                            'flag_url' => $user->country->flag_url,
                        ]
                        : null,
                    'user_type' => $user->userType
                        ? [
                            'id' => $user->userType->id,
                            'name' => $user->userType->name,
                            'slug' => $user->userType->slug,
                            'is_active' => $user->userType->is_active,
                            'sequence_order' => $user->userType->sequence_order,
                        ]
                        : null,
                ];
            });

        $programmes = Programme::query()
            ->with(['venues' => fn ($query) => $query->where('is_active', true)->orderBy('id')])
            ->orderBy('starts_at')
            ->get()
            ->map(function (Programme $programme) {
                $venue = $programme->venues->first();

                return [
                    'id' => $programme->id,
                    'tag' => $programme->tag,
                    'title' => $programme->title,
                    'description' => $programme->description,
                    'starts_at' => $programme->starts_at?->toISOString(),
                    'ends_at' => $programme->ends_at?->toISOString(),
                    'location' => $programme->location,
                    'venue' => $venue
                        ? [
                            'name' => $venue->name,
                            'address' => $venue->address,
                        ]
                        : null,
                    'image_url' => $programme->image_url,
                    'is_active' => $programme->is_active,
                ];
            });

        return Inertia::render('participant', [
            'countries' => $countries,
            'userTypes' => $userTypes,
            'participants' => $participants,
            'programmes' => $programmes,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'full_name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'contact_number' => ['nullable', 'string', 'max:30'],
            'contact_country_code' => ['nullable', 'string', 'max:10'],
            'country_id' => ['nullable', 'exists:countries,id'],
            'user_type_id' => ['nullable', 'exists:user_types,id'],
            'other_user_type' => ['nullable', 'string', 'max:255'],
            'honorific_title' => ['nullable', 'string', 'max:50'],
            'honorific_other' => ['nullable', 'string', 'max:255'],
            'given_name' => ['nullable', 'string', 'max:255'],
            'middle_name' => ['nullable', 'string', 'max:255'],
            'family_name' => ['nullable', 'string', 'max:255'],
            'suffix' => ['nullable', 'string', 'max:50'],
            'sex_assigned_at_birth' => ['nullable', 'string', Rule::in(['male', 'female'])],
            'organization_name' => ['nullable', 'string', 'max:255'],
            'position_title' => ['nullable', 'string', 'max:255'],
            'ip_affiliation' => ['nullable', 'boolean'],
            'ip_group_name' => ['nullable', 'string', 'max:255'],
            'is_active' => ['boolean'],
            'password' => ['nullable', 'string', 'min:8'],
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
            'profile_image' => ['nullable', 'image', 'max:5120'],
            'remove_profile_image' => ['nullable', 'boolean'],
        ]);

        $userTypeId = $validated['user_type_id'] ?? null;
        $otherUserType = $this->isOtherUserTypeId($userTypeId)
            ? trim((string) ($validated['other_user_type'] ?? '')) ?: null
            : null;
        $foodRestrictions = array_values(array_unique($validated['food_restrictions'] ?? []));
        $accessibilityNeeds = array_values(array_unique($validated['accessibility_needs'] ?? []));
        $fullName = $this->buildFullName(
            $validated['given_name'] ?? '',
            $validated['middle_name'] ?? null,
            $validated['family_name'] ?? '',
            $validated['suffix'] ?? null,
        );

        $user = User::create([
            'name' => $fullName ?: $validated['full_name'],
            'email' => $validated['email'],
            'contact_number' => $validated['contact_number'] ?? null,
            'contact_country_code' => $validated['contact_country_code'] ?? null,
            'password' => $validated['password'] ?? 'aseanph2026',
            'country_id' => $validated['country_id'] ?? null,
            'user_type_id' => $validated['user_type_id'] ?? null,
            'other_user_type' => $otherUserType,
            'honorific_title' => $validated['honorific_title'] ?? null,
            'honorific_other' => $validated['honorific_other'] ?? null,
            'given_name' => $validated['given_name'] ?? null,
            'middle_name' => $validated['middle_name'] ?? null,
            'family_name' => $validated['family_name'] ?? null,
            'suffix' => $validated['suffix'] ?? null,
            'sex_assigned_at_birth' => $validated['sex_assigned_at_birth'] ?? null,
            'organization_name' => $validated['organization_name'] ?? null,
            'position_title' => $validated['position_title'] ?? null,
            'ip_affiliation' => (bool) ($validated['ip_affiliation'] ?? false),
            'ip_group_name' => (bool) ($validated['ip_affiliation'] ?? false)
                ? ($validated['ip_group_name'] ?? null)
                : null,
            'is_active' => $validated['is_active'] ?? true,
            'has_food_restrictions' => $this->canHaveFoodRestrictions($userTypeId)
                ? ! empty($foodRestrictions)
                : false,
            'food_restrictions' => $this->canHaveFoodRestrictions($userTypeId) ? $foodRestrictions : [],
            'dietary_allergies' => $validated['dietary_allergies'] ?? null,
            'dietary_other' => $validated['dietary_other'] ?? null,
            'accessibility_needs' => $accessibilityNeeds,
            'accessibility_other' => in_array('other', $accessibilityNeeds, true)
                ? ($validated['accessibility_other'] ?? null)
                : null,
            'emergency_contact_name' => $validated['emergency_contact_name'] ?? null,
            'emergency_contact_relationship' => $validated['emergency_contact_relationship'] ?? null,
            'emergency_contact_phone' => $validated['emergency_contact_phone'] ?? null,
            'emergency_contact_email' => $validated['emergency_contact_email'] ?? null,
            'profile_photo_path' => $this->storeProfileImage($request->file('profile_image')),
        ])->refresh();

        app(WelcomeNotificationService::class)->dispatch($user);

        return back();
    }

    public function update(Request $request, User $participant)
    {
        $validated = $request->validate([
            'full_name' => ['sometimes', 'required', 'string', 'max:255'],
            'email' => ['sometimes', 'required', 'email', 'max:255', 'unique:users,email,' . $participant->id],
            'contact_number' => ['sometimes', 'nullable', 'string', 'max:30'],
            'contact_country_code' => ['sometimes', 'nullable', 'string', 'max:10'],
            'country_id' => ['nullable', 'exists:countries,id'],
            'user_type_id' => ['nullable', 'exists:user_types,id'],
            'other_user_type' => ['sometimes', 'nullable', 'string', 'max:255'],
            'honorific_title' => ['sometimes', 'nullable', 'string', 'max:50'],
            'honorific_other' => ['sometimes', 'nullable', 'string', 'max:255'],
            'given_name' => ['sometimes', 'nullable', 'string', 'max:255'],
            'middle_name' => ['sometimes', 'nullable', 'string', 'max:255'],
            'family_name' => ['sometimes', 'nullable', 'string', 'max:255'],
            'suffix' => ['sometimes', 'nullable', 'string', 'max:50'],
            'sex_assigned_at_birth' => ['sometimes', 'nullable', 'string', Rule::in(['male', 'female'])],
            'organization_name' => ['sometimes', 'nullable', 'string', 'max:255'],
            'position_title' => ['sometimes', 'nullable', 'string', 'max:255'],
            'ip_affiliation' => ['sometimes', 'nullable', 'boolean'],
            'ip_group_name' => ['sometimes', 'nullable', 'string', 'max:255'],
            'is_active' => ['sometimes', 'boolean'],
            'password' => ['sometimes', 'nullable', 'string', 'min:8'],
            'has_food_restrictions' => ['sometimes', 'boolean'],
            'food_restrictions' => ['sometimes', 'array'],
            'food_restrictions.*' => ['string', Rule::in(self::FOOD_RESTRICTION_OPTIONS)],
            'dietary_allergies' => ['sometimes', 'nullable', 'string', 'max:255'],
            'dietary_other' => ['sometimes', 'nullable', 'string', 'max:255'],
            'accessibility_needs' => ['sometimes', 'array'],
            'accessibility_needs.*' => ['string', Rule::in(self::ACCESSIBILITY_NEEDS_OPTIONS)],
            'accessibility_other' => ['sometimes', 'nullable', 'string', 'max:255'],
            'emergency_contact_name' => ['sometimes', 'nullable', 'string', 'max:255'],
            'emergency_contact_relationship' => ['sometimes', 'nullable', 'string', 'max:255'],
            'emergency_contact_phone' => ['sometimes', 'nullable', 'string', 'max:30'],
            'emergency_contact_email' => ['sometimes', 'nullable', 'email', 'max:255'],
            'profile_image' => ['sometimes', 'nullable', 'image', 'max:5120'],
            'remove_profile_image' => ['sometimes', 'nullable', 'boolean'],
        ]);

        $wasActive = (bool) $participant->is_active;
        $updates = [];

        if (array_key_exists('full_name', $validated)) {
            $updates['name'] = $validated['full_name'];
        }

        if (
            array_key_exists('given_name', $validated) ||
            array_key_exists('middle_name', $validated) ||
            array_key_exists('family_name', $validated) ||
            array_key_exists('suffix', $validated)
        ) {
            $fullName = $this->buildFullName(
                $validated['given_name'] ?? (string) $participant->given_name,
                $validated['middle_name'] ?? $participant->middle_name,
                $validated['family_name'] ?? (string) $participant->family_name,
                $validated['suffix'] ?? $participant->suffix,
            );

            if ($fullName !== '') {
                $updates['name'] = $fullName;
            }
        }

        if (array_key_exists('email', $validated)) {
            $updates['email'] = $validated['email'];
        }

        if (array_key_exists('contact_number', $validated)) {
            $updates['contact_number'] = $validated['contact_number'];
        }

        if (array_key_exists('contact_country_code', $validated)) {
            $updates['contact_country_code'] = $validated['contact_country_code'];
        }

        if (array_key_exists('country_id', $validated)) {
            $updates['country_id'] = $validated['country_id'];
        }

        if (array_key_exists('user_type_id', $validated)) {
            $updates['user_type_id'] = $validated['user_type_id'];
        }

        foreach ([
            'honorific_title',
            'honorific_other',
            'given_name',
            'middle_name',
            'family_name',
            'suffix',
            'sex_assigned_at_birth',
            'organization_name',
            'position_title',
            'ip_affiliation',
            'ip_group_name',
            'dietary_allergies',
            'dietary_other',
            'accessibility_other',
            'emergency_contact_name',
            'emergency_contact_relationship',
            'emergency_contact_phone',
            'emergency_contact_email',
        ] as $field) {
            if (array_key_exists($field, $validated)) {
                $updates[$field] = $validated[$field];
            }
        }

        if (array_key_exists('accessibility_needs', $validated)) {
            $accessibilityNeeds = array_values(array_unique($validated['accessibility_needs'] ?? []));
            $updates['accessibility_needs'] = $accessibilityNeeds;
            if (! in_array('other', $accessibilityNeeds, true)) {
                $updates['accessibility_other'] = null;
            }
        }

        if (array_key_exists('ip_affiliation', $validated) && ! $validated['ip_affiliation']) {
            $updates['ip_group_name'] = null;
        }

        if (array_key_exists('is_active', $validated)) {
            $updates['is_active'] = $validated['is_active'];
        }

        $nextUserTypeId = array_key_exists('user_type_id', $validated)
            ? $validated['user_type_id']
            : $participant->user_type_id;

        if (array_key_exists('other_user_type', $validated) || array_key_exists('user_type_id', $validated)) {
            $updates['other_user_type'] = $this->isOtherUserTypeId($nextUserTypeId)
                ? trim((string) ($validated['other_user_type'] ?? '')) ?: null
                : null;
        }

        if (array_key_exists('food_restrictions', $validated)) {
            $foodRestrictions = array_values(array_unique($validated['food_restrictions'] ?? []));
            $updates['food_restrictions'] = $this->canHaveFoodRestrictions($nextUserTypeId)
                ? $foodRestrictions
                : [];
            $updates['has_food_restrictions'] = ! empty($updates['food_restrictions']);
        } elseif (! $this->canHaveFoodRestrictions($nextUserTypeId)) {
            $updates['food_restrictions'] = [];
            $updates['has_food_restrictions'] = false;
        } elseif (array_key_exists('has_food_restrictions', $validated) && ! $validated['has_food_restrictions']) {
            $updates['food_restrictions'] = [];
            $updates['has_food_restrictions'] = false;
        }

        if (($validated['remove_profile_image'] ?? false) && $participant->profile_photo_path) {
            File::delete(public_path($participant->profile_photo_path));
            $updates['profile_photo_path'] = null;
        }

        $profileImagePath = $this->storeProfileImage($request->file('profile_image'));
        if ($profileImagePath) {
            if ($participant->profile_photo_path) {
                File::delete(public_path($participant->profile_photo_path));
            }
            $updates['profile_photo_path'] = $profileImagePath;
        }

        if (array_key_exists('password', $validated) && $validated['password'] !== null) {
            $updates['password'] = $validated['password'];
        }

        $participant->update($updates);

        if ($wasActive && array_key_exists('is_active', $updates) && ! $updates['is_active']) {
            DB::table('sessions')->where('user_id', $participant->id)->delete();
            $participant->forceFill(['remember_token' => Str::random(60)])->save();
        }

        return back();
    }

    public function destroy(User $participant)
    {
        $participant->delete();

        return back();
    }

    public function joinProgramme(Request $request, User $participant, Programme $programme)
    {
        $participant->joinedProgrammes()->syncWithoutDetaching([$programme->id]);

        return back();
    }

    public function leaveProgramme(Request $request, User $participant, Programme $programme)
    {
        $participant->joinedProgrammes()->detach($programme->id);

        return back();
    }

    private function canHaveFoodRestrictions(?int $userTypeId): bool
    {
        if (! $userTypeId) {
            return true;
        }

        $userType = UserType::query()->find($userTypeId);
        if (! $userType) {
            return true;
        }

        $value = Str::of((string) ($userType->slug ?: $userType->name))
            ->lower()
            ->replace(['_', '-'], ' ')
            ->trim();

        return $value !== 'ched' && ! $value->startsWith('ched ');
    }

    private function isOtherUserTypeId(?int $userTypeId): bool
    {
        if (! $userTypeId) {
            return false;
        }

        $userType = UserType::query()->find($userTypeId);
        if (! $userType) {
            return false;
        }

        return Str::lower((string) $userType->slug) === 'other' || Str::lower($userType->name) === 'other';
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

    private function storeProfileImage(?UploadedFile $file): ?string
    {
        if (! $file) {
            return null;
        }

        $extension = $file->getClientOriginalExtension() ?: 'jpg';
        $filename = sprintf('%s.%s', Str::uuid(), $extension);
        $directory = public_path('profile-image');

        if (! File::exists($directory)) {
            File::makeDirectory($directory, 0755, true);
        }

        $file->move($directory, $filename);

        return 'profile-image/' . $filename;
    }

    public function revertAttendance(Request $request, User $participant, Programme $programme)
    {
        ParticipantAttendance::query()
            ->where('user_id', $participant->id)
            ->where('programme_id', $programme->id)
            ->delete();

        return back();
    }
}
