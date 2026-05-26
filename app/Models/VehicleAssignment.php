<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Models\TransportVehicle;

class VehicleAssignment extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'programme_id',
        'vehicle_id',
        'driver_user_id',
        'vehicle_label',
        'pickup_status',
        'pickup_location',
        'pickup_at',
        'dropoff_location',
        'dropoff_at',
        'notify_admin',
    ];

    protected $casts = [
        'pickup_at' => 'datetime',
        'dropoff_at' => 'datetime',
    ];

    public function programme(): BelongsTo
    {
        return $this->belongsTo(Programme::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function driver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'driver_user_id');
    }

    public function vehicle(): BelongsTo
    {
        return $this->belongsTo(TransportVehicle::class, 'vehicle_id');
    }
}
