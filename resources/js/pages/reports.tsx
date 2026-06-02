import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command';
import { Input } from '@/components/ui/input';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { cn, toDateOnlyTimestamp } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import {
    ArrowUpDown,
    Check,
    ChevronDown,
    ChevronsUpDown,
    FileDown,
    Printer,
} from 'lucide-react';
import * as React from 'react';
import { toast } from 'sonner';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Reports', href: '/reports' }];

type Summary = {
    total_registered_participants: number;
    total_participants_attended: number;
    total_participants_did_not_join: number;
};

type EventRow = {
    id: number;
    title: string;
    starts_at?: string | null;
    ends_at?: string | null;
    is_active: boolean;
    is_registration_active?: boolean;
};

type ReportRow = {
    id: number;
    honorific_title?: string | null;
    given_name?: string | null;
    family_name?: string | null;
    suffix?: string | null;
    name: string;
    display_id?: string | null;
    country_name?: string | null;
    registrant_type?: string | null;
    organization_name?: string | null;
    other_user_type?: string | null;
    attend_welcome_dinner: boolean;
    avail_transport_from_makati_to_peninsula: boolean;
    table_assignment?: string | null;
    table_assignment_by_programme: Record<string, string | null>;
    vehicle_assignment?: string | null;
    vehicle_assignment_by_programme: Record<string, string | null>;
    vehicle_plate_number?: string | null;
    vehicle_plate_number_by_programme: Record<string, string | null>;
    notification_sent_at_by_programme: Record<string, string | null>;
    asemme10_registration?: Asemme10Registration | null;
    asemme10_registration_by_programme?: Record<
        string,
        Asemme10Registration | null
    >;
    has_attended: boolean;
    joined_programme_ids: number[];
    attended_programme_ids: number[];
    attendance_by_programme: Record<string, string | null>;
    latest_attendance_at?: string | null;
};

type Asemme10Registration = {
    attendee_id?: number | null;
    role?: string | null;
    title?: string | null;
    given_name?: string | null;
    family_name?: string | null;
    badge_name?: string | null;
    organization_name?: string | null;
    position_title?: string | null;
    email?: string | null;
    dietary_requirements?: string | null;
    mobility_or_special_needs?: string | null;
    registration_type?: string | null;
    focal_name?: string | null;
    focal_email?: string | null;
    focal_phone?: string | null;
};

type PageProps = {
    summary: Summary;
    rows: ReportRow[];
    events: EventRow[];
    default_event_id?: number | null;
    now_iso?: string | null;
};

type EventPhase = 'ongoing' | 'upcoming' | 'closed';
type CheckinSort = 'desc' | 'asc';
type RegistrantTypeSort = 'none' | 'asc' | 'desc';

const PAGE_SIZE_OPTIONS = [10, 50, 100, 1000] as const;
const ALL_EVENTS_VALUE = 'all';
function readXsrfCookieToken() {
    const cookieMatch = document.cookie.match(/(?:^|; )XSRF-TOKEN=([^;]+)/);

    if (!cookieMatch?.[1]) return '';

    try {
        return decodeURIComponent(cookieMatch[1]).trim();
    } catch {
        return cookieMatch[1].trim();
    }
}

function getCsrfTokens() {
    const metaToken = document
        .querySelector('meta[name="csrf-token"]')
        ?.getAttribute('content')
        ?.trim();
    const cookieToken = readXsrfCookieToken();

    return [metaToken, cookieToken].filter(
        (token, index, tokens): token is string =>
            Boolean(token) && tokens.indexOf(token) === index,
    );
}

function resolveEventPhase(event: EventRow, nowTs: number): EventPhase {
    if (!event.is_active) return 'closed';

    const startDate = event.starts_at ? new Date(event.starts_at) : null;
    const endDate = event.ends_at ? new Date(event.ends_at) : null;

    const todayTs = toDateOnlyTimestamp(new Date(nowTs));
    const startTs = startDate ? toDateOnlyTimestamp(startDate) : null;
    const endTs = endDate ? toDateOnlyTimestamp(endDate) : null;

    if (startTs !== null && todayTs < startTs) return 'upcoming';
    if (endTs !== null && todayTs > endTs) return 'closed';
    return 'ongoing';
}

function phaseLabel(phase: EventPhase) {
    return phase === 'ongoing'
        ? 'Ongoing'
        : phase === 'upcoming'
          ? 'Upcoming'
          : 'Closed';
}

function phaseBadgeClass(phase: EventPhase) {
    switch (phase) {
        case 'ongoing':
            return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300';
        case 'upcoming':
            return 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300';
        default:
            return 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
    }
}

function formatDateTime(value?: string | null) {
    if (!value) return '-';

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';

    return new Intl.DateTimeFormat('en-PH', {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    }).format(date);
}

function buildDisplayName(row: ReportRow) {
    const parts = [
        row.honorific_title,
        row.given_name,
        row.family_name,
        row.suffix,
    ]
        .map((item) => (item ?? '').trim())
        .filter(Boolean);

    if (parts.length) return parts.join(' ');

    return row.name;
}

function displayRegistrantType(row: ReportRow) {
    if ((row.registrant_type ?? '').trim().toLowerCase() === 'other') {
        return row.other_user_type?.trim() || 'Other';
    }

    return row.registrant_type ?? '-';
}

function getCheckinTime(
    row: ReportRow,
    selectedEventId: number | null,
): string | null | undefined {
    if (selectedEventId)
        return row.attendance_by_programme?.[String(selectedEventId)];
    return row.latest_attendance_at;
}

function getTableAssignment(
    row: ReportRow,
    selectedEventId: number | null,
): string | null | undefined {
    if (selectedEventId)
        return row.table_assignment_by_programme?.[String(selectedEventId)];

    return row.table_assignment;
}

function getVehicleAssignment(
    row: ReportRow,
    selectedEventId: number | null,
): string | null | undefined {
    if (selectedEventId)
        return row.vehicle_assignment_by_programme?.[String(selectedEventId)];

    return row.vehicle_assignment;
}

function getVehiclePlateNumber(
    row: ReportRow,
    selectedEventId: number | null,
): string | null | undefined {
    if (selectedEventId)
        return row.vehicle_plate_number_by_programme?.[String(selectedEventId)];

    return row.vehicle_plate_number;
}

function isAsemme10Event(event: EventRow | null) {
    const value = `${event?.title ?? ''}`.trim().toLowerCase();

    return (
        value.includes('asemme10') ||
        value.includes('asemme 10') ||
        value.includes('asia-europe meeting of ministers for education') ||
        value.includes('10th asia-europe meeting')
    );
}

function getAsemme10Registration(
    row: ReportRow,
    selectedEventId: number | null,
): Asemme10Registration | null | undefined {
    if (selectedEventId) {
        return row.asemme10_registration_by_programme?.[
            String(selectedEventId)
        ];
    }

    return row.asemme10_registration;
}

function displayAsemme10Name(
    row: ReportRow,
    registration?: Asemme10Registration | null,
) {
    const name = [
        registration?.title,
        registration?.given_name,
        registration?.family_name,
    ]
        .map((item) => (item ?? '').trim())
        .filter(Boolean)
        .join(' ');

    return name || buildDisplayName(row);
}

function displayAsemme10Role(role?: string | null) {
    const value = (role ?? '').trim();

    if (!value) return '-';

    return value
        .split('_')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
}

function ReportDetailItem({
    label,
    children,
}: {
    label: string;
    children: React.ReactNode;
}) {
    return (
        <div className="min-w-0">
            <div className="mb-1 text-[11px] font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400">
                {label}
            </div>
            <div className="min-w-0 text-sm break-words whitespace-pre-wrap text-slate-700 dark:text-slate-300">
                {children || '-'}
            </div>
        </div>
    );
}

