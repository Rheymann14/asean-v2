import * as React from 'react';
import AppLayout from '@/layouts/app-layout';
import { Head, router } from '@inertiajs/react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn, toDateOnlyTimestamp } from '@/lib/utils';
import { CalendarDays, MapPin, Users2 } from 'lucide-react';
import { toast } from 'sonner';

const FALLBACK_IMAGE = '/img/asean_banner_logo.png';

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
};

type EventPhase = 'ongoing' | 'upcoming' | 'closed';

type EventItem = {
    id: number;
    tag: string;
    title: string;
    description: string;
    startsAt: string;
    endsAt?: string;
    location: string;
    imageUrl: string;
    phase: EventPhase;
};

type SelectionSummaryItem = {
    id: number;
    title: string;
    phase: EventPhase;
};

const breadcrumbs = [
    { title: 'Dashboard', href: '/participant-dashboard' },
    { title: 'Event List', href: '/event-list' },
];

function resolveImageUrl(imageUrl?: string | null) {
    if (!imageUrl) return FALLBACK_IMAGE;
    if (imageUrl.startsWith('http') || imageUrl.startsWith('/')) return imageUrl;
    return `/event-images/${imageUrl}`;
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
            const venueLabel =
                venueName && venueAddress ? `${venueName} • ${venueAddress}` : venueName || venueAddress || '';

            return {
                id: programme.id,
                tag: programme.tag ?? '',
                title: programme.title,
                description: programme.description,
                startsAt,
                endsAt,
                location: venueLabel || (programme.location ?? ''),
                imageUrl: resolveImageUrl(programme.image_url),
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

function Section({
    title,
    description,
    events,
    selectedIds,
    onJoin,
}: {
    title: string;
    description: string;
    events: EventItem[];
    selectedIds: number[];
    onJoin: (id: number) => void;
}) {
    return (
        <section className="space-y-4">
            <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{title}</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">{description}</p>
            </div>

            {events.length === 0 ? (
                <Card className="border-dashed">
                    <div className="px-5 py-6 text-sm text-slate-500 dark:text-slate-400">
                        No events to show in this section yet.
                    </div>
                </Card>
            ) : (
                <div className="grid gap-3">
                    {events.map((event) => {
                        const isSelected = selectedIds.includes(event.id);
                        const isClosed = event.phase === 'closed';

                        return (
                            <Card key={event.id} className="overflow-hidden border-slate-200/70">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
                                    <div className="sm:w-44">
                                        <img
                                            src={event.imageUrl}
                                            alt={event.title}
                                            className="h-36 w-full object-cover sm:h-full"
                                            loading="lazy"
                                        />
                                    </div>
                                    <div className="flex flex-1 flex-col gap-2.5 p-4">
                                        <div className="flex flex-wrap items-start justify-between gap-2">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    {event.tag ? (
                                                        <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
                                                            {event.tag}
                                                        </Badge>
                                                    ) : null}
                                                    <Badge
                                                        variant="outline"
                                                        className={cn('text-[10px] uppercase tracking-wide', phaseBadgeClass(event.phase))}
                                                    >
                                                        {phaseLabel(event.phase)}
                                                    </Badge>
                                                </div>
                                                <h3 className="mt-2 text-base font-semibold text-slate-900 dark:text-slate-100">
                                                    {event.title}
                                                </h3>
                                            </div>
                                        </div>

                                        <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-2">
                                            {event.description || 'No event description available yet.'}
                                        </p>

                                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 dark:text-slate-300">
                                            <span className="inline-flex items-center gap-2">
                                                <CalendarDays className="h-4 w-4" />
                                                {formatEventWindow(event.startsAt, event.endsAt)}
                                            </span>
                                            {event.location ? (
                                                <span className="inline-flex items-center gap-2">
                                                    <MapPin className="h-4 w-4" />
                                                    {event.location}
                                                </span>
                                            ) : null}
                                        </div>

                                        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                                            <div className="text-xs text-slate-500 dark:text-slate-400">
                                                {isClosed
                                                    ? 'Closed events are no longer open for joining.'
                                                    : 'Select an event to confirm your participation.'}
                                            </div>
                                            <Button
                                                type="button"
                                                disabled={isClosed || isSelected}
                                                onClick={() => onJoin(event.id)}
                                            >
                                                {isClosed ? 'Closed' : isSelected ? 'Selected' : 'Join Event'}
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        );
                    })}
                </div>
            )}
        </section>
    );
}

export default function EventList({ programmes = [], joined_programme_ids = [] }: PageProps) {
    const nowTs = useNowTs();
    const [selectedIds, setSelectedIds] = React.useState<number[]>(() => joined_programme_ids);
    const [quickJoinId, setQuickJoinId] = React.useState<string>('');
    const [clearDialogOpen, setClearDialogOpen] = React.useState(false);

    const normalized = React.useMemo(() => normalizeProgrammes(programmes, nowTs), [programmes, nowTs]);
    const grouped = React.useMemo(() => {
        return normalized.reduce(
            (acc, event) => {
                acc[event.phase].push(event);
                return acc;
            },
            { ongoing: [] as EventItem[], upcoming: [] as EventItem[], closed: [] as EventItem[] },
        );
    }, [normalized]);

    React.useEffect(() => {
        setSelectedIds(joined_programme_ids);
    }, [joined_programme_ids]);

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

    const handleLeave = React.useCallback((id: number) => {
        setSelectedIds((prev) => prev.filter((item) => item !== id));
        router.delete(`/event-list/${id}/leave`, {
            preserveScroll: true,
            onSuccess: () => toast.success('Event removed.'),
            onError: () => {
                toast.error('Unable to remove this event.');
                setSelectedIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
            },
        });
    }, []);

    const selectedSummary = React.useMemo<SelectionSummaryItem[]>(
        () =>
            normalized
                .filter((event) => selectedIds.includes(event.id))
                .map((event) => ({ id: event.id, title: event.title, phase: event.phase })),
        [normalized, selectedIds],
    );

    const handleClearAll = React.useCallback(() => {
        router.delete('/event-list/clear', {
            preserveScroll: true,
            onSuccess: () => {
                setSelectedIds([]);
                toast.success('All selections cleared.');
            },
            onError: () => toast.error('Unable to clear selections.'),
        });
    }, []);

    const quickJoinOptions = React.useMemo(
        () => normalized.filter((event) => event.phase !== 'closed'),
        [normalized],
    );

    const handleQuickJoin = React.useCallback(() => {
        const id = Number(quickJoinId);
        if (!Number.isNaN(id)) {
            handleJoin(id);
            setQuickJoinId('');
        }
    }, [quickJoinId, handleJoin]);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Event List" />
            <div className="flex h-full flex-1 flex-col gap-6 rounded-xl p-4">
                <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                        <CalendarDays className="h-5 w-5 text-[#00359c]" />
                        <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
                            Select events to join
                        </h1>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                        Review ongoing, upcoming, and closed events. You can only join events that are ongoing or
                        upcoming.
                    </p>
                </div>

                <Card className="border-slate-200/70 bg-gradient-to-br from-white via-slate-50 to-white p-4 dark:border-slate-800 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
                    <div className="flex flex-col gap-4">
                        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                            <div className="flex items-start gap-3">
                                <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#00359c]/10 text-[#00359c]">
                                    <Users2 className="h-4 w-4" />
                                </div>
                                <div>
                                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                                        My joined events
                                    </p>
                                    <p className="text-sm text-slate-600 dark:text-slate-300">
                                        {selectedSummary.length} event{selectedSummary.length === 1 ? '' : 's'} selected
                                    </p>
                                </div>
                            </div>
                            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                                <select
                                    value={quickJoinId}
                                    onChange={(event) => setQuickJoinId(event.target.value)}
                                    className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-sm focus:border-slate-400 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 sm:w-64"
                                >
                                    <option value="">Quick join an event</option>
                                    {quickJoinOptions.map((event) => (
                                        <option key={event.id} value={event.id}>
                                            {event.title}
                                        </option>
                                    ))}
                                </select>
                                <Button type="button" onClick={handleQuickJoin} disabled={!quickJoinId}>
                                    Join
                                </Button>
                                <Button type="button" variant="outline" onClick={() => setClearDialogOpen(true)}>
                                    Clear all
                                </Button>
                            </div>
                        </div>

                        {selectedSummary.length ? (
                            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                                {selectedSummary.map((event) => (
                                    <div
                                        key={event.id}
                                        className="flex items-center justify-between gap-2 rounded-lg border border-slate-200/70 bg-white px-3 py-2 text-xs text-slate-700 shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
                                    >
                                        <span className="truncate font-medium">{event.title}</span>
                                        <div className="flex items-center gap-2">
                                            <Badge
                                                variant="outline"
                                                className={cn('text-[10px] uppercase tracking-wide', phaseBadgeClass(event.phase))}
                                            >
                                                {phaseLabel(event.phase)}
                                            </Badge>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                className="h-6 px-2 text-[10px]"
                                                onClick={() => handleLeave(event.id)}
                                            >
                                                Remove
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                Pick an ongoing or upcoming event below to join.
                            </p>
                        )}
                    </div>
                </Card>

                <Dialog open={clearDialogOpen} onOpenChange={setClearDialogOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Clear all joined events?</DialogTitle>
                            <DialogDescription>
                                This will remove all your joined events. You can rejoin ongoing or upcoming events later.
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setClearDialogOpen(false)}>
                                Cancel
                            </Button>
                            <Button
                                type="button"
                                variant="destructive"
                                onClick={() => {
                                    setClearDialogOpen(false);
                                    handleClearAll();
                                }}
                            >
                                Clear all
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                <Section
                    title="Ongoing events"
                    description="Events currently happening. Join now to participate."
                    events={grouped.ongoing}
                    selectedIds={selectedIds}
                    onJoin={handleJoin}
                />

                <Section
                    title="Upcoming events"
                    description="Plan ahead and reserve your spot before the event starts."
                    events={grouped.upcoming}
                    selectedIds={selectedIds}
                    onJoin={handleJoin}
                />

                <Section
                    title="Closed events"
                    description="Past events are listed for reference and cannot be joined."
                    events={grouped.closed}
                    selectedIds={selectedIds}
                    onJoin={handleJoin}
                />
            </div>
        </AppLayout>
    );
}
