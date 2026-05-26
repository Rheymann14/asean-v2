<?php

namespace App\Http\Controllers;

use App\Models\ContactDetail;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ContactDetailController extends Controller
{
    public function index()
    {
        $items = ContactDetail::query()
            ->with('updatedBy')
            ->orderBy('id')
            ->get()
            ->map(fn (ContactDetail $detail) => [
                'id' => $detail->id,
                'key' => $detail->key,
                'title' => $detail->title,
                'value' => $detail->value,
                'is_active' => $detail->is_active,
                'updated_at' => $detail->updated_at?->toISOString(),
                'updated_by_name' => $detail->updatedBy?->name,
            ]);

        return Inertia::render('contact-details', [
            'items' => $items,
        ]);
    }

    public function publicIndex()
    {
        $items = ContactDetail::query()
            ->where('is_active', true)
            ->orderBy('id')
            ->get()
            ->map(fn (ContactDetail $detail) => [
                'key' => $detail->key,
                'title' => $detail->title,
                'value' => $detail->value,
            ]);

        return Inertia::render('contact-us', [
            'items' => $items,
        ]);
    }

    public function update(Request $request, ContactDetail $contactDetail)
    {
        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'value' => ['required', 'string', 'max:1000'],
            'is_active' => ['required', 'boolean'],
        ]);

        $validated['updated_by_user_id'] = $request->user()->id;

        $contactDetail->update($validated);

        return back();
    }
}
