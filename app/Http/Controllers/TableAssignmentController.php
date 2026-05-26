<?php

namespace App\Http\Controllers;

use App\Models\ParticipantTable;
use App\Models\ParticipantTableAssignment;
use App\Models\Programme;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class TableAssignmentController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();

        if (! $this->isChedAdmin($user)) {
            return $this->participantIndex($request);
        }

        return $this->chedIndex($request, 'create');
    }

    public function create(Request $request)
    {
        return $this->chedIndex($request, 'create');
    }

    public function assignment(Request $request)
    {
        return $this->chedIndex($request, 'assignment');
    }

    private function chedIndex(Request $request, string $view)
    {
        $currentUser = $request->user();
        $isAdmin = $currentUser && $currentUser->userType &&
            (strtoupper($currentUser->userType->name ?? '') === 'ADMIN' ||
            strtoupper($currentUser->userType->slug ?? '') === 'ADMIN');

        $events = Programme::query()
            ->orderBy('starts_at')
            ->orderBy('title')
            ->get();

        $now = now();
        $defaultEvent = $events->first(fn (Programme $event) => $this->isProgrammeOpen($event, $now));

        $selectedEventId = (int) $request->input('event_id', $defaultEvent?->id ?? $events->first()?->id);

        $tables = ParticipantTable::with(['assignments.user.country', 'assignments.user.userType'])
            ->when($selectedEventId, fn ($query) => $query->where('programme_id', $selectedEventId))
            ->orderBy('table_number')
            ->get()
            ->map(function (ParticipantTable $table) {
                return [
                    'id' => $table->id,
                    'table_number' => $table->table_number,
                    'capacity' => $table->capacity,
                    'assigned_count' => $table->assignments->count(),
                    'assignments' => $table->assignments
                        ->sortBy([['seat_number', 'asc'], ['assigned_at', 'asc']])
                        ->values()
                        ->map(function (ParticipantTableAssignment $assignment) {
                            $participant = $assignment->user;

                            return [
                                'id' => $assignment->id,
                                'seat_number' => $assignment->seat_number,
                                'assigned_at' => $assignment->assigned_at?->toISOString(),
                                'participant' => $participant
                                    ? [
                                        'id' => $participant->id,
                                        'full_name' => $participant->name,
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
                                        'has_food_restrictions' => $participant->has_food_restrictions ?? false,
                                        'food_restrictions' => $participant->food_restrictions ?? [],
                                        'dietary_allergies' => $participant->dietary_allergies,
                                        'dietary_other' => $participant->dietary_other,
                                        'accessibility_needs' => $participant->accessibility_needs ?? [],
                                        'accessibility_other' => $participant->accessibility_other,
                                    ]
                                    : null,
                            ];
                        }),
                ];
            });

        $assignedIds = ParticipantTableAssignment::query()
            ->when($selectedEventId, fn ($query) => $query->where('programme_id', $selectedEventId))
            ->pluck('user_id');

        $participants = User::query()
            ->with(['country', 'userType'])
            ->when(
                $selectedEventId,
                fn ($query) => $query->whereHas('joinedProgrammes', fn ($subQuery) => $subQuery->where('programmes.id', $selectedEventId))
            )
            ->when(
                $assignedIds->isNotEmpty(),
                fn ($query) => $query->whereNotIn('id', $assignedIds)
            )
            ->when(! $isAdmin, function ($query) {
                $query->where(function ($q) {
                    $q->whereDoesntHave('userType')
                        ->orWhereHas('userType', function ($subQuery) {
                            $subQuery->where(function ($nameQuery) {
                                $nameQuery->whereNull('name')->orWhereRaw("UPPER(name) NOT LIKE 'CHED%'");
                            })->where(function ($slugQuery) {
                                $slugQuery->whereNull('slug')->orWhereRaw("UPPER(slug) NOT LIKE 'CHED%'");
                            });
                        });
                });
            })
            ->orderBy('name')
            ->get()
            ->map(function (User $participant) {
                return [
                    'id' => $participant->id,
                    'full_name' => $participant->name,
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
                    'has_food_restrictions' => $participant->has_food_restrictions ?? false,
                    'food_restrictions' => $participant->food_restrictions ?? [],
                    'dietary_allergies' => $participant->dietary_allergies,
                    'dietary_other' => $participant->dietary_other,
                    'accessibility_needs' => $participant->accessibility_needs ?? [],
                    'accessibility_other' => $participant->accessibility_other,
                ];
            });

        return Inertia::render('table-assignmeny', [
            'tables' => $tables,
            'participants' => $participants,
            'events' => $events->map(fn (Programme $event) => [
                'id' => $event->id,
                'title' => $event->title,
                'starts_at' => $event->starts_at?->toISOString(),
                'ends_at' => $event->ends_at?->toISOString(),
                'is_active' => $event->is_active,
            ]),
            'selected_event_id' => $selectedEventId ?: null,
            'view' => $view,
        ]);
    }

    private function participantIndex(Request $request)
    {
        $participant = $request->user();

        $events = $participant->joinedProgrammes()
            ->orderBy('starts_at')
            ->orderBy('title')
            ->get();

        $assignments = ParticipantTableAssignment::query()
            ->with(['participantTable', 'programme'])
            ->where('user_id', $participant->id)
            ->get()
            ->keyBy('programme_id');

        $eventRows = $events->map(function (Programme $event) use ($assignments) {
            $assignment = $assignments->get($event->id);
            $table = $assignment?->participantTable;

            return [
                'id' => $event->id,
                'title' => $event->title,
                'starts_at' => $event->starts_at?->toISOString(),
                'ends_at' => $event->ends_at?->toISOString(),
                'location' => $event->location,
                'table' => $table
                    ? [
                        'table_number' => $table->table_number,
                        'capacity' => $table->capacity,
                        'seat_number' => $assignment?->seat_number,
                        'assigned_at' => $assignment?->assigned_at?->toISOString(),
                    ]
                    : null,
            ];
        });

        return Inertia::render('participant-table-assignment', [
            'events' => $eventRows,
        ]);
    }

    public function storeTable(Request $request)
    {
        $minimumCapacity = $this->isAdmin($request->user()) ? 0 : 1;

        $validated = $request->validate([
            'programme_id' => ['required', 'exists:programmes,id'],
            'table_number' => [
                'required',
                'string',
                'max:50',
                Rule::unique('participant_tables', 'table_number')->where('programme_id', $request->input('programme_id')),
            ],
            'capacity' => ['required', 'integer', "min:{$minimumCapacity}"],
        ]);

        $validated['table_number'] = trim($validated['table_number']);

        ParticipantTable::create($validated);

        return back();
    }

    public function updateTable(Request $request, ParticipantTable $participantTable)
    {
        $minimumCapacity = $this->isAdmin($request->user()) ? 0 : 1;

        $validated = $request->validate([
            'table_number' => [
                'sometimes',
                'string',
                'max:50',
                Rule::unique('participant_tables', 'table_number')
                    ->where('programme_id', $participantTable->programme_id)
                    ->ignore($participantTable->id),
            ],
            'capacity' => ['required', 'integer', "min:{$minimumCapacity}"],
        ]);

        $payload = [
            'capacity' => $validated['capacity'],
        ];

        if (array_key_exists('table_number', $validated)) {
            $payload['table_number'] = trim($validated['table_number']);
        }

        $participantTable->update($payload);

        return back();
    }

    public function destroyTable(ParticipantTable $participantTable)
    {
        $participantTable->assignments()->delete();
        $participantTable->delete();

        return back();
    }

    public function storeAssignments(Request $request)
    {
        $validated = $request->validate([
            'programme_id' => ['required', 'exists:programmes,id'],
            'participant_table_id' => [
                'required',
                Rule::exists('participant_tables', 'id')->where('programme_id', $request->input('programme_id')),
            ],
            'participant_ids' => ['required', 'array', 'min:1'],
            'participant_ids.*' => ['integer', 'exists:users,id'],
        ]);

        $programme = Programme::query()->find($validated['programme_id']);
        if ($programme && ! $this->isProgrammeOpen($programme, now())) {
            return back()->withErrors([
                'programme_id' => 'This event is closed.',
            ]);
        }

        $table = ParticipantTable::withCount('assignments')
            ->where('programme_id', $validated['programme_id'])
            ->findOrFail($validated['participant_table_id']);
        $participantIds = collect($validated['participant_ids'])->unique()->values();

        $currentUser = $request->user();
        $isAdmin = $currentUser && $currentUser->userType &&
            (strtoupper($currentUser->userType->name ?? '') === 'ADMIN' ||
            strtoupper($currentUser->userType->slug ?? '') === 'ADMIN');

        $eligibleIds = User::query()
            ->whereIn('id', $participantIds)
            ->whereHas('joinedProgrammes', fn ($query) => $query->where('programmes.id', $validated['programme_id']))
            ->when(! $isAdmin, function ($query) {
                $query->where(function ($q) {
                    $q->whereDoesntHave('userType')
                        ->orWhereHas('userType', function ($subQuery) {
                            $subQuery->where(function ($nameQuery) {
                                $nameQuery->whereNull('name')->orWhereRaw("UPPER(name) NOT LIKE 'CHED%'");
                            })->where(function ($slugQuery) {
                                $slugQuery->whereNull('slug')->orWhereRaw("UPPER(slug) NOT LIKE 'CHED%'");
                            });
                        });
                });
            })
            ->pluck('id');

        $alreadyAssignedIds = ParticipantTableAssignment::query()
            ->whereIn('user_id', $eligibleIds)
            ->where('programme_id', $validated['programme_id'])
            ->pluck('user_id');

        $newIds = $eligibleIds->diff($alreadyAssignedIds)->values();

        if ($newIds->isEmpty()) {
            return back();
        }

        $availableSeats = $table->capacity - $table->assignments_count;

        if ($availableSeats < $newIds->count()) {
            return back()->withErrors([
                'participant_ids' => 'Not enough available seats for this table.',
            ]);
        }

        $now = now();
        $startingSeatNumber = ParticipantTableAssignment::query()
            ->where('participant_table_id', $table->id)
            ->max('seat_number') ?? 0;

        $payload = $newIds->values()->map(function ($id, $index) use ($validated, $table, $now, $startingSeatNumber) {
            return [
                'programme_id' => $validated['programme_id'],
                'participant_table_id' => $table->id,
                'seat_number' => $startingSeatNumber + $index + 1,
                'user_id' => $id,
                'assigned_at' => $now,
                'created_at' => $now,
                'updated_at' => $now,
            ];
        });

        ParticipantTableAssignment::insert($payload->all());

        return back();
    }


    public function updateAssignment(Request $request, ParticipantTableAssignment $participantTableAssignment)
    {
        $validated = $request->validate([
            'seat_number' => ['required', 'integer', 'min:1'],
        ]);

        $programme = $participantTableAssignment->programme;
        if ($programme && ! $this->isProgrammeOpen($programme, now())) {
            return back()->withErrors([
                'assignment' => 'This event is closed.',
            ]);
        }

        $table = $participantTableAssignment->participantTable;
        if (! $table) {
            return back()->withErrors([
                'assignment' => 'Table assignment is unavailable.',
            ]);
        }

        $seatNumber = (int) $validated['seat_number'];

        if ($seatNumber > $table->capacity) {
            return back()->withErrors([
                'seat_number' => 'Seat number exceeds table capacity.',
            ]);
        }

        if ($participantTableAssignment->seat_number === $seatNumber) {
            return back();
        }

        $existing = ParticipantTableAssignment::query()
            ->where('participant_table_id', $table->id)
            ->where('seat_number', $seatNumber)
            ->where('id', '!=', $participantTableAssignment->id)
            ->first();

        if (! $existing) {
            $participantTableAssignment->update(['seat_number' => $seatNumber]);

            return back();
        }

        $currentSeat = $participantTableAssignment->seat_number;

        DB::transaction(function () use ($participantTableAssignment, $existing, $seatNumber, $currentSeat) {
            $existing->update(['seat_number' => 0]);
            $participantTableAssignment->update(['seat_number' => $seatNumber]);
            $existing->update(['seat_number' => $currentSeat]);
        });

        return back();
    }

    public function destroyAssignment(ParticipantTableAssignment $participantTableAssignment)
    {
        $programme = $participantTableAssignment->programme;
        if ($programme && ! $this->isProgrammeOpen($programme, now())) {
            return back()->withErrors([
                'assignment' => 'This event is closed.',
            ]);
        }

        $tableId = $participantTableAssignment->participant_table_id;

        $participantTableAssignment->delete();

        $this->resequenceSeatNumbers($tableId);

        return back();
    }

    private function resequenceSeatNumbers(int $tableId): void
    {
        $assignments = ParticipantTableAssignment::query()
            ->where('participant_table_id', $tableId)
            ->orderBy('seat_number')
            ->orderBy('assigned_at')
            ->orderBy('id')
            ->get(['id']);

        foreach ($assignments as $index => $assignment) {
            $assignment->update(['seat_number' => $index + 1]);
        }
    }


    private function isChedAdmin(?User $user): bool
    {
        if (! $user) {
            return false;
        }

        $user->loadMissing('userType');

        $value = Str::of((string) ($user->userType->slug ?: $user->userType->name))
            ->upper()
            ->replace(['_', '-'], ' ')
            ->trim();

        return $value === 'CHED' || $value->startsWith('CHED ');
    }

    private function isAdmin(?User $user): bool
    {
        if (! $user) {
            return false;
        }

        $user->loadMissing('userType');

        return strtoupper((string) ($user->userType->slug ?? $user->userType->name)) === 'ADMIN';
    }

    private function isProgrammeOpen(Programme $event, $now): bool
    {
        if (! $event->is_active) {
            return false;
        }

        $endsAt = $event->ends_at;

        return ! $endsAt || $endsAt->isAfter($now) || $endsAt->equalTo($now);
    }
}
