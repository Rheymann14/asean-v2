import * as React from 'react';
import AppLayout from '@/layouts/app-layout';
import { Head, router } from '@inertiajs/react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn, toDateOnlyTimestamp } from '@/lib/utils';
import { CalendarDays, ImageOff, MapPin, Search } from 'lucide-react';
import { toast } from 'sonner';

type ProgrammeRow = {
    id: number;
    tag: string | null;
    title: string;
    description: string;
    starts_at: string | null;
    ends_at: string | null;
    location: string | null;
    venue?: {
        name: string;
        address?: string | null;
    } | null;
    image_url: string | null;
    pdf_url: string | null;
    is_active: boolean;
};

type PageProps = {
    programmes?: ProgrammeRow[];
    joined_programme_ids?: number[];
    checked_in_programmes?: {
        programme_id: number;
        scanned_at: string | null;
    }[];
};

type EventPhase = 'ongoing' | 'upcoming' | 'closed';
type TabKey = EventPhase | 'attended' | 'missed';

type EventItem = {
    id: number;
    tag: string;
    title: string;
    description: string;
    startsAt: string;
    endsAt?: string;
    location: string;
    imageUrl?: string | null;
    pdfUrl?: string | null;
    phase: EventPhase;
};

const breadcrumbs = [
    { title: 'Dashboard', href: '/participant-dashboard' },
    { title: 'Event List', href: '/event-list' },
];

function resolveImageUrl(imageUrl?: string | null) {
    if (!imageUrl) return null;
    if (imageUrl.startsWith('http') || imageUrl.startsWith('/')) return imageUrl;
    return `/event-images/${imageUrl}`;
}

function resolvePdfUrl(pdfUrl?: string | null) {
    if (!pdfUrl) return null;
    if (pdfUrl.startsWith('http') || pdfUrl.startsWith('/')) return pdfUrl;
    return `/downloadables/${pdfUrl}`;
}

function useNowTs(intervalMs = 60_000) {
    const [nowTs, setNowTs] = React.useState(() => Date.now());
    React.useEffect(() => {
        const t = window.setInterval(() => setNowTs(Date.now()), intervalMs);
        return () => window.clearInterval(t);
    }, [intervalMs]);
    return nowTs;
}



