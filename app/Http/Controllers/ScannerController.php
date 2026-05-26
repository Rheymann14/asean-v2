<?php

namespace App\Http\Controllers;

use App\Models\ParticipantAttendance;
use App\Models\Programme;
use App\Models\User;
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
                    'starts_at' => $programme->starts_at?->toISOString(),
                    'ends_at' => $programme->ends_at?->toISOString(),
                    'is_active' => $programme->is_active,
                    'phase' => $this->resolvePhase($programme, $now),
                ];
            })
            ->values();

        $defaultEventId = $programmes->firstWhere('phase', 'ongoing')['id']
            ?? $programmes->firstWhere('phase', 'upcoming')['id']
            ?? null;

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
                'message' => 'Invalid QR code or participant ID.',
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
                : 'profile-image/' . $rawProfilePath;

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
                'qr_payload' => $participant->qr_payload,
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
        $participant = User::query()
            ->where('display_id', $code)
            ->first();

        if ($participant) {
            return $participant;
        }

        try {
            $token = Crypt::decryptString($code);
            $participant = User::query()
                ->where('qr_token', $token)
                ->first();
        } catch (DecryptException) {
            $participant = User::query()
                ->where('qr_token', $code)
                ->first();
        }

        return $participant;
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
