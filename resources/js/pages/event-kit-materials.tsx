import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import printJS from '@/lib/print-js';

import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import PublicLayout from '@/layouts/public-layout';
import {
    buildCertificatePrintBody,
    CERTIFICATE_PRINT_STYLES,
} from '@/lib/certificates';
import { cn } from '@/lib/utils';
import { Head, useForm, usePage } from '@inertiajs/react';
import {
    ArrowRight,
    CalendarDays,
    ChevronDown,
    Download,
    FileText,
    MapPin,
    Medal,
    RotateCcw,
    ShieldCheck,
} from 'lucide-react';
import * as React from 'react';
import { toast } from 'sonner';

type Programme = {
    id: number;
    title: string;
    description: string;
    starts_at: string | null;
    ends_at: string | null;
    location: string | null;
    image_url: string | null;
    pdf_url: string | null;
    materials: {
        id: number;
        file_name: string;
        file_path: string;
        file_type: string | null;
    }[];
    signatory_name: string | null;
    signatory_title: string | null;
    signatory_signature_url: string | null;
};

type Participant = {
    id: number;
    name: string;
    email: string;
    display_id: string;
};

type Attendance = {
    scanned_at: string | null;
} | null;

type PageProps = {
    participant: Participant;
    programme: Programme;
    attendance: Attendance;
    checked_in_programmes: Programme[];
};

function resolvePdfUrl(pdfUrl?: string | null) {
    if (!pdfUrl) return null;
    if (pdfUrl.startsWith('http') || pdfUrl.startsWith('/')) return pdfUrl;
    return `/downloadables/${pdfUrl}`;
}

function resolveMaterialUrl(filePath?: string | null) {
    if (!filePath) return null;
    if (filePath.startsWith('http') || filePath.startsWith('/'))
        return filePath;
    return `/event-materials/${filePath}`;
}

function resolveSignatureUrl(signatureUrl?: string | null) {
    if (!signatureUrl) return null;
    if (signatureUrl.startsWith('http') || signatureUrl.startsWith('/'))
        return signatureUrl;
    return `/signatures/${signatureUrl}`;
}

function formatEventWindow(startsAt?: string | null, endsAt?: string | null) {
    if (!startsAt) return 'Date TBD';
    const start = new Date(startsAt);
    const end = endsAt ? new Date(endsAt) : null;

    const dateFmt = new Intl.DateTimeFormat('en-PH', {
        month: 'short',
        day: '2-digit',
        year: 'numeric',
    });
    const timeFmt = new Intl.DateTimeFormat('en-PH', {
        hour: 'numeric',
        minute: '2-digit',
    });

    const date = dateFmt.format(start);
    const startTime = timeFmt.format(start);

    if (!end) return `${date} • ${startTime}`;

    const sameDay =
        start.getFullYear() === end.getFullYear() &&
        start.getMonth() === end.getMonth() &&
        start.getDate() === end.getDate();

    const endTime = timeFmt.format(end);
    if (sameDay) return `${date} • ${startTime}–${endTime}`;

    return `${dateFmt.format(start)} ${startTime} → ${dateFmt.format(end)} ${timeFmt.format(end)}`;
}

function formatDateRange(startsAt?: string | null, endsAt?: string | null) {
    if (!startsAt) return '—';
    const start = new Date(startsAt);
    if (Number.isNaN(start.getTime())) return '—';
    const end = endsAt ? new Date(endsAt) : null;
    const sameDay =
        end &&
        !Number.isNaN(end.getTime()) &&
        start.toDateString() === end.toDateString();
    const date = new Intl.DateTimeFormat('en-PH', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
    }).format(start);
    if (!end || Number.isNaN(end.getTime()) || sameDay) return date;

    const endDate = new Intl.DateTimeFormat('en-PH', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
    }).format(end);
    return `${date} – ${endDate}`;
}

function formatGivenDate(startsAt?: string | null) {
    if (!startsAt) return '—';
    const start = new Date(startsAt);
    if (Number.isNaN(start.getTime())) return '—';
    return new Intl.DateTimeFormat('en-PH', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
    }).format(start);
}

