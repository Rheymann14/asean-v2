<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Mail;
use Inertia\Inertia;
use Laravel\Fortify\Features;
use App\Http\Controllers\ParticipantController;
use App\Http\Controllers\ParticipantDashboardController;
use App\Http\Controllers\CountryController;
use App\Http\Controllers\UserTypeController;
use App\Http\Controllers\IssuanceController;
use App\Http\Controllers\ContactDetailController;
use App\Http\Controllers\FeedbackController;
use App\Http\Controllers\ProgrammeController;
use App\Http\Controllers\VenueController;
use App\Http\Controllers\VenueSectionController;
use App\Http\Controllers\ScannerController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\ReportsController;
use App\Http\Controllers\TableAssignmentController;
use App\Http\Controllers\EventKitController;
use App\Http\Controllers\VehicleAssignmentController;
use App\Http\Controllers\TransportVehicleController;


use App\Http\Controllers\BrevoTestController;




Route::get('/', function () {
    return Inertia::render('welcome', [
        'canRegister' => Features::enabled(Features::registration()),
    ]);
})->name('home');

Route::middleware(['auth'])->group(function () {
    Route::get('/admin/brevo-test', [BrevoTestController::class, 'index'])->name('brevo.test');
    Route::post('/admin/brevo-test/send', [BrevoTestController::class, 'send'])->name('brevo.test.send');
});



Route::post('/feedback', [FeedbackController::class, 'store'])->name('feedback.store');

Route::get('/contact-us', [ContactDetailController::class, 'publicIndex'])->name('contact-us');

Route::get('/venue', [VenueController::class, 'publicIndex'])->name('venue');

Route::get('/event', [ProgrammeController::class, 'publicIndex'])->name('event');

Route::get('/event-kit', [EventKitController::class, 'entry'])->name('event-kit.entry');
Route::post('/event-kit/verify', [EventKitController::class, 'verify'])->name('event-kit.verify');
Route::get('/event-kit/survey', [EventKitController::class, 'survey'])->name('event-kit.survey');
Route::post('/event-kit/survey', [EventKitController::class, 'submitSurvey'])->name('event-kit.survey.submit');
Route::get('/event-kit/materials', [EventKitController::class, 'materials'])->name('event-kit.materials');
Route::post('/event-kit/select-programme', [EventKitController::class, 'selectProgramme'])->name('event-kit.select-programme');
Route::post('/event-kit/reset', [EventKitController::class, 'reset'])->name('event-kit.reset');


