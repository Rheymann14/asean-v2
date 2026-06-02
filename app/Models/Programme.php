<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Programme extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'tag',
        'title',
        'description',
        'starts_at',
        'ends_at',
        'location',
        'image_url',
        'pdf_url',
        'signatory_name',
        'signatory_title',
        'signatory_signature_url',
        'is_active',
        'is_registration_active',
    ];

    protected $casts = [
        'starts_at' => 'datetime',
        'ends_at' => 'datetime',
        'is_active' => 'boolean',
        'is_registration_active' => 'boolean',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function venues(): HasMany
    {
        return $this->hasMany(Venue::class);
    }

    public function materials(): HasMany
    {
        return $this->hasMany(ProgrammeMaterial::class);
    }

    public function registrationFields(): HasMany
    {
        return $this->hasMany(RegistrationField::class)->orderBy('sort_order')->orderBy('id');
    }

    public function participants(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'participant_programmes')->withTimestamps();
    }

    public function users(): BelongsToMany
    {
        return $this->participants();
    }
}
