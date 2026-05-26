<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ParticipantAttendance extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'programme_id',
        'status',
        'scanned_at',
    ];

    protected $casts = [
        'scanned_at' => 'datetime',
    ];

    public function participant()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function programme()
    {
        return $this->belongsTo(Programme::class);
    }
}
