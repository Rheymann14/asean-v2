<?php

namespace App\Services;

use App\Mail\ParticipantWelcomeMail;
use App\Models\User;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Throwable;

class WelcomeNotificationService
{
    public function dispatch(User $user): void
    {
        $this->sendWelcomeEmail($user);
        rescue(fn () => app(SemaphoreSms::class)->sendWelcome($user), report: true);
    }

    private function sendWelcomeEmail(User $user): void
    {
        try {
            if ($this->sendViaBrevoApi($user)) {
                return;
            }
        } catch (Throwable $exception) {
            report($exception);
        }

        try {
            Mail::to($user->email)->send(new ParticipantWelcomeMail($user));
        } catch (Throwable $exception) {
            report($exception);
        }
    }

    private function sendViaBrevoApi(User $user): bool
    {
        $apiKey = config('services.brevo.api_key');

        if (! $apiKey) {
            Log::warning('Welcome email skipped: BREVO_API_KEY missing.', [
                'user_id' => $user->id,
                'email' => $user->email,
            ]);

            return false;
        }

        try {
            $mailable = new ParticipantWelcomeMail($user);
            $subject = $mailable->envelope()->subject ?? 'Registration Confirmed: ASEAN Philippines 2026 (Higher Education Sector) | CHED-Hosted Welcome Dinner on February 12, 2025';
            $html = $this->minifyHtml(view('emails.participant-welcome-brevo', $mailable->data())->render());

            $payload = [
                'sender' => [
                    'name' => config('services.brevo.sender_name', config('mail.from.name', 'ASEAN PH 2026')),
                    'email' => config('services.brevo.sender_email', config('mail.from.address', 'ph2026@asean.chedro12.com')),
                ],
                'to' => [[
                    'email' => $user->email,
                    'name' => $user->name,
                ]],
                'subject' => $subject,
                'htmlContent' => $html,
                'textContent' => trim(preg_replace('/\s+/', ' ', strip_tags($html))),
            ];

            $response = Http::timeout(20)
                ->withHeaders([
                    'api-key' => $apiKey,
                    'accept' => 'application/json',
                    'content-type' => 'application/json',
                ])
                ->post('https://api.brevo.com/v3/smtp/email', $payload);

            if ($response->failed()) {
                Log::error('Welcome email via Brevo API failed.', [
                    'user_id' => $user->id,
                    'email' => $user->email,
                    'status' => $response->status(),
                    'body' => $response->body(),
                ]);

                return false;
            }

            return true;
        } catch (Throwable $fallbackException) {
            report($fallbackException);

            Log::error('Welcome email via Brevo API failed.', [
                'user_id' => $user->id,
                'email' => $user->email,
                'fallback_error' => $fallbackException->getMessage(),
            ]);

            return false;
        }
    }

    private function minifyHtml(string $html): string
    {
        $html = preg_replace('/<!--.*?-->/s', '', $html) ?? $html;
        $html = preg_replace('/>\\s+</', '><', $html) ?? $html;
        $html = preg_replace('/\\s{2,}/', ' ', $html) ?? $html;

        return trim($html);
    }
}
