<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RegistrationFieldResponse extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'programme_id',
        'registration_field_id',
        'answer',
    ];

    protected $casts = [
        'answer' => 'array',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function programme(): BelongsTo
    {
        return $this->belongsTo(Programme::class);
    }

    public function field(): BelongsTo
    {
        return $this->belongsTo(RegistrationField::class, 'registration_field_id');
    }
}
