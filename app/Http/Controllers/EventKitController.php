<?php

namespace App\Http\Controllers;

use App\Models\ParticipantAttendance;
use App\Models\Programme;
use App\Models\Feedback;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;

class EventKitController extends Controller
{
    public function entry()
    {
        if (session()->get('event_kit.survey_completed') && session()->get('event_kit.programme_id')) {
            return redirect()->route('event-kit.materials');
        }

        return Inertia::render('event-kit-entry');
    }

    public function verify(Request $request)
    {
        $validated = $request->validate([
            'participant_id' => ['required', 'string', 'max:255'],
        ]);

        $participantId = trim($validated['participant_id']);

        $participant = User::query()
            ->where('display_id', $participantId)
            ->orWhere('email', $participantId)
            ->orWhere('id', $participantId)
            ->first();

        if (!$participant) {
            return back()->withErrors([
                'participant_id' => 'Participant ID not found. Please check your ID or email.',
            ]);
        }

        $request->session()->put('event_kit.participant_id', $participant->id);
        $request->session()->forget(['event_kit.programme_id', 'event_kit.survey_completed']);

        return redirect()->route('event-kit.survey');
    }

    public function survey(Request $request)
    {
        $participant = $this->resolveParticipant($request);

        if (!$participant) {
            return redirect()->route('event-kit.entry');
        }

        $existingFeedback = Feedback::query()
            ->where('participant_id', $participant->id)
            ->latest()
            ->first();

        if ($existingFeedback && $existingFeedback->programme_id) {
            $request->session()->put('event_kit.survey_completed', true);
            $request->session()->put('event_kit.programme_id', $existingFeedback->programme_id);

            return redirect()->route('event-kit.materials');
        }

        if ($request->session()->get('event_kit.survey_completed')) {
            return redirect()->route('event-kit.materials');
        }

        [$programmes, $attendanceEntries] = $this->loadProgrammesAndAttendance($participant->id);

        $joinedProgrammeIds = $participant->joinedProgrammes()
            ->pluck('programmes.id')
            ->map(fn ($id) => (int) $id)
            ->values()
            ->all();

        return Inertia::render('event-kit-survey', [
            'participant' => $participant,
            'programmes' => $programmes,
            'attendance_entries' => $attendanceEntries,
            'joined_programme_ids' => $joinedProgrammeIds,
            'selected_programme_id' => $request->session()->get('event_kit.programme_id'),
        ]);
    }

    public function submitSurvey(Request $request)
    {
        $participant = $this->resolveParticipant($request);

        if (!$participant) {
            return redirect()->route('event-kit.entry');
        }

        $validated = $request->validate([
            'programme_id' => ['required', 'integer', 'exists:programmes,id'],
            'user_experience_rating' => ['nullable', 'integer', 'min:1', 'max:5'],
            'event_ratings' => ['nullable', 'array'],
            'event_ratings.*' => ['integer', 'min:1', 'max:5'],
            'recommendations' => ['nullable', 'string', 'max:1000'],
        ]);

        $eventRatings = collect($validated['event_ratings'] ?? [])->filter(fn ($value) => (int) $value > 0);
        $hasUserExperience = !empty($validated['user_experience_rating']);
        $hasEventRatings = $eventRatings->isNotEmpty();

        if (!$hasUserExperience && !$hasEventRatings) {
            return back()->withErrors([
                'survey' => 'Please add at least one rating before submitting.',
            ]);
        }

        $request->session()->put('event_kit.programme_id', (int) $validated['programme_id']);
        $request->session()->put('event_kit.survey_completed', true);

        Feedback::create([
            'participant_id' => $participant->id,
            'programme_id' => (int) $validated['programme_id'],
            'user_experience_rating' => $validated['user_experience_rating'] ?? null,
            'event_ratings' => $eventRatings->map(fn ($value) => (int) $value)->values()->all() ?: null,
            'recommendations' => $validated['recommendations'] ?? null,
        ]);

        return redirect()->route('event-kit.materials');
    }

