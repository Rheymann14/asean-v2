<?php

namespace App\Http\Controllers;

use App\Models\TransportVehicle;
use Illuminate\Http\Request;

class TransportVehicleController extends Controller
{
    public function store(Request $request)
    {
        $validated = $request->validate([
            'programme_id' => ['required', 'exists:programmes,id'],
            'label' => ['required', 'string', 'max:255'],
            'driver_name' => ['required', 'string', 'max:255'],
            'plate_number' => ['nullable', 'string', 'max:255'],
            'driver_contact_number' => ['required', 'string', 'max:50'],
            'incharge_user_id' => ['required', 'exists:users,id'],
        ]);

        TransportVehicle::create($validated);

        return back();
    }

    public function destroy(TransportVehicle $transportVehicle)
    {
        $hasAssignments = $transportVehicle->assignments()->exists();

        if ($hasAssignments) {
            return back()->withErrors([
                'vehicle' => 'Cannot remove vehicle. It already has participant assignments.',
            ]);
        }

        $transportVehicle->delete();

        return back();
    }
}
