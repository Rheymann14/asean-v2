<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Country extends Model
{
    use HasFactory;

    protected $fillable = [
        'code',
        'name',
        'flag_path',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    protected $appends = [
        'flag_url',
    ];

    public function users()
    {
        return $this->hasMany(User::class);
    }

    public function getFlagUrlAttribute(): ?string
    {
        return $this->flag_path ?: null;
    }
}