export default function Reports({
    summary,
    rows,
    events,
    default_event_id,
    now_iso,
}: PageProps) {
    const [search, setSearch] = React.useState('');
    const [currentPage, setCurrentPage] = React.useState(1);
    const [selectedEvent, setSelectedEvent] = React.useState<string>(() =>
        default_event_id ? String(default_event_id) : ALL_EVENTS_VALUE,
    );
    const [eventsOpen, setEventsOpen] = React.useState(false);
    const [checkinSort, setCheckinSort] = React.useState<CheckinSort>('desc');
    const [registrantTypeSort, setRegistrantTypeSort] =
        React.useState<RegistrantTypeSort>('none');
    const [entriesPerPage, setEntriesPerPage] = React.useState<number>(10);
    const [welcomeDinnerByUser, setWelcomeDinnerByUser] = React.useState<
        Record<number, boolean>
    >({});
    const [transportByUser, setTransportByUser] = React.useState<
        Record<number, boolean>
    >({});
    const [savingUserIds, setSavingUserIds] = React.useState<
        Record<number, boolean>
    >({});
    const [sendingNotificationByUser, setSendingNotificationByUser] =
        React.useState<Record<number, boolean>>({});
    const [notificationSentAtByAssignment, setNotificationSentAtByAssignment] =
        React.useState<Record<string, string>>({});
    const [expandedRowIds, setExpandedRowIds] = React.useState<Set<number>>(
        () => new Set(),
    );

    const getNotificationSentAtKey = React.useCallback(
        (userId: number, eventId: number) => `${userId}:${eventId}`,
        [],
    );

    const toggleExpandedRow = React.useCallback((rowId: number) => {
        setExpandedRowIds((prev) => {
            const next = new Set(prev);

            if (next.has(rowId)) {
                next.delete(rowId);
            } else {
                next.add(rowId);
            }

            return next;
        });
    }, []);

    React.useEffect(() => {
        setExpandedRowIds(new Set());
    }, [currentPage, entriesPerPage, search, selectedEvent]);

    React.useEffect(() => {
        setWelcomeDinnerByUser(
            Object.fromEntries(
                rows.map((row) => [row.id, row.attend_welcome_dinner]),
            ),
        );
        setTransportByUser(
            Object.fromEntries(
                rows.map((row) => [
                    row.id,
                    row.avail_transport_from_makati_to_peninsula,
                ]),
            ),
        );

        setNotificationSentAtByAssignment(
            Object.fromEntries(
                rows.flatMap((row) =>
                    Object.entries(row.notification_sent_at_by_programme ?? {})
                        .filter(([, sentAt]) => Boolean(sentAt))
                        .map(([eventId, sentAt]) => [
                            getNotificationSentAtKey(row.id, Number(eventId)),
                            sentAt as string,
                        ]),
                ),
            ),
        );
    }, [getNotificationSentAtKey, rows]);

    const updateWelcomeDinnerPreferences = React.useCallback(
        (
            userId: number,
            attendWelcomeDinner: boolean,
            availTransport: boolean,
        ) => {
            setSavingUserIds((prev) => ({ ...prev, [userId]: true }));

            router.patch(
                `/reports/${userId}/welcome-dinner-preferences`,
                {
                    attend_welcome_dinner: attendWelcomeDinner ? 1 : 0,
                    avail_transport_from_makati_to_peninsula: availTransport
                        ? 1
                        : 0,
                },
                {
                    preserveState: true,
                    preserveScroll: true,
                    onFinish: () => {
                        setSavingUserIds((prev) => {
                            const next = { ...prev };
                            delete next[userId];
                            return next;
                        });
                    },
                },
            );
        },
        [],
    );

    const referenceNowTs = React.useMemo(() => {
        const parsed = now_iso ? Date.parse(now_iso) : Number.NaN;
        return Number.isNaN(parsed) ? 0 : parsed;
    }, [now_iso]);

    const eventOptionItems = React.useMemo(() => {
        return events
            .map((event) => {
                const phase = resolveEventPhase(event, referenceNowTs);
                return {
                    ...event,
                    phase,
                    phase_label: phaseLabel(phase),
                };
            })
            .sort((a, b) => {
                const order: Record<EventPhase, number> = {
                    ongoing: 0,
                    upcoming: 1,
                    closed: 2,
                };
                return order[a.phase] - order[b.phase];
            });
    }, [events, referenceNowTs]);

    const selectedEventData = React.useMemo(
        () =>
            eventOptionItems.find(
                (event) => String(event.id) === selectedEvent,
            ) ?? null,
        [eventOptionItems, selectedEvent],
    );

    const selectedEventId = React.useMemo(() => {
        if (selectedEvent === ALL_EVENTS_VALUE) return null;
        const parsed = Number(selectedEvent);
        return Number.isNaN(parsed) || parsed <= 0 ? null : parsed;
    }, [selectedEvent]);
    const isAsemme10Selected = React.useMemo(
        () => isAsemme10Event(selectedEventData),
        [selectedEventData],
    );

    const getNotificationEventId = React.useCallback(
        (row: ReportRow) => {
            if (selectedEventId) {
                const hasTable = Boolean(
                    getTableAssignment(row, selectedEventId),
                );
                const hasVehicle = Boolean(
                    getVehicleAssignment(row, selectedEventId),
                );

                return hasTable || hasVehicle ? selectedEventId : null;
            }

            for (const event of eventOptionItems) {
                const eventId = event.id;
                const hasTable = Boolean(getTableAssignment(row, eventId));
                const hasVehicle = Boolean(getVehicleAssignment(row, eventId));

                if (hasTable || hasVehicle) return eventId;
            }

            return null;
        },
        [eventOptionItems, selectedEventId],
    );

    const handleSendNotification = React.useCallback(
        async (row: ReportRow) => {
            const notificationEventId = getNotificationEventId(row);

            if (!notificationEventId) {
                toast.warning(
                    'Notification can only be sent when table or vehicle assignment is available.',
                );
                return;
            }

            setSendingNotificationByUser((prev) => ({
                ...prev,
                [row.id]: true,
            }));

            const [primaryToken, fallbackToken] = getCsrfTokens();

            const sendRequest = (csrfToken?: string) =>
                fetch(`/reports/${row.id}/assignment-notification`, {
                    method: 'POST',
                    credentials: 'same-origin',
                    headers: {
                        'Content-Type': 'application/json',
                        Accept: 'application/json',
                        'X-Requested-With': 'XMLHttpRequest',
                        ...(csrfToken
                            ? {
                                  'X-CSRF-TOKEN': csrfToken,
                                  'X-XSRF-TOKEN': csrfToken,
                              }
                            : {}),
                    },
                    body: JSON.stringify({
                        event_id: notificationEventId,
                        ...(csrfToken ? { _token: csrfToken } : {}),
                    }),
                });

            const parsePayload = async (response: Response) =>
                (await response.json().catch(() => ({}))) as {
                    message?: string;
                    sent_at?: string;
                    errors?: Record<string, string[]>;
                };

            try {
                let response = await sendRequest(primaryToken);
                let payload = await parsePayload(response);

                if (!response.ok && response.status === 419 && fallbackToken) {
                    response = await sendRequest(fallbackToken);
                    payload = await parsePayload(response);
                }

                if (!response.ok) {
                    if (response.status === 419) {
                        toast.error(
                            'Session expired. Please reload the page and try again.',
                        );
                    } else if (response.status === 422) {
                        toast.warning(
                            payload.message ??
                                'Validation failed. Please check assignment data.',
                        );
                    } else {
                        toast.error(
                            payload.message ?? 'Failed to send notification.',
                        );
                    }

                    return;
                }

                const sentAt = payload.sent_at ?? new Date().toISOString();
                const sentAtKey = getNotificationSentAtKey(
                    row.id,
                    notificationEventId,
                );

                setNotificationSentAtByAssignment((prev) => ({
                    ...prev,
                    [sentAtKey]: sentAt,
                }));

                toast.success(
                    payload.message ?? 'Notification sent successfully.',
                );
            } catch {
                toast.error('Failed to send notification.');
            } finally {
                setSendingNotificationByUser((prev) => {
                    const next = { ...prev };
                    delete next[row.id];
                    return next;
                });
            }
        },
        [getNotificationEventId, getNotificationSentAtKey],
    );

    const rowsAfterEventFilter = React.useMemo(() => {
        if (!selectedEventId) return rows;

        return rows.filter(
            (row) =>
                row.joined_programme_ids.includes(selectedEventId) ||
                row.attended_programme_ids.includes(selectedEventId),
        );
    }, [rows, selectedEventId]);

    const filteredRows = React.useMemo(() => {
        const keyword = search.trim().toLowerCase();

        if (!keyword) return rowsAfterEventFilter;

        return rowsAfterEventFilter.filter((row) => {
            const asemme10Registration = getAsemme10Registration(
                row,
                selectedEventId,
            );
            const checkinLabel = selectedEventId
                ? row.attended_programme_ids.includes(selectedEventId)
                    ? 'checked in attended'
                    : 'did not join'
                : row.has_attended
                  ? 'checked in attended'
                  : 'did not join';

            return [
                buildDisplayName(row),
                row.country_name ?? '',
                displayRegistrantType(row),
                row.organization_name ?? '',
                asemme10Registration?.badge_name ?? '',
                asemme10Registration?.email ?? '',
                asemme10Registration?.role ?? '',
                asemme10Registration?.registration_type ?? '',
                asemme10Registration?.position_title ?? '',
                asemme10Registration?.focal_name ?? '',
                asemme10Registration?.focal_email ?? '',
                checkinLabel,
            ]
                .join(' ')
                .toLowerCase()
                .includes(keyword);
        });
    }, [rowsAfterEventFilter, search, selectedEventId]);

    const sortedRows = React.useMemo(() => {
        const rowsCopy = [...filteredRows];

        return rowsCopy.sort((a, b) => {
            if (registrantTypeSort !== 'none') {
                const typeOrder = displayRegistrantType(a).localeCompare(
                    displayRegistrantType(b),
                    undefined,
                    {
                        sensitivity: 'base',
                    },
                );

                if (typeOrder !== 0)
                    return registrantTypeSort === 'asc'
                        ? typeOrder
                        : -typeOrder;
            }

            const aScan = getCheckinTime(a, selectedEventId);
            const bScan = getCheckinTime(b, selectedEventId);
            const aParsed = aScan ? Date.parse(aScan) : Number.NaN;
            const bParsed = bScan ? Date.parse(bScan) : Number.NaN;
            const aTs = Number.isNaN(aParsed)
                ? checkinSort === 'desc'
                    ? Number.NEGATIVE_INFINITY
                    : Number.POSITIVE_INFINITY
                : aParsed;
            const bTs = Number.isNaN(bParsed)
                ? checkinSort === 'desc'
                    ? Number.NEGATIVE_INFINITY
                    : Number.POSITIVE_INFINITY
                : bParsed;

            if (aTs === bTs)
                return buildDisplayName(a).localeCompare(buildDisplayName(b));
            return checkinSort === 'desc' ? bTs - aTs : aTs - bTs;
        });
    }, [filteredRows, selectedEventId, checkinSort, registrantTypeSort]);

    const handlePrintPdf = React.useCallback(() => {
        const escapeHtml = (value: string) =>
            value
                .replaceAll('&', '&amp;')
                .replaceAll('<', '&lt;')
                .replaceAll('>', '&gt;')
                .replaceAll('"', '&quot;')
                .replaceAll("'", '&#39;');

        const rowsForPrint = sortedRows
            .map((row, index) => {
                const scannedAt = getCheckinTime(row, selectedEventId);
                const hasCheckin = Boolean(scannedAt);

                if (isAsemme10Selected) {
                    const registration = getAsemme10Registration(
                        row,
                        selectedEventId,
                    );

                    return `
                    <tr>
                        <td>${index + 1}</td>
                        <td>${escapeHtml(row.display_id ?? String(row.id))}</td>
                        <td>${escapeHtml(displayAsemme10Name(row, registration))}</td>
                        <td>${escapeHtml(registration?.badge_name ?? '-')}</td>
                        <td>${escapeHtml(row.country_name ?? '-')}</td>
                        <td>${escapeHtml(registration?.registration_type ?? '-')}</td>
                        <td>${escapeHtml(displayAsemme10Role(registration?.role))}</td>
                        <td>${escapeHtml(registration?.organization_name ?? row.organization_name ?? '-')}</td>
                        <td>${escapeHtml(registration?.position_title ?? '-')}</td>
                        <td>${escapeHtml(registration?.email ?? '-')}</td>
                        <td>${escapeHtml(registration?.dietary_requirements ?? '-')}</td>
                        <td>${escapeHtml(registration?.mobility_or_special_needs ?? '-')}</td>
                        <td>${escapeHtml(registration?.focal_name ?? '-')}</td>
                        <td>${escapeHtml(registration?.focal_email ?? '-')}</td>
                        <td>${escapeHtml(registration?.focal_phone ?? '-')}</td>
                        <td>${hasCheckin ? 'Checked In' : 'Did Not Join'}</td>
                        <td>${escapeHtml(hasCheckin ? formatDateTime(scannedAt) : '-')}</td>
                    </tr>
                `;
                }

                return `
                    <tr>
                        <td>${index + 1}</td>
                        <td>${escapeHtml(buildDisplayName(row))}</td>
                        <td>${escapeHtml(row.country_name ?? '-')}</td>
                        <td>${escapeHtml(displayRegistrantType(row))}</td>
                        <td>${escapeHtml(row.organization_name ?? '-')}</td>
                        <td>${row.attend_welcome_dinner ? 'YES' : 'NO'}</td>
                        <td>${row.avail_transport_from_makati_to_peninsula ? 'YES' : 'NO'}</td>
                        <td>${escapeHtml(getTableAssignment(row, selectedEventId) ?? '-')}</td>
                        <td>${escapeHtml(getVehicleAssignment(row, selectedEventId) ?? '-')}</td>
                        <td>${hasCheckin ? 'Checked In' : 'Did Not Join'}</td>
                        <td>${escapeHtml(hasCheckin ? formatDateTime(scannedAt) : '-')}</td>
                    </tr>
                `;
            })
            .join('');
        const tableHeaders = isAsemme10Selected
            ? [
                  'Seq',
                  'Participant ID',
                  'Name',
                  'Badge Name',
                  'Country',
                  'Registration Type',
                  'Role',
                  'Organization',
                  'Position',
                  'Email',
                  'Dietary Requirements',
                  'Mobility or Special Needs',
                  'Focal Person',
                  'Focal Email',
                  'Focal Phone',
                  'Check-in Status',
                  'Check-in Date and Time',
              ]
            : [
                  'Seq',
                  'Name',
                  'Country',
                  'Registrant Type',
                  'Organization',
                  'Welcome Dinner',
                  'Transportation',
                  'Table Assignment',
                  'Vehicle Assignment',
                  'Check-in Status',
                  'Check-in Date and Time',
              ];
        const headerHtml = tableHeaders
            .map((header) => `<th>${escapeHtml(header)}</th>`)
            .join('');
        const printTableClass = isAsemme10Selected
            ? 'report-table asemme10-table'
            : 'report-table';
        const disclaimerHtml = `
            <section class="disclaimer">
                <p><strong>Note:</strong> This data is system generated.</p>
                <p><strong>Disclaimer:</strong> This report is prepared for ASEAN event administration. It contains personal data protected under applicable data privacy laws and is intended only for authorized ASEAN, CHED, and event secretariat use. Unauthorized access, disclosure, copying, alteration, distribution, or use of this document, in whole or in part, is strictly prohibited.</p>
            </section>
        `;
        const aseanLogoUrl = `${window.location.origin}/img/asean_logo.png`;

        const printHtml = `
            <html>
                <head>
                    <title>Participants Report</title>
                    <style>
                        @page {
                            size: A4 landscape;
                            margin: 10mm 8mm 16mm;
                            @bottom-center {
                                content: "Page " counter(page) " of " counter(pages);
                                color: #475569;
                                font-family: Arial, sans-serif;
                                font-size: 8px;
                            }
                        }
                        html, body { background: #ffffff !important; color: #0f172a !important; }
                        body {
                            font-family: Arial, sans-serif;
                            margin: 0;
                            color: #0f172a;
                            -webkit-print-color-adjust: exact;
                            print-color-adjust: exact;
                        }
                        .print-watermark {
                            position: fixed;
                            inset: 0;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            pointer-events: none;
                            z-index: 0;
                        }
                        .print-watermark img {
                            width: 50%;
                            max-width: 420px;
                            opacity: 0.14;
                        }
                        .print-content {
                            position: relative;
                            z-index: 1;
                        }
                        h1 { margin: 0 0 7px; font-size: 16px; color: #0f172a; }
                        p { margin: 0 0 6px; color: #475569; font-size: 8px; }
                        .report-table {
                            width: 100%;
                            border-collapse: collapse;
                            table-layout: fixed;
                        }
                        .report-table th,
                        .report-table td {
                            border: 1px solid #cbd5e1;
                            padding: 3px 4px;
                            font-size: 7px;
                            line-height: 1.2;
                            vertical-align: top;
                            text-align: left;
                            overflow-wrap: anywhere;
                            word-break: break-word;
                        }
                        .report-table th {
                            background: #f8fafc;
                            color: #0f172a;
                            font-weight: 700;
                        }
                        .asemme10-table th,
                        .asemme10-table td {
                            font-size: 6.2px;
                            padding: 2px 3px;
                            line-height: 1.15;
                        }
                        .asemme10-table th:nth-child(1),
                        .asemme10-table td:nth-child(1) { width: 3%; }
                        .asemme10-table th:nth-child(2),
                        .asemme10-table td:nth-child(2) { width: 6%; }
                        .asemme10-table th:nth-child(3),
                        .asemme10-table td:nth-child(3) { width: 6%; }
                        .asemme10-table th:nth-child(4),
                        .asemme10-table td:nth-child(4) { width: 5%; }
                        .asemme10-table th:nth-child(5),
                        .asemme10-table td:nth-child(5) { width: 5%; }
                        .asemme10-table th:nth-child(6),
                        .asemme10-table td:nth-child(6) { width: 6%; }
                        .asemme10-table th:nth-child(7),
                        .asemme10-table td:nth-child(7) { width: 5%; }
                        .asemme10-table th:nth-child(8),
                        .asemme10-table td:nth-child(8) { width: 6%; }
                        .asemme10-table th:nth-child(9),
                        .asemme10-table td:nth-child(9) { width: 5%; }
                        .asemme10-table th:nth-child(10),
                        .asemme10-table td:nth-child(10) { width: 10%; }
                        .asemme10-table th:nth-child(11),
                        .asemme10-table td:nth-child(11) { width: 7%; }
                        .asemme10-table th:nth-child(12),
                        .asemme10-table td:nth-child(12) { width: 7%; }
                        .asemme10-table th:nth-child(13),
                        .asemme10-table td:nth-child(13) { width: 5%; }
                        .asemme10-table th:nth-child(14),
                        .asemme10-table td:nth-child(14) { width: 9%; }
                        .asemme10-table th:nth-child(15),
                        .asemme10-table td:nth-child(15) { width: 5%; }
                        .asemme10-table th:nth-child(16),
                        .asemme10-table td:nth-child(16) { width: 5%; }
                        .asemme10-table th:nth-child(17),
                        .asemme10-table td:nth-child(17) { width: 6%; }
                        thead { display: table-header-group; }
                        tr { break-inside: avoid; page-break-inside: avoid; }
                        .disclaimer {
                            break-before: auto;
                            break-inside: avoid;
                            margin-top: 12mm;
                            border-top: 1px solid #cbd5e1;
                            padding-top: 6mm;
                        }
                        .disclaimer p {
                            color: #0f172a;
                            font-size: 9px;
                            line-height: 1.45;
                            margin: 0 0 4px;
                        }
                        .page-footer {
                            position: fixed;
                            left: 0;
                            right: 0;
                            bottom: -9mm;
                            text-align: center;
                            color: #475569;
                            font-size: 8px;
                        }
                        .page-footer::after {
                            content: "Page " counter(page);
                        }
                     </style>
                 </head>
                 <body>
                    <div class="print-watermark" aria-hidden="true">
                        <img src="${aseanLogoUrl}" alt="" />
                    </div>
                    <div class="page-footer" aria-hidden="true"></div>
                    <main class="print-content">
                        <h1>Participants Report</h1>
                        ${selectedEventData ? `<p>Event: ${escapeHtml(selectedEventData.title)}</p>` : ''}
                        <p>Generated: ${formatDateTime(new Date().toISOString())}</p>
                        <table class="${printTableClass}">
                            <thead>
                                <tr>
                                    ${headerHtml}
                                </tr>
                            </thead>
                            <tbody>
                                ${rowsForPrint || `<tr><td colspan="${tableHeaders.length}">No participants found.</td></tr>`}
                            </tbody>
                        </table>
                        ${disclaimerHtml}
                    </main>
                </body>
            </html>
        `;

        const blob = new Blob([printHtml], { type: 'text/html' });
        const blobUrl = URL.createObjectURL(blob);
        const printFrame = document.createElement('iframe');

        printFrame.style.position = 'fixed';
        printFrame.style.right = '0';
        printFrame.style.bottom = '0';
        printFrame.style.width = '0';
        printFrame.style.height = '0';
        printFrame.style.border = '0';
        printFrame.src = blobUrl;

        const cleanup = () => {
            URL.revokeObjectURL(blobUrl);
            printFrame.remove();
        };

        printFrame.onload = () => {
            const frameWindow = printFrame.contentWindow;
            if (!frameWindow) {
                cleanup();
                return;
            }

            const images = Array.from(printFrame.contentDocument?.images ?? []);
            const waitForImages = Promise.all(
                images.map((image) =>
                    image.complete
                        ? Promise.resolve()
                        : new Promise<void>((resolve) => {
                              image.onload = () => resolve();
                              image.onerror = () => resolve();
                          }),
                ),
            );

            waitForImages.finally(() => {
                frameWindow.focus();
                frameWindow.print();

                setTimeout(cleanup, 1000);
            });
        };

        document.body.appendChild(printFrame);
    }, [isAsemme10Selected, selectedEventData, selectedEventId, sortedRows]);

    const handleExportXlsx = React.useCallback(() => {
        const encoder = new TextEncoder();

        const escapeXml = (value: string | number) =>
            String(value)
                .replaceAll('&', '&amp;')
                .replaceAll('<', '&lt;')
                .replaceAll('>', '&gt;')
                .replaceAll('"', '&quot;')
                .replaceAll("'", '&apos;');

        const columnName = (colIndex: number) => {
            let dividend = colIndex + 1;
            let name = '';

            while (dividend > 0) {
                const modulo = (dividend - 1) % 26;
                name = String.fromCharCode(65 + modulo) + name;
                dividend = Math.floor((dividend - modulo) / 26);
            }

            return name;
        };

        const cellRef = (colIndex: number, rowIndex: number) => {
            return `${columnName(colIndex)}${rowIndex + 1}`;
        };

        const toSheetRowXml = (
            rowValues: Array<string | number>,
            rowIndex: number,
        ) => {
            const isHeader = rowIndex === 0;
            const cells = rowValues
                .map(
                    (value, colIndex) =>
                        `<c r="${cellRef(colIndex, rowIndex)}" s="${isHeader ? 1 : 2}" t="inlineStr"><is><t>${escapeXml(value)}</t></is></c>`,
                )
                .join('');
            const rowHeight = isHeader
                ? 24
                : Math.min(
                      60,
                      Math.max(
                          18,
                          Math.max(
                              ...rowValues.map((value) => {
                                  const text = String(value);
                                  const wrappedLines = Math.ceil(
                                      text.length / 45,
                                  );
                                  return Math.max(
                                      1,
                                      wrappedLines,
                                      text.split(/\r\n|\r|\n/).length,
                                  );
                              }),
                          ) * 15,
                      ),
                  );

            return `<row r="${rowIndex + 1}" ht="${rowHeight}" customHeight="1">${cells}</row>`;
        };

        const headerRow = isAsemme10Selected
            ? [
                  'Seq',
                  'Participant ID',
                  'Name',
                  'Badge Name',
                  'Country',
                  'Registration Type',
                  'Role',
                  'Organization',
                  'Position',
                  'Email',
                  'Dietary Requirements',
                  'Mobility or Special Needs',
                  'Focal Person',
                  'Focal Email',
                  'Focal Phone',
                  'Check-in Status',
                  'Check-in Date and Time',
              ]
            : [
                  'Seq',
                  'Name',
                  'Country',
                  'Registrant Type',
                  'Organization',
                  'Welcome Dinner',
                  'Transportation',
                  'Table Assignment',
                  'Vehicle Assignment',
                  'Check-in Status',
                  'Check-in Date and Time',
              ];

        const dataRows = sortedRows.map((row, index) => {
            const scannedAt = getCheckinTime(row, selectedEventId);
            const hasCheckin = Boolean(scannedAt);

            if (isAsemme10Selected) {
                const registration = getAsemme10Registration(
                    row,
                    selectedEventId,
                );

                return [
                    index + 1,
                    row.display_id ?? String(row.id),
                    displayAsemme10Name(row, registration),
                    registration?.badge_name ?? '-',
                    row.country_name ?? '-',
                    registration?.registration_type ?? '-',
                    displayAsemme10Role(registration?.role),
                    registration?.organization_name ??
                        row.organization_name ??
                        '-',
                    registration?.position_title ?? '-',
                    registration?.email ?? '-',
                    registration?.dietary_requirements ?? '-',
                    registration?.mobility_or_special_needs ?? '-',
                    registration?.focal_name ?? '-',
                    registration?.focal_email ?? '-',
                    registration?.focal_phone ?? '-',
                    hasCheckin ? 'Checked In' : 'Did Not Join',
                    hasCheckin ? formatDateTime(scannedAt) : '-',
                ];
            }

            return [
                index + 1,
                buildDisplayName(row),
                row.country_name ?? '-',
                displayRegistrantType(row),
                row.organization_name ?? '-',
                row.attend_welcome_dinner ? 'YES' : 'NO',
                row.avail_transport_from_makati_to_peninsula ? 'YES' : 'NO',
                getTableAssignment(row, selectedEventId) ?? '-',
                getVehicleAssignment(row, selectedEventId) ?? '-',
                hasCheckin ? 'Checked In' : 'Did Not Join',
                hasCheckin ? formatDateTime(scannedAt) : '-',
            ];
        });

        const worksheetRows = [headerRow, ...dataRows];
        const sheetRowsXml = worksheetRows
            .map((rowValues, rowIndex) => toSheetRowXml(rowValues, rowIndex))
            .join('');
        const columnsXml = headerRow
            .map((_, colIndex) => {
                const values = worksheetRows.map((row) =>
                    String(row[colIndex] ?? ''),
                );
                const maxLength = Math.max(
                    ...values.map((value) => value.length),
                );
                const width = Math.min(45, Math.max(10, maxLength + 2));

                return `<col min="${colIndex + 1}" max="${colIndex + 1}" width="${width}" bestFit="1" customWidth="1"/>`;
            })
            .join('');
        const lastCellRef = `${columnName(headerRow.length - 1)}${worksheetRows.length}`;

        const files = [
            {
                name: '[Content_Types].xml',
                content:
                    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
                    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
                    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
                    '<Default Extension="xml" ContentType="application/xml"/>' +
                    '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
                    '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
                    '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
                    '</Types>',
            },
            {
                name: '_rels/.rels',
                content:
                    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
                    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
                    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
                    '</Relationships>',
            },
            {
                name: 'xl/workbook.xml',
                content:
                    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
                    '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
                    '<sheets><sheet name="Participants Report" sheetId="1" r:id="rId1"/></sheets>' +
                    '</workbook>',
            },
            {
                name: 'xl/_rels/workbook.xml.rels',
                content:
                    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
                    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
                    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>' +
                    '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
                    '</Relationships>',
            },
            {
                name: 'xl/styles.xml',
                content:
                    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
                    '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
                    '<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font></fonts>' +
                    '<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF1D4ED8"/><bgColor indexed="64"/></patternFill></fill></fills>' +
                    '<borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left style="thin"><color rgb="FFCBD5E1"/></left><right style="thin"><color rgb="FFCBD5E1"/></right><top style="thin"><color rgb="FFCBD5E1"/></top><bottom style="thin"><color rgb="FFCBD5E1"/></bottom><diagonal/></border></borders>' +
                    '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
                    '<cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf><xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf></cellXfs>' +
                    '</styleSheet>',
            },
            {
                name: 'xl/worksheets/sheet1.xml',
                content:
                    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
                    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
                    '<cols>' +
                    columnsXml +
                    '</cols>' +
                    '<sheetData>' +
                    sheetRowsXml +
                    '</sheetData>' +
                    `<autoFilter ref="A1:${lastCellRef}"/>` +
                    '</worksheet>',
            },
        ];

        const crcTable = (() => {
            const table = new Uint32Array(256);
            for (let i = 0; i < 256; i += 1) {
                let c = i;
                for (let j = 0; j < 8; j += 1) {
                    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
                }
                table[i] = c >>> 0;
            }
            return table;
        })();

        const crc32 = (bytes: Uint8Array) => {
            let crc = 0xffffffff;
            for (let i = 0; i < bytes.length; i += 1) {
                crc = crcTable[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
            }
            return (crc ^ 0xffffffff) >>> 0;
        };

        const writeUint16 = (view: DataView, offset: number, value: number) => {
            view.setUint16(offset, value, true);
        };

        const writeUint32 = (view: DataView, offset: number, value: number) => {
            view.setUint32(offset, value >>> 0, true);
        };

        const fileEntries = files.map((file) => {
            const nameBytes = encoder.encode(file.name);
            const dataBytes = encoder.encode(file.content);

            return {
                ...file,
                nameBytes,
                dataBytes,
                crc: crc32(dataBytes),
                compressedSize: dataBytes.length,
                uncompressedSize: dataBytes.length,
            };
        });

        const localParts: Uint8Array[] = [];
        const centralParts: Uint8Array[] = [];
        let offset = 0;

        fileEntries.forEach((entry) => {
            const localHeader = new Uint8Array(30 + entry.nameBytes.length);
            const localView = new DataView(localHeader.buffer);
            writeUint32(localView, 0, 0x04034b50);
            writeUint16(localView, 4, 20);
            writeUint16(localView, 6, 0);
            writeUint16(localView, 8, 0);
            writeUint16(localView, 10, 0);
            writeUint16(localView, 12, 0);
            writeUint32(localView, 14, entry.crc);
            writeUint32(localView, 18, entry.compressedSize);
            writeUint32(localView, 22, entry.uncompressedSize);
            writeUint16(localView, 26, entry.nameBytes.length);
            writeUint16(localView, 28, 0);
            localHeader.set(entry.nameBytes, 30);

            localParts.push(localHeader, entry.dataBytes);

            const centralHeader = new Uint8Array(46 + entry.nameBytes.length);
            const centralView = new DataView(centralHeader.buffer);
            writeUint32(centralView, 0, 0x02014b50);
            writeUint16(centralView, 4, 20);
            writeUint16(centralView, 6, 20);
            writeUint16(centralView, 8, 0);
            writeUint16(centralView, 10, 0);
            writeUint16(centralView, 12, 0);
            writeUint16(centralView, 14, 0);
            writeUint32(centralView, 16, entry.crc);
            writeUint32(centralView, 20, entry.compressedSize);
            writeUint32(centralView, 24, entry.uncompressedSize);
            writeUint16(centralView, 28, entry.nameBytes.length);
            writeUint16(centralView, 30, 0);
            writeUint16(centralView, 32, 0);
            writeUint16(centralView, 34, 0);
            writeUint16(centralView, 36, 0);
            writeUint32(centralView, 38, 0);
            writeUint32(centralView, 42, offset);
            centralHeader.set(entry.nameBytes, 46);
            centralParts.push(centralHeader);

            offset += localHeader.length + entry.dataBytes.length;
        });

        const centralSize = centralParts.reduce(
            (sum, part) => sum + part.length,
            0,
        );
        const endHeader = new Uint8Array(22);
        const endView = new DataView(endHeader.buffer);
        writeUint32(endView, 0, 0x06054b50);
        writeUint16(endView, 4, 0);
        writeUint16(endView, 6, 0);
        writeUint16(endView, 8, fileEntries.length);
        writeUint16(endView, 10, fileEntries.length);
        writeUint32(endView, 12, centralSize);
        writeUint32(endView, 16, offset);
        writeUint16(endView, 20, 0);

        const toArrayBuffer = (part: Uint8Array) =>
            part.buffer.slice(
                part.byteOffset,
                part.byteOffset + part.byteLength,
            ) as ArrayBuffer;

        const xlsxParts = [...localParts, ...centralParts, endHeader].map(
            toArrayBuffer,
        );

        const xlsxBlob = new Blob(xlsxParts, {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });

        const dateLabel = new Date().toISOString().slice(0, 10);
        const link = document.createElement('a');
        const url = URL.createObjectURL(xlsxBlob);

        link.href = url;
        link.download = `participants-report-${dateLabel}.xlsx`;
        link.click();

        URL.revokeObjectURL(url);
    }, [isAsemme10Selected, selectedEventId, sortedRows]);

    const summaryCards = React.useMemo(() => {
        if (selectedEvent === ALL_EVENTS_VALUE) return summary;

        const selectedId = Number(selectedEvent);
        const totalRegisteredParticipants = rows.filter((row) =>
            row.joined_programme_ids.includes(selectedId),
        ).length;
        const totalParticipantsAttended = rows.filter((row) =>
            row.attended_programme_ids.includes(selectedId),
        ).length;
        const totalParticipantsDidNotJoin = Math.max(
            0,
            totalRegisteredParticipants - totalParticipantsAttended,
        );

        return {
            total_registered_participants: totalRegisteredParticipants,
            total_participants_attended: totalParticipantsAttended,
            total_participants_did_not_join: totalParticipantsDidNotJoin,
        };
    }, [rows, selectedEvent, summary]);

    const totalPages = Math.max(
        1,
        Math.ceil(sortedRows.length / entriesPerPage),
    );

    React.useEffect(() => {
        setCurrentPage(1);
    }, [
        search,
        selectedEvent,
        checkinSort,
        registrantTypeSort,
        entriesPerPage,
    ]);

    React.useEffect(() => {
        if (currentPage > totalPages) {
            setCurrentPage(totalPages);
        }
    }, [currentPage, totalPages]);

    const paginatedRows = React.useMemo(() => {
        const start = (currentPage - 1) * entriesPerPage;
        return sortedRows.slice(start, start + entriesPerPage);
    }, [sortedRows, currentPage, entriesPerPage]);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Reports" />

            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
                    Reports
                </h1>

                <div className="grid gap-4 md:grid-cols-3">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-300">
                                Total Registered Participants
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-2xl font-bold">
                                {summaryCards.total_registered_participants.toLocaleString()}
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-300">
                                Total Participants Attended (Checked In)
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-2xl font-bold">
                                {summaryCards.total_participants_attended.toLocaleString()}
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-300">
                                Total Participants Did Not Join
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-2xl font-bold">
                                {summaryCards.total_participants_did_not_join.toLocaleString()}
                            </p>
                        </CardContent>
                    </Card>
                </div>

                <Card>
                    <CardHeader className="gap-3">
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                            <CardTitle>Participants Report</CardTitle>

                            <div className="flex w-full flex-col gap-2 md:w-auto md:flex-row">
                                <Popover
                                    open={eventsOpen}
                                    onOpenChange={setEventsOpen}
                                >
                                    <PopoverTrigger asChild>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            role="combobox"
                                            aria-expanded={eventsOpen}
                                            className="h-auto w-full justify-between gap-2 py-2 sm:max-w-[420px] md:w-[260px] md:max-w-none"
                                        >
                                            <span className="min-w-0 text-left leading-tight break-words whitespace-normal md:overflow-hidden md:text-ellipsis md:whitespace-nowrap">
                                                {selectedEventData
                                                    ? selectedEventData.title
                                                    : 'All Events'}
                                            </span>
                                            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-60" />
                                        </Button>
                                    </PopoverTrigger>

                                    <PopoverContent
                                        align="start"
                                        sideOffset={8}
                                        className="max-h-[70vh] w-[min(420px,calc(100vw-1.5rem))] overflow-hidden p-0 md:w-[--radix-popover-trigger-width]"
                                    >
                                        <Command className="w-full">
                                            <CommandInput placeholder="Search event..." />
                                            <CommandEmpty>
                                                No event found.
                                            </CommandEmpty>

                                            <CommandList className="max-h-[60vh] overflow-auto">
                                                <CommandGroup>
                                                    <CommandItem
                                                        value="all events"
                                                        onSelect={() => {
                                                            setSelectedEvent(
                                                                ALL_EVENTS_VALUE,
                                                            );
                                                            setEventsOpen(
                                                                false,
                                                            );
                                                        }}
                                                    >
                                                        <Check
                                                            className={cn(
                                                                'mr-2 h-4 w-4',
                                                                selectedEvent ===
                                                                    ALL_EVENTS_VALUE
                                                                    ? 'opacity-100'
                                                                    : 'opacity-0',
                                                            )}
                                                        />
                                                        <span className="truncate">
                                                            All Events
                                                        </span>
                                                    </CommandItem>

                                                    {eventOptionItems.map(
                                                        (event) => (
                                                            <CommandItem
                                                                key={event.id}
                                                                value={`${event.title} ${event.phase_label}`}
                                                                onSelect={() => {
                                                                    setSelectedEvent(
                                                                        String(
                                                                            event.id,
                                                                        ),
                                                                    );
                                                                    setEventsOpen(
                                                                        false,
                                                                    );
                                                                }}
                                                                className="flex items-start justify-between gap-2"
                                                            >
                                                                <div className="flex w-full min-w-0 items-start justify-between gap-2 sm:block">
                                                                    <Check
                                                                        className={cn(
                                                                            'mt-0.5 h-4 w-4 shrink-0',
                                                                            selectedEvent ===
                                                                                String(
                                                                                    event.id,
                                                                                )
                                                                                ? 'opacity-100'
                                                                                : 'opacity-0',
                                                                        )}
                                                                    />
                                                                    <div className="min-w-0">
                                                                        <p className="truncate text-sm font-medium">
                                                                            {
                                                                                event.title
                                                                            }
                                                                        </p>
                                                                        <p className="text-xs text-slate-500 dark:text-slate-400">
                                                                            {formatDateTime(
                                                                                event.starts_at,
                                                                            )}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                                <Badge
                                                                    className={cn(
                                                                        'shrink-0',
                                                                        phaseBadgeClass(
                                                                            event.phase,
                                                                        ),
                                                                    )}
                                                                >
                                                                    {
                                                                        event.phase_label
                                                                    }
                                                                </Badge>
                                                            </CommandItem>
                                                        ),
                                                    )}
                                                </CommandGroup>
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>

                                <Input
                                    value={search}
                                    onChange={(event) =>
                                        setSearch(event.target.value)
                                    }
                                    placeholder="Search name, country, registrant type, organization, or check-in"
                                    className="w-full md:w-80"
                                />

                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={handlePrintPdf}
                                    className="gap-2"
                                >
                                    <Printer className="h-4 w-4" />
                                    Print PDF
                                </Button>

                                <Button
                                    type="button"
                                    onClick={handleExportXlsx}
                                    className="gap-2"
                                >
                                    <FileDown className="h-4 w-4" />
                                    Export XLSX
                                </Button>
                            </div>
                        </div>

                        {selectedEventData ? (
                            <p className="text-sm text-slate-600 dark:text-slate-300">
                                Filtered by:{' '}
                                <span className="font-medium">
                                    {selectedEventData.title}
                                </span>{' '}
                                <Badge
                                    className={phaseBadgeClass(
                                        selectedEventData.phase,
                                    )}
                                >
                                    {selectedEventData.phase_label}
                                </Badge>
                            </p>
                        ) : null}
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="overflow-hidden rounded-md border sm:hidden">
                            <div className="border-b px-3 py-2 text-sm font-medium">
                                Participant
                            </div>
                            {paginatedRows.length ? (
                                paginatedRows.map((row, index) => {
                                    const scannedAt = getCheckinTime(
                                        row,
                                        selectedEventId,
                                    );
                                    const hasCheckin = Boolean(scannedAt);
                                    const notificationEventId =
                                        getNotificationEventId(row);
                                    const notificationSentAt =
                                        notificationEventId
                                            ? notificationSentAtByAssignment[
                                                  getNotificationSentAtKey(
                                                      row.id,
                                                      notificationEventId,
                                                  )
                                              ]
                                            : null;
                                    const hasAnyNotificationSentAt =
                                        Object.entries(
                                            notificationSentAtByAssignment,
                                        ).some(
                                            ([assignmentKey, sentAt]) =>
                                                assignmentKey.startsWith(
                                                    `${row.id}:`,
                                                ) && Boolean(sentAt),
                                        );
                                    const disableNotificationButton =
                                        Boolean(
                                            sendingNotificationByUser[row.id],
                                        ) ||
                                        !notificationEventId ||
                                        (!selectedEventId &&
                                            hasAnyNotificationSentAt);
                                    const isExpanded = expandedRowIds.has(
                                        row.id,
                                    );
                                    const registration =
                                        getAsemme10Registration(
                                            row,
                                            selectedEventId,
                                        );

                                    return (
                                        <div
                                            key={row.id}
                                            className="border-b last:border-b-0"
                                        >
                                            <div className="flex w-full items-start justify-between gap-3 px-3 py-3">
                                                <div className="min-w-0 flex-1">
                                                    <p className="font-medium break-words text-slate-900 dark:text-slate-100">
                                                        {isAsemme10Selected
                                                            ? displayAsemme10Name(
                                                                  row,
                                                                  registration,
                                                              )
                                                            : buildDisplayName(
                                                                  row,
                                                              )}
                                                    </p>
                                                    <p className="text-xs break-all text-slate-500 dark:text-slate-400">
                                                        {isAsemme10Selected
                                                            ? `ID: ${row.display_id ?? row.id}`
                                                            : (row.country_name ??
                                                              '-')}
                                                    </p>
                                                    {!isAsemme10Selected ? (
                                                        <p className="mt-1 text-xs break-words text-slate-500 dark:text-slate-400">
                                                            {displayRegistrantType(
                                                                row,
                                                            )}
                                                        </p>
                                                    ) : null}
                                                    <div className="mt-2">
                                                        {hasCheckin ? (
                                                            <div className="flex flex-col gap-1">
                                                                <Badge className="w-fit bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                                                                    Checked In
                                                                </Badge>
                                                                <span className="text-xs break-words text-slate-600 dark:text-slate-300">
                                                                    {formatDateTime(
                                                                        scannedAt,
                                                                    )}
                                                                </span>
                                                            </div>
                                                        ) : (
                                                            <Badge className="bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300">
                                                                Did Not Join
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </div>

                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-8 w-[72px] shrink-0 justify-center gap-1 px-2 text-xs"
                                                    aria-expanded={isExpanded}
                                                    onClick={() =>
                                                        toggleExpandedRow(
                                                            row.id,
                                                        )
                                                    }
                                                >
                                                    <ChevronDown
                                                        className={cn(
                                                            'h-3.5 w-3.5 transition-transform',
                                                            isExpanded &&
                                                                'rotate-180',
                                                        )}
                                                    />
                                                    {isExpanded
                                                        ? 'Less'
                                                        : 'More'}
                                                </Button>
                                            </div>

                                            {isExpanded ? (
                                                <div className="border-t bg-slate-50/50 px-3 py-3 dark:bg-slate-900/20">
                                                    <div className="grid gap-y-3">
                                                        {isAsemme10Selected ? (
                                                            <>
                                                                <ReportDetailItem label="Badge Name">
                                                                    {registration?.badge_name ??
                                                                        '-'}
                                                                </ReportDetailItem>
                                                                <ReportDetailItem label="Organization">
                                                                    {registration?.organization_name ??
                                                                        row.organization_name ??
                                                                        '-'}
                                                                </ReportDetailItem>
                                                                <ReportDetailItem label="Position">
                                                                    {registration?.position_title ??
                                                                        '-'}
                                                                </ReportDetailItem>
                                                                <ReportDetailItem label="Email">
                                                                    {registration?.email ??
                                                                        '-'}
                                                                </ReportDetailItem>
                                                                <ReportDetailItem label="Dietary Requirements">
                                                                    {registration?.dietary_requirements ??
                                                                        '-'}
                                                                </ReportDetailItem>
                                                                <ReportDetailItem label="Mobility or Special Needs">
                                                                    {registration?.mobility_or_special_needs ??
                                                                        '-'}
                                                                </ReportDetailItem>
                                                                <ReportDetailItem label="Focal Person">
                                                                    {registration?.focal_name ??
                                                                        '-'}
                                                                </ReportDetailItem>
                                                                <ReportDetailItem label="Focal Email">
                                                                    {registration?.focal_email ??
                                                                        '-'}
                                                                </ReportDetailItem>
                                                                <ReportDetailItem label="Focal Phone">
                                                                    {registration?.focal_phone ??
                                                                        '-'}
                                                                </ReportDetailItem>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <ReportDetailItem label="Organization">
                                                                    {row.organization_name ??
                                                                        '-'}
                                                                </ReportDetailItem>
                                                                <ReportDetailItem label="Welcome Dinner">
                                                                    <Select
                                                                        value={
                                                                            (welcomeDinnerByUser[
                                                                                row
                                                                                    .id
                                                                            ] ??
                                                                            row.attend_welcome_dinner)
                                                                                ? 'yes'
                                                                                : 'no'
                                                                        }
                                                                        onValueChange={(
                                                                            value,
                                                                        ) => {
                                                                            const nextWelcomeDinner =
                                                                                value ===
                                                                                'yes';
                                                                            const currentTransport =
                                                                                transportByUser[
                                                                                    row
                                                                                        .id
                                                                                ] ??
                                                                                row.avail_transport_from_makati_to_peninsula;
                                                                            const nextTransport =
                                                                                nextWelcomeDinner
                                                                                    ? currentTransport
                                                                                    : false;

                                                                            setWelcomeDinnerByUser(
                                                                                (
                                                                                    prev,
                                                                                ) => ({
                                                                                    ...prev,
                                                                                    [row.id]:
                                                                                        nextWelcomeDinner,
                                                                                }),
                                                                            );
                                                                            setTransportByUser(
                                                                                (
                                                                                    prev,
                                                                                ) => ({
                                                                                    ...prev,
                                                                                    [row.id]:
                                                                                        nextTransport,
                                                                                }),
                                                                            );

                                                                            updateWelcomeDinnerPreferences(
                                                                                row.id,
                                                                                nextWelcomeDinner,
                                                                                nextTransport,
                                                                            );
                                                                        }}
                                                                        disabled={Boolean(
                                                                            savingUserIds[
                                                                                row
                                                                                    .id
                                                                            ],
                                                                        )}
                                                                    >
                                                                        <SelectTrigger className="h-8 w-[90px]">
                                                                            <SelectValue />
                                                                        </SelectTrigger>
                                                                        <SelectContent>
                                                                            <SelectItem value="yes">
                                                                                YES
                                                                            </SelectItem>
                                                                            <SelectItem value="no">
                                                                                NO
                                                                            </SelectItem>
                                                                        </SelectContent>
                                                                    </Select>
                                                                </ReportDetailItem>
                                                                <ReportDetailItem label="Transportation">
                                                                    <Select
                                                                        value={
                                                                            (transportByUser[
                                                                                row
                                                                                    .id
                                                                            ] ??
                                                                            row.avail_transport_from_makati_to_peninsula)
                                                                                ? 'yes'
                                                                                : 'no'
                                                                        }
                                                                        onValueChange={(
                                                                            value,
                                                                        ) => {
                                                                            const currentWelcomeDinner =
                                                                                welcomeDinnerByUser[
                                                                                    row
                                                                                        .id
                                                                                ] ??
                                                                                row.attend_welcome_dinner;
                                                                            const nextTransport =
                                                                                value ===
                                                                                'yes';

                                                                            setTransportByUser(
                                                                                (
                                                                                    prev,
                                                                                ) => ({
                                                                                    ...prev,
                                                                                    [row.id]:
                                                                                        nextTransport,
                                                                                }),
                                                                            );

                                                                            updateWelcomeDinnerPreferences(
                                                                                row.id,
                                                                                currentWelcomeDinner,
                                                                                nextTransport,
                                                                            );
                                                                        }}
                                                                        disabled={
                                                                            Boolean(
                                                                                savingUserIds[
                                                                                    row
                                                                                        .id
                                                                                ],
                                                                            ) ||
                                                                            !(
                                                                                welcomeDinnerByUser[
                                                                                    row
                                                                                        .id
                                                                                ] ??
                                                                                row.attend_welcome_dinner
                                                                            )
                                                                        }
                                                                    >
                                                                        <SelectTrigger className="h-8 w-[90px]">
                                                                            <SelectValue />
                                                                        </SelectTrigger>
                                                                        <SelectContent>
                                                                            <SelectItem value="yes">
                                                                                YES
                                                                            </SelectItem>
                                                                            <SelectItem value="no">
                                                                                NO
                                                                            </SelectItem>
                                                                        </SelectContent>
                                                                    </Select>
                                                                </ReportDetailItem>
                                                                <ReportDetailItem label="Table Assignment">
                                                                    {getTableAssignment(
                                                                        row,
                                                                        selectedEventId,
                                                                    ) ?? '-'}
                                                                </ReportDetailItem>
                                                                <ReportDetailItem label="Vehicle Assignment">
                                                                    {getVehicleAssignment(
                                                                        row,
                                                                        selectedEventId,
                                                                    ) ?? '-'}
                                                                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                                                        Plate:{' '}
                                                                        {getVehiclePlateNumber(
                                                                            row,
                                                                            selectedEventId,
                                                                        ) ??
                                                                            '-'}
                                                                    </p>
                                                                </ReportDetailItem>
                                                                <ReportDetailItem label="Notification">
                                                                    <Button
                                                                        type="button"
                                                                        size="sm"
                                                                        variant="outline"
                                                                        onClick={() =>
                                                                            handleSendNotification(
                                                                                row,
                                                                            )
                                                                        }
                                                                        disabled={
                                                                            disableNotificationButton
                                                                        }
                                                                        className={cn(
                                                                            notificationSentAt
                                                                                ? 'border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700 hover:text-white'
                                                                                : '',
                                                                        )}
                                                                    >
                                                                        {sendingNotificationByUser[
                                                                            row
                                                                                .id
                                                                        ]
                                                                            ? 'Sending...'
                                                                            : 'Email'}
                                                                    </Button>
                                                                    {notificationSentAt ? (
                                                                        <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-300">
                                                                            Sent:{' '}
                                                                            {formatDateTime(
                                                                                notificationSentAt,
                                                                            )}
                                                                        </p>
                                                                    ) : null}
                                                                </ReportDetailItem>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            ) : null}
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="px-3 py-8 text-center text-sm text-slate-500">
                                    No participants found.
                                </div>
                            )}
                        </div>

                        <div className="hidden overflow-hidden rounded-md border sm:block">
                            <Table className="w-full table-fixed">
                                <TableHeader>
                                    <TableRow>
                                        {isAsemme10Selected ? (
                                            <>
                                                <TableHead className="hidden w-14 sm:table-cell">
                                                    Seq
                                                </TableHead>
                                                <TableHead>
                                                    Participant
                                                </TableHead>
                                                <TableHead className="hidden md:table-cell">
                                                    Country
                                                </TableHead>
                                                <TableHead className="hidden lg:table-cell">
                                                    Registration Type
                                                </TableHead>
                                                <TableHead className="hidden lg:table-cell">
                                                    Role
                                                </TableHead>
                                                <TableHead className="hidden sm:table-cell">
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        className="-ml-3 h-8 gap-1 px-3 font-semibold"
                                                        onClick={() =>
                                                            setCheckinSort(
                                                                (prev) =>
                                                                    prev ===
                                                                    'desc'
                                                                        ? 'asc'
                                                                        : 'desc',
                                                            )
                                                        }
                                                    >
                                                        Check-in
                                                        <ArrowUpDown className="h-3.5 w-3.5" />
                                                        <span className="text-[11px] text-slate-500">
                                                            {checkinSort ===
                                                            'desc'
                                                                ? 'Newest'
                                                                : 'Oldest'}
                                                        </span>
                                                    </Button>
                                                </TableHead>
                                                <TableHead className="hidden w-20 text-right sm:table-cell sm:w-32">
                                                    Details
                                                </TableHead>
                                            </>
                                        ) : (
                                            <>
                                                <TableHead className="hidden w-14 sm:table-cell">
                                                    Seq
                                                </TableHead>
                                                <TableHead>Name</TableHead>
                                                <TableHead className="hidden md:table-cell">
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        className="-ml-3 h-8 gap-1 px-3 font-semibold"
                                                        onClick={() =>
                                                            setRegistrantTypeSort(
                                                                (prev) =>
                                                                    prev ===
                                                                    'none'
                                                                        ? 'asc'
                                                                        : prev ===
                                                                            'asc'
                                                                          ? 'desc'
                                                                          : 'none',
                                                            )
                                                        }
                                                    >
                                                        Registrant Type
                                                        <ArrowUpDown className="h-3.5 w-3.5" />
                                                        <span className="text-[11px] text-slate-500">
                                                            {registrantTypeSort ===
                                                            'none'
                                                                ? 'Default'
                                                                : registrantTypeSort ===
                                                                    'asc'
                                                                  ? 'A-Z'
                                                                  : 'Z-A'}
                                                        </span>
                                                    </Button>
                                                </TableHead>
                                                <TableHead className="hidden sm:table-cell">
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        className="-ml-3 h-8 gap-1 px-3 font-semibold"
                                                        onClick={() =>
                                                            setCheckinSort(
                                                                (prev) =>
                                                                    prev ===
                                                                    'desc'
                                                                        ? 'asc'
                                                                        : 'desc',
                                                            )
                                                        }
                                                    >
                                                        Check-in (Date and Time)
                                                        <ArrowUpDown className="h-3.5 w-3.5" />
                                                        <span className="text-[11px] text-slate-500">
                                                            {checkinSort ===
                                                            'desc'
                                                                ? 'Newest'
                                                                : 'Oldest'}
                                                        </span>
                                                    </Button>
                                                </TableHead>
                                                <TableHead className="hidden w-20 text-right sm:table-cell sm:w-32">
                                                    Details
                                                </TableHead>
                                            </>
                                        )}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {paginatedRows.length ? (
                                        paginatedRows.map((row, index) => {
                                            const scannedAt = getCheckinTime(
                                                row,
                                                selectedEventId,
                                            );
                                            const hasCheckin =
                                                Boolean(scannedAt);
                                            const notificationEventId =
                                                getNotificationEventId(row);
                                            const notificationSentAt =
                                                notificationEventId
                                                    ? notificationSentAtByAssignment[
                                                          getNotificationSentAtKey(
                                                              row.id,
                                                              notificationEventId,
                                                          )
                                                      ]
                                                    : null;
                                            const hasAnyNotificationSentAt =
                                                Object.entries(
                                                    notificationSentAtByAssignment,
                                                ).some(
                                                    ([assignmentKey, sentAt]) =>
                                                        assignmentKey.startsWith(
                                                            `${row.id}:`,
                                                        ) && Boolean(sentAt),
                                                );
                                            const disableNotificationButton =
                                                Boolean(
                                                    sendingNotificationByUser[
                                                        row.id
                                                    ],
                                                ) ||
                                                !notificationEventId ||
                                                (!selectedEventId &&
                                                    hasAnyNotificationSentAt);
                                            const isExpanded =
                                                expandedRowIds.has(row.id);
                                            const seq =
                                                (currentPage - 1) *
                                                    entriesPerPage +
                                                index +
                                                1;

                                            if (isAsemme10Selected) {
                                                const registration =
                                                    getAsemme10Registration(
                                                        row,
                                                        selectedEventId,
                                                    );

                                                return (
                                                    <React.Fragment
                                                        key={row.id}
                                                    >
                                                        <TableRow
                                                            className={cn(
                                                                'align-top',
                                                                isExpanded &&
                                                                    'border-b-0',
                                                            )}
                                                        >
                                                            <TableCell className="hidden sm:table-cell">
                                                                {seq}
                                                            </TableCell>
                                                            <TableCell className="px-2 py-3 sm:px-4">
                                                                <div className="flex min-w-0 items-start gap-2">
                                                                    <div className="min-w-0 flex-1">
                                                                        <p className="font-medium break-words text-slate-900 dark:text-slate-100">
                                                                            {displayAsemme10Name(
                                                                                row,
                                                                                registration,
                                                                            )}
                                                                        </p>
                                                                        <p className="text-xs break-all text-slate-500 dark:text-slate-400">
                                                                            ID:{' '}
                                                                            {row.display_id ??
                                                                                row.id}
                                                                        </p>
                                                                        <div className="mt-2 sm:hidden">
                                                                            {hasCheckin ? (
                                                                                <div className="flex flex-col gap-1">
                                                                                    <Badge className="w-fit bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                                                                                        Checked
                                                                                        In
                                                                                    </Badge>
                                                                                    <span className="text-xs break-words text-slate-600 dark:text-slate-300">
                                                                                        {formatDateTime(
                                                                                            scannedAt,
                                                                                        )}
                                                                                    </span>
                                                                                </div>
                                                                            ) : (
                                                                                <Badge className="bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300">
                                                                                    Did
                                                                                    Not
                                                                                    Join
                                                                                </Badge>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                    <Button
                                                                        type="button"
                                                                        variant="outline"
                                                                        size="sm"
                                                                        className="ml-auto h-8 w-[72px] shrink-0 justify-center gap-1 px-2 text-xs sm:hidden"
                                                                        aria-expanded={
                                                                            isExpanded
                                                                        }
                                                                        onClick={() =>
                                                                            toggleExpandedRow(
                                                                                row.id,
                                                                            )
                                                                        }
                                                                    >
                                                                        <ChevronDown
                                                                            className={cn(
                                                                                'h-3.5 w-3.5 transition-transform',
                                                                                isExpanded &&
                                                                                    'rotate-180',
                                                                            )}
                                                                        />
                                                                        {isExpanded
                                                                            ? 'Less'
                                                                            : 'More'}
                                                                    </Button>
                                                                </div>
                                                            </TableCell>
                                                            <TableCell className="hidden break-words md:table-cell">
                                                                {row.country_name ??
                                                                    '-'}
                                                            </TableCell>
                                                            <TableCell className="hidden break-words lg:table-cell">
                                                                {registration?.registration_type ??
                                                                    '-'}
                                                            </TableCell>
                                                            <TableCell className="hidden break-words lg:table-cell">
                                                                {displayAsemme10Role(
                                                                    registration?.role,
                                                                )}
                                                            </TableCell>
                                                            <TableCell className="hidden px-2 py-3 sm:table-cell sm:px-4">
                                                                {hasCheckin ? (
                                                                    <div className="flex flex-col gap-1">
                                                                        <Badge className="w-fit bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                                                                            Checked
                                                                            In
                                                                        </Badge>
                                                                        <span className="text-xs break-words text-slate-600 dark:text-slate-300">
                                                                            {formatDateTime(
                                                                                scannedAt,
                                                                            )}
                                                                        </span>
                                                                    </div>
                                                                ) : (
                                                                    <Badge className="bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300">
                                                                        Did Not
                                                                        Join
                                                                    </Badge>
                                                                )}
                                                            </TableCell>
                                                            <TableCell className="hidden px-2 py-3 text-right sm:table-cell sm:px-4">
                                                                <Button
                                                                    type="button"
                                                                    variant="outline"
                                                                    size="sm"
                                                                    className="h-8 gap-1 px-2 text-xs sm:px-3"
                                                                    aria-expanded={
                                                                        isExpanded
                                                                    }
                                                                    onClick={() =>
                                                                        toggleExpandedRow(
                                                                            row.id,
                                                                        )
                                                                    }
                                                                >
                                                                    <ChevronDown
                                                                        className={cn(
                                                                            'h-3.5 w-3.5 transition-transform',
                                                                            isExpanded &&
                                                                                'rotate-180',
                                                                        )}
                                                                    />
                                                                    {isExpanded
                                                                        ? 'Collapse'
                                                                        : 'View all'}
                                                                </Button>
                                                            </TableCell>
                                                        </TableRow>
                                                        {isExpanded ? (
                                                            <TableRow className="border-b bg-slate-50/50 dark:bg-slate-900/20">
                                                                <TableCell
                                                                    colSpan={7}
                                                                    className="px-3 py-3 sm:px-6"
                                                                >
                                                                    <div className="grid gap-x-5 gap-y-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                                                                        <ReportDetailItem label="Badge Name">
                                                                            {registration?.badge_name ??
                                                                                '-'}
                                                                        </ReportDetailItem>
                                                                        <ReportDetailItem label="Organization">
                                                                            {registration?.organization_name ??
                                                                                row.organization_name ??
                                                                                '-'}
                                                                        </ReportDetailItem>
                                                                        <ReportDetailItem label="Position">
                                                                            {registration?.position_title ??
                                                                                '-'}
                                                                        </ReportDetailItem>
                                                                        <ReportDetailItem label="Email">
                                                                            {registration?.email ??
                                                                                '-'}
                                                                        </ReportDetailItem>
                                                                        <ReportDetailItem label="Dietary Requirements">
                                                                            {registration?.dietary_requirements ??
                                                                                '-'}
                                                                        </ReportDetailItem>
                                                                        <ReportDetailItem label="Mobility or Special Needs">
                                                                            {registration?.mobility_or_special_needs ??
                                                                                '-'}
                                                                        </ReportDetailItem>
                                                                        <ReportDetailItem label="Focal Person">
                                                                            {registration?.focal_name ??
                                                                                '-'}
                                                                        </ReportDetailItem>
                                                                        <ReportDetailItem label="Focal Email">
                                                                            {registration?.focal_email ??
                                                                                '-'}
                                                                        </ReportDetailItem>
                                                                        <ReportDetailItem label="Focal Phone">
                                                                            {registration?.focal_phone ??
                                                                                '-'}
                                                                        </ReportDetailItem>
                                                                    </div>
                                                                </TableCell>
                                                            </TableRow>
                                                        ) : null}
                                                    </React.Fragment>
                                                );
                                            }

                                            return (
                                                <React.Fragment key={row.id}>
                                                    <TableRow
                                                        className={cn(
                                                            'align-top',
                                                            isExpanded &&
                                                                'border-b-0',
                                                        )}
                                                    >
                                                        <TableCell className="hidden sm:table-cell">
                                                            {seq}
                                                        </TableCell>
                                                        <TableCell className="px-2 py-3 sm:px-4">
                                                            <div className="flex w-full min-w-0 items-start justify-between gap-2 sm:block">
                                                                <div className="min-w-0 flex-1">
                                                                    <p className="font-medium break-words text-slate-900 dark:text-slate-100">
                                                                        {buildDisplayName(
                                                                            row,
                                                                        )}
                                                                    </p>
                                                                    <p className="text-xs break-words text-slate-500 dark:text-slate-400">
                                                                        {row.country_name ??
                                                                            '-'}
                                                                    </p>
                                                                    <p className="mt-1 text-xs break-words text-slate-500 md:hidden dark:text-slate-400">
                                                                        {displayRegistrantType(
                                                                            row,
                                                                        )}
                                                                    </p>
                                                                    <div className="mt-2 sm:hidden">
                                                                        {hasCheckin ? (
                                                                            <div className="flex flex-col gap-1">
                                                                                <Badge className="w-fit bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                                                                                    Checked
                                                                                    In
                                                                                </Badge>
                                                                                <span className="text-xs break-words text-slate-600 dark:text-slate-300">
                                                                                    {formatDateTime(
                                                                                        scannedAt,
                                                                                    )}
                                                                                </span>
                                                                            </div>
                                                                        ) : (
                                                                            <Badge className="bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300">
                                                                                Did
                                                                                Not
                                                                                Join
                                                                            </Badge>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                <Button
                                                                    type="button"
                                                                    variant="outline"
                                                                    size="sm"
                                                                    className="ml-auto h-8 w-[72px] shrink-0 justify-center gap-1 px-2 text-xs sm:hidden"
                                                                    aria-expanded={
                                                                        isExpanded
                                                                    }
                                                                    onClick={() =>
                                                                        toggleExpandedRow(
                                                                            row.id,
                                                                        )
                                                                    }
                                                                >
                                                                    <ChevronDown
                                                                        className={cn(
                                                                            'h-3.5 w-3.5 transition-transform',
                                                                            isExpanded &&
                                                                                'rotate-180',
                                                                        )}
                                                                    />
                                                                    {isExpanded
                                                                        ? 'Less'
                                                                        : 'More'}
                                                                </Button>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="hidden break-words md:table-cell">
                                                            {displayRegistrantType(
                                                                row,
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="hidden px-2 py-3 sm:table-cell sm:px-4">
                                                            {hasCheckin ? (
                                                                <div className="flex flex-col gap-1">
                                                                    <Badge className="w-fit bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                                                                        Checked
                                                                        In
                                                                    </Badge>
                                                                    <span className="text-xs break-words text-slate-600 dark:text-slate-300">
                                                                        {formatDateTime(
                                                                            scannedAt,
                                                                        )}
                                                                    </span>
                                                                </div>
                                                            ) : (
                                                                <Badge className="bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300">
                                                                    Did Not Join
                                                                </Badge>
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="hidden px-2 py-3 text-right sm:table-cell sm:px-4">
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                size="sm"
                                                                className="h-8 gap-1 px-2 text-xs sm:px-3"
                                                                aria-expanded={
                                                                    isExpanded
                                                                }
                                                                onClick={() =>
                                                                    toggleExpandedRow(
                                                                        row.id,
                                                                    )
                                                                }
                                                            >
                                                                <ChevronDown
                                                                    className={cn(
                                                                        'h-3.5 w-3.5 transition-transform',
                                                                        isExpanded &&
                                                                            'rotate-180',
                                                                    )}
                                                                />
                                                                {isExpanded
                                                                    ? 'Collapse'
                                                                    : 'View all'}
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                    {isExpanded ? (
                                                        <TableRow className="border-b bg-slate-50/50 dark:bg-slate-900/20">
                                                            <TableCell
                                                                colSpan={5}
                                                                className="px-3 py-3 sm:px-6"
                                                            >
                                                                <div className="grid gap-x-5 gap-y-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                                                                    <ReportDetailItem label="Organization">
                                                                        {row.organization_name ??
                                                                            '-'}
                                                                    </ReportDetailItem>
                                                                    <ReportDetailItem label="Welcome Dinner">
                                                                        <Select
                                                                            value={
                                                                                (welcomeDinnerByUser[
                                                                                    row
                                                                                        .id
                                                                                ] ??
                                                                                row.attend_welcome_dinner)
                                                                                    ? 'yes'
                                                                                    : 'no'
                                                                            }
                                                                            onValueChange={(
                                                                                value,
                                                                            ) => {
                                                                                const nextWelcomeDinner =
                                                                                    value ===
                                                                                    'yes';
                                                                                const currentTransport =
                                                                                    transportByUser[
                                                                                        row
                                                                                            .id
                                                                                    ] ??
                                                                                    row.avail_transport_from_makati_to_peninsula;
                                                                                const nextTransport =
                                                                                    nextWelcomeDinner
                                                                                        ? currentTransport
                                                                                        : false;

                                                                                setWelcomeDinnerByUser(
                                                                                    (
                                                                                        prev,
                                                                                    ) => ({
                                                                                        ...prev,
                                                                                        [row.id]:
                                                                                            nextWelcomeDinner,
                                                                                    }),
                                                                                );
                                                                                setTransportByUser(
                                                                                    (
                                                                                        prev,
                                                                                    ) => ({
                                                                                        ...prev,
                                                                                        [row.id]:
                                                                                            nextTransport,
                                                                                    }),
                                                                                );

                                                                                updateWelcomeDinnerPreferences(
                                                                                    row.id,
                                                                                    nextWelcomeDinner,
                                                                                    nextTransport,
                                                                                );
                                                                            }}
                                                                            disabled={Boolean(
                                                                                savingUserIds[
                                                                                    row
                                                                                        .id
                                                                                ],
                                                                            )}
                                                                        >
                                                                            <SelectTrigger className="h-8 w-[90px]">
                                                                                <SelectValue />
                                                                            </SelectTrigger>
                                                                            <SelectContent>
                                                                                <SelectItem value="yes">
                                                                                    YES
                                                                                </SelectItem>
                                                                                <SelectItem value="no">
                                                                                    NO
                                                                                </SelectItem>
                                                                            </SelectContent>
                                                                        </Select>
                                                                    </ReportDetailItem>
                                                                    <ReportDetailItem label="Transportation">
                                                                        <Select
                                                                            value={
                                                                                (transportByUser[
                                                                                    row
                                                                                        .id
                                                                                ] ??
                                                                                row.avail_transport_from_makati_to_peninsula)
                                                                                    ? 'yes'
                                                                                    : 'no'
                                                                            }
                                                                            onValueChange={(
                                                                                value,
                                                                            ) => {
                                                                                const currentWelcomeDinner =
                                                                                    welcomeDinnerByUser[
                                                                                        row
                                                                                            .id
                                                                                    ] ??
                                                                                    row.attend_welcome_dinner;
                                                                                const nextTransport =
                                                                                    value ===
                                                                                    'yes';

                                                                                setTransportByUser(
                                                                                    (
                                                                                        prev,
                                                                                    ) => ({
                                                                                        ...prev,
                                                                                        [row.id]:
                                                                                            nextTransport,
                                                                                    }),
                                                                                );

                                                                                updateWelcomeDinnerPreferences(
                                                                                    row.id,
                                                                                    currentWelcomeDinner,
                                                                                    nextTransport,
                                                                                );
                                                                            }}
                                                                            disabled={
                                                                                Boolean(
                                                                                    savingUserIds[
                                                                                        row
                                                                                            .id
                                                                                    ],
                                                                                ) ||
                                                                                !(
                                                                                    welcomeDinnerByUser[
                                                                                        row
                                                                                            .id
                                                                                    ] ??
                                                                                    row.attend_welcome_dinner
                                                                                )
                                                                            }
                                                                        >
                                                                            <SelectTrigger className="h-8 w-[90px]">
                                                                                <SelectValue />
                                                                            </SelectTrigger>
                                                                            <SelectContent>
                                                                                <SelectItem value="yes">
                                                                                    YES
                                                                                </SelectItem>
                                                                                <SelectItem value="no">
                                                                                    NO
                                                                                </SelectItem>
                                                                            </SelectContent>
                                                                        </Select>
                                                                    </ReportDetailItem>
                                                                    <ReportDetailItem label="Table Assignment">
                                                                        {getTableAssignment(
                                                                            row,
                                                                            selectedEventId,
                                                                        ) ??
                                                                            '-'}
                                                                    </ReportDetailItem>
                                                                    <ReportDetailItem label="Vehicle Assignment">
                                                                        {getVehicleAssignment(
                                                                            row,
                                                                            selectedEventId,
                                                                        ) ??
                                                                            '-'}
                                                                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                                                            Plate:{' '}
                                                                            {getVehiclePlateNumber(
                                                                                row,
                                                                                selectedEventId,
                                                                            ) ??
                                                                                '-'}
                                                                        </p>
                                                                    </ReportDetailItem>
                                                                    <ReportDetailItem label="Notification">
                                                                        <Button
                                                                            type="button"
                                                                            size="sm"
                                                                            variant="outline"
                                                                            onClick={() =>
                                                                                handleSendNotification(
                                                                                    row,
                                                                                )
                                                                            }
                                                                            disabled={
                                                                                disableNotificationButton
                                                                            }
                                                                            className={cn(
                                                                                notificationSentAt
                                                                                    ? 'border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700 hover:text-white'
                                                                                    : '',
                                                                            )}
                                                                        >
                                                                            {sendingNotificationByUser[
                                                                                row
                                                                                    .id
                                                                            ]
                                                                                ? 'Sending...'
                                                                                : 'Email'}
                                                                        </Button>
                                                                        {notificationSentAt ? (
                                                                            <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-300">
                                                                                Sent:{' '}
                                                                                {formatDateTime(
                                                                                    notificationSentAt,
                                                                                )}
                                                                            </p>
                                                                        ) : null}
                                                                    </ReportDetailItem>
                                                                </div>
                                                            </TableCell>
                                                        </TableRow>
                                                    ) : null}
                                                </React.Fragment>
                                            );
                                        })
                                    ) : (
                                        <TableRow>
                                            <TableCell
                                                colSpan={
                                                    isAsemme10Selected ? 7 : 5
                                                }
                                                className="text-center text-slate-500"
                                            >
                                                No participants found.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>

                        <div className="flex flex-col items-center justify-between gap-3 text-sm text-slate-600 md:flex-row dark:text-slate-300">
                            <div className="flex flex-col items-center gap-2 sm:flex-row">
                                <div className="flex items-center gap-2">
                                    <span>Show entries</span>
                                    <Select
                                        value={String(entriesPerPage)}
                                        onValueChange={(value) =>
                                            setEntriesPerPage(Number(value))
                                        }
                                    >
                                        <SelectTrigger className="h-8 w-[90px]">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {PAGE_SIZE_OPTIONS.map((size) => (
                                                <SelectItem
                                                    key={size}
                                                    value={String(size)}
                                                >
                                                    {size}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <p>
                                    Showing{' '}
                                    {(currentPage - 1) * entriesPerPage +
                                        (paginatedRows.length ? 1 : 0)}{' '}
                                    to{' '}
                                    {(currentPage - 1) * entriesPerPage +
                                        paginatedRows.length}{' '}
                                    of {sortedRows.length} entries
                                </p>
                            </div>

                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={currentPage === 1}
                                    onClick={() =>
                                        setCurrentPage((page) =>
                                            Math.max(1, page - 1),
                                        )
                                    }
                                >
                                    Previous
                                </Button>
                                <span>
                                    Page {currentPage} of {totalPages}
                                </span>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={currentPage === totalPages}
                                    onClick={() =>
                                        setCurrentPage((page) =>
                                            Math.min(totalPages, page + 1),
                                        )
                                    }
                                >
                                    Next
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
