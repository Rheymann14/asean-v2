<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class UserType extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'slug',
        'is_active',
        'sequence_order',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'sequence_order' => 'integer',
    ];

    public function users()
    {
        return $this->hasMany(User::class);
    }
}
