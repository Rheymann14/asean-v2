import * as React from 'react';
import AppLayout from '@/layouts/app-layout';
import { Head } from '@inertiajs/react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn, toDateOnlyTimestamp } from '@/lib/utils';
import { Bus, CalendarDays, Check, ChevronsUpDown, MapPin, Phone, User2 } from 'lucide-react';

type VehicleAssignment = {
    vehicle_name?: string | null;
    plate_number?: string | null;
    ched_lo_name?: string | null;
    ched_lo_number?: string | null;
};

type EventRow = {
    id: number;
    title: string;
    starts_at?: string | null;
    ends_at?: string | null;
    location?: string | null;
    vehicle_assignment?: VehicleAssignment | null;
};

type PageProps = { events?: EventRow[] };

type EventPhase = 'ongoing' | 'upcoming' | 'closed';

const breadcrumbs = [
    { title: 'Dashboard', href: '/participant-dashboard' },
    { title: 'Van Assignment', href: '/vehicle-assignment' },
];

function formatEventWindow(startsAt?: string | null, endsAt?: string | null) {
    if (!startsAt) return 'Schedule to be announced';

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

function getEventPhase(startsAt: string | null | undefined, endsAt: string | null | undefined, nowTs: number): EventPhase {
    if (!startsAt) return 'upcoming';

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

function phaseLabel(phase: EventPhase) {
    if (phase === 'ongoing') return 'Ongoing';
    if (phase === 'upcoming') return 'Upcoming';

    return 'Closed';
}

function phaseBadgeClass(phase: EventPhase) {
    if (phase === 'ongoing') {
        return '!border-emerald-200 !bg-emerald-50 !text-emerald-700 dark:!border-emerald-500/30 dark:!bg-emerald-500/10 dark:!text-emerald-200';
    }
    if (phase === 'upcoming') {
        return '!border-sky-200 !bg-sky-50 !text-sky-700 dark:!border-sky-500/30 dark:!bg-sky-500/10 dark:!text-sky-200';
    }

    return '!border-rose-200 !bg-rose-50 !text-rose-700 dark:!border-rose-500/30 dark:!bg-rose-500/10 dark:!text-rose-200';
}

function phaseTitleClass(phase: EventPhase) {
    if (phase === 'ongoing') return 'text-emerald-900 dark:text-emerald-200';
    if (phase === 'upcoming') return 'text-sky-900 dark:text-sky-200';

    return 'text-rose-900 dark:text-rose-200';
}

function phaseDotClass(phase: EventPhase) {
    if (phase === 'ongoing') return 'bg-emerald-500 dark:bg-emerald-400';
    if (phase === 'upcoming') return 'bg-sky-500 dark:bg-sky-400';

    return 'bg-rose-500 dark:bg-rose-400';
}

function phaseCardAccentClass(phase: EventPhase) {
    if (phase === 'ongoing') return 'border-l-4 border-l-emerald-500/70 dark:border-l-emerald-400/60';
    if (phase === 'upcoming') return 'border-l-4 border-l-sky-500/70 dark:border-l-sky-400/60';

    return 'border-l-4 border-l-rose-500/70 dark:border-l-rose-400/60';
}

function Section({
    phase,
    title,
    description,
    events,
}: {
    phase: EventPhase;
    title: string;
    description: string;
    events: Array<EventRow & { phase: EventPhase }>;
}) {
    return (
        <section className="space-y-4">
            <div className="space-y-1">
                <div className="flex items-center gap-2">
                    <span className={cn('h-2.5 w-2.5 rounded-full', phaseDotClass(phase))} />
                    <h2 className={cn('text-lg font-semibold', phaseTitleClass(phase))}>{title}</h2>
                    <Badge variant="outline" className={cn('text-[10px] uppercase tracking-wide', phaseBadgeClass(phase))}>
                        {phaseLabel(phase)}
                    </Badge>
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400">{description}</p>
            </div>

            {events.length === 0 ? (
                <Card className="border-dashed">
                    <div className="px-5 py-6 text-sm text-slate-500 dark:text-slate-400">No events to show in this section yet.</div>
                </Card>
            ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {events.map((event) => {
                        const assignment = event.vehicle_assignment;

                        return (
                            <Card key={event.id} className={cn('border-slate-200/70 dark:border-slate-800', phaseCardAccentClass(event.phase))}>
                                <div className="flex flex-col gap-4 p-4">
                                    <div className="space-y-2">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">{event.title}</h3>
                                            <Badge
                                                variant="outline"
                                                className={cn('text-[10px] uppercase tracking-wide', phaseBadgeClass(event.phase))}
                                            >
                                                {phaseLabel(event.phase)}
                                            </Badge>
                                        </div>
                                        <div className="flex flex-col gap-2 text-sm text-slate-600 dark:text-slate-300">
                                            <span className="inline-flex items-center gap-2">
                                                <CalendarDays className="h-4 w-4 text-slate-400" />
                                                {formatEventWindow(event.starts_at, event.ends_at)}
                                            </span>
                                            {event.location ? (
                                                <span className="inline-flex items-center gap-2">
                                                    <MapPin className="h-4 w-4 text-slate-400" />
                                                    {event.location}
                                                </span>
                                            ) : null}
                                        </div>
                                    </div>

                                    <div className="space-y-2 rounded-lg border border-slate-200/70 bg-slate-50/60 p-3 text-sm dark:border-slate-700 dark:bg-slate-900/40">
                                        <div className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                                            Vehicle assignment
                                        </div>

                                        {assignment ? (
                                            <div className="space-y-2 text-slate-700 dark:text-slate-200">
                                                <p>
                                                    <span className="font-medium">Vehicle:</span> {assignment.vehicle_name || '—'}
                                                </p>
                                                <p>
                                                    <span className="font-medium">Plate number:</span> {assignment.plate_number || '—'}
                                                </p>
                                                <p className="inline-flex items-center gap-2">
                                                    <User2 className="h-4 w-4 text-slate-400" />
                                                    <span>
                                                        <span className="font-medium">CHED LO:</span> {assignment.ched_lo_name || '—'}
                                                    </span>
                                                </p>
                                                <p className="inline-flex items-center gap-2">
                                                    <Phone className="h-4 w-4 text-slate-400" />
                                                    <span>
                                                        <span className="font-medium">CHED LO number:</span> {assignment.ched_lo_number || '—'}
                                                    </span>
                                                </p>
                                            </div>
                                        ) : (
                                            <Badge
                                                variant="outline"
                                                className="border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-600/30 dark:bg-slate-800/30 dark:text-slate-300"
                                            >
                                                Pending
                                            </Badge>
                                        )}
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

export default function ParticipantVehicleAssignment({ events = [] }: PageProps) {
    const [nowTs] = React.useState(() => new Date().getTime());
    const [filterId, setFilterId] = React.useState('all');
    const [open, setOpen] = React.useState(false);

    const eventsWithPhase = React.useMemo(
        () =>
            events.map((event) => ({
                ...event,
                phase: getEventPhase(event.starts_at ?? null, event.ends_at ?? null, nowTs),
            })),
        [events, nowTs],
    );

    const filteredEvents = React.useMemo(() => {
        if (filterId === 'all') return eventsWithPhase;

        const id = Number(filterId);
        if (Number.isNaN(id)) return eventsWithPhase;

        return eventsWithPhase.filter((event) => event.id === id);
    }, [eventsWithPhase, filterId]);

    const grouped = React.useMemo(
        () => ({
            ongoing: filteredEvents.filter((event) => event.phase === 'ongoing'),
            upcoming: filteredEvents.filter((event) => event.phase === 'upcoming'),
            closed: filteredEvents.filter((event) => event.phase === 'closed'),
        }),
        [filteredEvents],
    );

    const selectedEvent = React.useMemo(() => {
        if (filterId === 'all') return null;

        const id = Number(filterId);
        if (Number.isNaN(id)) return null;

        return eventsWithPhase.find((event) => event.id === id) ?? null;
    }, [eventsWithPhase, filterId]);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Van Assignment" />
            <div className="flex h-full flex-1 flex-col gap-6 rounded-xl p-4">
                <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                        <Bus className="h-5 w-5 text-[#00359c]" />
                        <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">Van assignments</h1>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                        Review your assigned vehicle and CHED LO details per event.
                    </p>
                </div>

                <Card className="border-slate-200/70 bg-gradient-to-br from-white via-slate-50 to-white p-4 dark:border-slate-800 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div className="space-y-1">
                            <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Filter event</p>

                            <div className="flex flex-wrap items-center gap-2">
                                <span
                                    className={cn(
                                        'h-2.5 w-2.5 rounded-full',
                                        selectedEvent ? phaseDotClass(selectedEvent.phase) : 'bg-slate-300 dark:bg-slate-600',
                                    )}
                                />
                                <p className="max-w-[min(520px,80vw)] truncate text-sm text-slate-700 dark:text-slate-200">
                                    {selectedEvent ? selectedEvent.title : 'All joined events'}
                                </p>

                                {selectedEvent ? (
                                    <Badge
                                        variant="outline"
                                        className={cn('text-[10px] uppercase tracking-wide', phaseBadgeClass(selectedEvent.phase))}
                                    >
                                        {phaseLabel(selectedEvent.phase)}
                                    </Badge>
                                ) : (
                                    <Badge
                                        variant="outline"
                                        className="border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-600/30 dark:bg-slate-800/30 dark:text-slate-300"
                                    >
                                        All
                                    </Badge>
                                )}
                            </div>
                        </div>

                        <Popover open={open} onOpenChange={setOpen}>
                            <PopoverTrigger asChild>
                                <Button type="button" variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between md:w-80">
                                    <span className="flex min-w-0 items-center gap-2">
                                        <span
                                            className={cn(
                                                'h-2.5 w-2.5 rounded-full',
                                                selectedEvent ? phaseDotClass(selectedEvent.phase) : 'bg-slate-300 dark:bg-slate-600',
                                            )}
                                        />
                                        <span className="truncate">{selectedEvent ? selectedEvent.title : 'All events'}</span>
                                    </span>
                                    <span className="ml-2 inline-flex items-center gap-2">
                                        {selectedEvent ? (
                                            <Badge
                                                variant="outline"
                                                className={cn('hidden text-[10px] uppercase tracking-wide sm:inline-flex', phaseBadgeClass(selectedEvent.phase))}
                                            >
                                                {phaseLabel(selectedEvent.phase)}
                                            </Badge>
                                        ) : null}
                                        <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
                                    </span>
                                </Button>
                            </PopoverTrigger>

                            <PopoverContent
                                align="start"
                                className="w-[min(var(--radix-popover-trigger-width),calc(100vw-1rem))] max-w-[calc(100vw-1rem)] p-0"
                            >
                                <Command>
                                    <CommandInput placeholder="Search event..." />
                                    <CommandList>
                                        <CommandEmpty>No event found.</CommandEmpty>
                                        <CommandGroup>
                                            <CommandItem
                                                value="all events"
                                                onSelect={() => {
                                                    setFilterId('all');
                                                    setOpen(false);
                                                }}
                                            >
                                                <div className="flex w-full min-w-0 items-center gap-2">
                                                    <Check className={cn('h-4 w-4', filterId === 'all' ? 'opacity-100' : 'opacity-0')} />
                                                    <span className="min-w-0 flex-1 truncate">All events</span>
                                                    <Badge
                                                        variant="outline"
                                                        className="shrink-0 border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-600/30 dark:bg-slate-800/30 dark:text-slate-300"
                                                    >
                                                        All
                                                    </Badge>
                                                </div>
                                            </CommandItem>

                                            {eventsWithPhase.map((event) => (
                                                <CommandItem
                                                    key={event.id}
                                                    value={`${event.title} ${event.id}`}
                                                    onSelect={() => {
                                                        setFilterId(String(event.id));
                                                        setOpen(false);
                                                    }}
                                                >
                                                    <div className="flex w-full min-w-0 items-center gap-2">
                                                        <Check
                                                            className={cn(
                                                                'h-4 w-4',
                                                                filterId === String(event.id) ? 'opacity-100' : 'opacity-0',
                                                            )}
                                                        />
                                                        <span className={cn('h-2 w-2 rounded-full', phaseDotClass(event.phase))} />
                                                        <span className="min-w-0 flex-1 truncate">{event.title}</span>
                                                        <Badge
                                                            variant="outline"
                                                            className={cn('shrink-0 text-[10px] uppercase tracking-wide', phaseBadgeClass(event.phase))}
                                                        >
                                                            {phaseLabel(event.phase)}
                                                        </Badge>
                                                    </div>
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                    </div>
                </Card>

                {eventsWithPhase.length === 0 ? (
                    <Card className="border-dashed">
                        <div className="px-5 py-6 text-sm text-slate-500 dark:text-slate-400">
                            No vehicle assignments yet. Join an event to see your transport details.
                        </div>
                    </Card>
                ) : (
                    <div className="space-y-8">
                        <Section
                            phase="ongoing"
                            title="Ongoing events"
                            description="Events currently happening with your assigned vehicle details."
                            events={grouped.ongoing}
                        />
                        <Section
                            phase="upcoming"
                            title="Upcoming events"
                            description="Van assignments for upcoming events."
                            events={grouped.upcoming}
                        />
                        <Section
                            phase="closed"
                            title="Closed events"
                            description="Past events are listed for your reference."
                            events={grouped.closed}
                        />
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
