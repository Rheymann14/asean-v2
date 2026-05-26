<?php

namespace App\Http\Controllers;

use App\Models\Feedback;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class FeedbackController extends Controller
{
    public function store(Request $request)
    {
        $validated = $request->validate([
            'user_experience_rating' => ['nullable', 'integer', 'between:1,5'],
            'event_ratings' => ['nullable', 'array'],
            'event_ratings.*' => ['integer', 'between:1,5'],
            'recommendations' => ['nullable', 'string', 'max:2000'],
        ]);

        $eventRatings = collect($validated['event_ratings'] ?? [])
            ->filter(fn ($value) => !is_null($value) && $value > 0)
            ->map(fn ($value) => (int) $value)
            ->all();

        $userExperienceRating = $validated['user_experience_rating'] ?? null;

        if (!$userExperienceRating && empty($eventRatings)) {
            throw ValidationException::withMessages([
                'rating' => 'Please provide at least one rating before sending feedback.',
            ]);
        }

        $feedback = Feedback::create([
            'user_experience_rating' => $userExperienceRating,
            'event_ratings' => empty($eventRatings) ? null : $eventRatings,
            'recommendations' => $validated['recommendations'] ?? null,
        ]);

        return response()->json([
            'message' => 'Feedback submitted successfully.',
            'feedback_id' => $feedback->id,
        ]);
    }
}
