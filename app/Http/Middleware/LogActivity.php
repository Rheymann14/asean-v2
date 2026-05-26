<?php

namespace App\Http\Middleware;

use App\Models\ActivityLog;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;

class LogActivity
{
    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next): Response
    {
        /** @var Response $response */
        $response = $next($request);

        $user = $request->user();
        if (! $user) {
            return $response;
        }

        $route = $request->route();
        $routeName = $route?->getName();
        $path = $request->path() === '/' ? '/' : '/'.ltrim($request->path(), '/');
        $activity = $this->resolveActivity($request, $routeName);
        $status = $this->resolveStatus($response->getStatusCode(), $activity);

        if ($activity === 'view') {
            return $response;
        }
        $pageLabel = $routeName
            ? Str::of($routeName)->replace('.', ' / ')->headline()
            : $path;
        $description = $this->buildDescription($request, $routeName, $activity, $pageLabel);

        ActivityLog::create([
            'user_id' => $user->id,
            'route_name' => $routeName,
            'path' => $path,
            'method' => $request->method(),
            'activity' => $activity,
            'description' => $description,
            'status' => $status,
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return $response;
    }

    private function buildDescription(Request $request, ?string $routeName, string $activity, string $pageLabel): string
    {
        $routeName = Str::lower((string) $routeName);
        $subject = $this->resolveSubject($request, $routeName);
        $subjectLabel = $subject['label'] ?? null;
        $subjectName = $subject['name'] ?? null;
        $subjectDescriptor = $this->formatSubject($subjectLabel, $subjectName, false);
        $subjectDescriptorLower = $this->formatSubject($subjectLabel, $subjectName, true);

        $special = $this->resolveSpecialDescription($request, $routeName);
        if ($special) {
            return $special;
        }

        if ($activity === 'login') {
            return 'Signed in.';
        }

        if ($activity === 'logout') {
            return 'Signed out.';
        }

        if ($activity === 'export') {
            return $subjectDescriptorLower
                ? sprintf('Exported %s.', $subjectDescriptorLower)
                : 'Exported data.';
        }

        if ($activity === 'create') {
            return $subjectDescriptorLower
                ? sprintf('Added %s.', $subjectDescriptorLower)
                : sprintf('Created %s.', Str::lower($pageLabel));
        }

        if ($activity === 'delete') {
            return $subjectDescriptorLower
                ? sprintf('Deleted %s.', $subjectDescriptorLower)
                : sprintf('Removed %s.', Str::lower($pageLabel));
        }

        if ($activity === 'update') {
            if ($subjectDescriptorLower && $this->hasActiveToggle($request)) {
                $state = $request->boolean('is_active') ? 'active' : 'inactive';
                return sprintf('Set %s %s.', $subjectDescriptorLower, $state);
            }

            return $subjectDescriptorLower
                ? sprintf('Updated %s.', $subjectDescriptorLower)
                : sprintf('Updated %s.', Str::lower($pageLabel));
        }

        if ($activity === 'approve') {
            return $subjectDescriptorLower
                ? sprintf('Approved %s.', $subjectDescriptorLower)
                : sprintf('Approved %s.', Str::lower($pageLabel));
        }

        if ($activity === 'reject') {
            return $subjectDescriptorLower
                ? sprintf('Rejected %s.', $subjectDescriptorLower)
                : sprintf('Rejected %s.', Str::lower($pageLabel));
        }

        return sprintf('%s %s.', Str::headline($activity), $pageLabel);
    }

    private function resolveSpecialDescription(Request $request, string $routeName): ?string
    {
        $programme = $this->resolveProgramme($request);
        $programmeTitle = $programme?->title;

        if ($routeName === 'event-list.join') {
            return $programmeTitle
                ? sprintf('Joined event "%s".', $programmeTitle)
                : 'Joined event.';
        }

        if ($routeName === 'event-list.leave') {
            return $programmeTitle
                ? sprintf('Left event "%s".', $programmeTitle)
                : 'Left event.';
        }

        if ($routeName === 'event-list.clear') {
            return 'Cleared event selections.';
        }

        if ($routeName === 'participants.programmes.join') {
            $participant = $this->resolveParticipant($request);

            if ($participant?->name && $programmeTitle) {
                return sprintf(
                    'Added participant "%s" to event "%s".',
                    $participant->name,
                    $programmeTitle
                );
            }

            return 'Added participant to event.';
        }

        if ($routeName === 'participants.programmes.leave') {
            $participant = $this->resolveParticipant($request);

            if ($participant?->name && $programmeTitle) {
                return sprintf(
                    'Removed participant "%s" from event "%s".',
                    $participant->name,
                    $programmeTitle
                );
            }

            return 'Removed participant from event.';
        }

        if ($routeName === 'participants.programmes.attendance.revert') {
            $participant = $this->resolveParticipant($request);

            if ($participant?->name && $programmeTitle) {
                return sprintf(
                    'Reverted attendance for "%s" in event "%s".',
                    $participant->name,
                    $programmeTitle
                );
            }

            return 'Reverted attendance for event.';
        }

        if ($routeName === 'table-assignment.tables.store') {
            $tableNumber = $request->input('table_number');

            return $programmeTitle && $tableNumber
                ? sprintf('Added table %s for event "%s".', $tableNumber, $programmeTitle)
                : 'Added table for event.';
        }

        if ($routeName === 'table-assignment.tables.update') {
            $table = $request->route()?->parameter('participantTable');
            $tableNumber = $table?->table_number;

            return $programmeTitle && $tableNumber
                ? sprintf('Updated table %s for event "%s".', $tableNumber, $programmeTitle)
                : 'Updated table.';
        }

        if ($routeName === 'table-assignment.tables.destroy') {
            $table = $request->route()?->parameter('participantTable');
            $tableNumber = $table?->table_number;

            return $programmeTitle && $tableNumber
                ? sprintf('Deleted table %s for event "%s".', $tableNumber, $programmeTitle)
                : 'Deleted table for event.';
        }

        if ($routeName === 'table-assignment.assignments.store') {
            $table = $this->resolveParticipantTable($request);
            $tableNumber = $table?->table_number;

            return $programmeTitle && $tableNumber
                ? sprintf('Assigned participants to table %s for event "%s".', $tableNumber, $programmeTitle)
                : 'Assigned participants to a table.';
        }

        if ($routeName === 'table-assignment.assignments.update') {
            $assignment = $request->route()?->parameter('participantTableAssignment');
            $participantName = $assignment?->user?->name;
            $tableNumber = $assignment?->participantTable?->table_number;
            $eventTitle = $assignment?->programme?->title;
            $seatNumber = $request->input('seat_number');

            if ($participantName && $tableNumber && $eventTitle && $seatNumber) {
                return sprintf(
                    'Changed "%s" to seat %s at table %s in event "%s".',
                    $participantName,
                    $seatNumber,
                    $tableNumber,
                    $eventTitle
                );
            }

            return 'Updated participant seat assignment.';
        }

        if ($routeName === 'table-assignment.assignments.destroy') {
            $assignment = $request->route()?->parameter('participantTableAssignment');
            $participantName = $assignment?->user?->name;
            $tableNumber = $assignment?->participantTable?->table_number;
            $eventTitle = $assignment?->programme?->title;

            if ($participantName && $tableNumber && $eventTitle) {
                return sprintf(
                    'Removed "%s" from table %s in event "%s".',
                    $participantName,
                    $tableNumber,
                    $eventTitle
                );
            }

            return 'Removed table assignment.';
        }

        if ($routeName === 'section-management.title') {
            $title = $request->input('title');

            return $title
                ? sprintf('Updated section title to "%s".', $title)
                : 'Updated section title.';
        }

        if ($routeName === 'section-management.store') {
            $title = $request->input('title');

            return $title
                ? sprintf('Added section image "%s".', $title)
                : 'Added section image.';
        }

        if ($routeName === 'participants.store') {
            $name = $request->input('full_name');

            return $name
                ? sprintf('Added participant "%s".', $name)
                : 'Added participant.';
        }

        if ($routeName === 'participants.update') {
            $participant = $this->resolveParticipant($request);
            $name = $participant?->name ?? $request->input('full_name');

            if ($name && $this->hasActiveToggle($request)) {
                $state = $request->boolean('is_active') ? 'active' : 'inactive';
                return sprintf('Set participant "%s" %s.', $name, $state);
            }

            return $name
                ? sprintf('Updated participant "%s".', $name)
                : 'Updated participant.';
        }

        if ($routeName === 'participants.destroy') {
            $participant = $this->resolveParticipant($request);
            $name = $participant?->name ?? $request->input('full_name');

            return $name
                ? sprintf('Removed participant "%s".', $name)
                : 'Removed participant.';
        }

        if ($routeName === 'venues.store') {
            $name = $request->input('name');

            return $name
                ? sprintf('Added venue "%s".', $name)
                : 'Added venue.';
        }

        if ($routeName === 'venues.update') {
            $venue = $request->route()?->parameter('venue');
            $name = $venue?->name ?? $request->input('name');

            if ($name && $this->hasActiveToggle($request)) {
                $state = $request->boolean('is_active') ? 'active' : 'inactive';
                return sprintf('Set venue "%s" %s.', $name, $state);
            }

            return $name
                ? sprintf('Updated venue "%s".', $name)
                : 'Updated venue.';
        }

        if ($routeName === 'venues.destroy') {
            $venue = $request->route()?->parameter('venue');
            $name = $venue?->name ?? $request->input('name');

            return $name
                ? sprintf('Removed venue "%s".', $name)
                : 'Removed venue.';
        }

        if ($routeName === 'issuances.store') {
            $title = $request->input('title');

            return $title
                ? sprintf('Added issuance "%s".', $title)
                : 'Added issuance.';
        }

        if ($routeName === 'issuances.update') {
            $issuance = $request->route()?->parameter('issuance');
            $title = $issuance?->title ?? $request->input('title');

            if ($title && $this->hasActiveToggle($request)) {
                $state = $request->boolean('is_active') ? 'active' : 'inactive';
                return sprintf('Set issuance "%s" %s.', $title, $state);
            }

            return $title
                ? sprintf('Updated issuance "%s".', $title)
                : 'Updated issuance.';
        }

        if ($routeName === 'issuances.destroy') {
            $issuance = $request->route()?->parameter('issuance');
            $title = $issuance?->title ?? $request->input('title');

            return $title
                ? sprintf('Removed issuance "%s".', $title)
                : 'Removed issuance.';
        }

        if ($routeName === 'contact-details.update') {
            $title = $request->input('title');

            if ($title && $this->hasActiveToggle($request)) {
                $state = $request->boolean('is_active') ? 'active' : 'inactive';
                return sprintf('Set contact detail "%s" %s.', $title, $state);
            }

            return $title
                ? sprintf('Updated contact detail "%s".', $title)
                : 'Updated contact detail.';
        }

        if ($routeName === 'profile.update') {
            $userName = $request->user()?->name;

            return $userName
                ? sprintf('Updated profile for "%s".', $userName)
                : 'Updated profile.';
        }

        if ($routeName === 'profile.destroy') {
            return 'Deleted profile.';
        }

        if ($routeName === 'user-password.update') {
            return 'Updated account password.';
        }

        return null;
    }

    private function formatSubject(?string $label, ?string $name, bool $lowercaseLabel): ?string
    {
        if (! $label) {
            return null;
        }

        $labelText = $lowercaseLabel ? Str::lower($label) : $label;
        $nameText = $name ? trim($name) : null;

        return trim(sprintf('%s%s', $labelText, $nameText ? ' "' . $nameText . '"' : ''));
    }

    private function resolveSubject(Request $request, string $routeName): array
    {
        if (Str::startsWith($routeName, 'programmes.')) {
            return [
                'label' => 'Event',
                'name' => $this->resolveProgramme($request)?->title
                    ?? $request->input('title'),
            ];
        }

        if (Str::startsWith($routeName, 'venues.')) {
            return [
                'label' => 'Venue',
                'name' => $request->route()?->parameter('venue')?->name
                    ?? $request->input('name'),
            ];
        }

        if (Str::startsWith($routeName, 'issuances.')) {
            return [
                'label' => 'Issuance',
                'name' => $request->route()?->parameter('issuance')?->title
                    ?? $request->input('title'),
            ];
        }

        if (Str::startsWith($routeName, 'participants.')) {
            $participant = $this->resolveParticipant($request);

            return [
                'label' => 'Participant',
                'name' => $participant?->name
                    ?? $request->input('full_name'),
            ];
        }

        if (Str::startsWith($routeName, 'participants.countries.')) {
            return [
                'label' => 'Country',
                'name' => $request->route()?->parameter('country')?->name
                    ?? $request->input('name'),
            ];
        }

        if (Str::startsWith($routeName, 'participants.user-types.')) {
            return [
                'label' => 'User type',
                'name' => $request->route()?->parameter('user_type')?->name
                    ?? $request->input('name'),
            ];
        }

        if (Str::startsWith($routeName, 'contact-details.')) {
            return [
                'label' => 'Contact detail',
                'name' => $request->route()?->parameter('contactDetail')?->title
                    ?? $request->input('title'),
            ];
        }

        if (Str::startsWith($routeName, 'section-management.')) {
            return [
                'label' => 'Section image',
                'name' => $request->route()?->parameter('venueSectionImage')?->title
                    ?? $request->input('title'),
            ];
        }

        if (Str::startsWith($routeName, 'table-assignment.tables.')) {
            $table = $this->resolveParticipantTable($request);

            return [
                'label' => 'Table',
                'name' => $table?->table_number
                    ?? $request->input('table_number'),
            ];
        }

        if (Str::startsWith($routeName, 'profile.')) {
            return [
                'label' => 'Profile',
                'name' => $request->user()?->name,
            ];
        }

        if (Str::startsWith($routeName, 'user-password.')) {
            return [
                'label' => 'Password',
                'name' => null,
            ];
        }

        return [];
    }

    private function resolveProgramme(Request $request)
    {
        return $request->route()?->parameter('programme');
    }

    private function resolveParticipant(Request $request)
    {
        return $request->route()?->parameter('participant');
    }

    private function resolveParticipantTable(Request $request)
    {
        return $request->route()?->parameter('participant_table')
            ?? $request->route()?->parameter('participantTable');
    }

    private function hasActiveToggle(Request $request): bool
    {
        return $request->has('is_active');
    }

    private function resolveActivity(Request $request, ?string $routeName): string
    {
        $routeName = Str::lower((string) $routeName);
        $method = $request->method();

        if (Str::contains($routeName, 'login')) {
            return 'login';
        }

        if (Str::contains($routeName, 'logout')) {
            return 'logout';
        }

        if (Str::contains($routeName, 'export')) {
            return 'export';
        }

        if (Str::contains($routeName, 'approve')) {
            return 'approve';
        }

        if (Str::contains($routeName, 'reject')) {
            return 'reject';
        }

        return match ($method) {
            'POST' => 'create',
            'PUT', 'PATCH' => 'update',
            'DELETE' => 'delete',
            default => 'view',
        };
    }

    private function resolveStatus(int $statusCode, string $activity): string
    {
        if ($statusCode >= 400) {
            return 'failed';
        }

        if ($statusCode >= 300) {
            return 'warning';
        }

        if (in_array($activity, ['view'], true)) {
            return 'info';
        }

        return 'success';
    }
}
