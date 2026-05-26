<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class VenueSection extends Model
{
    protected $fillable = [
        'title',
    ];

    public function images(): HasMany
    {
        return $this->hasMany(VenueSectionImage::class);
    }
}
