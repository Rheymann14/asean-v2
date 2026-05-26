<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class VenueSectionImage extends Model
{
    protected $fillable = [
        'venue_section_id',
        'title',
        'description',
        'link',
        'image_path',
    ];

    public function section(): BelongsTo
    {
        return $this->belongsTo(VenueSection::class, 'venue_section_id');
    }
}
