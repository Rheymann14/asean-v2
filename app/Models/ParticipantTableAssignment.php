<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Models\Programme;

class ParticipantTableAssignment extends Model
{
    use HasFactory;

    protected $fillable = [
        'programme_id',
        'participant_table_id',
        'seat_number',
        'user_id',
        'assigned_at',
    ];

    protected $casts = [
        'assigned_at' => 'datetime',
    ];

    public function participantTable(): BelongsTo
    {
        return $this->belongsTo(ParticipantTable::class);
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
