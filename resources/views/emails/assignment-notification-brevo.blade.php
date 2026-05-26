<!DOCTYPE html>
<html lang="en">
    <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>ASEAN PH 2026 Assignment Notification</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f4f6fb; font-family: 'Segoe UI', Arial, sans-serif; color: #0f172a;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f6fb; padding: 24px 0;">
            <tr>
                <td align="center">
                    <table role="presentation" width="640" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden;">
                        <tr>
                            <td style="padding: 20px 28px 8px;">
                                <img src="{{ $bannerUrl }}" alt="ASEAN Philippines 2026 banner" style="display: block; width: 100%; max-width: 260px; height: auto;" />
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 0 28px 8px;">
                                <p style="margin: 0 0 12px; font-size: 14px; line-height: 1.6; color: #475569;">
                                    Hi {{ $participantName }},
                                </p>
                                <p style="margin: 0 0 12px; font-size: 14px; line-height: 1.6; color: #475569;">
                                    Please be informed of the following:
                                </p>
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 0 28px 20px;">
                                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #dbeafe; border-radius: 16px; padding: 14px; background-color: #eff6ff;">
                                    <tr>
                                        <td style="padding-bottom: 10px;">
                                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                                                <tr>
                                                    <td style="width: 40px; vertical-align: middle;">
                                                        <img src="{{ $logoUrl }}" alt="ASEAN logo" style="width: 36px; height: 36px; display: block;" />
                                                    </td>
                                                    <td style="vertical-align: middle;">
                                                        <div style="font-size: 12px; font-weight: 700; color: #0f172a;">ASEAN Philippines 2026</div>
                                                        <div style="font-size: 11px; color: #475569;">Assignment Notification</div>
                                                    </td>
                                                </tr>
                                            </table>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td>
                                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size: 13px; line-height: 1.7; color: #334155;">
                                                <tr><td><strong>Participant ID:</strong> {{ $participantId }}</td></tr>
                                                <tr><td><strong>Event Title:</strong> {{ $eventTitle }}</td></tr>
                                                <tr><td><strong>Event Date:</strong> {{ $eventDate }}</td></tr>
                                                <tr><td><strong>Vehicle:</strong> {{ $vehicleName }}</td></tr>
                                                <tr><td><strong>Vehicle Plate Number:</strong> {{ $vehiclePlateNumber }}</td></tr>
                                                <tr><td><strong>Table Number:</strong> {{ $tableNumber }}</td></tr>
                                            </table>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 0 28px 24px;">
                                <p style="margin: 0 0 12px; font-size: 14px; line-height: 1.6; color: #475569;">
                                    Thank you!
                                </p>
                                <p style="margin: 0; font-size: 12px; line-height: 1.6; color: #64748b; font-style: italic;">
                                    * This is a system-generated message. Please do not reply to this email.
                                </p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
</html>
