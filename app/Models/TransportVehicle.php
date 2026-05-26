<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class TransportVehicle extends Model
{
    use HasFactory;

    protected $fillable = [
        'programme_id',
        'label',
        'driver_name',
        'driver_contact_number',
        'incharge_user_id',
        'plate_number',
        'capacity',
    ];


    public function programme(): BelongsTo
    {
        return $this->belongsTo(Programme::class);
    }

    public function incharge(): BelongsTo
    {
        return $this->belongsTo(User::class, 'incharge_user_id');
    }

    public function assignments(): HasMany
    {
        return $this->hasMany(VehicleAssignment::class, 'vehicle_id');
    }
}