function formatEventWindow(startsAt: string, endsAt?: string) {
    const start = new Date(startsAt);
    const end = endsAt ? new Date(endsAt) : null;

    const dateFmt = new Intl.DateTimeFormat('en-PH', { month: 'short', day: '2-digit', year: 'numeric' });
    const timeFmt = new Intl.DateTimeFormat('en-PH', { hour: 'numeric', minute: '2-digit' });

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

function getEventPhase(startsAt: string, endsAt: string | undefined, nowTs: number): EventPhase {
    const start = new Date(startsAt);
    const end = endsAt ? new Date(endsAt) : null;
    const nowDateTs = toDateOnlyTimestamp(new Date(nowTs));
    const startDateTs = toDateOnlyTimestamp(start);
    const endDateTs = end ? toDateOnlyTimestamp(end) : null;

    if (endDateTs !== null) {
        if (nowDateTs < startDateTs) return 'upcoming';
        if (nowDateTs <= endDateTs) return 'ongoing';
        return 'closed';
    }

    if (nowDateTs < startDateTs) return 'upcoming';
    if (nowDateTs === startDateTs) return 'ongoing';
    return 'closed';
}

function normalizeProgrammes(programmes: ProgrammeRow[], nowTs: number): EventItem[] {
    return programmes
        .map((programme) => {
            const startsAt = programme.starts_at ?? programme.ends_at ?? new Date(nowTs).toISOString();
            const endsAt = programme.ends_at ?? undefined;
            const isActive = programme.is_active ?? true;
            const phase = isActive ? getEventPhase(startsAt, endsAt, nowTs) : 'closed';
            const venueName = programme.venue?.name?.trim() ?? '';
            const venueAddress = programme.venue?.address?.trim() ?? '';
            const venueLabel = venueName && venueAddress ? `${venueName} • ${venueAddress}` : venueName || venueAddress || '';

            return {
                id: programme.id,
                tag: programme.tag ?? '',
                title: programme.title,
                description: programme.description,
                startsAt,
                endsAt,
                location: venueLabel || (programme.location ?? ''),
                imageUrl: resolveImageUrl(programme.image_url),
                pdfUrl: resolvePdfUrl(programme.pdf_url),
                phase,
            };
        })
        .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
}

function phaseLabel(phase: EventPhase) {
    switch (phase) {
        case 'ongoing':
            return 'Ongoing';
        case 'upcoming':
            return 'Upcoming';
        case 'closed':
        default:
            return 'Closed';
    }
}

function phaseBadgeClass(phase: EventPhase) {
    switch (phase) {
        case 'ongoing':
            return 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200';
        case 'upcoming':
            return 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-200';
        case 'closed':
        default:
            return 'border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-600/30 dark:bg-slate-800/30 dark:text-slate-300';
    }
}

function EmptyState({ label }: { label: string }) {
    return (
        <Card className="border-dashed border-slate-200/70 dark:border-slate-800">
            <div className="px-4 py-4 text-xs text-slate-500 dark:text-slate-400">{label}</div>
        </Card>
    );
}

function formatCheckInDate(scannedAt?: string | null) {
    if (!scannedAt) return 'Checked in';
    const date = new Date(scannedAt);
    const dateFmt = new Intl.DateTimeFormat('en-PH', { month: 'short', day: '2-digit', year: 'numeric' });
    const timeFmt = new Intl.DateTimeFormat('en-PH', { hour: 'numeric', minute: '2-digit' });
    return `Checked in • ${dateFmt.format(date)} ${timeFmt.format(date)}`;
}

function EventGrid({
    events,
    selectedIds,
    onJoin,
}: {
    events: EventItem[];
    selectedIds: number[];
    onJoin: (id: number) => void;
}) {
    if (!events.length) return <EmptyState label="No events to show here yet." />;

    return (
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {events.map((event) => {
                const isSelected = selectedIds.includes(event.id);
                const isClosed = event.phase === 'closed';
                const hasPdf = Boolean(event.pdfUrl);

                return (
                    <Card
                        key={event.id}
                        className={cn(
                            'overflow-hidden border-slate-200/70 dark:border-slate-800',
                            'hover:bg-slate-50/60 dark:hover:bg-slate-900/40',
                            isClosed && 'opacity-85',
                        )}
                    >
                        {/* ✅ Mobile: image becomes banner. sm+: becomes square thumbnail */}
                        <div className="grid gap-3 p-3 sm:grid-cols-[72px_1fr] sm:items-start">
                            <div
                                className={cn(
                                    'relative overflow-hidden rounded-xl border border-slate-200/70 bg-slate-100 dark:border-slate-800 dark:bg-slate-900',
                                    'aspect-[16/9] w-full sm:aspect-square sm:h-[72px] sm:w-[72px]',
                                )}
                            >
                                {event.imageUrl ? (
                                    <img
                                        src={event.imageUrl}
                                        alt={event.title}
                                        loading="lazy"
                                        className={cn(
                                            'absolute inset-0 h-full w-full object-cover',
                                            isClosed && 'grayscale',
                                        )}
                                    />
                                ) : (
                                    <div className="flex h-full w-full items-center justify-center text-slate-400 dark:text-slate-500">
                                        <ImageOff className="h-6 w-6" aria-hidden="true" />
                                        <span className="sr-only">No image available</span>
                                    </div>
                                )}
                            </div>

                            <div className="min-w-0">
                                {/* badges */}
                                <div className="flex flex-wrap items-center gap-1.5">
                                    {event.tag ? (
                                        <Badge
                                            variant="outline"
                                            className="h-5 px-1.5 text-[10px] uppercase tracking-wide"
                                        >
                                            {event.tag}
                                        </Badge>
                                    ) : null}
                                    <Badge
                                        variant="outline"
                                        className={cn(
                                            'h-5 px-1.5 text-[10px] uppercase tracking-wide',
                                            phaseBadgeClass(event.phase),
                                        )}
                                    >
                                        {phaseLabel(event.phase)}
                                    </Badge>
                                </div>

                                {/* title */}
                                <p className="mt-1 line-clamp-2 text-sm font-semibold text-slate-900 dark:text-slate-100 sm:text-[15px]">
                                    {event.title}
                                </p>

                                {/* meta */}
                                <div className="mt-2 flex flex-col gap-1 text-[11px] text-slate-600 dark:text-slate-300 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-3 sm:gap-y-1">
                                    <span className="inline-flex min-w-0 items-center gap-1.5">
                                        <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                                        <span className="truncate">{formatEventWindow(event.startsAt, event.endsAt)}</span>
                                    </span>

                                    {event.location ? (
                                        <span className="inline-flex min-w-0 items-center gap-1.5">
                                            <MapPin className="h-3.5 w-3.5 shrink-0" />
                                            <span className="truncate">{event.location}</span>
                                        </span>
                                    ) : null}
                                </div>

                                {/* description */}
                                <p className="mt-1 line-clamp-2 text-xs text-slate-600 dark:text-slate-300">
                                    {event.description || 'No description.'}
                                </p>

                                {/* ✅ Mobile actions: 2-col grid; Desktop: inline */}
                                <div
                                    className={cn(
                                        'mt-3 grid gap-2',
                                        hasPdf ? 'grid-cols-2' : 'grid-cols-1',
                                        'sm:flex sm:items-center sm:justify-end sm:gap-2',
                                    )}
                                >
                                    {hasPdf ? (
                                        <Button
                                            asChild
                                            type="button"
                                            size="sm"
                                            variant="outline"
                                            className="h-8 w-full px-3 text-xs sm:w-auto"
                                        >
                                            <a href={event.pdfUrl ?? undefined} target="_blank" rel="noreferrer">
                                                View program
                                            </a>
                                        </Button>
                                    ) : null}

                                    <Button
                                        type="button"
                                        size="sm"
                                        disabled={isClosed || isSelected}
                                        onClick={() => onJoin(event.id)}
                                        className={cn(
                                            'h-8 w-full px-3 text-xs shadow-sm sm:w-auto',
                                            'bg-[#00359c] text-white hover:bg-[#00359c]/90',
                                            (isClosed || isSelected) && 'opacity-70',
                                        )}
                                    >
                                        {isClosed ? 'Closed' : isSelected ? 'Selected' : 'Join'}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </Card>
                );
            })}
        </div>
    );
}

function AttendanceGrid({
    events,
    attendanceByProgramme,
}: {
    events: EventItem[];
    attendanceByProgramme: Map<number, string | null>;
}) {
    if (!events.length) return <EmptyState label="No events to show here yet." />;

    return (
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {events.map((event) => {
                const scannedAt = attendanceByProgramme.get(event.id) ?? null;
                const hasAttendance = Boolean(scannedAt);
                const hasPdf = Boolean(event.pdfUrl);

                return (
                    <Card
                        key={event.id}
                        className={cn(
                            'overflow-hidden border-slate-200/70 dark:border-slate-800',
                            'hover:bg-slate-50/60 dark:hover:bg-slate-900/40',
                        )}
                    >
                        <div className="grid gap-3 p-3 sm:grid-cols-[72px_1fr] sm:items-start">
                            <div
                                className={cn(
                                    'relative overflow-hidden rounded-xl border border-slate-200/70 bg-slate-100 dark:border-slate-800 dark:bg-slate-900',
                                    'aspect-[16/9] w-full sm:aspect-square sm:h-[72px] sm:w-[72px]',
                                )}
                            >
                                {event.imageUrl ? (
                                    <img
                                        src={event.imageUrl}
                                        alt={event.title}
                                        loading="lazy"
                                        className="absolute inset-0 h-full w-full object-cover"
                                    />
                                ) : (
                                    <div className="flex h-full w-full items-center justify-center text-slate-400 dark:text-slate-500">
                                        <ImageOff className="h-6 w-6" aria-hidden="true" />
                                        <span className="sr-only">No image available</span>
                                    </div>
                                )}
                            </div>

                            <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-1.5">
                                    {event.tag ? (
                                        <Badge variant="outline" className="h-5 px-1.5 text-[10px] uppercase tracking-wide">
                                            {event.tag}
                                        </Badge>
                                    ) : null}

                                    <Badge
                                        variant="outline"
                                        className={cn('h-5 px-1.5 text-[10px] uppercase tracking-wide', phaseBadgeClass(event.phase))}
                                    >
                                        {phaseLabel(event.phase)}
                                    </Badge>

                                    <Badge
                                        variant="outline"
                                        className={cn(
                                            'h-5 px-1.5 text-[10px] uppercase tracking-wide',
                                            hasAttendance
                                                ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200'
                                                : 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200',
                                        )}
                                    >
                                        {hasAttendance ? formatCheckInDate(scannedAt) : 'No attendance'}
                                    </Badge>
                                </div>

                                <p className="mt-1 line-clamp-2 text-sm font-semibold text-slate-900 dark:text-slate-100 sm:text-[15px]">
                                    {event.title}
                                </p>

                                <div className="mt-2 flex flex-col gap-1 text-[11px] text-slate-600 dark:text-slate-300 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-3 sm:gap-y-1">
                                    <span className="inline-flex min-w-0 items-center gap-1.5">
                                        <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                                        <span className="truncate">{formatEventWindow(event.startsAt, event.endsAt)}</span>
                                    </span>

                                    {event.location ? (
                                        <span className="inline-flex min-w-0 items-center gap-1.5">
                                            <MapPin className="h-3.5 w-3.5 shrink-0" />
                                            <span className="truncate">{event.location}</span>
                                        </span>
                                    ) : null}
                                </div>

                                <p className="mt-1 line-clamp-2 text-xs text-slate-600 dark:text-slate-300">
                                    {event.description || 'No description.'}
                                </p>

                                <div
                                    className={cn(
                                        'mt-3 grid gap-2',
                                        hasPdf ? 'grid-cols-1' : 'grid-cols-1',
                                        'sm:flex sm:items-center sm:justify-end sm:gap-2',
                                    )}
                                >
                                    {hasPdf ? (
                                        <Button
                                            asChild
                                            type="button"
                                            size="sm"
                                            variant="outline"
                                            className="h-8 w-full px-3 text-xs sm:w-auto"
                                        >
                                            <a href={event.pdfUrl ?? undefined} target="_blank" rel="noreferrer">
                                                View program
                                            </a>
                                        </Button>
                                    ) : null}
                                </div>
                            </div>
                        </div>
                    </Card>
                );
            })}
        </div>
    );
}


export default function EventList({
    programmes = [],
    joined_programme_ids = [],
    checked_in_programmes = [],
}: PageProps) {
    const nowTs = useNowTs();
    const [selectedIds, setSelectedIds] = React.useState<number[]>(() => joined_programme_ids);

    const [tab, setTab] = React.useState<TabKey>('ongoing');
    const [search, setSearch] = React.useState('');

    const normalized = React.useMemo(() => normalizeProgrammes(programmes, nowTs), [programmes, nowTs]);

    const grouped = React.useMemo(() => {
        const base = normalized.reduce(
            (acc, event) => {
                acc[event.phase].push(event);
                return acc;
            },
            { ongoing: [] as EventItem[], upcoming: [] as EventItem[], closed: [] as EventItem[] },
        );

        const q = search.trim().toLowerCase();
        if (!q) return base;

        const match = (e: EventItem) =>
            [e.title, e.description, e.tag, e.location].filter(Boolean).some((v) => v.toLowerCase().includes(q));

        return {
            ongoing: base.ongoing.filter(match),
            upcoming: base.upcoming.filter(match),
            closed: base.closed.filter(match),
        };
    }, [normalized, search]);

    const counts = React.useMemo(() => {
        const raw = normalized.reduce(
            (acc, e) => {
                acc[e.phase] += 1;
                return acc;
            },
            { ongoing: 0, upcoming: 0, closed: 0 },
        );
        return raw;
    }, [normalized]);

    const attendanceByProgramme = React.useMemo(
        () => new Map(checked_in_programmes.map((entry) => [entry.programme_id, entry.scanned_at ?? null])),
        [checked_in_programmes],
    );

    const attendedEvents = React.useMemo(
        () => normalized.filter((event) => selectedIds.includes(event.id) && Boolean(attendanceByProgramme.get(event.id))),
        [normalized, selectedIds, attendanceByProgramme],
    );

    const missedEvents = React.useMemo(
        () =>
            normalized.filter(
                (event) => selectedIds.includes(event.id) && !attendanceByProgramme.get(event.id) && event.phase === 'closed',
            ),
        [normalized, selectedIds, attendanceByProgramme],
    );

    const attendanceCounts = React.useMemo(
        () => ({
            attended: attendedEvents.length,
            missed: missedEvents.length,
        }),
        [attendedEvents.length, missedEvents.length],
    );

    React.useEffect(() => {
        setSelectedIds(joined_programme_ids);
    }, [joined_programme_ids]);

    React.useEffect(() => {
        const defaultTab: EventPhase = counts.ongoing ? 'ongoing' : counts.upcoming ? 'upcoming' : 'closed';
        setTab(defaultTab);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [counts.ongoing, counts.upcoming, counts.closed]);

    const handleJoin = React.useCallback((id: number) => {
        setSelectedIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
        router.post(
            `/event-list/${id}/join`,
            {},
            {
                preserveScroll: true,
                onSuccess: () => toast.success('Event joined.'),
                onError: () => {
                    toast.error('Unable to join this event.');
                    setSelectedIds((prev) => prev.filter((item) => item !== id));
                },
            },
        );
    }, []);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Event List" />

            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-3 sm:p-4">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            <CalendarDays className="h-5 w-5 text-[#00359c]" />
                            <h1 className="truncate text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100">
                                Select events to join
                            </h1>
                        </div>
                        <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                            Join ongoing or upcoming events. Closed events are read-only.
                        </p>
                    </div>
                </div>

                <Card className="border-slate-200/70 bg-white/70 p-3 dark:border-slate-800 dark:bg-slate-950/40">
                    <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)} className="space-y-3">
                        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                            {/* ✅ NEW: mobile shows 2 rows (status row + attendance row)
                               md+ shows single row like before */}
                            <div className="w-full">
                                {/* Desktop (md+) */}
                                <TabsList className="hidden w-full flex-wrap items-center justify-start gap-2 bg-slate-100/70 p-1.5 dark:bg-slate-900/50 md:flex md:w-auto">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <TabsTrigger
                                            value="ongoing"
                                            className="gap-2 data-[state=active]:bg-amber-50 data-[state=active]:text-amber-800 dark:data-[state=active]:bg-amber-500/15 dark:data-[state=active]:text-amber-200"
                                        >
                                            Ongoing
                                            <Badge
                                                variant="outline"
                                                className="h-5 border-amber-200 bg-amber-50/60 px-1.5 text-[10px] text-amber-700 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-200"
                                            >
                                                {counts.ongoing}
                                            </Badge>
                                        </TabsTrigger>

                                        <TabsTrigger
                                            value="upcoming"
                                            className="gap-2 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-800 dark:data-[state=active]:bg-blue-500/15 dark:data-[state=active]:text-blue-200"
                                        >
                                            Upcoming
                                            <Badge
                                                variant="outline"
                                                className="h-5 border-blue-200 bg-blue-50/60 px-1.5 text-[10px] text-blue-700 dark:border-blue-500/25 dark:bg-blue-500/10 dark:text-blue-200"
                                            >
                                                {counts.upcoming}
                                            </Badge>
                                        </TabsTrigger>

                                        <TabsTrigger
                                            value="closed"
                                            className="gap-2 data-[state=active]:bg-red-50 data-[state=active]:text-red-800 dark:data-[state=active]:bg-red-500/15 dark:data-[state=active]:text-red-200"
                                        >
                                            Closed
                                            <Badge
                                                variant="outline"
                                                className="h-5 border-red-200 bg-red-50/60 px-1.5 text-[10px] text-red-700 dark:border-red-500/25 dark:bg-red-500/10 dark:text-red-200"
                                            >
                                                {counts.closed}
                                            </Badge>
                                        </TabsTrigger>
                                    </div>

                                    <div className="mx-1 hidden h-6 w-px bg-slate-200 dark:bg-slate-700 md:block" />

                                    <div className="flex flex-wrap items-center gap-2">
                                        <TabsTrigger
                                            value="attended"
                                            className="gap-2 data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-800 dark:data-[state=active]:bg-emerald-500/15 dark:data-[state=active]:text-emerald-200"
                                        >
                                            Attended
                                            <Badge
                                                variant="outline"
                                                className="h-5 border-emerald-200 bg-emerald-50/60 px-1.5 text-[10px] text-emerald-700 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-200"
                                            >
                                                {attendanceCounts.attended}
                                            </Badge>
                                        </TabsTrigger>

                                        <TabsTrigger
                                            value="missed"
                                            className="gap-2 data-[state=active]:bg-slate-100 data-[state=active]:text-slate-800 dark:data-[state=active]:bg-slate-700/40 dark:data-[state=active]:text-slate-100"
                                        >
                                            Missed
                                            <Badge
                                                variant="outline"
                                                className="h-5 border-slate-200 bg-slate-50/70 px-1.5 text-[10px] text-slate-700 dark:border-slate-600/40 dark:bg-slate-800/40 dark:text-slate-200"
                                            >
                                                {attendanceCounts.missed}
                                            </Badge>
                                        </TabsTrigger>
                                    </div>
                                </TabsList>

                                {/* Mobile (below md): 3 rows -> (ongoing, upcoming) / (closed, attended) / (missed) */}
                                <div className="space-y-2 md:hidden">
                                    {/* Row 1 */}
                                    <TabsList className="grid w-full grid-cols-2 gap-2 bg-slate-100/70 p-1.5 dark:bg-slate-900/50">
                                        <TabsTrigger
                                            value="ongoing"
                                            className="w-full justify-between gap-2 data-[state=active]:bg-amber-50 data-[state=active]:text-amber-800 dark:data-[state=active]:bg-amber-500/15 dark:data-[state=active]:text-amber-200"
                                        >
                                            <span className="truncate">Ongoing</span>
                                            <Badge
                                                variant="outline"
                                                className="h-5 border-amber-200 bg-amber-50/60 px-1.5 text-[10px] text-amber-700 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-200"
                                            >
                                                {counts.ongoing}
                                            </Badge>
                                        </TabsTrigger>

                                        <TabsTrigger
                                            value="upcoming"
                                            className="w-full justify-between gap-2 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-800 dark:data-[state=active]:bg-blue-500/15 dark:data-[state=active]:text-blue-200"
                                        >
                                            <span className="truncate">Upcoming</span>
                                            <Badge
                                                variant="outline"
                                                className="h-5 border-blue-200 bg-blue-50/60 px-1.5 text-[10px] text-blue-700 dark:border-blue-500/25 dark:bg-blue-500/10 dark:text-blue-200"
                                            >
                                                {counts.upcoming}
                                            </Badge>
                                        </TabsTrigger>
                                    </TabsList>

                                    {/* Row 2 */}
                                    <TabsList className="grid w-full grid-cols-2 gap-2 bg-slate-100/70 p-1.5 dark:bg-slate-900/50">
                                        <TabsTrigger
                                            value="closed"
                                            className="w-full justify-between gap-2 data-[state=active]:bg-red-50 data-[state=active]:text-red-800 dark:data-[state=active]:bg-red-500/15 dark:data-[state=active]:text-red-200"
                                        >
                                            <span className="truncate">Closed</span>
                                            <Badge
                                                variant="outline"
                                                className="h-5 border-red-200 bg-red-50/60 px-1.5 text-[10px] text-red-700 dark:border-red-500/25 dark:bg-red-500/10 dark:text-red-200"
                                            >
                                                {counts.closed}
                                            </Badge>
                                        </TabsTrigger>

                                        <TabsTrigger
                                            value="attended"
                                            className="w-full justify-between gap-2 data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-800 dark:data-[state=active]:bg-emerald-500/15 dark:data-[state=active]:text-emerald-200"
                                        >
                                            <span className="truncate">Attended</span>
                                            <Badge
                                                variant="outline"
                                                className="h-5 border-emerald-200 bg-emerald-50/60 px-1.5 text-[10px] text-emerald-700 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-200"
                                            >
                                                {attendanceCounts.attended}
                                            </Badge>
                                        </TabsTrigger>
                                    </TabsList>

                                    {/* Row 3 (full width) */}
                                    <TabsList className="grid w-full grid-cols-1 gap-2 bg-slate-100/70 p-1.5 dark:bg-slate-900/50">
                                        <TabsTrigger
                                            value="missed"
                                            className="w-full justify-between gap-2 data-[state=active]:bg-slate-100 data-[state=active]:text-slate-800 dark:data-[state=active]:bg-slate-700/40 dark:data-[state=active]:text-slate-100"
                                        >
                                            <span className="truncate">Missed</span>
                                            <Badge
                                                variant="outline"
                                                className="h-5 border-slate-200 bg-slate-50/70 px-1.5 text-[10px] text-slate-700 dark:border-slate-600/40 dark:bg-slate-800/40 dark:text-slate-200"
                                            >
                                                {attendanceCounts.missed}
                                            </Badge>
                                        </TabsTrigger>
                                    </TabsList>
                                </div>

                            </div>

                            <div className="relative w-full md:w-72">
                                <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search events..." className="h-9 pl-8 text-sm" />
                            </div>
                        </div>

                        <TabsContent value="ongoing" className="mt-0 space-y-2">
                            <p className="text-xs text-slate-500 dark:text-slate-400">Events currently happening. Join now.</p>
                            <EventGrid events={grouped.ongoing} selectedIds={selectedIds} onJoin={handleJoin} />
                        </TabsContent>

                        <TabsContent value="upcoming" className="mt-0 space-y-2">
                            <p className="text-xs text-slate-500 dark:text-slate-400">Plan ahead and reserve your spot.</p>
                            <EventGrid events={grouped.upcoming} selectedIds={selectedIds} onJoin={handleJoin} />
                        </TabsContent>

                        <TabsContent value="closed" className="mt-0 space-y-2">
                            <p className="text-xs text-slate-500 dark:text-slate-400">Past events (read-only).</p>
                            <EventGrid events={grouped.closed} selectedIds={selectedIds} onJoin={handleJoin} />
                        </TabsContent>

                        <TabsContent value="attended" className="mt-0 space-y-2">
                            <p className="text-xs text-slate-500 dark:text-slate-400">Events you checked into with attendance or QR scan.</p>
                            <AttendanceGrid events={attendedEvents} attendanceByProgramme={attendanceByProgramme} />
                        </TabsContent>

                        <TabsContent value="missed" className="mt-0 space-y-2">
                            <p className="text-xs text-slate-500 dark:text-slate-400">Events you joined but did not check in.</p>
                            <AttendanceGrid events={missedEvents} attendanceByProgramme={attendanceByProgramme} />
                        </TabsContent>
                    </Tabs>
                </Card>

            </div>
        </AppLayout>
    );
}