Route::get('/issuances', [IssuanceController::class, 'publicIndex'])->name('issuances');

    Route::middleware(['auth'])->group(function () {
        Route::get('table-assignment', [TableAssignmentController::class, 'index'])->name('table-assignment');
        Route::get('table-assignment/create', [TableAssignmentController::class, 'create'])
            ->middleware(['verified', 'role:ched_admin'])
            ->name('table-assignment.create');
        Route::get('table-assignment/assignment', [TableAssignmentController::class, 'assignment'])
            ->middleware(['verified', 'role:ched_admin'])
            ->name('table-assignment.assignment');

        Route::get('vehicle-assignment', [VehicleAssignmentController::class, 'index'])->name('vehicle-assignment');

    Route::middleware(['role:participant'])->group(function () {
            Route::get('participant-dashboard', function () {
                return Inertia::render('participant-dashboard');
            })->name('participant-dashboard');
            Route::get('/participant-dashboard', [ParticipantDashboardController::class, 'show'])
                ->name('participant.dashboard');
            Route::patch('/participant-dashboard/preferences', [ParticipantDashboardController::class, 'updatePreferences'])
                ->name('participant-dashboard.preferences.update');
            Route::post('/participant-dashboard/welcome-dinner', [ParticipantDashboardController::class, 'updateWelcomeDinner'])
                ->name('participant-dashboard.welcome-dinner.update');
            Route::post('/participant-dashboard/photo', [ParticipantDashboardController::class, 'updatePhoto'])
                ->name('participant-dashboard.photo.update');
            Route::delete('/participant-dashboard/photo', [ParticipantDashboardController::class, 'destroyPhoto'])
                ->name('participant-dashboard.photo.destroy');
            Route::get('/event-list', [ProgrammeController::class, 'participantIndex'])
                ->name('event-list');
            Route::post('/event-list/{programme}/join', [ProgrammeController::class, 'join'])
                ->name('event-list.join');
            Route::delete('/event-list/{programme}/leave', [ProgrammeController::class, 'leave'])
                ->name('event-list.leave');
            Route::delete('/event-list/clear', [ProgrammeController::class, 'clearSelections'])
                ->name('event-list.clear');
        });

    Route::middleware(['verified', 'role:ched_admin'])->group(function () {
        Route::get('vehicle-management', [VehicleAssignmentController::class, 'managementIndex'])->name('vehicle-management');
        Route::post('vehicle-assignments', [VehicleAssignmentController::class, 'store'])
            ->name('vehicle-assignments.store');
        Route::delete('vehicle-assignments/{vehicleAssignment}', [VehicleAssignmentController::class, 'destroy'])
            ->name('vehicle-assignments.destroy');
        Route::patch('vehicle-assignments/{vehicleAssignment}/pickup', [VehicleAssignmentController::class, 'storePickup'])
            ->name('vehicle-assignments.pickup');
        Route::patch('vehicle-assignments/{vehicleAssignment}/dropoff', [VehicleAssignmentController::class, 'storeDropoff'])
            ->name('vehicle-assignments.dropoff');
        Route::patch('vehicle-assignments/{vehicleAssignment}/presence', [VehicleAssignmentController::class, 'updatePresence'])
            ->name('vehicle-assignments.presence');
        Route::post('vehicle-assignments/send-pickup', [VehicleAssignmentController::class, 'sendPickupNotification'])
            ->name('vehicle-assignments.send-pickup');
        Route::post('vehicle-assignments/remove-pickup', [VehicleAssignmentController::class, 'removePickupNotification'])
            ->name('vehicle-assignments.remove-pickup');
        Route::post('transport-vehicles', [TransportVehicleController::class, 'store'])
            ->name('transport-vehicles.store');
        Route::delete('transport-vehicles/{transportVehicle}', [TransportVehicleController::class, 'destroy'])
            ->name('transport-vehicles.destroy');

        Route::post('table-assignment/tables', [TableAssignmentController::class, 'storeTable'])->name('table-assignment.tables.store');
        Route::patch('table-assignment/tables/{participantTable}', [TableAssignmentController::class, 'updateTable'])->name('table-assignment.tables.update');
        Route::delete('table-assignment/tables/{participantTable}', [TableAssignmentController::class, 'destroyTable'])
            ->name('table-assignment.tables.destroy');
        Route::post('table-assignment/assignments', [TableAssignmentController::class, 'storeAssignments'])->name('table-assignment.assignments.store');
        Route::patch('table-assignment/assignments/{participantTableAssignment}', [TableAssignmentController::class, 'updateAssignment'])
            ->name('table-assignment.assignments.update');
        Route::delete('table-assignment/assignments/{participantTableAssignment}', [TableAssignmentController::class, 'destroyAssignment'])
            ->name('table-assignment.assignments.destroy');
    });

    Route::middleware(['verified', 'role:ched'])->group(function () {
        Route::get('dashboard', [DashboardController::class, 'show'])->name('dashboard');
        Route::get('participant', [ParticipantController::class, 'index'])->name('participant');

        Route::resource('participants', ParticipantController::class)->only(['store', 'update', 'destroy']);
        Route::post('participants/{participant}/programmes/{programme}', [ParticipantController::class, 'joinProgramme'])
            ->name('participants.programmes.join');
        Route::delete('participants/{participant}/programmes/{programme}', [ParticipantController::class, 'leaveProgramme'])
            ->name('participants.programmes.leave');
        Route::delete('participants/{participant}/programmes/{programme}/attendance', [ParticipantController::class, 'revertAttendance'])
            ->name('participants.programmes.attendance.revert');
        Route::resource('participants/countries', CountryController::class)->only(['store', 'update', 'destroy']);
        Route::resource('participants/user-types', UserTypeController::class)->only(['store', 'update', 'destroy']);

        Route::get('venue-management', [VenueController::class, 'index'])->name('venue-management');
        Route::resource('venues', VenueController::class)->only(['store', 'update', 'destroy']);

        Route::get('section-management', [VenueSectionController::class, 'index'])->name('section-management');
        Route::patch('section-management/title', [VenueSectionController::class, 'updateTitle'])
            ->name('section-management.title');
        Route::post('section-management', [VenueSectionController::class, 'store'])->name('section-management.store');
        Route::patch('section-management/{venueSectionImage}', [VenueSectionController::class, 'update'])
            ->name('section-management.update');
        Route::delete('section-management/{venueSectionImage}', [VenueSectionController::class, 'destroy'])
            ->name('section-management.destroy');

        Route::get('issuances-management', [IssuanceController::class, 'index'])->name('issuances-management');
        Route::resource('issuances', IssuanceController::class)->only(['store', 'update', 'destroy']);

        Route::get('contact-details', [ContactDetailController::class, 'index'])->name('contact-details');
        Route::get('reports', [ReportsController::class, 'index'])->name('reports');
        Route::patch('reports/{user}/welcome-dinner-preferences', [ReportsController::class, 'updateWelcomeDinnerPreferences'])
            ->name('reports.welcome-dinner-preferences.update');
        Route::post('reports/{user}/assignment-notification', [ReportsController::class, 'sendAssignmentNotification'])
            ->name('reports.assignment-notification.send');
        Route::patch('contact-details/{contactDetail}', [ContactDetailController::class, 'update'])->name('contact-details.update');

        Route::get('event-management', [ProgrammeController::class, 'index'])->name('event-management');
        Route::get('event-management/{programme}/participants', [ProgrammeController::class, 'participants'])
            ->name('event-management.participants');
        Route::resource('programmes', ProgrammeController::class)->only(['store', 'update', 'destroy']);


        Route::get('scanner', [ScannerController::class, 'index'])->name('scanner');
        Route::post('scanner/scan', [ScannerController::class, 'scan'])->name('scanner.scan');
    });
});

require __DIR__.'/settings.php';
