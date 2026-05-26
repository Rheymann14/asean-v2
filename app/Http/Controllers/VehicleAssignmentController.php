<?php

namespace App\Http\Controllers;

use App\Models\Programme;
use App\Models\ParticipantAttendance;
use App\Models\ParticipantTableAssignment;
use App\Models\TransportVehicle;
use App\Models\User;
use App\Models\UserType;
use App\Models\VehicleAssignment;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class VehicleAssignmentController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();

        if ($this->isAdmin($user)) {
            return $this->assignmentIndex($request);
        }

        if ($user && $this->isChedLoType($user)) {
            return $this->chedLoAssignmentIndex($request);
        }

        return $this->participantAssignmentIndex($request);
    }

    public function managementIndex(Request $request)
    {
        $events = Programme::query()->orderBy('starts_at')->orderBy('title')->get();
        $selectedEventId = $this->resolveSelectedEventId($request, $events);

        $vehicles = TransportVehicle::query()
            ->with(['incharge', 'assignments.user'])
            ->withCount('assignments')
            ->when($selectedEventId, fn ($query) => $query->where('programme_id', $selectedEventId))
            ->orderBy('label')
            ->get()
            ->map(fn (TransportVehicle $vehicle) => [
                'id' => $vehicle->id,
                'label' => $vehicle->label,
                'driver_name' => $vehicle->driver_name,
                'plate_number' => $vehicle->plate_number,
                'driver_contact_number' => $vehicle->driver_contact_number,
                'participants' => $vehicle->assignments
                    ->map(fn ($assignment) => [
                        'id' => $assignment->user_id,
                        'full_name' => $assignment->user?->name,
                        'email' => $assignment->user?->email,
                        'is_checked' => $assignment->pickup_status !== 'pending',
                    ])
                    ->values(),
                'incharge' => $vehicle->incharge
                    ? [
                        'id' => $vehicle->incharge->id,
                        'full_name' => $vehicle->incharge->name,
                        'email' => $vehicle->incharge->email,
                    ]
                    : null,
                'created_at' => $vehicle->created_at?->toISOString(),
                'assignments_count' => $vehicle->assignments_count,
                'pickup_sent_at' => $vehicle->assignments
                    ->where('notify_admin', true)
                    ->max('pickup_at')?->toISOString(),
            ]);

        $chedLoTypeIds = UserType::query()
            ->get()
            ->filter(fn (UserType $type) => $this->matchesChedLo((string) $type->name) || $this->matchesChedLo((string) $type->slug))
            ->pluck('id')
            ->values();

        $chedLoUsers = User::query()
            ->with('userType')
            ->when(
                $chedLoTypeIds->isNotEmpty(),
                fn ($query) => $query->whereIn('user_type_id', $chedLoTypeIds),
                fn ($query) => $query->whereHas('userType', function ($subQuery) {
                    $subQuery->where(function ($q) {
                        $q->whereRaw("UPPER(REPLACE(REPLACE(COALESCE(name, ''), '-', ''), '_', '')) LIKE 'CHEDLO%'")
                            ->orWhereRaw("UPPER(COALESCE(name, '')) LIKE 'CHED LIAISON%'")
                            ->orWhereRaw("UPPER(REPLACE(REPLACE(COALESCE(slug, ''), '-', ''), '_', '')) LIKE 'CHEDLO%'")
                            ->orWhereRaw("UPPER(COALESCE(slug, '')) LIKE 'CHED LIAISON%'");
                    });
                })
            )
            ->orderBy('name')
            ->get()
            ->filter(fn (User $user) => $this->isChedLoType($user))
            ->map(fn (User $user) => [
                'id' => $user->id,
                'full_name' => $user->name,
                'email' => $user->email,
            ])
            ->values();

        return Inertia::render('vehicle-management', [
            'events' => $events->map(fn (Programme $event) => [
                'id' => $event->id,
                'title' => $event->title,
                'starts_at' => $event->starts_at?->toISOString(),
                'ends_at' => $event->ends_at?->toISOString(),
                'is_active' => (bool) $event->is_active,
            ]),
            'selected_event_id' => $selectedEventId ?: null,
            'vehicles' => $vehicles,
            'ched_lo_users' => $chedLoUsers,
        ]);
    }

    public function assignmentIndex(Request $request)
    {
        $events = Programme::query()->orderBy('starts_at')->orderBy('title')->get();
        $selectedEventId = $this->resolveSelectedEventId($request, $events);

        $vehicles = TransportVehicle::query()
            ->with('incharge')
            ->when($selectedEventId, fn ($query) => $query->where('programme_id', $selectedEventId))
            ->orderBy('label')
            ->get()
            ->map(fn (TransportVehicle $vehicle) => [
                'id' => $vehicle->id,
                'label' => $vehicle->label,
                'driver_name' => $vehicle->driver_name,
                'plate_number' => $vehicle->plate_number,
                'driver_contact_number' => $vehicle->driver_contact_number,
                'incharge' => $vehicle->incharge
                    ? [
                        'id' => $vehicle->incharge->id,
                        'full_name' => $vehicle->incharge->name,
                    ]
                    : null,
            ]);

        $assignmentsByUser = VehicleAssignment::query()
            ->with('vehicle')
            ->when($selectedEventId, fn ($query) => $query->where('programme_id', $selectedEventId))
            ->get()
            ->keyBy('user_id');

        $participantIds = $assignmentsByUser->keys()->values();

        $tableAssignments = ParticipantTableAssignment::query()
            ->with('participantTable')
            ->when($selectedEventId, fn ($query) => $query->where('programme_id', $selectedEventId))
            ->when($participantIds->isNotEmpty(), fn ($query) => $query->whereIn('user_id', $participantIds))
            ->get()
            ->keyBy('user_id');

        $attendanceByUser = ParticipantAttendance::query()
            ->when($selectedEventId, fn ($query) => $query->where('programme_id', $selectedEventId))
            ->when($participantIds->isNotEmpty(), fn ($query) => $query->whereIn('user_id', $participantIds))
            ->get()
            ->keyBy('user_id');

        $participants = User::query()
            ->with(['country', 'userType'])
            ->when(
                $selectedEventId,
                fn ($query) => $query->whereHas('joinedProgrammes', fn ($subQuery) => $subQuery->where('programmes.id', $selectedEventId))
            )
            ->orderBy('name')
            ->get()
            ->map(function (User $participant) use ($assignmentsByUser, $tableAssignments, $attendanceByUser) {
                $assignment = $assignmentsByUser->get($participant->id);
                $tableAssignment = $tableAssignments->get($participant->id);
                $table = $tableAssignment?->participantTable;
                $attendance = $attendanceByUser->get($participant->id);

                return [
                    'id' => $participant->id,
                    'display_id' => $participant->display_id,
                    'qr_payload' => $participant->qr_payload,
                    'profile_photo_url' => $participant->profile_photo_url,
                    'full_name' => $participant->name,
                    'email' => $participant->email,
                    'country' => $participant->country
                        ? [
                            'id' => $participant->country->id,
                            'code' => $participant->country->code,
                            'name' => $participant->country->name,
                            'flag_url' => $participant->country->flag_url,
                        ]
                        : null,
                    'user_type' => $participant->userType
                        ? [
                            'id' => $participant->userType->id,
                            'name' => $participant->userType->name,
                            'slug' => $participant->userType->slug,
                        ]
                        : null,
                    'table_assignment' => $table
                        ? [
                            'table_number' => $table->table_number,
                            'seat_number' => $tableAssignment?->seat_number,
                        ]
                        : null,
                    'attendance' => [
                        'scanned_at' => $attendance?->scanned_at?->toISOString(),
                    ],
                    'dietary' => [
                        'has_food_restrictions' => (bool) ($participant->has_food_restrictions ?? false),
                        'food_restrictions' => $participant->food_restrictions ?? [],
                        'dietary_allergies' => $participant->dietary_allergies,
                        'dietary_other' => $participant->dietary_other,
                    ],
                    'accessibility' => [
                        'needs' => $participant->accessibility_needs ?? [],
                        'other' => $participant->accessibility_other,
                    ],
                    'assignment' => $assignment
                        ? [
                            'id' => $assignment->id,
                            'vehicle_id' => $assignment->vehicle_id,
                            'vehicle_label' => $assignment->vehicle?->label ?: $assignment->vehicle_label,
                            'pickup_status' => $assignment->pickup_status,
                            'pickup_location' => $assignment->pickup_location,
                            'pickup_at' => $assignment->pickup_at?->toISOString(),
                            'dropoff_location' => $assignment->dropoff_location,
                            'dropoff_at' => $assignment->dropoff_at?->toISOString(),
                        ]
                        : null,
                ];
            });

        return Inertia::render('vehicle-assignment', [
            'events' => $events->map(fn (Programme $event) => [
                'id' => $event->id,
                'title' => $event->title,
                'starts_at' => $event->starts_at?->toISOString(),
                'ends_at' => $event->ends_at?->toISOString(),
                'is_active' => (bool) $event->is_active,
            ]),
            'selected_event_id' => $selectedEventId ?: null,
            'vehicles' => $vehicles,
            'participants' => $participants,
        ]);
    }

    public function participantAssignmentIndex(Request $request)
    {
        $participant = $request->user();

        $events = $participant->joinedProgrammes()
            ->orderBy('starts_at')
            ->orderBy('title')
            ->get();

        $assignments = VehicleAssignment::query()
            ->with(['vehicle.incharge', 'driver'])
            ->where('user_id', $participant->id)
            ->get()
            ->keyBy('programme_id');

        $eventRows = $events->map(function (Programme $event) use ($assignments) {
            $assignment = $assignments->get($event->id);
            $vehicle = $assignment?->vehicle;
            $incharge = $vehicle?->incharge ?? $assignment?->driver;

            return [
                'id' => $event->id,
                'title' => $event->title,
                'starts_at' => $event->starts_at?->toISOString(),
                'ends_at' => $event->ends_at?->toISOString(),
                'location' => $event->location,
                'vehicle_assignment' => $assignment
                    ? [
                        'vehicle_name' => $vehicle?->label ?: $assignment->vehicle_label,
                        'plate_number' => $vehicle?->plate_number,
                        'ched_lo_name' => $incharge?->name,
                        'ched_lo_number' => $incharge?->contact_number,
                    ]
                    : null,
            ];
        });

        return Inertia::render('participant-vehicle-assignment', [
            'events' => $eventRows,
        ]);
    }

    public function chedLoAssignmentIndex(Request $request)
    {
        $user = $request->user();

        $events = Programme::query()
            ->orderBy('starts_at')
            ->orderBy('title')
            ->get();

        $selectedEventId = $this->resolveSelectedEventId($request, $events);

        $vehicles = TransportVehicle::query()
            ->with(['assignments' => fn ($query) => $query
                ->when($selectedEventId, fn ($q) => $q->where('programme_id', $selectedEventId))
                ->where('driver_user_id', $user->id)])
            ->when($selectedEventId, fn ($query) => $query->where('programme_id', $selectedEventId))
            ->where('incharge_user_id', $user->id)
            ->orderBy('label')
            ->get()
            ->map(fn (TransportVehicle $vehicle) => [
                'id' => $vehicle->id,
                'label' => $vehicle->label,
                'plate_number' => $vehicle->plate_number,
                'driver_name' => $vehicle->driver_name,
                'driver_contact_number' => $vehicle->driver_contact_number,
                'pickup_sent_at' => $vehicle->assignments
                    ->where('notify_admin', true)
                    ->max('pickup_at')?->toISOString(),
            ]);

        $assignmentsByUser = VehicleAssignment::query()
            ->with('vehicle')
            ->where('driver_user_id', $user->id)
            ->when($selectedEventId, fn ($query) => $query->where('programme_id', $selectedEventId))
            ->get()
            ->keyBy('user_id');

        $participantIds = $assignmentsByUser->keys()->values();

        $tableAssignments = ParticipantTableAssignment::query()
            ->with('participantTable')
            ->when($selectedEventId, fn ($query) => $query->where('programme_id', $selectedEventId))
            ->when($participantIds->isNotEmpty(), fn ($query) => $query->whereIn('user_id', $participantIds))
            ->get()
            ->keyBy('user_id');

        $attendanceByUser = ParticipantAttendance::query()
            ->when($selectedEventId, fn ($query) => $query->where('programme_id', $selectedEventId))
            ->when($participantIds->isNotEmpty(), fn ($query) => $query->whereIn('user_id', $participantIds))
            ->get()
            ->keyBy('user_id');

        $participants = User::query()
            ->with(['country', 'userType'])
            ->when($participantIds->isNotEmpty(), fn ($query) => $query->whereIn('id', $participantIds), fn ($query) => $query->whereRaw('1 = 0'))
            ->orderBy('name')
            ->get()
            ->map(function (User $participant) use ($assignmentsByUser, $tableAssignments, $attendanceByUser) {
                $assignment = $assignmentsByUser->get($participant->id);
                $tableAssignment = $tableAssignments->get($participant->id);
                $table = $tableAssignment?->participantTable;
                $attendance = $attendanceByUser->get($participant->id);

                return [
                    'id' => $participant->id,
                    'display_id' => $participant->display_id,
                    'qr_payload' => $participant->qr_payload,
                    'profile_photo_url' => $participant->profile_photo_url,
                    'full_name' => $participant->name,
                    'email' => $participant->email,
                    'country' => $participant->country
                        ? [
                            'id' => $participant->country->id,
                            'code' => $participant->country->code,
                            'name' => $participant->country->name,
                            'flag_url' => $participant->country->flag_url,
                        ]
                        : null,
                    'user_type' => $participant->userType
                        ? [
                            'id' => $participant->userType->id,
                            'name' => $participant->userType->name,
                            'slug' => $participant->userType->slug,
                        ]
                        : null,
                    'table_assignment' => $table
                        ? [
                            'table_number' => $table->table_number,
                            'seat_number' => $tableAssignment?->seat_number,
                        ]
                        : null,
                    'attendance' => [
                        'scanned_at' => $attendance?->scanned_at?->toISOString(),
                    ],
                    'dietary' => [
                        'has_food_restrictions' => (bool) ($participant->has_food_restrictions ?? false),
                        'food_restrictions' => $participant->food_restrictions ?? [],
                        'dietary_allergies' => $participant->dietary_allergies,
                        'dietary_other' => $participant->dietary_other,
                    ],
                    'accessibility' => [
                        'needs' => $participant->accessibility_needs ?? [],
                        'other' => $participant->accessibility_other,
                    ],
                    'assignment' => $assignment
                        ? [
                            'id' => $assignment->id,
                            'vehicle_id' => $assignment->vehicle_id,
                            'vehicle_label' => $assignment->vehicle?->label ?: $assignment->vehicle_label,
                            'pickup_status' => $assignment->pickup_status,
                            'pickup_location' => $assignment->pickup_location,
                            'pickup_at' => $assignment->pickup_at?->toISOString(),
                            'dropoff_location' => $assignment->dropoff_location,
                            'dropoff_at' => $assignment->dropoff_at?->toISOString(),
                        ]
                        : null,
                ];
            });

        return Inertia::render('vehicle-assignment', [
            'events' => $events->map(fn (Programme $event) => [
                'id' => $event->id,
                'title' => $event->title,
                'starts_at' => $event->starts_at?->toISOString(),
                'ends_at' => $event->ends_at?->toISOString(),
                'is_active' => (bool) $event->is_active,
            ]),
            'selected_event_id' => $selectedEventId ?: null,
            'vehicles' => $vehicles,
            'participants' => $participants,
        ]);
    }


    public function updatePresence(Request $request, VehicleAssignment $vehicleAssignment)
    {
        $user = $request->user();

        if (! $this->isAdmin($user) && $vehicleAssignment->driver_user_id !== $user?->id) {
            abort(403);
        }

        $validated = $request->validate([
            'is_present' => ['required', 'boolean'],
        ]);

        $isPresent = (bool) $validated['is_present'];

        $vehicleAssignment->update([
            'pickup_status' => $isPresent ? 'picked_up' : 'pending',
            'pickup_at' => $isPresent ? ($vehicleAssignment->pickup_at ?? now()) : null,
            'dropoff_at' => $isPresent ? $vehicleAssignment->dropoff_at : null,
        ]);

        return back();
    }


    public function sendPickupNotification(Request $request)
    {
        $user = $request->user();

        if (! $user || ! $this->isChedLoType($user)) {
            abort(403);
        }

        $validated = $request->validate([
            'programme_id' => ['required', 'integer', 'exists:programmes,id'],
            'vehicle_id' => ['required', 'integer', 'exists:transport_vehicles,id'],
        ]);

        $vehicle = TransportVehicle::query()
            ->where('id', $validated['vehicle_id'])
            ->where('programme_id', $validated['programme_id'])
            ->where('incharge_user_id', $user->id)
            ->firstOrFail();

        $assignments = VehicleAssignment::query()
            ->where('programme_id', $validated['programme_id'])
            ->where('vehicle_id', $vehicle->id)
            ->where('driver_user_id', $user->id)
            ->where('pickup_status', '!=', 'pending')
            ->get();

        if ($assignments->isEmpty()) {
            return back()->withErrors([
                'pickup' => 'No checked passengers found for this vehicle.',
            ]);
        }

        $pickupAt = now();

        VehicleAssignment::query()
            ->whereIn('id', $assignments->pluck('id'))
            ->update([
                'notify_admin' => true,
                'pickup_at' => $pickupAt,
            ]);

        return back();
    }


    public function removePickupNotification(Request $request)
    {
        $user = $request->user();

        if (! $user || ! $this->isChedLoType($user)) {
            abort(403);
        }

        $validated = $request->validate([
            'programme_id' => ['required', 'integer', 'exists:programmes,id'],
            'vehicle_id' => ['required', 'integer', 'exists:transport_vehicles,id'],
        ]);

        $vehicle = TransportVehicle::query()
            ->where('id', $validated['vehicle_id'])
            ->where('programme_id', $validated['programme_id'])
            ->where('incharge_user_id', $user->id)
            ->firstOrFail();

        VehicleAssignment::query()
            ->where('programme_id', $validated['programme_id'])
            ->where('vehicle_id', $vehicle->id)
            ->where('driver_user_id', $user->id)
            ->where('notify_admin', true)
            ->update([
                'notify_admin' => false,
                'pickup_at' => null,
            ]);

        return back();
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'programme_id' => ['required', 'exists:programmes,id'],
            'vehicle_id' => [
                'required',
                Rule::exists('transport_vehicles', 'id')->where('programme_id', $request->input('programme_id')),
            ],
            'participant_ids' => ['required', 'array', 'min:1'],
            'participant_ids.*' => ['integer', 'exists:users,id'],
        ]);

        $vehicle = TransportVehicle::query()->findOrFail($validated['vehicle_id']);

        $participantIds = collect($validated['participant_ids'])->unique()->values();

        foreach ($participantIds as $participantId) {
            VehicleAssignment::updateOrCreate(
                [
                    'programme_id' => $validated['programme_id'],
                    'user_id' => $participantId,
                ],
                [
                    'vehicle_id' => $vehicle->id,
                    'driver_user_id' => $vehicle->incharge_user_id,
                    'vehicle_label' => $vehicle->label,
                ],
            );
        }

        return back();
    }

    public function destroy(int $vehicleAssignmentId)
    {
        $vehicleAssignment = VehicleAssignment::query()->find($vehicleAssignmentId);

        if (! $vehicleAssignment) {
            return back();
        }

        $vehicleAssignment->delete();

        return back();
    }

    public function storePickup(Request $request, VehicleAssignment $vehicleAssignment)
    {
        $validated = $request->validate([
            'pickup_location' => ['required', 'string', 'max:255'],
            'pickup_at' => ['required', 'date'],
        ]);

        $vehicleAssignment->update([
            'pickup_location' => $validated['pickup_location'],
            'pickup_at' => $validated['pickup_at'],
            'pickup_status' => 'picked_up',
        ]);

        return back();
    }

    public function storeDropoff(Request $request, VehicleAssignment $vehicleAssignment)
    {
        $validated = $request->validate([
            'dropoff_location' => ['required', 'string', 'max:255'],
            'dropoff_at' => ['required', 'date'],
        ]);

        $vehicleAssignment->update([
            'dropoff_location' => $validated['dropoff_location'],
            'dropoff_at' => $validated['dropoff_at'],
            'pickup_status' => 'dropped_off',
        ]);

        return back();
    }

    private function resolveSelectedEventId(Request $request, $events): int
    {
        $requestedEventId = (int) $request->input('event_id');

        if ($requestedEventId > 0) {
            return $requestedEventId;
        }

        $activeEvent = $events->firstWhere('is_active', true);

        return (int) ($activeEvent?->id ?? $events->first()?->id ?? 0);
    }

    private function isChedLoType(User $user): bool
    {
        return $this->matchesChedLo((string) $user->userType?->name)
            || $this->matchesChedLo((string) $user->userType?->slug);
    }

    private function matchesChedLo(string $value): bool
    {
        $normalized = Str::of($value)
            ->upper()
            ->replace(['_', '-'], ' ')
            ->replaceMatches('/\s+/', ' ')
            ->trim();

        $compact = Str::of((string) $normalized)->replace(' ', '');

        return $normalized === 'CHED LO'
            || $normalized === 'CHEDLO'
            || $normalized->startsWith('CHED LO ')
            || $compact->startsWith('CHEDLO')
            || $normalized->startsWith('CHED LIAISON')
            || $compact->startsWith('CHEDLIAISON');
    }

    private function isChedAdmin(?User $user): bool
    {
        if (! $user) {
            return false;
        }

        $user->loadMissing('userType');

        $roleName = Str::upper((string) ($user->userType?->name ?? ''));
        $roleSlug = Str::upper((string) ($user->userType?->slug ?? ''));

        $isAdmin = in_array('ADMIN', [$roleName, $roleSlug], true);
        $isChed = in_array('CHED', [$roleName, $roleSlug], true);
        $isChedLo = in_array('CHED LO', [$roleName, $roleSlug], true)
            || in_array('CHED-LO', [$roleSlug], true);

        return $isAdmin || $isChed || $isChedLo;
    }

    private function isAdmin(?User $user): bool
    {
        if (! $user) {
            return false;
        }

        $user->loadMissing('userType');

        $roleName = Str::upper((string) ($user->userType?->name ?? ''));
        $roleSlug = Str::upper((string) ($user->userType?->slug ?? ''));

        return in_array('ADMIN', [$roleName, $roleSlug], true);
    }
}
