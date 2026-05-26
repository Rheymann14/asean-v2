<!DOCTYPE html>
<html lang="en">
    <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>ASEAN PH 2026 Registration</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f4f6fb; font-family: 'Segoe UI', Arial, sans-serif; color: #0f172a;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f6fb; padding: 24px 0;">
            <tr>
                <td align="center">
                    <table role="presentation" width="680" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 12px 30px rgba(15, 23, 42, 0.08);">
                        <tr>
                            <td style="padding: 24px 32px 12px;">
                                @php
                                    $bannerSrc = $bannerPath && isset($message) ? $message->embed($bannerPath) : $bannerUrl;
                                @endphp
                                <img src="{{ $bannerSrc }}" alt="ASEAN Philippines 2026 banner" style="display: block; width: 100%; max-width: 280px; height: auto;" />
                            </td>
                        </tr>
                           <tr>
                            <td style="padding: 0 28px 18px;">
                                <h1 style="margin: 0 0 10px; font-size: 20px; line-height: 1.3; color: #0f172a;">
                                    Thank you for registering for the CHED-Hosted Welcome Dinner. Your registration is confirmed.
                                </h1>
                                <p style="margin: 0 0 12px; font-size: 14px; line-height: 1.6; color: #475569;">
                                    Please log in to the registration portal to access your QR code, which will serve as your entry pass to the event.
                                   
                                </p>
                              <p style="margin: 0 0 12px; font-size: 14px; line-height: 1.6; color: #475569;">
                                    <strong>System Link:</strong>
                                    <a href="{{ $appUrl }}" style="color: #1d4ed8; text-decoration: none; font-weight: 600;">
                                        {{ $appUrl }}
                                    </a>
                                    <br />
                                    <strong>Username:</strong> {{ $user->email }}
                                </p>

                                <p style="margin: 0 0 6px; font-size: 14px; line-height: 1.6; color: #64748b;">
                                    Kindly save a copy of your QR code and present it for scanning at the registration desk upon arrival.
                                </p>
                            </td>
                        </tr>
                  
                        <tr>
                            <td style="padding: 0 32px 24px;">
                                <h2 style="margin: 0 0 12px; font-size: 16px; color: #0f172a;">System-generated ID</h2>
                                @php
                                    $qrSrc = $qrImage && isset($message) ? $message->embedData($qrImage, 'participant-qr.png', 'image/png') : $qrUrl;
                                @endphp
                                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #dbeafe; border-radius: 18px; padding: 16px; background-color: #eff6ff;">
                                    <tr>
                                        <td style="padding-bottom: 12px;">
                                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                                                <tr>
                                                    <td style="width: 48px; vertical-align: middle;">
                                                        @php
                                                            $logoSrc = $logoPath && isset($message) ? $message->embed($logoPath) : $logoUrl;
                                                        @endphp
                                                        <img src="{{ $logoSrc }}" alt="ASEAN logo" style="width: 42px; height: 42px; display: block;" />
                                                    </td>
                                                    <td style="width: 48px; vertical-align: middle;">
                                                        @php
                                                            $bagongPilipinasSrc = $bagongPilipinasPath && isset($message) ? $message->embed($bagongPilipinasPath) : $bagongPilipinasUrl;
                                                        @endphp
                                                        <img src="{{ $bagongPilipinasSrc }}" alt="Bagong Pilipinas logo" style="width: 42px; height: 42px; display: block;" />
                                                    </td>
                                                    <td style="vertical-align: middle;">
                                                        <div style="font-size: 13px; font-weight: 700; color: #0f172a;">ASEAN Philippines 2026</div>
                                                        <div style="font-size: 11px; color: #475569;">Participant Identification</div>
                                                    </td>
                                                </tr>
                                            </table>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td>
                                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                                                <tr>
                                                    <td style="width: 60%; vertical-align: top; padding-right: 12px;">
                                                        <div style="font-size: 13px; line-height: 1.6; color: #334155;">
                                                            <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: #64748b;">Participant</div>
                                                            <div style="font-weight: 700; color: #0f172a;">{{ $user->name }}</div>
                                                            <div style="margin-top: 6px;">{{ $user->country?->name ?? 'ASEAN Participant' }}</div>
                                                            <div style="margin-top: 6px; font-size: 12px; color: #475569;">Participant ID:</div>
                                                            <div style="font-weight: 700; color: #1e40af;">{{ $user->display_id }}</div>
                                                            <div style="margin-top: 8px; font-size: 11px; color: #64748b;">
                                                                Use this landscape ID for check-in attendance verification.
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td style="width: 40%; text-align: center; vertical-align: top;">
                                                        <div style="background: #ffffff; border-radius: 14px; padding: 10px; border: 1px solid #dbeafe; display: inline-block;">
                                                            <div style="font-size: 11px; font-weight: 600; color: #475569; margin-bottom: 6px;">QR Code</div>
                                                            <img src="{{ $qrSrc }}" alt="Participant QR code" style="width: 160px; height: 160px; border-radius: 10px; border: 1px solid #e2e8f0;" />
                                                        </div>
                                                        <div style="margin-top: 8px; font-size: 11px; color: #64748b;">Scan for attendance check-in</div>
                                                    </td>
                                                </tr>
                                            </table>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 0 32px 16px;">
                                <h2 style="margin: 0 0 12px; font-size: 16px; color: #0f172a;">Events Joined</h2>
                                @if ($events->isEmpty())
                                    <p style="margin: 0; font-size: 13px; color: #475569;">No events joined yet. Log in to the portal to select your events.</p>
                                @else
                                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
                                        <tr>
                                            <th align="left" style="padding: 8px 0; font-size: 12px; color: #64748b; border-bottom: 1px solid #e2e8f0;">Event</th>
                                            <th align="left" style="padding: 8px 0; font-size: 12px; color: #64748b; border-bottom: 1px solid #e2e8f0;">Date</th>
                                        </tr>
                                        @foreach ($events as $event)
                                            @php
                                                $assignment = $assignments->get($event['id']);
                                                $tableNumber = $assignment?->participantTable?->table_number;
                                            @endphp
                                            <tr>
                                                <td style="padding: 10px 0; font-size: 13px; color: #1e293b;">{{ $event['title'] }}</td>
                                                <td style="padding: 10px 0; font-size: 13px; color: #475569;">
                                                    {{ $event['starts_at'] ?? 'TBA' }}
                                                </td>
                                            </tr>
                                        @endforeach
                                    </table>
                                @endif
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 16px 32px 32px;">
                                 <p style="margin: 0; font-size: 13px; line-height: 1.6; color: #1e293b; font-weight: 600;">
                                   This is a system-generated message. Please do not reply to this email.
                                </p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
</html>
