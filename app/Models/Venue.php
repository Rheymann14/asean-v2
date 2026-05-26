<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Venue extends Model
{
    use HasFactory;

    protected $fillable = [
        'programme_id',
        'name',
        'address',
        'google_maps_url',
        'embed_url',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function programme(): BelongsTo
    {
        return $this->belongsTo(Programme::class);
    }
}
