<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;
use Inertia\Inertia;

class ParticipantDashboardController extends Controller
{
    public function show(Request $request)
    {
        $user = $request->user()->load(['country', 'userType']);

        return Inertia::render('participant-dashboard', [
            'participant' => [
                'display_id' => $user->display_id,
                'qr_payload' => $user->qr_payload,
                'name' => $user->name,
                'email' => $user->email,
                'profile_photo_url' => $user->profile_photo_path ? asset($user->profile_photo_path) : null,
                'contact_number' => $user->contact_number,
                'contact_country_code' => $user->contact_country_code,
                'honorific_title' => $user->honorific_title,
                'honorific_other' => $user->honorific_other,
                'given_name' => $user->given_name,
                'middle_name' => $user->middle_name,
                'family_name' => $user->family_name,
                'suffix' => $user->suffix,
                'sex_assigned_at_birth' => $user->sex_assigned_at_birth,
                'organization_name' => $user->organization_name,
                'position_title' => $user->position_title,
                'user_type' => $user->userType?->name,
                'other_user_type' => $user->other_user_type,
                'ip_group_name' => $user->ip_group_name,
                'dietary_allergies' => $user->dietary_allergies,
                'dietary_other' => $user->dietary_other,
                'accessibility_needs' => $user->accessibility_needs ?? [],
                'accessibility_other' => $user->accessibility_other,
                'emergency_contact_name' => $user->emergency_contact_name,
                'emergency_contact_relationship' => $user->emergency_contact_relationship,
                'emergency_contact_phone' => $user->emergency_contact_phone,
                'emergency_contact_email' => $user->emergency_contact_email,
                'consent_contact_sharing' => (bool) $user->consent_contact_sharing,
                'consent_photo_video' => (bool) $user->consent_photo_video,
                'country' => $user->country ? [
                    'code' => $user->country->code,
                    'name' => $user->country->name,
                    'flag_url' => $user->country->flag_url,
                ] : null,
                'food_restrictions' => $user->food_restrictions ?? [],
            ],
        ]);

    }

    public function updatePreferences(Request $request)
    {
        $validated = $request->validate([
            'has_food_restrictions' => ['nullable', 'boolean'],
            'food_restrictions' => ['nullable', 'array'],
            'food_restrictions.*' => ['string', 'max:255'],
            'dietary_allergies' => ['nullable', 'string', 'max:255'],
            'dietary_other' => ['nullable', 'string', 'max:255'],
            'accessibility_needs' => ['nullable', 'array'],
            'accessibility_needs.*' => ['string', 'max:255'],
            'accessibility_other' => ['nullable', 'string', 'max:255'],
        ]);

        $user = $request->user();
        $user->fill($validated);
        $user->save();

        return back();
    }

    public function updatePhoto(Request $request)
    {
        $validated = $request->validate([
            'profile_photo' => ['required', 'image', 'max:5120'],
        ]);

        $user = $request->user();

        if ($user->profile_photo_path) {
            File::delete(public_path($user->profile_photo_path));
        }

        $file = $request->file('profile_photo');
        $extension = $file->getClientOriginalExtension() ?: 'jpg';
        $filename = sprintf('%s-%s.%s', $user->id, Str::uuid(), $extension);
        $directory = public_path('profile-image');
        if (!File::exists($directory)) {
            File::makeDirectory($directory, 0755, true);
        }
        $file->move($directory, $filename);
        $user->profile_photo_path = 'profile-image/' . $filename;
        $user->save();

        return back();
    }

    public function destroyPhoto(Request $request)
    {
        $user = $request->user();

        if ($user->profile_photo_path) {
            File::delete(public_path($user->profile_photo_path));
            $user->profile_photo_path = null;
        }
        $user->save();

        return back();
    }

    public function updateWelcomeDinner(Request $request)
    {
        $validated = $request->validate([
            'attend_welcome_dinner' => ['required', 'boolean'],
            'avail_transport_from_makati_to_peninsula' => ['nullable', 'boolean'],
        ]);

        if (!$validated['attend_welcome_dinner']) {
            $validated['avail_transport_from_makati_to_peninsula'] = false;
        }

        $user = $request->user();
        $user->fill($validated);
        $user->save();

        return back();
    }
}
