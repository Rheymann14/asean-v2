<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AssignmentNotificationLog extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'programme_id',
        'sent_at',
    ];

    protected $casts = [
        'sent_at' => 'datetime',
    ];
}
