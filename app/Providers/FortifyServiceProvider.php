<?php

namespace App\Providers;

use App\Actions\Fortify\CreateNewUser;
use App\Actions\Fortify\ResetUserPassword;
use App\Models\Country;
use App\Models\Programme;
use App\Models\User;
use App\Models\UserType;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Laravel\Fortify\Contracts\LoginResponse;
use Laravel\Fortify\Contracts\RegisterResponse;
use Laravel\Fortify\Features;
use Laravel\Fortify\Fortify;

class FortifyServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $this->configureActions();
        $this->configureAuthentication();
        $this->configureResponses();
        $this->configureViews();
        $this->configureRateLimiting();
    }

    /**
     * Configure Fortify actions.
     */
    private function configureActions(): void
    {
        Fortify::resetUserPasswordsUsing(ResetUserPassword::class);
        Fortify::createUsersUsing(CreateNewUser::class);
    }

    /**
     * Configure Fortify authentication behavior.
     */
    private function configureAuthentication(): void
    {
        Fortify::authenticateUsing(function (Request $request) {
            $login = trim((string) $request->input(Fortify::username()));

            $user = User::query()
                ->whereRaw('LOWER(email) = ?', [Str::lower($login)])
                ->orWhereRaw('LOWER(display_id) = ?', [Str::lower($login)])
                ->first();

            if (! $user || ! $user->is_active) {
                return null;
            }

            return Hash::check($request->password, $user->password) ? $user : null;
        });
    }

    /**
     * Configure Fortify responses.
     */
    private function configureResponses(): void
    {
        $this->app->singleton(LoginResponse::class, function () {
            return new class implements LoginResponse
            {
                public function toResponse($request)
                {
                    $user = $request->user();

                    if ($user) {
                        $user->loadMissing('userType');

                        $roleValue = (string) Str::of((string) ($user->userType?->slug ?: $user->userType?->name))
                            ->upper()
                            ->replace(['_', '-'], ' ')
                            ->trim();

                        if ($roleValue === 'ADMIN') {
                            return redirect('/dashboard');
                        }

                        if ($roleValue === 'CHED LO') {
                            return redirect('/vehicle-assignment');
                        }

                        if (Str::startsWith($roleValue, 'CHED ')) {
                            return redirect('/table-assignment/create');
                        }
                    }

                    return redirect('/participant-dashboard');
                }
            };
        });

        $this->app->singleton(RegisterResponse::class, function () {
            return new class implements RegisterResponse
            {
                public function toResponse($request)
                {
                    $participant = $request->user();
                    $participant?->loadMissing('joinedProgrammes');
                    $requestedProgrammeIds = collect($request->input('programme_ids', []))
                        ->map(fn ($id) => (int) $id)
                        ->filter()
                        ->all();
                    $registeredEvent = $participant?->joinedProgrammes
                        ?->when(
                            ! empty($requestedProgrammeIds),
                            fn ($programmes) => $programmes->whereIn('id', $requestedProgrammeIds),
                        )
                        ->sortBy('starts_at')
                        ->first();

                    $badge = $participant
                        ? [
                            'name' => $participant->name,
                            'email' => $participant->email,
                            'display_id' => $participant->display_id,
                            'qr_payload' => $participant->qr_payload,
                            'event_title' => $registeredEvent?->title,
                        ]
                        : null;

                    Auth::guard('web')->logout();
                    $request->session()->invalidate();
                    $request->session()->regenerateToken();

                    return redirect('/register')
                        ->with('status', 'registered')
                        ->with('registeredParticipant', $badge);
                }
            };
        });
    }

    /**
     * Configure Fortify views.
     */
    private function configureViews(): void
    {
        Fortify::loginView(fn (Request $request) => Inertia::render('auth/login', [
            'canResetPassword' => Features::enabled(Features::resetPasswords()),
            'canRegister' => Features::enabled(Features::registration()),
            'status' => $request->session()->get('status'),
        ]));

        Fortify::resetPasswordView(fn (Request $request) => Inertia::render('auth/reset-password', [
            'email' => $request->email,
            'token' => $request->route('token'),
        ]));

        Fortify::requestPasswordResetLinkView(fn (Request $request) => Inertia::render('auth/forgot-password', [
            'status' => $request->session()->get('status'),
        ]));

        Fortify::verifyEmailView(fn (Request $request) => Inertia::render('auth/verify-email', [
            'status' => $request->session()->get('status'),
        ]));

        Fortify::registerView(function (Request $request) {
            $activeProgrammes = Programme::query()
                ->where('is_active', true)
                ->with('registrationFields')
                ->orderByDesc('is_registration_active')
                ->get();

            $currentProgramme = $this->publicRegistrationProgramme($activeProgrammes);
            $programmes = $currentProgramme ? collect([$currentProgramme]) : collect();
            $countries = Country::query()
                ->where('is_active', true)
                ->orderBy('name')
                ->get()
                ->map(fn (Country $country) => [
                    'id' => $country->id,
                    'code' => $country->code,
                    'name' => $country->name,
                    'flag_url' => $country->flag_url,
                ]);

            return Inertia::render('auth/register', [
                'countries' => $countries,
                'registrantTypes' => UserType::query()
                    ->where('is_active', true)
                    ->where('slug', '!=', 'admin')
                    ->where('name', '!=', 'Admin')
                    ->where('slug', '!=', 'ched')
                    ->where('name', '!=', 'CHED')
                    ->orderBy('sequence_order')
                    ->orderBy('id')
                    ->get()
                    ->map(fn (UserType $type) => [
                        'id' => $type->id,
                        'name' => $type->name,
                        'slug' => $type->slug,
                    ]),
                'programmes' => $programmes->map(fn (Programme $programme) => $this->registrationProgrammePayload($programme))->values(),
                'activeProgramme' => $currentProgramme ? $this->registrationProgrammePayload($currentProgramme) : null,
                'registeredParticipant' => $request->session()->get('registeredParticipant'),
                'asemme10Submission' => $request->session()->get('asemme10Submission'),
                'status' => $request->session()->get('status'),
            ]);
        });

        Fortify::twoFactorChallengeView(fn () => Inertia::render('auth/two-factor-challenge'));

        Fortify::confirmPasswordView(fn () => Inertia::render('auth/confirm-password'));
    }

    /**
     * Configure rate limiting.
     */
    private function configureRateLimiting(): void
    {
        RateLimiter::for('two-factor', function (Request $request) {
            return Limit::perMinute(5)->by($request->session()->get('login.id'));
        });

        RateLimiter::for('login', function (Request $request) {
            $throttleKey = Str::transliterate(Str::lower($request->input(Fortify::username())).'|'.$request->ip());

            return Limit::perMinute(5)->by($throttleKey);
        });
    }

    private function publicRegistrationProgramme($programmes): ?Programme
    {
        $activeRegistrationProgramme = $programmes->firstWhere('is_registration_active', true);

        if ($activeRegistrationProgramme) {
            return $activeRegistrationProgramme;
        }

        $configuredEventId = (int) config('services.registration.public_event_id', 0);

        if ($configuredEventId > 0) {
            $configuredProgramme = $programmes->firstWhere('id', $configuredEventId);

            if ($configuredProgramme) {
                return $configuredProgramme;
            }
        }

        $asemme10 = $programmes->first(fn (Programme $programme) => $this->isAsemme10Programme($programme));

        if ($asemme10) {
            return $asemme10;
        }

        $publicProgrammes = $programmes->reject(function (Programme $programme) {
            return ! config('services.registration.welcome_dinner_enabled', false)
                && $this->isWelcomeDinnerProgramme($programme);
        });

        return $this->nearestOpenProgramme($publicProgrammes);
    }

    private function nearestOpenProgramme($programmes): ?Programme
    {
        $today = now()->startOfDay();

        return $programmes
            ->map(function (Programme $programme) use ($today) {
                $startsAt = $programme->starts_at?->copy()->startOfDay();
                $endsAt = $programme->ends_at?->copy()->startOfDay();

                if (! $startsAt) {
                    return ['programme' => $programme, 'priority' => 2, 'distance' => PHP_INT_MAX];
                }

                $isClosed = $endsAt
                    ? $today->greaterThan($endsAt)
                    : $today->greaterThan($startsAt);

                if ($isClosed) {
                    return null;
                }

                $isOngoing = $today->greaterThanOrEqualTo($startsAt)
                    && (! $endsAt || $today->lessThanOrEqualTo($endsAt));

                return [
                    'programme' => $programme,
                    'priority' => $isOngoing ? 0 : 1,
                    'distance' => abs($today->diffInDays($startsAt, false)),
                ];
            })
            ->filter()
            ->sortBy([
                ['priority', 'asc'],
                ['distance', 'asc'],
            ])
            ->pluck('programme')
            ->first();
    }

    private function isAsemme10Programme(Programme $programme): bool
    {
        $value = Str::lower(trim("{$programme->tag} {$programme->title}"));

        return Str::contains($value, [
            'asemme10',
            'asemme 10',
            'asia-europe meeting of ministers for education',
            '10th asia-europe meeting',
        ]);
    }

    private function isWelcomeDinnerProgramme(Programme $programme): bool
    {
        $value = Str::lower(trim("{$programme->tag} {$programme->title}"));

        return Str::contains($value, 'welcome dinner');
    }

    private function registrationProgrammePayload(Programme $programme): array
    {
        return [
            'id' => $programme->id,
            'title' => $programme->title,
            'description' => $programme->description,
            'starts_at' => $programme->starts_at?->toISOString(),
            'ends_at' => $programme->ends_at?->toISOString(),
            'is_registration_active' => $programme->is_registration_active,
            'registration_fields' => $programme->registrationFields
                ->map(fn ($field) => [
                    'id' => $field->id,
                    'field_key' => $field->field_key,
                    'label' => $field->label,
                    'field_type' => $field->field_type,
                    'options' => $field->options ?? [],
                    'placeholder' => $field->placeholder,
                    'help_text' => $field->help_text,
                    'is_required' => $field->is_required,
                    'sort_order' => $field->sort_order,
                ])
                ->values()
                ->all(),
        ];
    }
}
