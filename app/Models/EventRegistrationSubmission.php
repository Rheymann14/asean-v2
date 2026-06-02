<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class EventRegistrationSubmission extends Model
{
    use HasFactory;

    protected $fillable = [
        'programme_id',
        'country_id',
        'submitted_by_user_id',
        'registration_type',
        'focal_name',
        'focal_email',
        'focal_phone',
        'focal_organization',
        'focal_position',
        'consents',
        'delegation_details',
        'status',
        'submitted_at',
    ];

    protected $casts = [
        'consents' => 'array',
        'delegation_details' => 'array',
        'submitted_at' => 'datetime',
    ];

    public function programme(): BelongsTo
    {
        return $this->belongsTo(Programme::class);
    }

    public function country(): BelongsTo
    {
        return $this->belongsTo(Country::class);
    }

    public function submitter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'submitted_by_user_id');
    }

    public function attendees(): HasMany
    {
        return $this->hasMany(EventRegistrationAttendee::class, 'submission_id');
    }
}
