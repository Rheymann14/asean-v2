<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EventRegistrationAttendee extends Model
{
    use HasFactory;

    protected $fillable = [
        'submission_id',
        'programme_id',
        'user_id',
        'role',
        'title',
        'given_name',
        'family_name',
        'badge_name',
        'organization_name',
        'position_title',
        'email',
        'dietary_requirements',
        'mobility_or_special_needs',
        'extra_details',
    ];

    protected $casts = [
        'extra_details' => 'array',
    ];

    public function submission(): BelongsTo
    {
        return $this->belongsTo(EventRegistrationSubmission::class, 'submission_id');
    }

    public function programme(): BelongsTo
    {
        return $this->belongsTo(Programme::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
