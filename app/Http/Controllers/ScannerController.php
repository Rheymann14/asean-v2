<?php

namespace App\Http\Controllers;

use App\Models\ParticipantAttendance;
use App\Models\Programme;
use App\Models\User;
use App\Support\EventDefaults;
use Carbon\Carbon;
use Illuminate\Contracts\Encryption\DecryptException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Crypt;
use Inertia\Inertia;

class ScannerController extends Controller
{
    public function index()
    {
        $now = now();

        $programmes = Programme::query()
            ->orderBy('starts_at')
            ->get()
            ->map(function (Programme $programme) use ($now) {
                return [
                    'id' => $programme->id,
                    'title' => $programme->title,
                    'image_url' => $programme->image_url,
                    'starts_at' => $programme->starts_at?->toISOString(),
                    'ends_at' => $programme->ends_at?->toISOString(),
                    'is_active' => $programme->is_active,
                    'is_registration_active' => $programme->is_registration_active,
                    'phase' => $this->resolvePhase($programme, $now),
                ];
            })
            ->values();

        $defaultEventId = EventDefaults::defaultEventId(
            $programmes,
            fn ($events) => $events->firstWhere('phase', 'ongoing') ?? $events->firstWhere('phase', 'upcoming'),
        ) ?: null;

        return Inertia::render('scanner', [
            'events' => $programmes,
            'default_event_id' => $defaultEventId,
        ]);
    }

    public function scan(Request $request)
    {
        $validated = $request->validate([
            'code' => ['required', 'string'],
            'event_id' => ['required', 'exists:programmes,id'],
        ]);

        $event = Programme::query()->find($validated['event_id']);
        if (! $event) {
            return response()->json([
                'ok' => false,
                'message' => 'Selected event not found.',
            ]);
        }

        $participant = $this->resolveParticipant($validated['code']);
        if (! $participant) {
            return response()->json([
                'ok' => false,
                'message' => $this->looksLikeAseanCode($validated['code'])
                    ? 'Participant not found for this QR code.'
                    : 'This is not a valid ASEAN QR code. Please scan a participant\'s ASEAN ID.',
            ]);
        }

        if (! $participant->is_active) {
            return response()->json([
                'ok' => false,
                'message' => 'Participant is inactive.',
            ]);
        }

        $isRegistered = $participant->joinedProgrammes()
            ->where('programmes.id', $event->id)
            ->exists();

        if (! $isRegistered) {
            return response()->json([
                'ok' => false,
                'message' => 'Participant is not registered for the selected event.',
            ]);
        }

        $attendance = ParticipantAttendance::query()
            ->where('user_id', $participant->id)
            ->where('programme_id', $event->id)
            ->first();
        $alreadyCheckedIn = (bool) $attendance;

        if (! $attendance) {
            $attendance = ParticipantAttendance::updateOrCreate(
                ['user_id' => $participant->id, 'programme_id' => $event->id],
                ['status' => 'scanned', 'scanned_at' => now()],
            );
        }

        $participant->loadMissing(['country', 'userType', 'joinedProgrammes']);

        $rawProfilePath = $participant->profile_image_path
        ?? $participant->profile_image
        ?? $participant->profile_photo_path
        ?? null;

        $profileImageUrl = null;
        if ($rawProfilePath) {
            $rawProfilePath = ltrim((string) $rawProfilePath, '/');

            if (str_starts_with($rawProfilePath, 'http://') || str_starts_with($rawProfilePath, 'https://')) {
                $profileImageUrl = $rawProfilePath;
            } else {
                $relative = str_starts_with($rawProfilePath, 'profile-image/')
                    ? $rawProfilePath
                    : 'profile-image/'.$rawProfilePath;

                $profileImageUrl = asset($relative);
            }
        }

        return response()->json([
            'ok' => true,
            'message' => $alreadyCheckedIn
                ? 'Already checked in for this event.'
                : 'Attendance recorded successfully.',
            'participant' => [
                'id' => $participant->id,
                'full_name' => $participant->name,
                'profile_image_url' => $profileImageUrl,
                'display_id' => $participant->display_id,
                'qr_token' => $participant->qr_token,
                'email' => $participant->email,
                'country' => $participant->country?->name,
                'country_code' => $participant->country?->code,
                'country_flag_url' => $participant->country?->flag_url,
                'user_type' => $participant->userType?->name,
                'is_verified' => (bool) $participant->email_verified_at,
            ],
            'registered_events' => $participant->joinedProgrammes
                ->sortBy('starts_at')
                ->map(fn (Programme $programme) => [
                    'id' => $programme->id,
                    'title' => $programme->title,
                    'starts_at' => $programme->starts_at?->toISOString(),
                ])
                ->values(),
            'checked_in_event' => [
                'id' => $event->id,
                'title' => $event->title,
            ],
            'already_checked_in' => $alreadyCheckedIn,
            'scanned_at' => $attendance?->scanned_at?->toISOString(),
        ]);
    }

    private function resolveParticipant(string $code): ?User
    {
        $code = trim($code);

        if ($code === '') {
            return null;
        }

        // Low-noise QR: bare qr_token (UUID)
        $participant = User::query()->where('qr_token', $code)->first();
        if ($participant) {
            return $participant;
        }

        // Manual entry: human-readable Participant ID
        $participant = User::query()->where('display_id', $code)->first();
        if ($participant) {
            return $participant;
        }

        // Previous-event QR: encrypted qr_payload — match the stored ciphertext
        // directly first (works even if APP_KEY changed)...
        $participant = User::query()->where('qr_payload', $code)->first();
        if ($participant) {
            return $participant;
        }

        // ...otherwise decrypt it back to the qr_token.
        try {
            $token = Crypt::decryptString($code);

            return User::query()->where('qr_token', $token)->first();
        } catch (DecryptException) {
            return null;
        }
    }

    /**
     * Whether a scanned code is plausibly one of ours (so we can distinguish a
     * genuine-but-unknown ASEAN code from a foreign/random QR when showing the
     * rejection message).
     */
    private function looksLikeAseanCode(string $code): bool
    {
        $code = trim($code);

        // qr_token shape (UUID) or the display_id shape (ASEAN-XXXX-XXXX)
        if (preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i', $code) === 1
            || preg_match('/^ASEAN-[A-Z0-9]{4}-[A-Z0-9]{4}$/i', $code) === 1) {
            return true;
        }

        // encrypted qr_payload that we can decrypt is also one of ours
        try {
            Crypt::decryptString($code);

            return true;
        } catch (DecryptException) {
            return false;
        }
    }

    private function resolvePhase(Programme $programme, Carbon $now): string
    {
        if (! $programme->is_active) {
            return 'closed';
        }

        $start = $programme->starts_at ?? $programme->ends_at ?? $now;
        $end = $programme->ends_at;

        $nowDate = $now->copy()->startOfDay();
        $startDate = $start->copy()->startOfDay();
        $endDate = $end ? $end->copy()->startOfDay() : null;

        if ($endDate && $nowDate->greaterThan($endDate)) {
            return 'closed';
        }

        if ($nowDate->lessThan($startDate)) {
            return 'upcoming';
        }

        return $nowDate->equalTo($startDate) || ($endDate && $nowDate->betweenIncluded($startDate, $endDate))
            ? 'ongoing'
            : 'closed';
    }
}
