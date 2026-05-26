<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use App\Models\Programme;

class ParticipantTable extends Model
{
    use HasFactory;

    protected $fillable = [
        'programme_id',
        'table_number',
        'capacity',
    ];

    public function programme(): BelongsTo
    {
        return $this->belongsTo(Programme::class);
    }

    public function assignments(): HasMany
    {
        return $this->hasMany(ParticipantTableAssignment::class);
    }
}