export default function EventKitMaterials() {
    const { participant, programme, attendance, checked_in_programmes } =
        usePage<PageProps>().props;

    const resetForm = useForm({});
    const selectForm = useForm({ programme_id: programme.id });

    const [open, setOpen] = React.useState(false);

    const hasAttendance = Boolean(attendance?.scanned_at);
    const pdfUrl = resolvePdfUrl(programme.pdf_url);
    const signatorySignatureUrl = resolveSignatureUrl(
        programme.signatory_signature_url,
    );

    const materials = programme.materials.map((material) => ({
        ...material,
        url: resolveMaterialUrl(material.file_path),
    }));

    const selectedProgramme =
        checked_in_programmes.find((item) => item.id === programme.id) ?? null;

    const eventDate = formatDateRange(programme.starts_at, programme.ends_at);
    const givenDateLabel = formatGivenDate(
        programme.ends_at ?? programme.starts_at,
    );
    const venue = programme.location || '—';

    const handlePrint = () => {
        if (!hasAttendance) return;

        const html = buildCertificatePrintBody({
            data: {
                eventName: programme.title,
                eventDate,
                givenDate: givenDateLabel,
                venue,
                signatoryName:
                    programme.signatory_name ?? '',
                signatoryTitle: programme.signatory_title ?? '',
                signatorySignature: signatorySignatureUrl,
            },
            participants: [{ name: participant.name }],
        });

        if (!html.trim()) return;

        printJS({
            printable: html,
            type: 'raw-html',
            style: CERTIFICATE_PRINT_STYLES,
            documentTitle: 'Certificate',
        });
    };


    return (
        <>
            <Head title="Event Kit Materials" />
            <PublicLayout navActive="/event">
                <section className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
                    {/* Header */}
                    <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-start">
                        <div className="min-w-0">
                            <Badge variant="outline">Event Kit</Badge>
                            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-balance text-slate-900 sm:text-3xl dark:text-slate-100">
                                Event kit & certificates
                            </h1>
                            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                                Download event materials and access your
                                certificates if you checked in.
                            </p>
                        </div>

                        <Card className="w-full border-slate-200/70 bg-white/70 px-4 py-3 text-xs text-slate-600 shadow-sm md:w-[320px] dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-300">
                            <div className="truncate font-semibold text-slate-900 dark:text-slate-100">
                                {participant.name}
                            </div>
                            <div className="truncate">
                                {participant.display_id}
                            </div>
                            <div className="truncate text-slate-500 dark:text-slate-400">
                                {participant.email}
                            </div>
                        </Card>
                    </div>

                    {/* Event selector */}
                    {checked_in_programmes.length ? (
                        <Card className="mt-5 border-slate-200/70 bg-white/70 p-4 sm:p-5 dark:border-slate-800 dark:bg-slate-950/40">
                            <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
                                <div className="min-w-0">
                                    <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                        Choose a checked-in event
                                    </div>
                                    <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                                        Filter the Event Kit materials and
                                        certificates by your checked-in events.
                                    </p>
                                </div>

                                <Popover open={open} onOpenChange={setOpen}>
                                    <PopoverTrigger asChild>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            className={cn(
                                                'h-10 w-full max-w-full min-w-0 justify-between overflow-hidden rounded-xl border-slate-200 bg-white/80 text-left dark:border-slate-700 dark:bg-slate-900/60',
                                                'md:w-[360px]',
                                            )}
                                        >
                                            <span className="block min-w-0 flex-1 truncate pr-2">
                                                {selectedProgramme
                                                    ? selectedProgramme.title
                                                    : 'Select event'}
                                            </span>
                                            <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
                                        </Button>
                                    </PopoverTrigger>

                                    <PopoverContent
                                        className="w-[min(100vw-2rem,var(--radix-popover-trigger-width))] max-w-[min(100vw-2rem,var(--radix-popover-trigger-width))] p-0"
                                        align="start"
                                    >
                                        <Command>
                                            <CommandInput
                                                placeholder="Search events..."
                                                className="h-10"
                                            />
                                            <CommandList className="max-h-[60vh] overflow-auto">
                                                <CommandEmpty>
                                                    No events found.
                                                </CommandEmpty>
                                                <CommandGroup>
                                                    {checked_in_programmes.map(
                                                        (item) => (
                                                            <CommandItem
                                                                key={item.id}
                                                                value={
                                                                    item.title
                                                                }
                                                                onSelect={() => {
                                                                    selectForm.setData(
                                                                        'programme_id',
                                                                        item.id,
                                                                    );
                                                                    selectForm.post(
                                                                        '/event-kit/select-programme',
                                                                        {
                                                                            preserveScroll: true,
                                                                            onSuccess:
                                                                                () =>
                                                                                    toast.success(
                                                                                        'Event updated.',
                                                                                    ),
                                                                            onError:
                                                                                () =>
                                                                                    toast.error(
                                                                                        'Unable to switch event.',
                                                                                    ),
                                                                        },
                                                                    );
                                                                    setOpen(
                                                                        false,
                                                                    );
                                                                }}
                                                            >
                                                                <div className="flex min-w-0 flex-col gap-1">
                                                                    <span className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                                                                        {
                                                                            item.title
                                                                        }
                                                                    </span>
                                                                    <span className="truncate text-xs text-slate-500 dark:text-slate-400">
                                                                        {formatEventWindow(
                                                                            item.starts_at,
                                                                            item.ends_at,
                                                                        )}
                                                                    </span>
                                                                </div>
                                                            </CommandItem>
                                                        ),
                                                    )}
                                                </CommandGroup>
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                            </div>
                        </Card>
                    ) : null}

                    {/* Main content */}
                    <div className="mt-5 grid gap-4 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
                        {/* Left: Event + materials */}
                        <Card className="border-slate-200/70 bg-white/70 p-4 sm:p-6 dark:border-slate-800 dark:bg-slate-950/40">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                <div className="min-w-0">
                                    <h2 className="text-base font-semibold text-slate-900 sm:text-lg dark:text-slate-100">
                                        <span className="block break-words">
                                            {programme.title}
                                        </span>
                                    </h2>

                                    <p className="mt-1 text-xs leading-relaxed text-slate-600 sm:text-sm dark:text-slate-300">
                                        {programme.description}
                                    </p>

                                    <div className="mt-3 flex flex-col gap-2 text-xs text-slate-600 dark:text-slate-300">
                                        <span className="inline-flex items-center gap-2">
                                            <CalendarDays className="h-4 w-4 shrink-0 text-[#0033A0]" />
                                            <span className="min-w-0 truncate">
                                                {formatEventWindow(
                                                    programme.starts_at,
                                                    programme.ends_at,
                                                )}
                                            </span>
                                        </span>

                                        {programme.location ? (
                                            <span className="inline-flex items-center gap-2">
                                                <MapPin className="h-4 w-4 shrink-0 text-[#0033A0]" />
                                                <span className="min-w-0 break-words">
                                                    {programme.location}
                                                </span>
                                            </span>
                                        ) : null}
                                    </div>
                                </div>

                                <Badge
                                    variant="outline"
                                    className={cn(
                                        'w-fit self-start rounded-xl px-2.5 py-1',
                                        'border-emerald-200 bg-emerald-50 text-emerald-700',
                                        !hasAttendance &&
                                        'border-rose-200 bg-rose-50 text-rose-600',
                                    )}
                                >
                                    {hasAttendance
                                        ? 'Checked in'
                                        : 'No attendance recorded'}
                                </Badge>
                            </div>

                            {attendance?.scanned_at ? (
                                <div className="mt-3 text-xs text-emerald-600">
                                    Attendance scanned:{' '}
                                    {new Date(
                                        attendance.scanned_at,
                                    ).toLocaleString('en-PH')}
                                </div>
                            ) : null}

                            <div className="mt-5 border-t border-slate-200/60 pt-4 sm:mt-6 sm:pt-5 dark:border-slate-800">
                                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                                    <Download className="h-4 w-4 text-[#0033A0]" />
                                    Event Kit (Materials)
                                </div>
                                <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">
                                    Download the official event materials and
                                    guide for this programme.
                                </p>

                                <div className="mt-4 space-y-2">
                                    {pdfUrl ? (
                                        <Button
                                            asChild
                                            className="h-10 w-full rounded-xl bg-[#0033A0] text-white hover:bg-[#0033A0]/90 sm:w-auto"
                                        >
                                            <a
                                                href={pdfUrl}
                                                target="_blank"
                                                rel="noreferrer"
                                            >
                                                Download event guide
                                                <ArrowRight className="ml-2 h-4 w-4" />
                                            </a>
                                        </Button>
                                    ) : null}

                                    {materials.length ? (
                                        <div className="space-y-2">
                                            {materials.map((material) => (
                                                <div
                                                    key={material.id}
                                                    className={cn(
                                                        'rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-slate-700',
                                                        'dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-200',
                                                        'flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between',
                                                    )}
                                                >
                                                    <div className="flex min-w-0 items-center gap-2">
                                                        <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                                                            <FileText className="h-4 w-4" />
                                                        </div>

                                                        <div className="min-w-0">
                                                            <div className="line-clamp-2 text-sm font-semibold sm:line-clamp-1">
                                                                {
                                                                    material.file_name
                                                                }
                                                            </div>
                                                            <div className="text-[11px] text-slate-500 dark:text-slate-400">
                                                                {material.file_type?.toUpperCase() ??
                                                                    'FILE'}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {material.url ? (
                                                        <Button
                                                            asChild
                                                            size="sm"
                                                            variant="outline"
                                                            className="h-9 w-full rounded-xl sm:h-8 sm:w-auto"
                                                        >
                                                            <a
                                                                href={
                                                                    material.url
                                                                }
                                                                target="_blank"
                                                                rel="noreferrer"
                                                            >
                                                                Download
                                                            </a>
                                                        </Button>
                                                    ) : null}
                                                </div>
                                            ))}
                                        </div>
                                    ) : !pdfUrl ? (
                                        <p className="text-xs text-slate-500 dark:text-slate-400">
                                            Materials are not available yet.
                                            Please check back later.
                                        </p>
                                    ) : null}
                                </div>
                            </div>
                        </Card>

                        {/* Right: Certificates + reset */}
                        <div className="space-y-4">
                            <Card className="border-slate-200/70 bg-white/70 p-4 sm:p-5 dark:border-slate-800 dark:bg-slate-950/40">
                                <div className="flex items-start gap-3">
                                    <div className="mt-1 rounded-xl bg-emerald-500/10 p-2 text-emerald-600">
                                        <ShieldCheck className="h-5 w-5" />
                                    </div>

                                    <div className="min-w-0">
                                        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                            Certificates
                                        </h3>
                                        <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">
                                            {hasAttendance
                                                ? 'Your attendance has been verified. Download both certificates below.'
                                                : 'Certificates become available after your QR attendance is scanned.'}
                                        </p>
                                    </div>
                                </div>

                                <div
                                    className={cn(
                                        'mt-4 rounded-xl border p-3 text-xs',
                                        hasAttendance
                                            ? 'border-emerald-200 bg-emerald-50/60 text-emerald-700'
                                            : 'border-slate-200 bg-white/70 text-slate-500 dark:border-slate-700 dark:bg-slate-950/40',
                                    )}
                                >
                                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                        <div className="flex min-w-0 items-center gap-2">
                                            <Medal className="h-4 w-4 shrink-0" />
                                            <span className="min-w-0 font-semibold break-words">
                                                Download certificates (appearance
                                                & participation)
                                            </span>
                                        </div>

                                        {hasAttendance ? (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="h-9 w-full rounded-xl sm:h-8 sm:w-auto"
                                                onClick={handlePrint}
                                            >
                                                Print
                                            </Button>
                                        ) : (
                                            <span className="text-[11px]">
                                                Pending attendance
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </Card>

                            <Card className="border-slate-200/70 bg-white/70 p-4 sm:p-5 dark:border-slate-800 dark:bg-slate-950/40">
                                <div className="flex flex-col gap-2 text-xs text-slate-600 sm:flex-row sm:items-center sm:justify-between dark:text-slate-300">
                                    <span>Need to switch participant?</span>

                                    <form
                                        onSubmit={(event) =>
                                            event.preventDefault()
                                        }
                                        className="w-full sm:w-auto"
                                    >
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            className="h-9 w-full rounded-xl sm:h-8 sm:w-auto"
                                            onClick={() =>
                                                resetForm.post(
                                                    '/event-kit/reset',
                                                    {
                                                        preserveScroll: true,
                                                        onSuccess: () =>
                                                            toast.success(
                                                                'Session reset.',
                                                            ),
                                                        onError: () =>
                                                            toast.error(
                                                                'Unable to reset.',
                                                            ),
                                                    },
                                                )
                                            }
                                        >
                                            <RotateCcw className="mr-1 h-3.5 w-3.5" />
                                            Start over
                                        </Button>
                                    </form>
                                </div>
                            </Card>
                        </div>
                    </div>
                </section>
            </PublicLayout>
        </>
    );
}
