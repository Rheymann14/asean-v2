<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProgrammeMaterial extends Model
{
    use HasFactory;

    protected $fillable = [
        'programme_id',
        'file_name',
        'file_path',
        'file_type',
    ];

    public function programme(): BelongsTo
    {
        return $this->belongsTo(Programme::class);
    }
}
