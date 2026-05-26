<?php

namespace App\Http\Controllers;

use App\Models\Country;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;

class CountryController extends Controller
{
    public function store(Request $request)
    {
        $validated = $request->validate([
            'code' => ['required', 'string', 'max:4', 'unique:countries,code'],
            'name' => ['required', 'string', 'max:255', 'unique:countries,name'],
            'is_active' => ['boolean'],
            'flag' => ['nullable', 'image', 'max:5120'],
        ]);

        $country = Country::create([
            'code' => Str::upper($validated['code']),
            'name' => $validated['name'],
            'is_active' => $validated['is_active'] ?? true,
        ]);

        if ($request->hasFile('flag')) {
            $country->flag_path = $this->storeFlag($request->file('flag'), $country->code);
            $country->save();
        }

        return back();
    }

    public function update(Request $request, Country $country)
    {
        $validated = $request->validate([
            'code' => ['sometimes', 'required', 'string', 'max:4', 'unique:countries,code,' . $country->id],
            'name' => ['sometimes', 'required', 'string', 'max:255', 'unique:countries,name,' . $country->id],
            'is_active' => ['sometimes', 'boolean'],
            'flag' => ['sometimes', 'nullable', 'image', 'max:5120'],
        ]);

        if (array_key_exists('code', $validated)) {
            $country->code = Str::upper($validated['code']);
        }

        if (array_key_exists('name', $validated)) {
            $country->name = $validated['name'];
        }

        if (array_key_exists('is_active', $validated)) {
            $country->is_active = $validated['is_active'];
        }

        if ($request->hasFile('flag')) {
            $country->flag_path = $this->storeFlag($request->file('flag'), $country->code);
        }

        $country->save();

        return back();
    }

    public function destroy(Country $country)
    {
        $country->delete();

        return back();
    }

    private function storeFlag($file, string $code): string
    {
        $directory = public_path('asean');
        File::ensureDirectoryExists($directory);

        $extension = $file->getClientOriginalExtension();
        $filename = Str::lower($code) . '.' . $extension;

        $file->move($directory, $filename);

        return '/asean/' . $filename;
    }
}
