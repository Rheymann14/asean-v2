<?php

namespace App\Http\Controllers;

use App\Models\AssignmentNotificationLog;
use App\Models\ParticipantAttendance;
use App\Models\ParticipantTableAssignment;
use App\Models\Programme;
use App\Models\User;
use App\Models\UserType;
use App\Models\VehicleAssignment;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class ReportsController extends Controller
{
    public function updateWelcomeDinnerPreferences(Request $request, User $user): RedirectResponse
    {
        $validated = $request->validate([
            'attend_welcome_dinner' => ['required', 'boolean'],
            'avail_transport_from_makati_to_peninsula' => ['required', 'boolean'],
        ]);

        $attendWelcomeDinner = (bool) $validated['attend_welcome_dinner'];

        $user->update([
            'attend_welcome_dinner' => $attendWelcomeDinner,
            'avail_transport_from_makati_to_peninsula' => $attendWelcomeDinner
                ? (bool) $validated['avail_transport_from_makati_to_peninsula']
                : false,
        ]);

        return back()->with('success', 'Welcome dinner preferences updated.');
    }


    public function sendAssignmentNotification(Request $request, User $user): JsonResponse
    {
        $validated = $request->validate([
            'event_id' => ['required', 'integer', 'exists:programmes,id'],
        ]);

        $event = Programme::query()->findOrFail($validated['event_id']);

        $tableAssignment = ParticipantTableAssignment::query()
            ->join('participant_tables', 'participant_table_assignments.participant_table_id', '=', 'participant_tables.id')
            ->where('participant_table_assignments.user_id', $user->id)
            ->where('participant_table_assignments.programme_id', $event->id)
            ->orderByDesc('participant_table_assignments.assigned_at')
            ->first(['participant_tables.table_number']);

        $vehicleAssignment = VehicleAssignment::query()
            ->leftJoin('transport_vehicles', 'vehicle_assignments.vehicle_id', '=', 'transport_vehicles.id')
            ->where('vehicle_assignments.user_id', $user->id)
            ->where('vehicle_assignments.programme_id', $event->id)
            ->orderByDesc('vehicle_assignments.updated_at')
            ->first([
                'vehicle_assignments.vehicle_label',
                'transport_vehicles.label as transport_vehicle_label',
                'transport_vehicles.plate_number as transport_vehicle_plate_number',
            ]);

        $tableNumber = $tableAssignment?->table_number ?: 'N/A';
        $vehicleName = $vehicleAssignment?->transport_vehicle_label ?: $vehicleAssignment?->vehicle_label ?: 'N/A';
        $vehiclePlateNumber = $vehicleAssignment?->transport_vehicle_plate_number ?: 'N/A';

        $hasTableAssignment = $tableNumber !== 'N/A';
        $hasVehicleAssignment = $vehicleName !== 'N/A';

        if (! $hasTableAssignment && ! $hasVehicleAssignment) {
            return response()->json([
                'message' => 'Participant must have either table or vehicle assignment for the selected event.',
            ], 422);
        }

        $eventDate = collect([$event->starts_at, $event->ends_at])
            ->filter()
            ->map(fn ($date) => $date->format('F d, Y'))
            ->unique()
            ->implode(' to ');

        $participantName = trim($user->name ?: collect([$user->given_name, $user->family_name, $user->suffix])->filter()->implode(' '));
        $participantName = $participantName !== '' ? $participantName : 'Participant';

        $textContent = "Hi {$participantName}

Please be informed of the following:

"
            . "Participant ID: ".($user->display_id ?: $user->id)."\n"
            . "Event Title: {$event->title}
"
            . 'Event Date: '.($eventDate ?: 'TBA')."
"
            . "Vehicle: {$vehicleName}
"
            . "Vehicle Plate Number: {$vehiclePlateNumber}
"
            . "Table Number: {$tableNumber}

"
            . 'Thank you!';

        $appUrl = rtrim((string) config('app.url', 'https://asean-registration.ched.gov.ph'), '/');
        $htmlContent = $this->minifyHtml(view('emails.assignment-notification-brevo', [
            'bannerUrl' => $appUrl.'/img/asean_banner_logo.png',
            'logoUrl' => $appUrl.'/img/asean_logo.png',
            'participantName' => $participantName,
            'participantId' => $user->display_id ?: $user->id,
            'eventTitle' => $event->title,
            'eventDate' => $eventDate ?: 'TBA',
            'vehicleName' => $vehicleName,
            'vehiclePlateNumber' => $vehiclePlateNumber,
            'tableNumber' => $tableNumber,
        ])->render());

        $apiKey = config('services.brevo.api_key');

        if (! $apiKey) {
            Log::warning('Assignment email skipped: BREVO_API_KEY missing.', [
                'user_id' => $user->id,
                'email' => $user->email,
                'event_id' => $event->id,
            ]);

            return response()->json([
                'message' => 'Notification could not be sent because BREVO API key is missing.',
            ], 500);
        }

        try {
            $response = Http::timeout(20)
                ->withHeaders([
                    'api-key' => $apiKey,
                    'accept' => 'application/json',
                    'content-type' => 'application/json',
                ])
                ->post('https://api.brevo.com/v3/smtp/email', [
                    'sender' => [
                        'name' => config('services.brevo.sender_name', config('mail.from.name', 'ASEAN PH 2026')),
                        'email' => config('services.brevo.sender_email', config('mail.from.address', 'ph2026@asean.chedro12.com')),
                    ],
                    'to' => [[
                        'email' => $user->email,
                        'name' => $participantName,
                    ]],
                    'subject' => 'ASEAN 2026 Assignment Notification',
                    'htmlContent' => $htmlContent,
                    'textContent' => $textContent,
                ]);

            if ($response->failed()) {
                Log::error('Assignment email via Brevo API failed.', [
                    'user_id' => $user->id,
                    'email' => $user->email,
                    'event_id' => $event->id,
                    'status' => $response->status(),
                    'body' => $response->body(),
                ]);

                return response()->json([
                    'message' => 'Failed to send notification.',
                ], 500);
            }

            $sentAt = now();

            AssignmentNotificationLog::query()->updateOrCreate(
                [
                    'user_id' => $user->id,
                    'programme_id' => $event->id,
                ],
                [
                    'sent_at' => $sentAt,
                ],
            );

            return response()->json([
                'message' => 'Notification sent successfully.',
                'sent_at' => $sentAt->toISOString(),
            ]);
        } catch (\Throwable $exception) {
            report($exception);

            return response()->json([
                'message' => 'Failed to send notification.',
            ], 500);
        }
    }



    private function minifyHtml(string $html): string
    {
        $html = preg_replace('/<!--.*?-->/s', '', $html) ?? $html;
        $html = preg_replace('/>\s+</', '><', $html) ?? $html;
        $html = preg_replace('/\s{2,}/', ' ', $html) ?? $html;

        return trim($html);
    }

    public function index()
    {
        $adminTypeId = UserType::query()
            ->where('slug', 'admin')
            ->orWhere('name', 'Admin')
            ->value('id');

        $excludeAdmin = function ($query) use ($adminTypeId) {
            if (! $adminTypeId) {
                return;
            }

            $query->where(function ($inner) use ($adminTypeId) {
                $inner->where('users.user_type_id', '!=', $adminTypeId)
                    ->orWhereNull('users.user_type_id');
            });
        };

        $events = Programme::query()
            ->orderBy('starts_at')
            ->get()
            ->map(fn (Programme $programme) => [
                'id' => $programme->id,
                'title' => $programme->title,
                'starts_at' => $programme->starts_at?->toISOString(),
                'ends_at' => $programme->ends_at?->toISOString(),
                'is_active' => (bool) $programme->is_active,
            ])
            ->values();

        $totalRegisteredParticipants = User::query()
            ->where('is_active', true)
            ->tap($excludeAdmin)
            ->count();

        $attendedParticipantIds = ParticipantAttendance::query()
            ->join('users', 'participant_attendances.user_id', '=', 'users.id')
            ->whereNotNull('participant_attendances.scanned_at')
            ->tap(function ($query) use ($excludeAdmin) {
                $excludeAdmin($query);
            })
            ->distinct()
            ->pluck('participant_attendances.user_id');

        $totalParticipantsAttended = $attendedParticipantIds->count();
        $totalParticipantsDidNotJoin = max(0, $totalRegisteredParticipants - $totalParticipantsAttended);

        $joinedByUser = DB::table('participant_programmes')
            ->join('users', 'participant_programmes.user_id', '=', 'users.id')
            ->where('users.is_active', true)
            ->tap($excludeAdmin)
            ->select('participant_programmes.user_id', 'participant_programmes.programme_id')
            ->get()
            ->groupBy('user_id')
            ->map(fn ($group) => $group->pluck('programme_id')->map(fn ($id) => (int) $id)->values());

        $attendanceEntriesByUser = ParticipantAttendance::query()
            ->join('users', 'participant_attendances.user_id', '=', 'users.id')
            ->where('users.is_active', true)
            ->whereNotNull('participant_attendances.scanned_at')
            ->tap(function ($query) use ($excludeAdmin) {
                $excludeAdmin($query);
            })
            ->select('participant_attendances.user_id', 'participant_attendances.programme_id', 'participant_attendances.scanned_at')
            ->orderBy('participant_attendances.scanned_at')
            ->get()
            ->groupBy('user_id');

        $tableAssignmentsByUser = ParticipantTableAssignment::query()
            ->join('participant_tables', 'participant_table_assignments.participant_table_id', '=', 'participant_tables.id')
            ->join('users', 'participant_table_assignments.user_id', '=', 'users.id')
            ->where('users.is_active', true)
            ->tap($excludeAdmin)
            ->select([
                'participant_table_assignments.user_id',
                'participant_table_assignments.programme_id',
                'participant_table_assignments.assigned_at',
                'participant_tables.table_number',
            ])
            ->orderBy('participant_table_assignments.assigned_at')
            ->get()
            ->groupBy('user_id');

        $vehicleAssignmentsByUser = VehicleAssignment::query()
            ->leftJoin('transport_vehicles', 'vehicle_assignments.vehicle_id', '=', 'transport_vehicles.id')
            ->join('users', 'vehicle_assignments.user_id', '=', 'users.id')
            ->where('users.is_active', true)
            ->tap($excludeAdmin)
            ->select([
                'vehicle_assignments.user_id',
                'vehicle_assignments.programme_id',
                'vehicle_assignments.updated_at',
                'vehicle_assignments.vehicle_label',
                'transport_vehicles.label as transport_vehicle_label',
                'transport_vehicles.plate_number as transport_vehicle_plate_number',
            ])
            ->orderBy('vehicle_assignments.updated_at')
            ->get()
            ->groupBy('user_id');

        $assignmentNotificationByUser = AssignmentNotificationLog::query()
            ->join('users', 'assignment_notification_logs.user_id', '=', 'users.id')
            ->where('users.is_active', true)
            ->tap($excludeAdmin)
            ->select([
                'assignment_notification_logs.user_id',
                'assignment_notification_logs.programme_id',
                'assignment_notification_logs.sent_at',
            ])
            ->orderBy('assignment_notification_logs.sent_at')
            ->get()
            ->groupBy('user_id');

        $rows = User::query()
            ->leftJoin('countries', 'users.country_id', '=', 'countries.id')
            ->leftJoin('user_types', 'users.user_type_id', '=', 'user_types.id')
            ->where('users.is_active', true)
            ->tap($excludeAdmin)
            ->select([
                'users.id',
                'users.honorific_title',
                'users.given_name',
                'users.family_name',
                'users.suffix',
                'users.name',
                'users.display_id',
                'users.organization_name',
                'users.other_user_type',
                'users.attend_welcome_dinner',
                'users.avail_transport_from_makati_to_peninsula',
                'countries.name as country_name',
                'user_types.name as registrant_type',
            ])
            ->orderBy('users.name')
            ->get()
            ->map(function ($row) use ($joinedByUser, $attendanceEntriesByUser, $tableAssignmentsByUser, $vehicleAssignmentsByUser, $assignmentNotificationByUser) {
                $joinedProgrammeIds = ($joinedByUser->get($row->id) ?? collect())->values();
                $attendanceEntries = $attendanceEntriesByUser->get($row->id, collect());
                $tableAssignments = $tableAssignmentsByUser->get($row->id, collect());
                $vehicleAssignments = $vehicleAssignmentsByUser->get($row->id, collect());
                $assignmentNotificationEntries = $assignmentNotificationByUser->get($row->id, collect());

                $attendedProgrammeIds = $attendanceEntries
                    ->pluck('programme_id')
                    ->unique()
                    ->map(fn ($id) => (int) $id)
                    ->values();

                $attendanceByProgramme = $attendanceEntries
                    ->groupBy('programme_id')
                    ->map(function ($entries) {
                        $latest = $entries->last();

                        return $latest?->scanned_at?->toISOString();
                    })
                    ->all();

                $latestAttendance = $attendanceEntries->last();
                $latestTableAssignment = $tableAssignments->last();
                $latestVehicleAssignment = $vehicleAssignments->last();

                $tableAssignmentByProgramme = $tableAssignments
                    ->groupBy('programme_id')
                    ->map(fn ($entries) => $entries->last()?->table_number)
                    ->all();

                $vehicleAssignmentByProgramme = $vehicleAssignments
                    ->groupBy('programme_id')
                    ->map(function ($entries) {
                        $latest = $entries->last();

                        return $latest?->transport_vehicle_label ?: $latest?->vehicle_label;
                    })
                    ->all();

                $vehiclePlateNumberByProgramme = $vehicleAssignments
                    ->groupBy('programme_id')
                    ->map(fn ($entries) => $entries->last()?->transport_vehicle_plate_number)
                    ->all();

                $notificationSentAtByProgramme = $assignmentNotificationEntries
                    ->groupBy('programme_id')
                    ->map(fn ($entries) => $entries->last()?->sent_at?->toISOString())
                    ->all();

                return [
                    'id' => $row->id,
                    'honorific_title' => $row->honorific_title,
                    'given_name' => $row->given_name,
                    'family_name' => $row->family_name,
                    'suffix' => $row->suffix,
                    'name' => $row->name,
                    'display_id' => $row->display_id,
                    'country_name' => $row->country_name,
                    'registrant_type' => $row->registrant_type,
                    'organization_name' => $row->organization_name,
                    'other_user_type' => $row->other_user_type,
                    'attend_welcome_dinner' => (bool) $row->attend_welcome_dinner,
                    'avail_transport_from_makati_to_peninsula' => (bool) $row->avail_transport_from_makati_to_peninsula,
                    'table_assignment' => $latestTableAssignment?->table_number,
                    'table_assignment_by_programme' => $tableAssignmentByProgramme,
                    'vehicle_assignment' => $latestVehicleAssignment?->transport_vehicle_label ?: $latestVehicleAssignment?->vehicle_label,
                    'vehicle_assignment_by_programme' => $vehicleAssignmentByProgramme,
                    'vehicle_plate_number' => $latestVehicleAssignment?->transport_vehicle_plate_number,
                    'vehicle_plate_number_by_programme' => $vehiclePlateNumberByProgramme,
                    'notification_sent_at_by_programme' => $notificationSentAtByProgramme,
                    'has_attended' => $attendedProgrammeIds->isNotEmpty(),
                    'joined_programme_ids' => $joinedProgrammeIds,
                    'attended_programme_ids' => $attendedProgrammeIds,
                    'attendance_by_programme' => $attendanceByProgramme,
                    'latest_attendance_at' => $latestAttendance?->scanned_at?->toISOString(),
                ];
            })
            ->values();

        return Inertia::render('reports', [
            'summary' => [
                'total_registered_participants' => $totalRegisteredParticipants,
                'total_participants_attended' => $totalParticipantsAttended,
                'total_participants_did_not_join' => $totalParticipantsDidNotJoin,
            ],
            'rows' => $rows,
            'events' => $events,
            'now_iso' => now()->toISOString(),
        ]);
    }
}
