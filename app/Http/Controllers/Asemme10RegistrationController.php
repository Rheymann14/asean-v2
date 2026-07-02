<?php

namespace App\Http\Controllers;

use App\Models\EventRegistrationSubmission;
use App\Models\Programme;
use App\Models\User;
use App\Models\UserType;
use App\Services\WelcomeNotificationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class Asemme10RegistrationController extends Controller
{
    private const REGISTRATION_TYPES = [
        'Country Delegation',
        'Stakeholder Delegation',
        'ASEAN Secretariat',
        'European Union',
        'Other',
    ];

    public function store(Request $request)
    {
        $validated = $request->validate([
            'programme_id' => ['required', 'integer', 'exists:programmes,id'],
            'country_id' => ['nullable', 'integer', 'exists:countries,id'],
            'registration_type' => ['required', 'string', Rule::in(self::REGISTRATION_TYPES)],
            'focal.name' => ['required', 'string', 'max:255'],
            'focal.email' => ['required', 'email', 'max:255'],
            'focal.phone' => ['nullable', 'string', 'max:50'],
            'focal.organization' => ['nullable', 'string', 'max:255'],
            'focal.position' => ['nullable', 'string', 'max:255'],
            'consents.data_collection' => ['accepted'],
            'consents.data_storage' => ['accepted'],
            'consents.photo_video' => ['accepted'],
            'delegation.minister_responsibility_type' => ['nullable', 'string', 'max:255'],
            'delegation.speech_topic' => ['nullable', 'string', 'max:255'],
            'delegation.country' => ['nullable', 'string', 'max:255'],
            'delegation.country_other' => ['nullable', 'string', 'max:255'],
            'delegation.registration_type_other' => ['nullable', 'string', 'max:255'],
            'delegation.social_activities' => ['nullable', 'array'],
            'delegation.social_activities.*' => ['string', 'max:255'],
            'delegation.social_activity_other' => ['nullable', 'string', 'max:255'],
            'delegation.social_activity_details' => ['nullable', 'string', 'max:2000'],
            'delegation.bilateral_meeting_interest' => ['nullable', 'string', 'max:500'],
            'delegation.bilateral_contact_emails' => ['nullable', 'string', 'max:2000'],
            'delegation.bilateral_comments' => ['nullable', 'string', 'max:2000'],
            'delegation.additional_comments' => ['nullable', 'string', 'max:2000'],
            'attendees' => ['required', 'array'],
            'attendees.*.role' => ['required', 'string', 'max:80', 'distinct'],
            'attendees.*.title' => ['nullable', 'string', 'max:50'],
            'attendees.*.title_other' => ['nullable', 'string', 'max:50'],
            'attendees.*.given_name' => ['nullable', 'string', 'max:255'],
            'attendees.*.family_name' => ['nullable', 'string', 'max:255'],
            'attendees.*.badge_name' => ['nullable', 'string', 'max:255'],
            'attendees.*.organization_name' => ['nullable', 'string', 'max:255'],
            'attendees.*.position_title' => ['nullable', 'string', 'max:255'],
            'attendees.*.email' => ['nullable', 'email', 'max:255'],
            'attendees.*.dietary_requirements' => ['nullable', 'string', 'max:2000'],
            'attendees.*.mobility_or_special_needs' => ['nullable', 'string', 'max:2000'],
        ]);

        $programme = Programme::query()
            ->whereKey($validated['programme_id'])
            ->where('is_active', true)
            ->firstOrFail();

        if (
            $validated['registration_type'] === 'Other'
            && trim((string) (($validated['delegation'] ?? [])['registration_type_other'] ?? '')) === ''
        ) {
            throw ValidationException::withMessages([
                'delegation.registration_type_other' => 'Enter the registration type.',
            ]);
        }

        if (
            in_array('Other', ($validated['delegation'] ?? [])['social_activities'] ?? [], true)
            && trim((string) (($validated['delegation'] ?? [])['social_activity_other'] ?? '')) === ''
        ) {
            throw ValidationException::withMessages([
                'delegation.social_activity_other' => 'Enter the other social activity.',
            ]);
        }

        foreach ($validated['attendees'] as $index => $attendee) {
            if (
                ($attendee['title'] ?? null) === 'Other'
                && trim((string) ($attendee['title_other'] ?? '')) === ''
            ) {
                throw ValidationException::withMessages([
                    "attendees.{$index}.title_other" => 'Enter the participant title.',
                ]);
            }
        }

        $attendees = $this->filledAttendees($validated['attendees']);

        if ($attendees === []) {
            throw ValidationException::withMessages([
                'attendees' => 'Add at least one participant to register.',
            ]);
        }

        $seenEmails = [];

        foreach ($attendees as $index => $attendee) {
            $email = Str::lower(trim((string) ($attendee['email'] ?? '')));

            if ($email === '') {
                continue;
            }

            if (in_array($email, $seenEmails, true)) {
                throw ValidationException::withMessages([
                    "attendees.{$index}.email" => 'Each participant email must be unique.',
                ]);
            }

            $seenEmails[] = $email;

            $alreadyJoined = User::query()
                ->whereRaw('LOWER(email) = ?', [$email])
                ->whereHas('joinedProgrammes', fn ($query) => $query->whereKey($programme->id))
                ->exists();

            if ($alreadyJoined) {
                throw ValidationException::withMessages([
                    "attendees.{$index}.email" => 'This email is already registered for the selected event.',
                ]);
            }
        }

        $created = DB::transaction(function () use ($request, $validated, $programme, $attendees) {
            $submission = EventRegistrationSubmission::query()->create([
                'programme_id' => $programme->id,
                'country_id' => $validated['country_id'] ?? null,
                'submitted_by_user_id' => $request->user()?->id,
                'registration_type' => $validated['registration_type'],
                'focal_name' => $validated['focal']['name'],
                'focal_email' => $validated['focal']['email'],
                'focal_phone' => $validated['focal']['phone'] ?? null,
                'focal_organization' => $validated['focal']['organization'] ?? null,
                'focal_position' => $validated['focal']['position'] ?? null,
                'consents' => $validated['consents'] ?? [],
                'delegation_details' => $validated['delegation'] ?? [],
                'status' => 'submitted',
                'submitted_at' => now(),
            ]);

            $usedEmails = [];
            $participants = [];

            foreach ($attendees as $attendee) {
                $user = $this->participantUserForAttendee(
                    $attendee,
                    $validated,
                    $programme,
                    $usedEmails,
                );

                $user->joinedProgrammes()->syncWithoutDetaching([$programme->id]);

                $submission->attendees()->create([
                    'programme_id' => $programme->id,
                    'user_id' => $user->id,
                    'role' => $attendee['role'],
                    'title' => $this->attendeeTitle($attendee),
                    'given_name' => trim((string) $attendee['given_name']),
                    'family_name' => trim((string) $attendee['family_name']),
                    'badge_name' => $this->blankToNull($attendee['badge_name'] ?? null),
                    'organization_name' => $this->blankToNull($attendee['organization_name'] ?? null),
                    'position_title' => $this->blankToNull($attendee['position_title'] ?? null),
                    'email' => $this->blankToNull($attendee['email'] ?? null),
                    'dietary_requirements' => $this->blankToNull($attendee['dietary_requirements'] ?? null),
                    'mobility_or_special_needs' => $this->blankToNull($attendee['mobility_or_special_needs'] ?? null),
                    'extra_details' => [
                        'registration_type' => $validated['registration_type'],
                        'focal_email' => $validated['focal']['email'],
                        'title_other' => $this->blankToNull($attendee['title_other'] ?? null),
                    ],
                ]);

                $participants[] = [
                    'name' => $user->name,
                    'email' => $this->blankToNull($attendee['email'] ?? null),
                    'display_id' => $user->display_id,
                    'qr_scan_value' => $user->qr_scan_value,
                    'role' => $attendee['role'],
                    'country_code' => $user->country?->code,
                    'country_name' => $user->country?->name,
                    'country_flag_url' => $user->country?->flag_url,
                    'virtual_id_email_sent' => $this->canEmailAttendee($attendee, $user),
                ];
            }

            return [
                'submission' => $submission,
                'participants' => $participants,
            ];
        });

        $this->sendParticipantConfirmations($created['submission']);

        return back()
            ->with('status', 'asemme10-registered')
            ->with('asemme10Submission', [
                'id' => $created['submission']->id,
                'event_title' => $programme->title,
                'focal_email' => $validated['focal']['email'],
                'participants' => $created['participants'],
            ]);
    }

    /**
     * @param  array<int, array<string, mixed>>  $attendees
     * @return array<int, array<string, mixed>>
     */
    private function filledAttendees(array $attendees): array
    {
        return collect($attendees)
            ->filter(function (array $attendee) {
                return trim((string) ($attendee['given_name'] ?? '')) !== ''
                    || trim((string) ($attendee['family_name'] ?? '')) !== ''
                    || trim((string) ($attendee['email'] ?? '')) !== '';
            })
            ->map(function (array $attendee) {
                if (trim((string) ($attendee['given_name'] ?? '')) === '' || trim((string) ($attendee['family_name'] ?? '')) === '') {
                    throw ValidationException::withMessages([
                        'attendees' => 'Each participant must have a given name and family name.',
                    ]);
                }

                return $attendee;
            })
            ->values()
            ->all();
    }

    /**
     * @param  array<string, mixed>  $attendee
     * @param  array<string, mixed>  $validated
     * @param  array<int, string>  $usedEmails
     */
    private function participantUserForAttendee(array $attendee, array $validated, Programme $programme, array &$usedEmails): User
    {
        $email = Str::lower(trim((string) ($attendee['email'] ?? '')));
        $canUseEmail = $email !== '' && ! in_array($email, $usedEmails, true);

        if ($canUseEmail) {
            $existing = User::query()
                ->whereRaw('LOWER(email) = ?', [$email])
                ->first();

            if ($existing) {
                $usedEmails[] = $email;
                $this->updateMissingParticipantProfile($existing, $attendee, $validated);

                return $existing->refresh();
            }
        }

        $user = User::query()->create([
            'name' => $this->attendeeFullName($attendee),
            'email' => $canUseEmail ? $email : null,
            'password' => Str::random(32),
            'country_id' => $validated['country_id'] ?? null,
            'user_type_id' => $this->participantUserTypeId(),
            'honorific_title' => $this->attendeeTitle($attendee),
            'given_name' => trim((string) $attendee['given_name']),
            'family_name' => trim((string) $attendee['family_name']),
            'organization_name' => $this->blankToNull($attendee['organization_name'] ?? null) ?: ($validated['focal']['organization'] ?? null),
            'position_title' => $this->blankToNull($attendee['position_title'] ?? null),
            'contact_number' => $validated['focal']['phone'] ?? null,
            'contact_country_code' => null,
            'is_active' => true,
        ])->refresh();

        if ($canUseEmail) {
            $usedEmails[] = $email;
        }

        return $user;
    }

    /**
     * @param  array<string, mixed>  $attendee
     * @param  array<string, mixed>  $validated
     */
    private function updateMissingParticipantProfile(User $user, array $attendee, array $validated): void
    {
        $updates = [
            'country_id' => $user->country_id ?: ($validated['country_id'] ?? null),
            'user_type_id' => $user->user_type_id ?: $this->participantUserTypeId(),
            'honorific_title' => $user->honorific_title ?: $this->attendeeTitle($attendee),
            'given_name' => $user->given_name ?: trim((string) $attendee['given_name']),
            'family_name' => $user->family_name ?: trim((string) $attendee['family_name']),
            'organization_name' => $user->organization_name ?: ($this->blankToNull($attendee['organization_name'] ?? null) ?: ($validated['focal']['organization'] ?? null)),
            'position_title' => $user->position_title ?: $this->blankToNull($attendee['position_title'] ?? null),
            'contact_number' => $user->contact_number ?: ($validated['focal']['phone'] ?? null),
        ];

        if (! $user->name || Str::startsWith($user->name, 'Participant ')) {
            $updates['name'] = $this->attendeeFullName($attendee);
        }

        $user->update($updates);
    }

    /**
     * @param  array<string, mixed>  $attendee
     */
    private function attendeeFullName(array $attendee): string
    {
        return collect([
            $attendee['given_name'] ?? '',
            $attendee['family_name'] ?? '',
        ])->map(fn ($value) => trim((string) $value))
            ->filter()
            ->implode(' ');
    }

    /**
     * @param  array<string, mixed>  $attendee
     */
    private function attendeeTitle(array $attendee): ?string
    {
        if (($attendee['title'] ?? null) === 'Other') {
            return $this->blankToNull($attendee['title_other'] ?? null) ?? 'Other';
        }

        return $this->blankToNull($attendee['title'] ?? null);
    }

    private function participantUserTypeId(): ?int
    {
        return UserType::query()
            ->whereIn('slug', ['government-official', 'other'])
            ->orderByRaw("CASE WHEN slug = 'government-official' THEN 0 ELSE 1 END")
            ->value('id')
            ?? UserType::query()->firstOrCreate(
                ['slug' => 'other'],
                ['name' => 'Other', 'is_active' => true],
            )->id;
    }

    private function blankToNull(mixed $value): ?string
    {
        $value = trim((string) $value);

        return $value === '' ? null : $value;
    }

    /**
     * @param  array<string, mixed>  $attendee
     */
    private function canEmailAttendee(array $attendee, User $user): bool
    {
        $email = Str::lower(trim((string) ($attendee['email'] ?? '')));

        return $email !== '' && Str::lower((string) $user->email) === $email;
    }

    private function sendParticipantConfirmations(EventRegistrationSubmission $submission): void
    {
        $submission->loadMissing('attendees.user');

        foreach ($submission->attendees as $attendee) {
            if (! $attendee->email || Str::lower((string) $attendee->user?->email) !== Str::lower($attendee->email)) {
                continue;
            }

            rescue(fn () => app(WelcomeNotificationService::class)->dispatch($attendee->user), report: true);
        }
    }
}