    public function materials(Request $request)
    {
        $participant = $this->resolveParticipant($request);

        if (!$participant) {
            return redirect()->route('event-kit.entry');
        }

        if (!$request->session()->get('event_kit.survey_completed')) {
            return redirect()->route('event-kit.survey');
        }

        $programmeId = $request->session()->get('event_kit.programme_id');

        if (!$programmeId) {
            return redirect()->route('event-kit.survey');
        }

        $attendanceEntries = ParticipantAttendance::query()
            ->select(['programme_id'])
            ->where('user_id', $participant->id)
            ->whereNotNull('scanned_at')
            ->get();

        $checkedInProgrammeIds = $attendanceEntries->pluck('programme_id')->unique()->values();

        $checkedInProgrammes = Programme::query()
            ->with('materials')
            ->whereIn('id', $checkedInProgrammeIds)
            ->latest('starts_at')
            ->get()
            ->map(fn (Programme $programme) => [
                'id' => $programme->id,
                'title' => $programme->title,
                'description' => $programme->description,
                'starts_at' => $programme->starts_at?->toISOString(),
                'ends_at' => $programme->ends_at?->toISOString(),
                'location' => $programme->location,
                'materials' => $programme->materials
                    ->map(fn ($material) => [
                        'id' => $material->id,
                        'file_name' => $material->file_name,
                        'file_path' => $material->file_path,
                        'file_type' => $material->file_type,
                    ])
                    ->values()
                    ->all(),
                'signatory_name' => $programme->signatory_name,
                'signatory_title' => $programme->signatory_title,
                'signatory_signature_url' => $programme->signatory_signature_url,
            ])
            ->values()
            ->all();

        if ($checkedInProgrammeIds->isNotEmpty() && !$checkedInProgrammeIds->contains((int) $programmeId)) {
            $programmeId = $checkedInProgrammeIds->first();
            $request->session()->put('event_kit.programme_id', $programmeId);
        }

        $programme = Programme::query()
            ->with('materials')
            ->find($programmeId);

        if (!$programme) {
            return redirect()->route('event-kit.survey');
        }

        $attendance = ParticipantAttendance::query()
            ->where('programme_id', $programmeId)
            ->where('user_id', $participant->id)
            ->first();

        return Inertia::render('event-kit-materials', [
            'participant' => $participant,
            'programme' => [
                'id' => $programme->id,
                'title' => $programme->title,
                'description' => $programme->description,
                'starts_at' => $programme->starts_at?->toISOString(),
                'ends_at' => $programme->ends_at?->toISOString(),
                'location' => $programme->location,
                'image_url' => $programme->image_url,
                'pdf_url' => $programme->pdf_url,
                'materials' => $programme->materials
                    ->map(fn ($material) => [
                        'id' => $material->id,
                        'file_name' => $material->file_name,
                        'file_path' => $material->file_path,
                        'file_type' => $material->file_type,
                    ])
                    ->values()
                    ->all(),
                'signatory_name' => $programme->signatory_name,
                'signatory_title' => $programme->signatory_title,
                'signatory_signature_url' => $programme->signatory_signature_url,
            ],
            'checked_in_programmes' => $checkedInProgrammes,
            'attendance' => $attendance
                ? [
                    'scanned_at' => $attendance->scanned_at?->toISOString(),
                ]
                : null,
        ]);
    }

    public function selectProgramme(Request $request)
    {
        $participant = $this->resolveParticipant($request);

        if (!$participant) {
            return redirect()->route('event-kit.entry');
        }

        $validated = $request->validate([
            'programme_id' => ['required', 'integer', 'exists:programmes,id'],
        ]);

        $hasAttendance = ParticipantAttendance::query()
            ->where('user_id', $participant->id)
            ->where('programme_id', $validated['programme_id'])
            ->whereNotNull('scanned_at')
            ->exists();

        if (!$hasAttendance) {
            return back()->withErrors([
                'programme_id' => 'Please select an event you checked into.',
            ]);
        }

        $request->session()->put('event_kit.programme_id', (int) $validated['programme_id']);

        return redirect()->route('event-kit.materials');
    }

    public function reset(Request $request)
    {
        $request->session()->forget(['event_kit']);

        return redirect()->route('event-kit.entry');
    }

    private function resolveParticipant(Request $request): ?User
    {
        $participantId = $request->session()->get('event_kit.participant_id');

        if (!$participantId) {
            return null;
        }

        return User::query()->find($participantId);
    }

    private function loadProgrammesAndAttendance(int $participantId): array
    {
        $programmes = Programme::query()
            ->latest('starts_at')
            ->get()
            ->map(fn (Programme $programme) => [
                'id' => $programme->id,
                'title' => $programme->title,
                'description' => $programme->description,
                'starts_at' => $programme->starts_at?->toISOString(),
                'ends_at' => $programme->ends_at?->toISOString(),
                'location' => $programme->location,
            ])
            ->values()
            ->all();

        $attendanceEntries = ParticipantAttendance::query()
            ->select(['programme_id', 'scanned_at'])
            ->where('user_id', $participantId)
            ->get()
            ->map(fn (ParticipantAttendance $attendance) => [
                'programme_id' => $attendance->programme_id,
                'scanned_at' => $attendance->scanned_at?->toISOString(),
            ])
            ->values()
            ->all();

        return [$programmes, $attendanceEntries];
    }
}
