<?php

namespace App\Support;

use Illuminate\Support\Collection;

class EventDefaults
{
    public static function defaultEventId($events, ?callable $fallback = null): int
    {
        $collection = $events instanceof Collection ? $events : collect($events);

        $activeRegistration = $collection->firstWhere('is_registration_active', true);
        if ($activeRegistration) {
            return (int) data_get($activeRegistration, 'id');
        }

        $fallbackEvent = $fallback
            ? $fallback($collection)
            : $collection->firstWhere('is_active', true);

        return (int) (data_get($fallbackEvent, 'id') ?? data_get($collection->first(), 'id') ?? 0);
    }
}
