<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Feedback extends Model
{
    protected $fillable = [
        'participant_id',
        'programme_id',
        'user_experience_rating',
        'event_ratings',
        'recommendations',
    ];

    protected $casts = [
        'event_ratings' => 'array',
    ];
}
