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
            return new class implements LoginResponse {
                public function toResponse($request)
                {
                    $user = $request->user();

                    if ($user) {
                        $user->loadMissing('userType');

                        $roleValue = (string) Str::of((string) ($user->userType->slug ?: $user->userType->name))
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
            return new class implements RegisterResponse {
                public function toResponse($request)
                {
                    Auth::guard('web')->logout();
                    $request->session()->invalidate();
                    $request->session()->regenerateToken();

                    return redirect('/register')->with('status', 'registered');
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

        Fortify::registerView(fn (Request $request) => Inertia::render('auth/register', [
            'countries' => Country::query()
                ->where('is_active', true)
                ->orderBy('name')
                ->get()
                ->map(fn (Country $country) => [
                    'id' => $country->id,
                    'code' => $country->code,
                    'name' => $country->name,
                    'flag_url' => $country->flag_url,
                ]),
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
            'programmes' => Programme::query()
                ->where('is_active', true)
                ->latest('starts_at')
                ->get()
                ->map(fn (Programme $programme) => [
                    'id' => $programme->id,
                    'title' => $programme->title,
                    'description' => $programme->description,
                    'starts_at' => $programme->starts_at?->toISOString(),
                    'ends_at' => $programme->ends_at?->toISOString(),
                ]),
            'status' => $request->session()->get('status'),
        ]));

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
}
