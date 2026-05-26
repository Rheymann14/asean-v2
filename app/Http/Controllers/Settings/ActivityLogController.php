<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;

class ActivityLogController extends Controller
{
    public function index(Request $request)
    {
        $logs = ActivityLog::query()
            ->with(['user.userType'])
            ->latest()
            ->get()
            ->map(function (ActivityLog $log) {
                $role = $log->user?->userType?->slug ?? $log->user?->userType?->name;

                return [
                    'id' => $log->id,
                    'page' => $log->route_name
                        ? Str::of($log->route_name)->replace('.', ' / ')->headline()
                        : $log->path,
                    'pageHref' => $log->path,
                    'user' => [
                        'name' => $log->user?->name ?? 'Unknown user',
                        'role' => $role ? Str::lower((string) $role) : null,
                    ],
                    'activity' => $log->activity,
                    'description' => $log->description,
                    'status' => $log->status,
                    'ip' => $log->ip_address,
                    'device' => $log->user_agent,
                    'timestamp' => $log->created_at?->toIso8601String(),
                ];
            });

        return Inertia::render('settings/activity-log', [
            'logs' => $logs,
        ]);
    }
}
