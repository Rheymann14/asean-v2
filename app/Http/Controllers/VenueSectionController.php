<?php

namespace App\Http\Controllers;

use App\Models\VenueSection;
use App\Models\VenueSectionImage;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;
use Inertia\Inertia;

class VenueSectionController extends Controller
{
    public function index()
    {
        $section = $this->resolveSection();

        $images = $section->images()
            ->orderBy('id')
            ->get()
            ->map(fn (VenueSectionImage $image) => [
                'id' => $image->id,
                'title' => $image->title,
                'description' => $image->description,
                'link' => $image->link,
                'image_path' => $image->image_path,
                'updated_at' => $image->updated_at?->toISOString(),
            ]);

        return Inertia::render('section-management', [
            'section' => [
                'title' => $section->title,
                'images' => $images,
            ],
        ]);
    }

    public function updateTitle(Request $request)
    {
        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
        ]);

        $section = $this->resolveSection();
        $section->update([
            'title' => trim($validated['title']),
        ]);

        return back();
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'link' => ['nullable', 'url', 'max:2048'],
            'image' => ['required', 'image', 'max:10240'],
        ]);

        $section = $this->resolveSection();
        $imageName = $this->storeImage($request);

        $section->images()->create([
            'title' => trim($validated['title']),
            'description' => $validated['description'] ? trim($validated['description']) : null,
            'link' => $validated['link'] ? trim($validated['link']) : null,
            'image_path' => $imageName,
        ]);

        return back();
    }

    public function update(Request $request, VenueSectionImage $venueSectionImage)
    {
        $validated = $request->validate([
            'title' => ['sometimes', 'required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'link' => ['nullable', 'url', 'max:2048'],
            'image' => ['nullable', 'image', 'max:10240'],
        ]);

        if ($request->hasFile('image')) {
            $imageName = $this->storeImage($request);

            if ($venueSectionImage->image_path) {
                $existing = public_path('section/' . ltrim($venueSectionImage->image_path, '/'));
                if (File::exists($existing)) {
                    File::delete($existing);
                }
            }

            $validated['image_path'] = $imageName;
        }

        if (array_key_exists('title', $validated)) {
            $validated['title'] = trim($validated['title']);
        }

        if (array_key_exists('description', $validated)) {
            $validated['description'] = $validated['description'] ? trim($validated['description']) : null;
        }

        if (array_key_exists('link', $validated)) {
            $validated['link'] = $validated['link'] ? trim($validated['link']) : null;
        }

        $venueSectionImage->update($validated);

        return back();
    }

    public function destroy(VenueSectionImage $venueSectionImage)
    {
        if ($venueSectionImage->image_path) {
            $existing = public_path('section/' . ltrim($venueSectionImage->image_path, '/'));
            if (File::exists($existing)) {
                File::delete($existing);
            }
        }

        $venueSectionImage->delete();

        return back();
    }

    private function resolveSection(): VenueSection
    {
        return VenueSection::query()->firstOrCreate([], [
            'title' => 'Section Title',
        ]);
    }

    private function storeImage(Request $request): string
    {
        $file = $request->file('image');
        $imageName = Str::uuid()->toString() . '.' . $file->getClientOriginalExtension();
        $destination = public_path('section');

        if (!File::exists($destination)) {
            File::makeDirectory($destination, 0755, true);
        }

        $file->move($destination, $imageName);

        return $imageName;
    }
}
