<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class RegistrationField extends Model
{
    use HasFactory;

    protected $fillable = [
        'programme_id',
        'field_key',
        'label',
        'field_type',
        'options',
        'placeholder',
        'help_text',
        'is_required',
        'sort_order',
    ];

    protected $casts = [
        'options' => 'array',
        'is_required' => 'boolean',
    ];

    public function programme(): BelongsTo
    {
        return $this->belongsTo(Programme::class);
    }

    public function responses(): HasMany
    {
        return $this->hasMany(RegistrationFieldResponse::class);
    }
}
