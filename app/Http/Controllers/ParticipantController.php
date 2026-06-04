<?php

namespace App\Http\Controllers;

use App\Models\Country;
use App\Models\EventRegistrationAttendee;
use App\Models\ParticipantAttendance;
use App\Models\Programme;
use App\Models\RegistrationField;
use App\Models\User;
use App\Models\UserType;
use App\Services\WelcomeNotificationService;
use App\Support\EventDefaults;
use BaconQrCode\Common\ErrorCorrectionLevel;
use BaconQrCode\Encoder\Encoder;
use Dompdf\Cpdf;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator as ValidationValidator;
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

    public function index(Request $request)
    {
        $programmesForFilters = Programme::query()
            ->with([
                'registrationFields',
                'venues' => fn ($query) => $query->where('is_active', true)->orderBy('id'),
            ])
            ->orderBy('starts_at')
            ->get();
        $defaultProgrammeId = EventDefaults::defaultEventId($programmesForFilters);

        $filters = [
            'search' => trim((string) $request->query('search', '')),
            'country_id' => (string) $request->query('country_id', 'all'),
            'user_type_id' => (string) $request->query('user_type_id', 'all'),
            'status' => (string) $request->query('status', 'all'),
            'programme_id' => $request->has('programme_id')
                ? (string) $request->query('programme_id', 'all')
                : ($defaultProgrammeId > 0 ? (string) $defaultProgrammeId : 'all'),
        ];

        $perPage = (int) $request->query('per_page', 10);
        if (! in_array($perPage, [10, 20, 50, 100, 1000], true)) {
            $perPage = 10;
        }

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

        $selectedProgramme = $filters['programme_id'] !== 'all' && is_numeric($filters['programme_id'])
            ? Programme::query()->find((int) $filters['programme_id'])
            : null;

        $usesAsemme10RegistrationData = $selectedProgramme
            ? $this->isAsemme10Programme($selectedProgramme)
            : false;

        if ($usesAsemme10RegistrationData) {
            $latestAttendeeIds = EventRegistrationAttendee::query()
                ->selectRaw('MAX(id)')
                ->where('programme_id', $selectedProgramme->id)
                ->groupBy('user_id');

            $participantPaginator = EventRegistrationAttendee::query()
                ->with([
                    'submission.country',
                    'user.country',
                    'user.userType',
                    'user.joinedProgrammes:id,title',
                ])
                ->where('programme_id', $selectedProgramme->id)
                ->whereIn('id', $latestAttendeeIds)
                ->when($filters['search'] !== '', function ($query) use ($filters) {
                    $search = $filters['search'];

                    $query->where(function ($query) use ($search) {
                        $query
                            ->where('given_name', 'like', "%{$search}%")
                            ->orWhere('family_name', 'like', "%{$search}%")
                            ->orWhere('badge_name', 'like', "%{$search}%")
                            ->orWhere('email', 'like', "%{$search}%")
                            ->orWhere('role', 'like', "%{$search}%")
                            ->orWhere('organization_name', 'like', "%{$search}%")
                            ->orWhere('position_title', 'like', "%{$search}%")
                            ->orWhereHas('submission', function ($submissionQuery) use ($search) {
                                $submissionQuery
                                    ->where('registration_type', 'like', "%{$search}%")
                                    ->orWhere('focal_name', 'like', "%{$search}%")
                                    ->orWhere('focal_email', 'like', "%{$search}%");
                            })
                            ->orWhereHas('submission.country', fn ($countryQuery) => $countryQuery->where('name', 'like', "%{$search}%"))
                            ->orWhereHas('user.country', fn ($countryQuery) => $countryQuery->where('name', 'like', "%{$search}%"));
                    });
                })
                ->when($filters['country_id'] !== 'all' && is_numeric($filters['country_id']), function ($query) use ($filters) {
                    $countryId = (int) $filters['country_id'];

                    $query->where(function ($query) use ($countryId) {
                        $query
                            ->whereHas('submission', fn ($submissionQuery) => $submissionQuery->where('country_id', $countryId))
                            ->orWhereHas('user', fn ($userQuery) => $userQuery->where('country_id', $countryId));
                    });
                })
                ->when($filters['user_type_id'] !== 'all' && is_numeric($filters['user_type_id']), function ($query) use ($filters) {
                    $query->whereHas('user', fn ($userQuery) => $userQuery->where('user_type_id', (int) $filters['user_type_id']));
                })
                ->when(in_array($filters['status'], ['active', 'inactive'], true), function ($query) use ($filters) {
                    $query->whereHas('user', fn ($userQuery) => $userQuery->where('is_active', $filters['status'] === 'active'));
                })
                ->orderByDesc('created_at')
                ->orderBy('role')
                ->paginate($perPage)
                ->withQueryString();

            $participantIds = collect($participantPaginator->items())
                ->pluck('user_id')
                ->filter()
                ->unique()
                ->values();

            $attendanceByUser = ParticipantAttendance::query()
                ->select(['user_id', 'programme_id', 'scanned_at'])
                ->whereIn('user_id', $participantIds)
                ->get()
                ->groupBy('user_id');

            $responsesByUser = DB::table('registration_field_responses')
                ->select(['user_id', 'programme_id', 'registration_field_id', 'answer'])
                ->whereIn('user_id', $participantIds)
                ->get()
                ->groupBy('user_id')
                ->map(function ($rows) {
                    return $rows
                        ->groupBy('programme_id')
                        ->map(function ($programmeRows) {
                            return $programmeRows->mapWithKeys(function ($row) {
                                $decoded = json_decode((string) $row->answer, true);

                                return [
                                    (string) $row->registration_field_id => json_last_error() === JSON_ERROR_NONE
                                        ? $decoded
                                        : $row->answer,
                                ];
                            })->all();
                        })
                        ->all();
                });

            $participants = $participantPaginator
                ->getCollection()
                ->map(function (EventRegistrationAttendee $attendee) use ($attendanceByUser, $responsesByUser) {
                    $user = $attendee->user;
                    $submission = $attendee->submission;
                    $country = $submission?->country ?? $user?->country;
                    $attendanceEntries = $user
                        ? $attendanceByUser->get($user->id, collect())
                        : collect();
                    $fullName = trim(collect([$attendee->given_name, $attendee->family_name])->filter()->implode(' '));

                    return [
                        'id' => $user?->id,
                        'full_name' => $fullName ?: ($attendee->badge_name ?: ($user?->name ?? 'Participant')),
                        'display_id' => $user?->display_id,
                        'qr_payload' => $user?->qr_payload,
                        'profile_image_url' => $user?->profile_photo_path ? asset($user->profile_photo_path) : null,
                        'profile_photo_url' => $user?->profile_photo_path ? asset($user->profile_photo_path) : null,
                        'profile_photo_path' => $user?->profile_photo_path,
                        'email' => $attendee->email ?? '',
                        'contact_number' => $user?->contact_number,
                        'contact_country_code' => $user?->contact_country_code,
                        'country_id' => $country?->id,
                        'user_type_id' => $user?->user_type_id,
                        'other_user_type' => $user?->other_user_type,
                        'honorific_title' => $attendee->title ?: $user?->honorific_title,
                        'honorific_other' => $user?->honorific_other,
                        'given_name' => $attendee->given_name,
                        'middle_name' => $user?->middle_name,
                        'family_name' => $attendee->family_name,
                        'suffix' => $user?->suffix,
                        'sex_assigned_at_birth' => $user?->sex_assigned_at_birth,
                        'organization_name' => $attendee->organization_name ?: $user?->organization_name,
                        'position_title' => $attendee->position_title ?: $user?->position_title,
                        'ip_affiliation' => $user?->ip_affiliation,
                        'ip_group_name' => $user?->ip_group_name,
                        'is_active' => (bool) ($user?->is_active ?? true),
                        'consent_contact_sharing' => $user?->consent_contact_sharing,
                        'consent_photo_video' => $user?->consent_photo_video,
                        'has_food_restrictions' => $user?->has_food_restrictions,
                        'food_restrictions' => $user?->food_restrictions ?? [],
                        'dietary_allergies' => $attendee->dietary_requirements ?: $user?->dietary_allergies,
                        'dietary_other' => $user?->dietary_other,
                        'accessibility_needs' => $user?->accessibility_needs ?? [],
                        'accessibility_other' => $attendee->mobility_or_special_needs ?: $user?->accessibility_other,
                        'emergency_contact_name' => $user?->emergency_contact_name,
                        'emergency_contact_relationship' => $user?->emergency_contact_relationship,
                        'emergency_contact_phone' => $user?->emergency_contact_phone,
                        'emergency_contact_email' => $user?->emergency_contact_email,
                        'created_at' => $attendee->created_at?->toISOString(),
                        'joined_programme_ids' => $user?->joinedProgrammes
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
                        'registration_responses' => $user ? $responsesByUser->get($user->id, []) : [],
                        'asemme10_registration' => [
                            'attendee_id' => $attendee->id,
                            'submission_id' => $submission?->id,
                            'role' => $attendee->role,
                            'title' => $attendee->title,
                            'badge_name' => $attendee->badge_name,
                            'registration_type' => $submission?->registration_type,
                            'focal_name' => $submission?->focal_name,
                            'focal_email' => $submission?->focal_email,
                            'focal_phone' => $submission?->focal_phone,
                            'focal_organization' => $submission?->focal_organization,
                            'focal_position' => $submission?->focal_position,
                            'consents' => $submission?->consents ?? [],
                            'delegation_details' => $submission?->delegation_details ?? [],
                            'dietary_requirements' => $attendee->dietary_requirements,
                            'mobility_or_special_needs' => $attendee->mobility_or_special_needs,
                            'submitted_at' => $submission?->submitted_at?->toISOString(),
                            'status' => $submission?->status,
                        ],
                        'country' => $country
                            ? [
                                'id' => $country->id,
                                'code' => $country->code,
                                'name' => $country->name,
                                'is_active' => $country->is_active,
                                'flag_url' => $country->flag_url,
                            ]
                            : null,
                        'user_type' => $user?->userType
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
        } else {
            $participantQuery = User::query()
                ->with(['country', 'userType', 'joinedProgrammes:id,title'])
                ->when($filters['search'] !== '', function ($query) use ($filters) {
                    $search = $filters['search'];

                    $query->where(function ($query) use ($search) {
                        $query
                            ->where('name', 'like', "%{$search}%")
                            ->orWhere('email', 'like', "%{$search}%")
                            ->orWhere('contact_number', 'like', "%{$search}%")
                            ->orWhereHas('country', fn ($countryQuery) => $countryQuery->where('name', 'like', "%{$search}%"))
                            ->orWhereHas('userType', fn ($typeQuery) => $typeQuery->where('name', 'like', "%{$search}%"));
                    });
                })
                ->when($filters['country_id'] !== 'all' && is_numeric($filters['country_id']), fn ($query) => $query->where('country_id', (int) $filters['country_id']))
                ->when($filters['user_type_id'] !== 'all' && is_numeric($filters['user_type_id']), fn ($query) => $query->where('user_type_id', (int) $filters['user_type_id']))
                ->when(in_array($filters['status'], ['active', 'inactive'], true), fn ($query) => $query->where('is_active', $filters['status'] === 'active'))
                ->when($filters['programme_id'] !== 'all' && is_numeric($filters['programme_id']), function ($query) use ($filters) {
                    $query->whereHas('joinedProgrammes', fn ($programmeQuery) => $programmeQuery->whereKey((int) $filters['programme_id']));
                })
                ->orderBy('name');

            $participantPaginator = $participantQuery
                ->paginate($perPage)
                ->withQueryString();

            $participantIds = collect($participantPaginator->items())->pluck('id');

            $attendanceByUser = ParticipantAttendance::query()
                ->select(['user_id', 'programme_id', 'scanned_at'])
                ->whereIn('user_id', $participantIds)
                ->get()
                ->groupBy('user_id');

            $responsesByUser = DB::table('registration_field_responses')
                ->select(['user_id', 'programme_id', 'registration_field_id', 'answer'])
                ->whereIn('user_id', $participantIds)
                ->get()
                ->groupBy('user_id')
                ->map(function ($rows) {
                    return $rows
                        ->groupBy('programme_id')
                        ->map(function ($programmeRows) {
                            return $programmeRows->mapWithKeys(function ($row) {
                                $decoded = json_decode((string) $row->answer, true);

                                return [
                                    (string) $row->registration_field_id => json_last_error() === JSON_ERROR_NONE
                                        ? $decoded
                                        : $row->answer,
                                ];
                            })->all();
                        })
                        ->all();
                });

            $participants = $participantPaginator
                ->getCollection()
                ->map(function (User $user) use ($attendanceByUser, $responsesByUser) {
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
                        'registration_responses' => $responsesByUser->get($user->id, []),
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
        }

        $programmes = $programmesForFilters
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
                    'registration_fields' => $this->registrationFieldsPayload($programme),
                    'image_url' => $programme->image_url,
                    'is_active' => $programme->is_active,
                    'is_registration_active' => $programme->is_registration_active,
                ];
            });

        return Inertia::render('participant', [
            'countries' => $countries,
            'userTypes' => $userTypes,
            'participants' => $participants,
            'participantPagination' => [
                'current_page' => $participantPaginator->currentPage(),
                'last_page' => $participantPaginator->lastPage(),
                'per_page' => $participantPaginator->perPage(),
                'total' => $participantPaginator->total(),
                'from' => $participantPaginator->firstItem(),
                'to' => $participantPaginator->lastItem(),
            ],
            'filters' => $filters,
            'programmes' => $programmes,
        ]);
    }

    private function isAsemme10Programme(Programme $programme): bool
    {
        $value = Str::lower(trim(($programme->tag ?? '').' '.$programme->title));

        return Str::contains($value, [
            'asemme10',
            'asemme 10',
            'asia-europe meeting of ministers for education',
            '10th asia-europe meeting',
        ]);
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
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
            'programme_id' => ['nullable', 'integer', 'exists:programmes,id'],
            'registration_responses' => ['nullable', 'array'],
        ]);

        $validator->after(fn (ValidationValidator $validator) => $this->validateRegistrationResponses($validator, $request));

        $validated = $validator->validate();

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

        $this->syncSelectedProgrammeAndResponses($user, $request);

        app(WelcomeNotificationService::class)->dispatch($user);

        return back();
    }

    public function update(Request $request, User $participant)
    {
        $validator = Validator::make($request->all(), [
            'full_name' => ['sometimes', 'required', 'string', 'max:255'],
            'email' => ['sometimes', 'required', 'email', 'max:255', 'unique:users,email,'.$participant->id],
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
            'programme_id' => ['nullable', 'integer', 'exists:programmes,id'],
            'registration_responses' => ['nullable', 'array'],
        ]);

        $validator->after(fn (ValidationValidator $validator) => $this->validateRegistrationResponses($validator, $request));

        $validated = $validator->validate();

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

        $this->syncSelectedProgrammeAndResponses($participant, $request);

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

    public function downloadIdCardsPdf(Request $request)
    {
        @ini_set('memory_limit', '512M');
        @set_time_limit(120);

        $validated = $request->validate([
            'orientation' => ['required', Rule::in(['portrait', 'landscape'])],
            'ids' => ['required', 'array', 'min:1', 'max:1000'],
            'ids.*' => ['integer', 'exists:users,id'],
        ]);

        $ids = collect($validated['ids'])
            ->map(fn ($id) => (int) $id)
            ->filter(fn ($id) => $id > 0)
            ->unique()
            ->values();

        $participantsById = User::query()
            ->select([
                'id',
                'name',
                'display_id',
                'qr_payload',
                'country_id',
                'user_type_id',
            ])
            ->with([
                'country:id,code,name',
                'userType:id,name,slug',
            ])
            ->whereIn('id', $ids)
            ->get()
            ->keyBy('id');

        $participants = $ids
            ->map(fn ($id) => $participantsById->get($id))
            ->filter()
            ->map(fn (User $user) => [
                'id' => $user->id,
                'name' => $user->name ?: 'Participant',
                'display_id' => $user->display_id ?: (string) $user->id,
                'qr_payload' => $user->qr_payload ?: ($user->display_id ?: (string) $user->id),
                'country_name' => $user->country?->name ?: '-',
                'country_code' => $user->country?->code ? strtoupper($user->country->code) : '',
                'type_name' => $user->userType?->name ?: '',
                'flag_path' => $this->countryFlagJpegPath($user->country?->code, $user->country?->name),
            ])
            ->values();

        $orientation = $validated['orientation'];
        $filename = sprintf(
            'participant-ids-%s-%s.pdf',
            $orientation,
            now()->format('Ymd-His'),
        );

        return response($this->buildIdCardsPdf($participants, $orientation), 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'attachment; filename="'.$filename.'"',
        ]);
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

    private function buildIdCardsPdf($participants, string $orientation): string
    {
        $isLandscape = $orientation === 'landscape';
        $pageWidth = $isLandscape ? 841.89 : 595.28;
        $pageHeight = $isLandscape ? 595.28 : 841.89;
        $cardWidth = $isLandscape ? 242.64 : 223.2;
        $cardHeight = $isLandscape ? 153.0 : 363.6;
        $columns = $isLandscape ? 3 : 2;
        $perPage = $isLandscape ? 9 : 4;
        $margin = 18.0;
        $gap = 8.0;

        $pdf = new Cpdf([0, 0, $pageWidth, $pageHeight], false);
        $pdf->selectFont(base_path('vendor/dompdf/dompdf/lib/fonts/Helvetica.afm'));
        $pdf->setLineStyle(0.6);
        $assets = [
            'background' => public_path('img/id-card-bg.jpg'),
            'asean_logo' => public_path('img/id-card-asean-logo.jpg'),
            'bagong_logo' => public_path('img/id-card-bagong-pilipinas-logo.jpg'),
        ];

        foreach ($assets as $key => $path) {
            if (! File::exists($path)) {
                $assets[$key] = null;
            }
        }

        foreach ($participants->values() as $index => $participant) {
            if ($index > 0 && $index % $perPage === 0) {
                $pdf->newPage();
            }

            $slot = $index % $perPage;
            $column = $slot % $columns;
            $row = intdiv($slot, $columns);
            $x = $margin + ($column * ($cardWidth + $gap));
            $top = $margin + ($row * ($cardHeight + $gap));
            $y = $pageHeight - $top - $cardHeight;

            $this->drawIdCard($pdf, $participant, $x, $y, $cardWidth, $cardHeight, $isLandscape, $assets);
        }

        return $pdf->output();
    }

    private function drawIdCard(
        Cpdf $pdf,
        array $participant,
        float $x,
        float $y,
        float $width,
        float $height,
        bool $isLandscape,
        array $assets
    ): void {
        $top = $y + $height;
        $pad = $isLandscape ? 9.0 : 14.0;
        $radius = $isLandscape ? 13.0 : 16.0;

        $pdf->setColor([1, 1, 1]);
        $this->filledRoundedRectangle($pdf, $x, $y, $width, $height, $radius);

        $pdf->clippingRectangleRounded($x, $y, $width, $height, $radius, $radius, $radius, $radius);
        if ($assets['background']) {
            $this->drawJpegCover($pdf, $assets['background'], $x, $y, $width, $height);
        } else {
            $pdf->setColor([0.90, 0.97, 1.0]);
            $pdf->filledRectangle($x, $y, $width, $height);
        }
        $pdf->clippingEnd();

        $pdf->setStrokeColor([0.80, 0.88, 0.95]);
        $pdf->setLineStyle(0.7);
        $this->roundedBorder($pdf, $x, $y, $width, $height, $radius);

        $logoSize = $isLandscape ? 17.0 : 22.0;
        $logoY = $top - $pad - $logoSize;
        if ($assets['asean_logo']) {
            $this->drawPdfImage($pdf, $assets['asean_logo'], $x + $pad, $logoY, $logoSize, $logoSize);
        }
        if ($assets['bagong_logo']) {
            $this->drawPdfImage($pdf, $assets['bagong_logo'], $x + $pad + $logoSize + 5.0, $logoY, $logoSize, $logoSize);
        }

        $titleX = $x + $pad + ($logoSize * 2) + 16.0;
        $titleLimit = $width - ($titleX - $x) - $pad;
        $titleSize = $isLandscape ? 6.6 : 6.9;
        $subtitleSize = $isLandscape ? 5.6 : 5.9;
        $this->drawText($pdf, $this->limitPdfText('ASEAN Philippines 2026', $this->charsForWidth($titleLimit, $titleSize)), $titleX, $top - $pad - 8.0, $titleSize, [0.08, 0.20, 0.36]);
        $this->drawText($pdf, 'Participant Identification', $titleX, $top - $pad - 18.6, $subtitleSize, [0.35, 0.43, 0.55]);

        $pdf->setStrokeColor([0.82, 0.88, 0.96]);
        $pdf->setLineStyle(0.5);
        $pdf->line($x + $pad, $top - $pad - 29, $x + $width - $pad, $top - $pad - 29);

        $name = $this->pdfText((string) $participant['name']);
        $country = $this->pdfText((string) $participant['country_name']);
        $countryCode = $this->pdfText((string) $participant['country_code']);
        $type = $this->pdfText((string) $participant['type_name']);
        $displayId = $this->pdfText((string) $participant['display_id']);
        $qrPayload = (string) ($participant['qr_payload'] ?? $participant['display_id']);
        $flagPath = $participant['flag_path'] ?? null;

        $bodyTop = $top - $pad - 43.0;
        $this->drawText($pdf, 'PARTICIPANT', $x + $pad, $bodyTop, $isLandscape ? 6.4 : 7.0, [0.39, 0.46, 0.57]);

        if ($isLandscape) {
            $qrPanelW = 84.0;
            $qrPanelX = $x + $width - $pad - $qrPanelW;
            $qrPanelY = $y + 16.0;
            $qrPanelH = 100.0;
            $leftLimit = $qrPanelX - $x - ($pad * 2) - 10.0;
            $nameSize = $this->fitPdfFontSize($name, $leftLimit, 9.0, 7.0, 2);
            $nameLineGap = $nameSize + 1.0;
            $nameLines = $this->wrapPdfText($name, $this->charsForWidth($leftLimit, $nameSize), 2);
            foreach ($nameLines as $lineIndex => $line) {
                $this->drawText($pdf, $line, $x + $pad, $bodyTop - 14.0 - ($lineIndex * $nameLineGap), $nameSize, [0.02, 0.06, 0.16]);
            }

            $detailsY = $bodyTop - 39.0 - ((count($nameLines) - 1) * $nameLineGap);
            $flagSize = 38.0;
            if ($flagPath) {
                $this->drawClippedJpeg($pdf, $flagPath, $x + $pad, $detailsY - 30.0, $flagSize, $flagSize, 7.0);
            }
            $detailX = $flagPath ? $x + $pad + $flagSize + 7.0 : $x + $pad;
            $detailLimit = $leftLimit - ($flagPath ? $flagSize + 7.0 : 0.0);
            $this->drawText($pdf, $this->limitPdfText($country, $this->charsForWidth($detailLimit, 8.0)), $detailX, $detailsY - 1.0, 8.0, [0.12, 0.18, 0.27]);
            if ($countryCode !== '') {
                $this->drawText($pdf, $this->limitPdfText($countryCode, $this->charsForWidth($detailLimit, 7.0)), $detailX, $detailsY - 13.0, 7.0, [0.39, 0.46, 0.57]);
            }

            $idLabelX = $flagPath ? $detailX : $x + $pad;
            $idLabelLimit = $flagPath ? $detailLimit : $leftLimit;
            $this->drawText($pdf, $this->limitPdfText('PARTICIPANT ID', $this->charsForWidth($idLabelLimit, 5.5)), $idLabelX, $y + 29.0, 5.5, [0.39, 0.46, 0.57]);
            $idText = $this->limitPdfText($displayId, $this->charsForWidth($leftLimit - 12.0, 6.8));
            $idWidth = min($leftLimit, max(58.0, strlen($idText) * 4.5 + 12.0));
            $idBadgeY = $y + 4.6;
            $idBadgeH = 16.5;
            $this->filledRoundedRectangle($pdf, $x + $pad, $idBadgeY, $idWidth, $idBadgeH, 7.0);
            $pdf->setStrokeColor([0.82, 0.88, 0.96]);
            $this->roundedBorder($pdf, $x + $pad, $idBadgeY, $idWidth, $idBadgeH, 7.0);
            $this->drawText($pdf, $idText, $x + $pad + 6.0, $idBadgeY + 5.7, 6.8, [0.02, 0.06, 0.16]);

            $this->drawQrPanel($pdf, $displayId, $qrPayload, $qrPanelX, $qrPanelY, $qrPanelW, $qrPanelH, 54.0, true, $countryCode, $name);

            return;
        }

        $leftLimit = $width - ($pad * 2);
        $nameSize = $this->fitPdfFontSize($name, $leftLimit, 12.5, 9.0, 2);
        $nameLineGap = $nameSize + 1.5;
        $nameLines = $this->wrapPdfText($name, $this->charsForWidth($leftLimit, $nameSize), 2);
        foreach ($nameLines as $lineIndex => $line) {
            $this->drawText($pdf, $line, $x + $pad, $bodyTop - 17.0 - ($lineIndex * $nameLineGap), $nameSize, [0.02, 0.06, 0.16]);
        }

        $detailsY = $bodyTop - 54.0 - ((count($nameLines) - 1) * $nameLineGap);
        $flagSize = 42.0;
        if ($flagPath) {
            $this->drawClippedJpeg($pdf, $flagPath, $x + $pad, $detailsY - 32.0, $flagSize, $flagSize, 8.0);
        }
        $detailX = $flagPath ? $x + $pad + $flagSize + 8.0 : $x + $pad;
        $detailLimit = $leftLimit - ($flagPath ? $flagSize + 8.0 : 0.0);
        $this->drawText($pdf, $this->limitPdfText($country, $this->charsForWidth($detailLimit, 10.8)), $detailX, $detailsY, 10.8, [0.12, 0.18, 0.27]);
        if ($countryCode !== '') {
            $this->drawText($pdf, $this->limitPdfText($countryCode, $this->charsForWidth($detailLimit, 9.0)), $detailX, $detailsY - 14.0, 9.0, [0.39, 0.46, 0.57]);
        }
        $idY = $detailsY - 64.0;
        $this->drawText($pdf, 'PARTICIPANT ID', $x + $pad, $idY + 24.0, 6.5, [0.39, 0.46, 0.57]);
        $idText = $this->limitPdfText($displayId, $this->charsForWidth($leftLimit - 12.0, 7.6));
        $idWidth = min($leftLimit, max(68.0, strlen($idText) * 5.1 + 14.0));
        $this->filledRoundedRectangle($pdf, $x + $pad, $idY, $idWidth, 20.0, 8.0);
        $pdf->setStrokeColor([0.82, 0.88, 0.96]);
        $this->roundedBorder($pdf, $x + $pad, $idY, $idWidth, 20.0, 8.0);
        $this->drawText($pdf, $idText, $x + $pad + 7.0, $idY + 7.2, 7.6, [0.02, 0.06, 0.16]);

        $qrPanelW = $width - ($pad * 2);
        $qrPanelH = 128.0;
        $qrPanelX = $x + $pad;
        $qrPanelY = $y + 24.0;
        $this->drawQrPanel($pdf, $displayId, $qrPayload, $qrPanelX, $qrPanelY, $qrPanelW, $qrPanelH, 80.0, false, $countryCode, $name);
    }

    private function drawQrPanel(
        Cpdf $pdf,
        string $displayId,
        string $qrPayload,
        float $x,
        float $y,
        float $width,
        float $height,
        float $qrSize,
        bool $compact,
        string $countryCode = '',
        string $name = ''
    ): void
    {
        $radius = $compact ? 11.0 : 15.0;
        $this->filledRoundedRectangle($pdf, $x, $y, $width, $height, $radius);
        $pdf->setStrokeColor([0.82, 0.88, 0.96]);
        $this->roundedBorder($pdf, $x, $y, $width, $height, $radius);

        $titleSize = $compact ? 5.8 : 6.8;
        $this->drawCenteredText($pdf, 'QR Code', $x + ($width / 2), $y + $height - ($compact ? 12.0 : 13.0), $titleSize, [0.12, 0.18, 0.27]);

        $qrX = $x + (($width - $qrSize) / 2);
        $qrY = $y + ($compact ? 26.0 : 31.0);
        $pdf->setColor([1, 1, 1]);
        $pdf->filledRectangle($qrX, $qrY, $qrSize, $qrSize);
        $this->drawQr($pdf, $qrPayload, $qrX + 3.0, $qrY + 3.0, $qrSize - 6.0);

        $ownerText = trim(($countryCode !== '' ? $countryCode.' - ' : '').$name);
        if ($ownerText !== '') {
            $ownerSize = $compact ? 4.3 : 5.5;
            $ownerY = $compact ? $y + 14.5 : $y + 17.0;
            $ownerText = $this->limitPdfText($ownerText, $this->charsForWidth($width - 12.0, $ownerSize));
            $this->drawCenteredText($pdf, $ownerText, $x + ($width / 2), $ownerY, $ownerSize, [0.12, 0.18, 0.27]);
        }

        $idSize = $compact ? 4.1 : 5.0;
        $idY = $compact ? $y + 7.2 : $y + 8.5;
        $idText = $this->limitPdfText($displayId, $this->charsForWidth($width - 12.0, $idSize));
        $this->drawCenteredText($pdf, $idText, $x + ($width / 2), $idY, $idSize, [0.39, 0.46, 0.57]);
    }

    private function filledRoundedRectangle(Cpdf $pdf, float $x, float $y, float $width, float $height, float $radius): void
    {
        $radius = min($radius, $width / 2, $height / 2);
        $pdf->setColor([1, 1, 1]);
        $pdf->filledRectangle($x + $radius, $y, $width - ($radius * 2), $height);
        $pdf->filledRectangle($x, $y + $radius, $width, $height - ($radius * 2));
        $pdf->filledEllipse($x + $radius, $y + $radius, $radius);
        $pdf->filledEllipse($x + $width - $radius, $y + $radius, $radius);
        $pdf->filledEllipse($x + $radius, $y + $height - $radius, $radius);
        $pdf->filledEllipse($x + $width - $radius, $y + $height - $radius, $radius);
    }

    private function roundedBorder(Cpdf $pdf, float $x, float $y, float $width, float $height, float $radius): void
    {
        $radius = min($radius, $width / 2, $height / 2);
        $pdf->line($x + $radius, $y, $x + $width - $radius, $y);
        $pdf->line($x + $radius, $y + $height, $x + $width - $radius, $y + $height);
        $pdf->line($x, $y + $radius, $x, $y + $height - $radius);
        $pdf->line($x + $width, $y + $radius, $x + $width, $y + $height - $radius);
        $pdf->ellipse($x + $radius, $y + $radius, $radius, 0, 0, 8, 180, 270, false, false, true);
        $pdf->ellipse($x + $width - $radius, $y + $radius, $radius, 0, 0, 8, 270, 360, false, false, true);
        $pdf->ellipse($x + $width - $radius, $y + $height - $radius, $radius, 0, 0, 8, 0, 90, false, false, true);
        $pdf->ellipse($x + $radius, $y + $height - $radius, $radius, 0, 0, 8, 90, 180, false, false, true);
    }

    private function drawClippedJpeg(Cpdf $pdf, string $path, float $x, float $y, float $width, float $height, float $radius): void
    {
        $pdf->clippingRectangleRounded($x, $y, $width, $height, $radius, $radius, $radius, $radius);
        $this->drawJpegCover($pdf, $path, $x, $y, $width, $height);
        $pdf->clippingEnd();
        $pdf->setStrokeColor([0.82, 0.88, 0.96]);
        $this->roundedBorder($pdf, $x, $y, $width, $height, $radius);
    }

    private function drawJpegCover(Cpdf $pdf, string $path, float $x, float $y, float $width, float $height): void
    {
        $imageSize = @getimagesize($path);
        if (! $imageSize || empty($imageSize[0]) || empty($imageSize[1])) {
            $pdf->addJpegFromFile($path, $x, $y, $width, $height);

            return;
        }

        $imageRatio = $imageSize[0] / $imageSize[1];
        $boxRatio = $width / $height;
        if ($imageRatio > $boxRatio) {
            $drawHeight = $height;
            $drawWidth = $height * $imageRatio;
            $drawX = $x - (($drawWidth - $width) / 2);
            $drawY = $y;
        } else {
            $drawWidth = $width;
            $drawHeight = $width / $imageRatio;
            $drawX = $x;
            $drawY = $y - (($drawHeight - $height) / 2);
        }

        $pdf->addJpegFromFile($path, $drawX, $drawY, $drawWidth, $drawHeight);
    }

    private function drawPdfImage(Cpdf $pdf, string $path, float $x, float $y, float $width, float $height): void
    {
        if (Str::lower(pathinfo($path, PATHINFO_EXTENSION)) === 'svg') {
            $pdf->addSvgFromFile($path, $x, $y, $width, $height);

            return;
        }

        $pdf->addJpegFromFile($path, $x, $y, $width, $height);
    }

    private function drawQr(Cpdf $pdf, string $payload, float $x, float $y, float $size): void
    {
        $matrix = Encoder::encode($payload, ErrorCorrectionLevel::M())->getMatrix();
        $quietModules = 2;
        $matrixSize = $matrix->getWidth();
        $moduleSize = $size / ($matrixSize + ($quietModules * 2));
        $originX = $x + ($quietModules * $moduleSize);
        $originY = $y + $size - ($quietModules * $moduleSize);

        $pdf->setColor([0, 0, 0]);

        for ($row = 0; $row < $matrixSize; $row++) {
            $runStart = null;

            for ($column = 0; $column <= $matrixSize; $column++) {
                $filled = $column < $matrixSize && $matrix->get($column, $row) === 1;

                if ($filled && $runStart === null) {
                    $runStart = $column;

                    continue;
                }

                if ((! $filled || $column === $matrixSize) && $runStart !== null) {
                    $runWidth = $column - $runStart;
                    $pdf->filledRectangle(
                        $originX + ($runStart * $moduleSize),
                        $originY - (($row + 1) * $moduleSize),
                        $runWidth * $moduleSize,
                        $moduleSize
                    );
                    $runStart = null;
                }
            }
        }
    }

    private function drawText(Cpdf $pdf, string $text, float $x, float $y, float $size, array $color): void
    {
        $pdf->setColor($color);
        $pdf->addText($x, $y, $size, $text);
    }

    private function drawCenteredText(Cpdf $pdf, string $text, float $centerX, float $y, float $size, array $color): void
    {
        $this->drawText($pdf, $text, $centerX - ($this->pdfTextWidth($text, $size) / 2), $y, $size, $color);
    }

    private function pdfTextWidth(string $text, float $size): float
    {
        return strlen($text) * $size * 0.52;
    }

    private function wrapPdfText(string $text, int $lineLength, int $maxLines): array
    {
        $words = preg_split('/\s+/', trim($text)) ?: [];
        $lines = [];
        $current = '';

        foreach ($words as $word) {
            $candidate = $current === '' ? $word : $current.' '.$word;
            if (strlen($candidate) <= $lineLength) {
                $current = $candidate;

                continue;
            }

            if ($current !== '') {
                $lines[] = $current;
            }
            $current = $word;

            if (count($lines) >= $maxLines) {
                break;
            }
        }

        if ($current !== '' && count($lines) < $maxLines) {
            $lines[] = $current;
        }

        if (count($lines) === 0) {
            return ['Participant'];
        }

        if (count($lines) === $maxLines) {
            $last = array_key_last($lines);
            $lines[$last] = $this->limitPdfText($lines[$last], $lineLength);
        }

        return $lines;
    }

    private function limitPdfText(string $text, int $length): string
    {
        if (strlen($text) <= $length) {
            return $text;
        }

        return rtrim(substr($text, 0, max(0, $length - 3))).'...';
    }

    private function charsForWidth(float $width, float $fontSize): int
    {
        return max(4, (int) floor($width / max(1.0, $fontSize * 0.52)));
    }

    private function fitPdfFontSize(string $text, float $width, float $baseSize, float $minSize, int $maxLines = 1): float
    {
        $length = max(1, strlen(trim($text)));
        $fittedSize = ($width * max(1, $maxLines)) / ($length * 0.52);

        return max($minSize, min($baseSize, $fittedSize));
    }

    private function countryFlagJpegPath(?string $code, ?string $name): ?string
    {
        $code = Str::of((string) $code)->lower()->trim()->toString();
        $slug = Str::of((string) $name)->lower()->slug('-')->toString();
        $candidates = array_filter([
            $code ? public_path("asean/{$code}.jpg") : null,
            $code ? public_path("asean/{$code}.jpeg") : null,
            $slug ? public_path("asean/{$slug}.jpg") : null,
            $slug ? public_path("asean/{$slug}.jpeg") : null,
        ]);

        foreach ($candidates as $candidate) {
            if (File::exists($candidate)) {
                return $candidate;
            }
        }

        return null;
    }

    private function pdfText(string $text): string
    {
        $text = trim(preg_replace('/\s+/', ' ', $text) ?? '');

        return preg_replace('/(?<=[A-Za-z])\?(?=[a-z]{2,})/', 'ñ', $text) ?? $text;
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

        return 'profile-image/'.$filename;
    }

    private function registrationFieldsPayload(Programme $programme): array
    {
        return $programme->registrationFields
            ->map(fn (RegistrationField $field) => [
                'id' => $field->id,
                'field_key' => $field->field_key,
                'label' => $field->label,
                'field_type' => $field->field_type,
                'options' => $field->options ?? [],
                'placeholder' => $field->placeholder,
                'help_text' => $field->help_text,
                'is_required' => $field->is_required,
                'sort_order' => $field->sort_order,
            ])
            ->values()
            ->all();
    }

    private function validateRegistrationResponses(ValidationValidator $validator, Request $request): void
    {
        $programmeId = $request->integer('programme_id');
        if (! $programmeId) {
            return;
        }

        $responses = is_array($request->input('registration_responses'))
            ? $request->input('registration_responses')
            : [];

        RegistrationField::query()
            ->where('programme_id', $programmeId)
            ->orderBy('sort_order')
            ->get()
            ->each(function (RegistrationField $field) use ($validator, $responses, $programmeId) {
                if ($field->field_type === 'section') {
                    return;
                }

                $value = $responses[$programmeId][$field->id]
                    ?? $responses[(string) $programmeId][(string) $field->id]
                    ?? $responses[(string) $programmeId][$field->id]
                    ?? $responses[$programmeId][(string) $field->id]
                    ?? null;

                $attribute = "registration_responses.{$programmeId}.{$field->id}";

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
    }

    private function syncSelectedProgrammeAndResponses(User $user, Request $request): void
    {
        $programmeId = $request->integer('programme_id');
        if (! $programmeId) {
            return;
        }

        $user->joinedProgrammes()->syncWithoutDetaching([$programmeId]);

        $responses = is_array($request->input('registration_responses'))
            ? $request->input('registration_responses')
            : [];

        $fields = RegistrationField::query()
            ->where('programme_id', $programmeId)
            ->where('field_type', '!=', 'section')
            ->get();

        foreach ($fields as $field) {
            $value = $responses[$programmeId][$field->id]
                ?? $responses[(string) $programmeId][(string) $field->id]
                ?? $responses[(string) $programmeId][$field->id]
                ?? $responses[$programmeId][(string) $field->id]
                ?? null;

            if ($this->isBlankDynamicAnswer($value)) {
                $user->registrationFieldResponses()
                    ->where('programme_id', $programmeId)
                    ->where('registration_field_id', $field->id)
                    ->delete();

                continue;
            }

            $answer = is_array($value)
                ? array_values(array_filter($value, fn ($item) => trim((string) $item) !== ''))
                : trim((string) $value);

            $user->registrationFieldResponses()->updateOrCreate(
                [
                    'programme_id' => $programmeId,
                    'registration_field_id' => $field->id,
                ],
                ['answer' => $answer],
            );
        }
    }

    private function isBlankDynamicAnswer(mixed $value): bool
    {
        if (is_array($value)) {
            return collect($value)->filter(fn ($item) => trim((string) $item) !== '')->isEmpty();
        }

        return trim((string) $value) === '';
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
