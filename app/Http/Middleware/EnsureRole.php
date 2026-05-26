<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;

class EnsureRole
{
    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next, string $role): Response
    {
        $user = $request->user();

        if (! $user) {
            abort(403);
        }

        $user->loadMissing('userType');
        $roleName = Str::upper((string) ($user->userType->name ?? ''));
        $roleSlug = Str::upper((string) ($user->userType->slug ?? ''));
        $isAdmin = in_array('ADMIN', [$roleName, $roleSlug], true);
        $isChed = in_array('CHED', [$roleName, $roleSlug], true);
        $isChedLo = in_array('CHED LO', [$roleName], true) || in_array('CHED-LO', [$roleSlug], true);
        $isChedAdmin = $isAdmin || $isChedLo;

        if ($role === 'ched' && ! $isAdmin) {
            abort(403);
        }

        if ($role === 'ched_lo' && ! $isChedLo) {
            abort(403);
        }

        if ($role === 'ched_admin' && ! $isChedAdmin) {
            abort(403);
        }

        if ($role === 'participant' && $isChedAdmin) {
            abort(403);
        }

        return $next($request);
    }
}
