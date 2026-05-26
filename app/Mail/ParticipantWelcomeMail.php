<?php

namespace App\Mail;

use App\Models\Programme;
use App\Models\User;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class ParticipantWelcomeMail extends Mailable
{
    use SerializesModels;

    public function __construct(public User $user)
    {
        $this->user->loadMissing([
            'country',
            'joinedProgrammes',
            'tableAssignments.participantTable',
            'tableAssignments.programme',
        ]);
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Registration Confirmed: ASEAN Philippines 2026 (Higher Education Sector) | CHED-Hosted Welcome Dinner on February 12, 2025',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.participant-welcome',
            with: $this->data(),
        );
    }

    public function data(): array
    {
        $qrUrl = $this->qrUrl();

        $events = $this->user->joinedProgrammes
            ->sortBy('starts_at')
            ->values()
            ->map(fn (Programme $event) => [
                'id' => $event->id,
                'title' => $event->title,
                'starts_at' => $event->starts_at?->format('F j, Y g:i A'),
                'ends_at' => $event->ends_at?->format('F j, Y g:i A'),
            ]);

        $assignments = $this->user->tableAssignments->keyBy('programme_id');

        $appUrl = rtrim((string) config('app.url', 'https://asean-registration.ched.gov.ph'), '/');
        $bannerPath = public_path('img/asean_banner_logo.png');
        $logoPath = public_path('img/asean_logo.png');
        $bagongPilipinasPath = public_path('img/bagong_pilipinas.png');

        return [
            'appUrl' => $appUrl,
            'bannerUrl' => $appUrl . '/img/asean_banner_logo.png',
            'logoUrl' => $appUrl . '/img/asean_logo.png',
            'bannerPath' => is_file($bannerPath) ? $bannerPath : null,
            'logoPath' => is_file($logoPath) ? $logoPath : null,
            'bagongPilipinasUrl' => $appUrl . '/img/bagong_pilipinas.png',
            'bagongPilipinasPath' => is_file($bagongPilipinasPath) ? $bagongPilipinasPath : null,
            'events' => $events,
            'assignments' => $assignments,
            'qrImage' => null,
            'qrUrl' => $qrUrl,
            'user' => $this->user,
        ];
    }


    public function attachments(): array
    {
        return [];
    }

    private function qrUrl(): string
    {
        $payload = urlencode((string) $this->user->qr_payload);

        return "https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=0&data={$payload}";
    }
}
