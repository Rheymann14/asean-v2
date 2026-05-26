<?php

namespace App\Http\Controllers;

use App\Models\Issuance;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;
use Inertia\Inertia;

class IssuanceController extends Controller
{
    public function index()
    {
        $issuances = Issuance::query()
            ->latest('issued_at')
            ->get()
            ->map(fn (Issuance $issuance) => [
                'id' => $issuance->id,
                'title' => $issuance->title,
                'issued_at' => $issuance->issued_at?->toDateString(),
                'pdf_url' => '/' . ltrim($issuance->pdf_path, '/'),
                'is_active' => $issuance->is_active,
                'created_at' => $issuance->created_at?->toISOString(),
                'updated_at' => $issuance->updated_at?->toISOString(),
            ]);

        return Inertia::render('issuances-management', [
            'issuances' => $issuances,
        ]);
    }

    public function publicIndex()
    {
        $issuances = Issuance::query()
            ->where('is_active', true)
            ->latest('issued_at')
            ->get()
            ->map(fn (Issuance $issuance) => [
                'title' => $issuance->title,
                'issued_at' => $issuance->issued_at?->toDateString(),
                'href' => '/' . ltrim($issuance->pdf_path, '/'),
            ]);

        return Inertia::render('issuances', [
            'issuances' => $issuances,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'issued_at' => ['required', 'date'],
            'pdf' => ['required', 'file', 'mimes:pdf', 'max:20480'],
        ]);

        $file = $validated['pdf'];
        $fileName = Str::uuid()->toString() . '.' . $file->getClientOriginalExtension();
        $destination = public_path('downloadables');

        if (!File::exists($destination)) {
            File::makeDirectory($destination, 0755, true);
        }

        $file->move($destination, $fileName);

        Issuance::create([
            'user_id' => $request->user()->id,
            'title' => $validated['title'],
            'issued_at' => $validated['issued_at'],
            'pdf_path' => 'downloadables/' . $fileName,
            'is_active' => true,
        ]);

        return back();
    }

    public function update(Request $request, Issuance $issuance)
    {
        $validated = $request->validate([
            'title' => ['sometimes', 'required', 'string', 'max:255'],
            'issued_at' => ['sometimes', 'required', 'date'],
            'is_active' => ['sometimes', 'boolean'],
            'pdf' => ['nullable', 'file', 'mimes:pdf', 'max:20480'],
        ]);

        if ($request->hasFile('pdf')) {
            $file = $request->file('pdf');
            $fileName = Str::uuid()->toString() . '.' . $file->getClientOriginalExtension();
            $destination = public_path('downloadables');

            if (!File::exists($destination)) {
                File::makeDirectory($destination, 0755, true);
            }

            $file->move($destination, $fileName);

            if ($issuance->pdf_path) {
                $existing = public_path($issuance->pdf_path);
                if (File::exists($existing)) {
                    File::delete($existing);
                }
            }

            $validated['pdf_path'] = 'downloadables/' . $fileName;
        }

        $issuance->update($validated);

        return back();
    }

    public function destroy(Issuance $issuance)
    {
        if ($issuance->pdf_path) {
            $existing = public_path($issuance->pdf_path);
            if (File::exists($existing)) {
                File::delete($existing);
            }
        }

        $issuance->delete();

        return back();
    }
}
