<?php

namespace App\Http\Controllers;

use App\Models\Programme;
use App\Models\VenueSection;
use App\Models\Venue;
use Illuminate\Http\Request;
use Inertia\Inertia;

class VenueController extends Controller
{
    public function index()
    {
        $programmes = Programme::query()
            ->latest('starts_at')
            ->get()
            ->map(fn (Programme $programme) => [
                'id' => $programme->id,
                'title' => $programme->title,
                'starts_at' => $programme->starts_at?->toISOString(),
                'ends_at' => $programme->ends_at?->toISOString(),
            ]);

        $venues = Venue::query()
            ->with('programme')
            ->latest('updated_at')
            ->get()
            ->map(fn (Venue $venue) => [
                'id' => $venue->id,
                'programme_id' => $venue->programme_id,
                'name' => $venue->name,
                'address' => $venue->address,
                'google_maps_url' => $venue->google_maps_url,
                'embed_url' => $venue->embed_url,
                'is_active' => $venue->is_active,
                'updated_at' => $venue->updated_at?->toISOString(),
                'programme' => $venue->programme
                    ? [
                        'id' => $venue->programme->id,
                        'title' => $venue->programme->title,
                        'starts_at' => $venue->programme->starts_at?->toISOString(),
                        'ends_at' => $venue->programme->ends_at?->toISOString(),
                    ]
                    : null,
            ]);

        return Inertia::render('venue-management', [
            'programmes' => $programmes,
            'venues' => $venues,
        ]);
    }

    public function publicIndex()
    {
        $venues = Venue::query()
            ->with('programme')
            ->where('is_active', true)
            ->where(function ($query) {
                $query->whereNull('programme_id')
                    ->orWhereHas('programme', fn ($subQuery) => $subQuery->where('is_active', true));
            })
            ->get()
            ->sortBy(fn (Venue $venue) => $venue->programme?->starts_at)
            ->values()
            ->map(fn (Venue $venue) => [
                'id' => $venue->id,
                'programme_id' => $venue->programme_id,
                'name' => $venue->name,
                'address' => $venue->address,
                'google_maps_url' => $venue->google_maps_url,
                'embed_url' => $venue->embed_url,
                'programme' => $venue->programme
                    ? [
                        'id' => $venue->programme->id,
                        'title' => $venue->programme->title,
                        'starts_at' => $venue->programme->starts_at?->toISOString(),
                        'ends_at' => $venue->programme->ends_at?->toISOString(),
                    ]
                    : null,
            ]);

        $section = VenueSection::query()
            ->with(['images' => fn ($query) => $query->orderBy('id')])
            ->first();

        $sectionData = $section
            ? [
                'title' => $section->title,
                'items' => $section->images->map(fn ($image) => [
                    'id' => $image->id,
                    'title' => $image->title,
                    'description' => $image->description,
                    'link' => $image->link,
                    'image_path' => $image->image_path,
                ]),
            ]
            : null;

        return Inertia::render('venue', [
            'venues' => $venues,
            'section' => $sectionData,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'programme_id' => ['nullable', 'exists:programmes,id'],
            'name' => ['required', 'string', 'max:255'],
            'address' => ['required', 'string'],
            'google_maps_url' => ['nullable', 'url'],
            'embed_url' => ['nullable', 'string'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        $validated['embed_url'] = $this->extractIframeSrc($validated['embed_url'] ?? null);

        Venue::create([
            'programme_id' => $validated['programme_id'] ?? null,
            'name' => $validated['name'],
            'address' => $validated['address'],
            'google_maps_url' => $validated['google_maps_url'] ?? null,
            'embed_url' => $validated['embed_url'] ?: null,
            'is_active' => $validated['is_active'] ?? true,
        ]);

        return back();
    }

    public function update(Request $request, Venue $venue)
    {
        $validated = $request->validate([
            'programme_id' => ['sometimes', 'nullable', 'exists:programmes,id'],
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'address' => ['sometimes', 'required', 'string'],
            'google_maps_url' => ['sometimes', 'nullable', 'url'],
            'embed_url' => ['sometimes', 'nullable', 'string'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        if (array_key_exists('embed_url', $validated)) {
            $validated['embed_url'] = $this->extractIframeSrc($validated['embed_url']);
        }

        $venue->update($validated);

        return back();
    }

    public function destroy(Venue $venue)
    {
        $venue->delete();

        return back();
    }

    private function extractIframeSrc(?string $value): ?string
    {
        if (!$value) {
            return null;
        }

        $trimmed = trim($value);
        if ($trimmed === '') {
            return null;
        }

        if (!str_contains($trimmed, '<iframe')) {
            return $trimmed;
        }

        if (preg_match('/src=["\']([^"\']+)["\']/i', $trimmed, $matches)) {
            return $matches[1];
        }

        return $trimmed;
    }
}
