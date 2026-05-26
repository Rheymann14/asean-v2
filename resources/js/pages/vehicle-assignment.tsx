import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem, type SharedData } from '@/types';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import {
    Bus,
    Check,
    CheckCircle2,
    ChevronsUpDown,
    QrCodeIcon,
} from 'lucide-react';
import QRCode from 'qrcode';
import * as React from 'react';
import { toast } from 'sonner';

type EventRow = { id: number; title: string };
type VehicleRow = {
    id: number;
    label: string;
    plate_number?: string | null;
    driver_name?: string | null;
    driver_contact_number?: string | null;
    pickup_sent_at?: string | null;
};
type Assignment = {
    id: number;
    vehicle_id: number | null;
    vehicle_label: string | null;
    pickup_status: 'pending' | 'picked_up' | 'dropped_off';
};
type Participant = {
    id: number;
    display_id?: string | null;
    qr_payload?: string | null;
    profile_photo_url?: string | null;
    full_name: string;
    email: string | null;
    country?: {
        code?: string | null;
        name?: string | null;
        flag_url?: string | null;
    } | null;
    table_assignment?: {
        table_number: string;
        seat_number?: number | null;
    } | null;
    dietary?: {
        has_food_restrictions?: boolean;
        food_restrictions?: string[];
        dietary_allergies?: string | null;
        dietary_other?: string | null;
    } | null;
    accessibility?: {
        needs?: string[];
        other?: string | null;
    } | null;
    assignment: Assignment | null;
};

type PageProps = {
    events: EventRow[];
    selected_event_id?: number | null;
    vehicles: VehicleRow[];
    participants: Participant[];
};

type SearchItem = {
    value: string;
    label: string;
    description?: string;
};

function getFlagSrc(country?: Participant['country']) {
    if (!country) return null;
    if (country.flag_url) return country.flag_url;
    const code = (country.code ?? '').trim().toLowerCase();
    if (!code) return null;
    return `https://flagcdn.com/w80/${code}.png`;
}

function SearchableDropdown({
    value,
    onValueChange,
    items,
    placeholder,
    searchPlaceholder,
    emptyText,
}: {
    value: string;
    onValueChange: (value: string) => void;
    items: SearchItem[];
    placeholder: string;
    searchPlaceholder: string;
    emptyText: string;
}) {
    const [open, setOpen] = React.useState(false);
    const selected = items.find((item) => item.value === value) ?? null;

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between"
                    type="button"
                >
                    <span
                        className={cn(
                            'truncate',
                            !selected && 'text-slate-500',
                        )}
                    >
                        {selected ? selected.label : placeholder}
                    </span>
                    <ChevronsUpDown className="h-4 w-4 opacity-60" />
                </Button>
            </PopoverTrigger>
            <PopoverContent
                align="start"
                className="w-[min(var(--radix-popover-trigger-width),calc(100vw-1rem))] max-w-[calc(100vw-1rem)] p-0"
            >
                <Command>
                    <CommandInput placeholder={searchPlaceholder} />
                    <CommandEmpty>{emptyText}</CommandEmpty>
                    <CommandList>
                        <CommandGroup>
                            {items.map((item) => (
                                <CommandItem
                                    key={item.value}
                                    value={`${item.label} ${item.description ?? ''}`.trim()}
                                    onSelect={() => {
                                        onValueChange(item.value);
                                        setOpen(false);
                                    }}
                                    className="min-w-0 gap-2"
                                >
                                    <Check
                                        className={cn(
                                            'h-4 w-4',
                                            value === item.value
                                                ? 'opacity-100'
                                                : 'opacity-0',
                                        )}
                                    />
                                    <div className="min-w-0 flex-1">
                                        <div className="truncate">
                                            {item.label}
                                        </div>
                                        {item.description ? (
                                            <div className="truncate text-xs text-slate-500">
                                                {item.description}
                                            </div>
                                        ) : null}
                                    </div>
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}

function showToastError(errors: Record<string, string | string[]>) {
    const first = Object.values(errors ?? {})[0];
    toast.error(
        Array.isArray(first)
            ? first[0]
            : first || 'Please review the form and try again.',
    );
}

function VirtualLandscapeId({ participant }: { participant: Participant }) {
    const [qrDataUrl, setQrDataUrl] = React.useState<string | null>(null);
    const flagSrc = getFlagSrc(participant.country);
    const name = participant.full_name || '—';
    const displayId = participant.display_id || '—';

    React.useEffect(() => {
        let active = true;
        const run = async () => {
            const value = participant.qr_payload?.trim() ?? '';
            if (!value) {
                setQrDataUrl(null);
                return;
            }
            try {
                const url = await QRCode.toDataURL(value, {
                    margin: 1,
                    width: 240,
                    errorCorrectionLevel: 'M',
                });
                if (active) setQrDataUrl(url);
            } catch {
                if (active) setQrDataUrl(null);
            }
        };

        run();
        return () => {
            active = false;
        };
    }, [participant.qr_payload]);

    return (
        <div className="mx-auto w-full max-w-[520px]">
            <div
                className="id-print-card relative overflow-hidden"
                style={{
                    WebkitPrintColorAdjust: 'exact',
                    printColorAdjust: 'exact',
                }}
            >
                <div className="id-print-card-inner relative aspect-[3.37/2.125] w-full">
                    <div className="relative h-full w-full overflow-hidden rounded-3xl border border-slate-200/70 bg-white shadow-sm dark:border-white/10 dark:bg-slate-950">
                        <div aria-hidden className="absolute inset-0">
                            <img
                                src="/img/bg.png"
                                alt=""
                                className="absolute inset-0 h-full w-full object-cover opacity-100 brightness-80 contrast-150 saturate-200 filter dark:opacity-35 dark:brightness-80 dark:contrast-110"
                                draggable={false}
                                loading="eager"
                                decoding="async"
                            />
                            <div className="absolute inset-0 bg-black/10 dark:bg-black/15" />
                            <div className="absolute inset-0 bg-gradient-to-b from-white/45 via-white/20 to-white/55 dark:from-slate-950/55 dark:via-slate-950/28 dark:to-slate-950/55" />
                            <div className="pointer-events-none absolute -top-10 -right-10 h-36 w-36 rounded-full bg-slate-200/60 blur-3xl dark:bg-slate-800/60" />
                        </div>

                        <div className="relative flex h-full flex-col px-4 pt-3 pb-2">
                            <div className="flex items-center justify-between gap-2">
                                <div className="flex min-w-0 items-center gap-2.5">
                                    <img
                                        src="/img/asean_logo.svg"
                                        alt="ASEAN"
                                        className="h-8 w-8 object-contain drop-shadow-sm"
                                        draggable={false}
                                        loading="eager"
                                        decoding="async"
                                    />
                                    <img
                                        src="/img/bagong_pilipinas.svg"
                                        alt="Bagong Pilipinas"
                                        className="h-8 w-8 object-contain drop-shadow-sm"
                                        draggable={false}
                                        loading="eager"
                                        decoding="async"
                                    />
                                    <div className="min-w-0">
                                        <p className="truncate text-[13px] leading-4 font-semibold text-slate-900 dark:text-slate-100">
                                            ASEAN Philippines 2026
                                        </p>
                                        <p className="truncate text-[11px] leading-4 text-slate-600 dark:text-slate-300">
                                            Participant Identification
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="my-2 h-px w-full bg-slate-200/80 dark:bg-white/10" />

                            <div className="flex min-h-0 flex-1 gap-2 sm:gap-3">
                                <div className="min-w-0 flex-1">
                                    <div className="text-[13px] font-medium tracking-wide text-slate-500 uppercase dark:text-slate-400">
                                        Participant
                                    </div>
                                    <p className="mt-1 line-clamp-2 text-[19px] leading-6 font-semibold text-slate-900 dark:text-slate-100">
                                        {name}
                                    </p>

                                    <div className="mt-2 flex items-center gap-2.5">
                                        <div className="h-9 w-9 overflow-hidden rounded-lg border border-slate-200/70 bg-white shadow-sm dark:border-white/10 dark:bg-slate-900">
                                            {flagSrc ? (
                                                <img
                                                    src={flagSrc}
                                                    alt={
                                                        participant.country
                                                            ?.name ??
                                                        'Country flag'
                                                    }
                                                    className="h-full w-full object-cover"
                                                />
                                            ) : null}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="truncate text-[14px] leading-4 font-semibold text-slate-900 dark:text-slate-100">
                                                {participant.country?.name ||
                                                    '—'}
                                            </div>
                                            {participant.country?.code ? (
                                                <div className="mt-0.5 text-[12px] leading-4 text-slate-500 dark:text-slate-300">
                                                    {String(
                                                        participant.country
                                                            .code,
                                                    ).toUpperCase()}
                                                </div>
                                            ) : null}
                                        </div>
                                    </div>

                                    <div className="mt-2">
                                        <div className="text-[13px] font-medium tracking-wide text-slate-500 uppercase dark:text-slate-400">
                                            Participant ID
                                        </div>
                                        <div className="mt-1 inline-flex max-w-full rounded-2xl border border-slate-200/70 bg-white/80 px-3 py-1.5 font-mono text-[16px] leading-4 break-words whitespace-normal text-slate-900 shadow-sm backdrop-blur dark:border-white/10 dark:bg-slate-950/45 dark:text-slate-100">
                                            {displayId}
                                        </div>
                                    </div>

                                    <div className="mt-auto pt-1 text-[10px] text-slate-500 dark:text-slate-400">
                                        Scan QR for attendance verification.
                                    </div>
                                </div>

                                <div className="flex h-full w-[38%] max-w-[200px] min-w-[130px] flex-col items-center justify-center rounded-2xl border border-slate-200/70 bg-white/80 p-1 shadow-sm backdrop-blur sm:rounded-3xl dark:border-white/10 dark:bg-slate-950/45">
                                    <div className="mb-1 inline-flex items-center gap-1.5 text-[10px] font-semibold text-slate-700 dark:text-slate-200">
                                        <QrCodeIcon className="h-3.5 w-3.5" />
                                        QR Code
                                    </div>

                                    {qrDataUrl ? (
                                        <img
                                            src={qrDataUrl}
                                            alt="Participant QR code"
                                            className="aspect-square w-full max-w-[160px] rounded-xl bg-white object-contain p-1 sm:rounded-2xl sm:p-1.5"
                                            draggable={false}
                                        />
                                    ) : (
                                        <div
                                            className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-slate-200/70 bg-white/60 text-center dark:border-white/10 dark:bg-slate-950/30"
                                            style={{
                                                width: '100%',
                                                maxWidth: 160,
                                                aspectRatio: '1 / 1',
                                            }}
                                        >
                                            <QrCodeIcon className="h-7 w-7 text-slate-400" />
                                            <div className="text-[10px] font-medium text-slate-600 dark:text-slate-300">
                                                QR unavailable
                                            </div>
                                        </div>
                                    )}

                                    <div className="mt-2 w-full text-center">
                                        <div
                                            className="line-clamp-2 text-[10px] font-semibold text-slate-900 dark:text-slate-100"
                                            title={`${String(participant.country?.code ?? '').toUpperCase()} • ${name}`}
                                        >
                                            {String(
                                                participant.country?.code ?? '',
                                            ).toUpperCase()}
                                            {participant.country?.code
                                                ? ' • '
                                                : ''}
                                            {name}
                                        </div>
                                        <div className="mt-1 font-mono text-[10px] break-words text-slate-500 dark:text-slate-400">
                                            {displayId}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function VehicleAssignmentPage({
    events,
    selected_event_id,
    vehicles,
    participants,
}: PageProps) {
    const { auth } = usePage<SharedData>().props;
    const userType = auth.user?.user_type ?? auth.user?.userType;
    const roleName = (userType?.name ?? '').toUpperCase();
    const roleSlug = (userType?.slug ?? '').toUpperCase();
    const isChedLo = roleName === 'CHED LO' || roleSlug === 'CHED-LO';
    const pageTitle = isChedLo
        ? 'Participants Monitoring'
        : 'Vehicle Assignment';
    const breadcrumbs: BreadcrumbItem[] = [
        { title: pageTitle, href: '/vehicle-assignment' },
    ];

    const selectedEventId = selected_event_id
        ? String(selected_event_id)
        : events[0]
          ? String(events[0].id)
          : '';

    const [selectedIds, setSelectedIds] = React.useState<number[]>([]);
    const [selectedAssignedIds, setSelectedAssignedIds] = React.useState<
        number[]
    >([]);
    const [participantSearch, setParticipantSearch] = React.useState('');
    const [assignedPage, setAssignedPage] = React.useState(1);
    const [unassignedPage, setUnassignedPage] = React.useState(1);
    const [presenceOverrides, setPresenceOverrides] = React.useState<
        Record<number, boolean>
    >({});
    const [sendingPickupVehicleId, setSendingPickupVehicleId] =
        React.useState<number | null>(null);
    const [idPreviewParticipant, setIdPreviewParticipant] =
        React.useState<Participant | null>(null);
    const perPage = 10;

    const assignmentForm = useForm({
        programme_id: selectedEventId,
        vehicle_id: vehicles[0] ? String(vehicles[0].id) : '',
        participant_ids: [] as number[],
    });

    React.useEffect(() => {
        if (!selectedEventId) return;
        if (assignmentForm.data.programme_id !== selectedEventId) {
            assignmentForm.setData('programme_id', selectedEventId);
        }
    }, [assignmentForm, selectedEventId]);

    React.useEffect(() => {
        const next: Record<number, boolean> = {};
        participants.forEach((participant) => {
            if (!participant.assignment) return;
            next[participant.assignment.id] =
                participant.assignment.pickup_status !== 'pending';
        });
        setPresenceOverrides(next);
    }, [participants]);

    const onChangeEvent = (value: string) => {
        assignmentForm.setData('programme_id', value);
        assignmentForm.setData('vehicle_id', '');
        setSelectedIds([]);
        setSelectedAssignedIds([]);
        router.get(
            '/vehicle-assignment',
            { event_id: value || undefined },
            { preserveState: true, preserveScroll: true, replace: true },
        );
    };

    const assignedParticipants = React.useMemo(
        () => participants.filter((participant) => participant.assignment),
        [participants],
    );
    const unassignedParticipants = React.useMemo(
        () => participants.filter((participant) => !participant.assignment),
        [participants],
    );

    const filteredAssignedParticipants = React.useMemo(() => {
        if (!participantSearch.trim()) return assignedParticipants;
        const query = participantSearch.trim().toLowerCase();
        return assignedParticipants.filter((participant) =>
            [participant.full_name, participant.email]
                .filter(Boolean)
                .some((value) => value!.toLowerCase().includes(query)),
        );
    }, [assignedParticipants, participantSearch]);

    const filteredUnassignedParticipants = React.useMemo(() => {
        if (!participantSearch.trim()) return unassignedParticipants;
        const query = participantSearch.trim().toLowerCase();
        return unassignedParticipants.filter((participant) =>
            [participant.full_name, participant.email]
                .filter(Boolean)
                .some((value) => value!.toLowerCase().includes(query)),
        );
    }, [unassignedParticipants, participantSearch]);

    const assignedTotalPages = Math.max(
        1,
        Math.ceil(filteredAssignedParticipants.length / perPage),
    );
    const unassignedTotalPages = Math.max(
        1,
        Math.ceil(filteredUnassignedParticipants.length / perPage),
    );

    React.useEffect(() => {
        setAssignedPage(1);
        setUnassignedPage(1);
    }, [participantSearch, selectedEventId]);

    const assignedPageItems = filteredAssignedParticipants.slice(
        (assignedPage - 1) * perPage,
        assignedPage * perPage,
    );
    const unassignedPageItems = filteredUnassignedParticipants.slice(
        (unassignedPage - 1) * perPage,
        unassignedPage * perPage,
    );

    const toggleAllUnassigned = (checked: boolean) => {
        setSelectedIds(checked ? unassignedPageItems.map((p) => p.id) : []);
    };

    const toggleUnassignedParticipant = (
        participantId: number,
        checked: boolean,
    ) => {
        setSelectedIds((prev) =>
            checked
                ? [...new Set([...prev, participantId])]
                : prev.filter((id) => id !== participantId),
        );
    };

    const toggleAllAssigned = (checked: boolean) => {
        setSelectedAssignedIds(
            checked ? assignedPageItems.map((p) => p.id) : [],
        );
    };

    const toggleAssignedParticipant = (
        participantId: number,
        checked: boolean,
    ) => {
        setSelectedAssignedIds((prev) =>
            checked
                ? [...new Set([...prev, participantId])]
                : prev.filter((id) => id !== participantId),
        );
    };

    const doAssign = (participantIds: number[], successMessage: string) => {
        if (!assignmentForm.data.programme_id) {
            toast.error('Please select an event.');
            return;
        }
        if (!assignmentForm.data.vehicle_id) {
            toast.error('Please select a vehicle.');
            return;
        }
        if (!participantIds.length) {
            toast.error('Please select participant(s) to assign.');
            return;
        }

        assignmentForm.clearErrors();

        router.post(
            '/vehicle-assignments',
            {
                programme_id: assignmentForm.data.programme_id,
                vehicle_id: assignmentForm.data.vehicle_id,
                participant_ids: participantIds,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    toast.success(successMessage);
                    setSelectedIds([]);
                },
                onError: (errors) => {
                    assignmentForm.setError(errors as Record<string, string>);
                    showToastError(errors as Record<string, string | string[]>);
                },
            },
        );
    };

    const assignBulk = () =>
        doAssign(selectedIds, 'Participants assigned to vehicle.');

    const assignSingle = (participantId: number) =>
        doAssign([participantId], 'Participant assigned to vehicle.');

    const removeAssignment = (assignmentId: number) => {
        router.delete(`/vehicle-assignments/${assignmentId}`, {
            preserveScroll: true,
            onSuccess: () => toast.success('Participant assignment removed.'),
            onError: () => toast.error('Unable to remove assignment.'),
        });
    };

    const removeBulkAssignments = () => {
        const assignmentsToRemove = assignedParticipants.filter((participant) =>
            selectedAssignedIds.includes(participant.id),
        );
        if (!assignmentsToRemove.length) {
            toast.error('Please select participant(s) to unassign.');
            return;
        }

        assignmentsToRemove.forEach((participant) => {
            if (participant.assignment) {
                removeAssignment(participant.assignment.id);
            }
        });
        setSelectedAssignedIds([]);
    };

    const togglePresence = (assignmentId: number, checked: boolean) => {
        setPresenceOverrides((prev) => ({ ...prev, [assignmentId]: checked }));

        router.patch(
            `/vehicle-assignments/${assignmentId}/presence`,
            { is_present: checked },
            {
                preserveScroll: true,
                onSuccess: () =>
                    toast.success(
                        checked
                            ? 'Marked as present in vehicle.'
                            : 'Marked as not present in vehicle.',
                    ),
                onError: () => {
                    setPresenceOverrides((prev) => ({
                        ...prev,
                        [assignmentId]: !checked,
                    }));
                    toast.error('Unable to update vehicle attendance status.');
                },
            },
        );
    };

    const sendPickup = (vehicleId: number) => {
        setSendingPickupVehicleId(vehicleId);
        router.post(
            '/vehicle-assignments/send-pickup',
            {
                programme_id: assignmentForm.data.programme_id,
                vehicle_id: vehicleId,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    toast.success('Pickup details sent to admin.');
                },
                onError: (errors) => {
                    showToastError(errors as Record<string, string | string[]>);
                },
                onFinish: () => setSendingPickupVehicleId(null),
            },
        );
    };

    const removePickup = (vehicleId: number) => {
        setSendingPickupVehicleId(vehicleId);
        router.post(
            '/vehicle-assignments/remove-pickup',
            {
                programme_id: assignmentForm.data.programme_id,
                vehicle_id: vehicleId,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    toast.success('Pickup details removed.');
                },
                onError: (errors) => {
                    showToastError(errors as Record<string, string | string[]>);
                },
                onFinish: () => setSendingPickupVehicleId(null),
            },
        );
    };

    const checkedPassengersByVehicle = React.useMemo(() => {
        const counts: Record<number, number> = {};

        assignedParticipants.forEach((participant) => {
            const assignment = participant.assignment;
            if (!assignment?.vehicle_id) {
                return;
            }

            const isPresent = presenceOverrides[assignment.id] ?? false;
            if (!isPresent) {
                return;
            }

            counts[assignment.vehicle_id] = (counts[assignment.vehicle_id] ?? 0) + 1;
        });

        return counts;
    }, [assignedParticipants, presenceOverrides]);

    const formatList = (items?: string[] | null) => {
        if (!items?.length) return '—';
        return items.map((value) => value.replaceAll('_', ' ')).join(', ');
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={pageTitle} />

            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-2 sm:p-4">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <Bus className="h-5 w-5 text-[#00359c]" />
                        <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
                            {pageTitle}
                        </h1>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                        {isChedLo
                            ? 'Monitor assigned participants per event, including vehicle presence, table/seat, support preferences, and virtual ID.'
                            : 'Assign participants to vehicles per event.'}
                    </p>
                </div>

                {!isChedLo && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">
                                Event Filter
                            </CardTitle>
                            <CardDescription>
                                Choose an event to manage assignments.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-1">
                                    <Label>Event</Label>
                                    <SearchableDropdown
                                        value={assignmentForm.data.programme_id}
                                        onValueChange={onChangeEvent}
                                        placeholder="Select event"
                                        searchPlaceholder="Search events..."
                                        emptyText="No events found."
                                        items={events.map((event) => ({
                                            value: String(event.id),
                                            label: event.title,
                                        }))}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor="participant-search">
                                        Search participant
                                    </Label>
                                    <Input
                                        id="participant-search"
                                        placeholder="Search participants..."
                                        value={participantSearch}
                                        onChange={(event) =>
                                            setParticipantSearch(
                                                event.target.value,
                                            )
                                        }
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}
                {isChedLo ? (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">
                                Vehicle Details
                            </CardTitle>
                            <CardDescription>
                                Vehicles assigned under your supervision for the
                                selected event.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                                {vehicles.length === 0 ? (
                                    <p className="text-sm text-slate-500">
                                        No vehicles assigned to you for this
                                        event.
                                    </p>
                                ) : null}
                                {vehicles.map((vehicle) => (
                                    <div
                                        key={vehicle.id}
                                        className="rounded-lg border p-3"
                                    >
                                        <p className="font-semibold text-slate-900 dark:text-slate-100">
                                            {vehicle.label}
                                        </p>
                                        <p className="text-xs text-slate-500">
                                            Plate: {vehicle.plate_number || '—'}
                                        </p>
                                        <p className="text-xs text-slate-500">
                                            Driver: {vehicle.driver_name || '—'}
                                        </p>
                                        <p className="text-xs text-slate-500">
                                            Contact:{' '}
                                            {vehicle.driver_contact_number ||
                                                '—'}
                                        </p>
                                        <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">
                                            Checked passengers: {checkedPassengersByVehicle[vehicle.id] ?? 0}
                                        </p>
                                        <Button
                                            type="button"
                                            size="sm"
                                            className={cn(
                                                'mt-3 w-full text-white',
                                                vehicle.pickup_sent_at
                                                    ? 'bg-red-600 hover:bg-red-600/90'
                                                    : 'bg-[#00359c] hover:bg-[#00359c]/90',
                                            )}
                                            disabled={
                                                (!vehicle.pickup_sent_at &&
                                                    (checkedPassengersByVehicle[vehicle.id] ?? 0) === 0) ||
                                                sendingPickupVehicleId === vehicle.id
                                            }
                                            onClick={() =>
                                                vehicle.pickup_sent_at
                                                    ? removePickup(vehicle.id)
                                                    : sendPickup(vehicle.id)
                                            }
                                        >
                                            {sendingPickupVehicleId === vehicle.id
                                                ? vehicle.pickup_sent_at
                                                    ? 'Removing...'
                                                    : 'Sending...'
                                                : vehicle.pickup_sent_at
                                                  ? 'Remove Notification'
                                                  : 'Notify Admin'}
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                ) : (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">
                                Assign Participants
                            </CardTitle>
                            <CardDescription>
                                Select vehicle, then assign individual or bulk
                                participants.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="space-y-1 md:max-w-sm">
                                <Label>Vehicle</Label>
                                <SearchableDropdown
                                    value={assignmentForm.data.vehicle_id}
                                    onValueChange={(value) =>
                                        assignmentForm.setData(
                                            'vehicle_id',
                                            value,
                                        )
                                    }
                                    placeholder="Select vehicle"
                                    searchPlaceholder="Search vehicles..."
                                    emptyText="No vehicles found."
                                    items={vehicles.map((vehicle) => ({
                                        value: String(vehicle.id),
                                        label: vehicle.label,
                                        description: vehicle.plate_number || '',
                                    }))}
                                />
                                {assignmentForm.errors.vehicle_id ? (
                                    <p className="text-xs text-rose-500">
                                        {assignmentForm.errors.vehicle_id}
                                    </p>
                                ) : null}
                            </div>
                            {assignmentForm.errors.participant_ids ? (
                                <p className="text-xs text-rose-500">
                                    {assignmentForm.errors.participant_ids}
                                </p>
                            ) : null}
                        </CardContent>
                    </Card>
                )}

                <div
                    className={cn(
                        'grid gap-4',
                        isChedLo ? 'lg:grid-cols-1' : 'lg:grid-cols-2',
                    )}
                >
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">
                                Assigned Participants
                            </CardTitle>
                            <CardDescription>
                                {isChedLo
                                    ? 'Check participants present in your vehicle and review table/seat, support preferences, and virtual ID.'
                                    : 'Remove assignments from participants already assigned to a vehicle.'}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {!isChedLo ? (
                                <div>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={removeBulkAssignments}
                                        disabled={!selectedAssignedIds.length}
                                    >
                                        Remove Selected
                                    </Button>
                                </div>
                            ) : null}

                            {isChedLo ? (
                                <div className="space-y-3 md:hidden">
                                    {assignedPageItems.length === 0 ? (
                                        <p className="rounded-lg border p-4 text-center text-sm text-slate-500">
                                            No assigned participants found.
                                        </p>
                                    ) : null}
                                    {assignedPageItems.map((participant) => {
                                        const assignmentId =
                                            participant.assignment?.id;
                                        const isPresent = assignmentId
                                            ? (presenceOverrides[
                                                  assignmentId
                                              ] ?? false)
                                            : false;
                                        return (
                                            <div
                                                key={participant.id}
                                                className={cn(
                                                    'space-y-2 rounded-xl border p-3',
                                                    isPresent &&
                                                        'bg-green-50 dark:bg-emerald-950/40',
                                                )}
                                            >
                                                <div className="flex items-start justify-between gap-2">
                                                    <div>
                                                        <p className="font-semibold">
                                                            {
                                                                participant.full_name
                                                            }
                                                        </p>
                                                        <p className="text-xs text-slate-500">
                                                            {participant.email ||
                                                                '—'}
                                                        </p>
                                                    </div>
                                                    <Checkbox
                                                        checked={isPresent}
                                                        disabled={!assignmentId}
                                                        onCheckedChange={(
                                                            checked,
                                                        ) =>
                                                            assignmentId &&
                                                            togglePresence(
                                                                assignmentId,
                                                                Boolean(
                                                                    checked,
                                                                ),
                                                            )
                                                        }
                                                    />
                                                </div>
                                                <p className="text-xs text-slate-600">
                                                    Vehicle:{' '}
                                                    {participant.assignment
                                                        ?.vehicle_label || '—'}
                                                </p>
                                                <p className="text-xs text-slate-600">
                                                    Table/Seat:{' '}
                                                    {participant.table_assignment
                                                        ? `${participant.table_assignment.table_number} / Seat ${participant.table_assignment.seat_number ?? '—'}`
                                                        : '—'}
                                                </p>
                                                <p className="text-xs text-slate-600">
                                                    Dietary:{' '}
                                                    {formatList(
                                                        participant.dietary
                                                            ?.food_restrictions,
                                                    )}
                                                </p>
                                                <p className="text-xs text-slate-600">
                                                    Accessibility:{' '}
                                                    {formatList(
                                                        participant
                                                            .accessibility
                                                            ?.needs,
                                                    )}
                                                </p>
                                                <div className="flex justify-end">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        type="button"
                                                        onClick={() =>
                                                            setIdPreviewParticipant(
                                                                participant,
                                                            )
                                                        }
                                                    >
                                                        View ID
                                                    </Button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : null}

                            <div
                                className={cn(
                                    'overflow-x-auto rounded-xl border',
                                    isChedLo ? 'hidden md:block' : 'block',
                                )}
                            >
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-10">
                                                {isChedLo ? (
                                                    'Attendance'
                                                ) : (
                                                    <Checkbox
                                                        checked={
                                                            assignedPageItems.length >
                                                                0 &&
                                                            selectedAssignedIds.length ===
                                                                assignedPageItems.length
                                                        }
                                                        onCheckedChange={(
                                                            checked,
                                                        ) =>
                                                            toggleAllAssigned(
                                                                Boolean(
                                                                    checked,
                                                                ),
                                                            )
                                                        }
                                                    />
                                                )}
                                            </TableHead>
                                            <TableHead>Participant</TableHead>
                                            <TableHead>Vehicle</TableHead>
                                            <TableHead>Table / Seat</TableHead>
                                            <TableHead>Dietary</TableHead>
                                            <TableHead>Accessibility</TableHead>
                                            {isChedLo ? (
                                                <TableHead className="text-right">
                                                    Virtual ID
                                                </TableHead>
                                            ) : null}
                                            {!isChedLo ? (
                                                <TableHead className="text-right">
                                                    Action
                                                </TableHead>
                                            ) : null}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {assignedPageItems.length === 0 ? (
                                            <TableRow>
                                                <TableCell
                                                    colSpan={isChedLo ? 7 : 7}
                                                    className="py-6 text-center text-sm text-slate-500"
                                                >
                                                    No assigned participants
                                                    found.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            assignedPageItems.map(
                                                (participant) => {
                                                    const assignmentId =
                                                        participant.assignment
                                                            ?.id;
                                                    const isPresent =
                                                        assignmentId
                                                            ? (presenceOverrides[
                                                                  assignmentId
                                                              ] ?? false)
                                                            : false;

                                                    return (
                                                        <TableRow
                                                            key={participant.id}
                                                            className={
                                                                isChedLo &&
                                                                isPresent
                                                                    ? 'bg-green-50 hover:bg-green-50/90 dark:bg-emerald-950/40 dark:hover:bg-emerald-950/50'
                                                                    : ''
                                                            }
                                                        >
                                                            <TableCell>
                                                                {isChedLo ? (
                                                                    <Checkbox
                                                                        checked={
                                                                            isPresent
                                                                        }
                                                                        disabled={
                                                                            !assignmentId
                                                                        }
                                                                        onCheckedChange={(
                                                                            checked,
                                                                        ) =>
                                                                            assignmentId &&
                                                                            togglePresence(
                                                                                assignmentId,
                                                                                Boolean(
                                                                                    checked,
                                                                                ),
                                                                            )
                                                                        }
                                                                    />
                                                                ) : (
                                                                    <Checkbox
                                                                        checked={selectedAssignedIds.includes(
                                                                            participant.id,
                                                                        )}
                                                                        onCheckedChange={(
                                                                            checked,
                                                                        ) =>
                                                                            toggleAssignedParticipant(
                                                                                participant.id,
                                                                                Boolean(
                                                                                    checked,
                                                                                ),
                                                                            )
                                                                        }
                                                                    />
                                                                )}
                                                            </TableCell>
                                                            <TableCell>
                                                                <div className="font-medium">
                                                                    {
                                                                        participant.full_name
                                                                    }
                                                                </div>
                                                                <div className="text-xs text-slate-500">
                                                                    {participant.email ||
                                                                        '—'}
                                                                </div>
                                                            </TableCell>
                                                            <TableCell>
                                                                {participant
                                                                    .assignment
                                                                    ?.vehicle_label ||
                                                                    '—'}
                                                            </TableCell>
                                                            <TableCell>
                                                                {participant.table_assignment
                                                                    ? ` ${participant.table_assignment.table_number} / Seat ${participant.table_assignment.seat_number ?? '—'}`
                                                                    : '—'}
                                                            </TableCell>
                                                            <TableCell>
                                                                <div className="text-xs">
                                                                    <p>
                                                                        {formatList(
                                                                            participant
                                                                                .dietary
                                                                                ?.food_restrictions,
                                                                        )}
                                                                    </p>
                                                                    {participant
                                                                        .dietary
                                                                        ?.dietary_allergies ? (
                                                                        <p>
                                                                            Allergies:{' '}
                                                                            {
                                                                                participant
                                                                                    .dietary
                                                                                    .dietary_allergies
                                                                            }
                                                                        </p>
                                                                    ) : null}
                                                                    {participant
                                                                        .dietary
                                                                        ?.dietary_other ? (
                                                                        <p>
                                                                            Other:{' '}
                                                                            {
                                                                                participant
                                                                                    .dietary
                                                                                    .dietary_other
                                                                            }
                                                                        </p>
                                                                    ) : null}
                                                                </div>
                                                            </TableCell>
                                                            <TableCell>
                                                                <div className="text-xs">
                                                                    <p>
                                                                        {formatList(
                                                                            participant
                                                                                .accessibility
                                                                                ?.needs,
                                                                        )}
                                                                    </p>
                                                                    {participant
                                                                        .accessibility
                                                                        ?.other ? (
                                                                        <p>
                                                                            Other:{' '}
                                                                            {
                                                                                participant
                                                                                    .accessibility
                                                                                    .other
                                                                            }
                                                                        </p>
                                                                    ) : null}
                                                                </div>
                                                            </TableCell>
                                                            {isChedLo ? (
                                                                <TableCell className="text-right">
                                                                    <Button
                                                                        type="button"
                                                                        size="sm"
                                                                        variant="outline"
                                                                        onClick={() =>
                                                                            setIdPreviewParticipant(
                                                                                participant,
                                                                            )
                                                                        }
                                                                    >
                                                                        View ID
                                                                    </Button>
                                                                </TableCell>
                                                            ) : null}
                                                            {!isChedLo ? (
                                                                <TableCell className="text-right">
                                                                    <Button
                                                                        type="button"
                                                                        size="sm"
                                                                        variant="outline"
                                                                        onClick={() =>
                                                                            removeAssignment(
                                                                                participant
                                                                                    .assignment!
                                                                                    .id,
                                                                            )
                                                                        }
                                                                    >
                                                                        Remove
                                                                        Assignment
                                                                    </Button>
                                                                </TableCell>
                                                            ) : null}
                                                        </TableRow>
                                                    );
                                                },
                                            )
                                        )}
                                    </TableBody>
                                </Table>
                            </div>

                            <div className="flex items-center justify-between text-sm text-slate-500">
                                <span>
                                    Page {assignedPage} of {assignedTotalPages}
                                </span>
                                <div className="flex gap-2">
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        disabled={assignedPage <= 1}
                                        onClick={() =>
                                            setAssignedPage((page) =>
                                                Math.max(1, page - 1),
                                            )
                                        }
                                    >
                                        Previous
                                    </Button>
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        disabled={
                                            assignedPage >= assignedTotalPages
                                        }
                                        onClick={() =>
                                            setAssignedPage((page) =>
                                                Math.min(
                                                    assignedTotalPages,
                                                    page + 1,
                                                ),
                                            )
                                        }
                                    >
                                        Next
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {!isChedLo ? (
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">
                                    Unassigned Participants
                                </CardTitle>
                                <CardDescription>
                                    Select participants and assign them to a
                                    vehicle.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex justify-end">
                                    <Button
                                        type="button"
                                        onClick={assignBulk}
                                        disabled={
                                            !selectedIds.length ||
                                            assignmentForm.processing
                                        }
                                        className="bg-[#00359c] text-white hover:bg-[#00359c]/90"
                                    >
                                        <CheckCircle2 className="mr-2 h-4 w-4" />
                                        Assign Selected
                                    </Button>
                                </div>
                                {assignmentForm.errors.participant_ids ? (
                                    <p className="text-xs text-rose-500">
                                        {assignmentForm.errors.participant_ids}
                                    </p>
                                ) : null}

                                <div className="overflow-x-auto rounded-xl border">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="w-10">
                                                    <Checkbox
                                                        checked={
                                                            unassignedPageItems.length >
                                                                0 &&
                                                            selectedIds.length ===
                                                                unassignedPageItems.length
                                                        }
                                                        onCheckedChange={(
                                                            checked,
                                                        ) =>
                                                            toggleAllUnassigned(
                                                                Boolean(
                                                                    checked,
                                                                ),
                                                            )
                                                        }
                                                    />
                                                </TableHead>
                                                <TableHead>
                                                    Participant
                                                </TableHead>
                                                <TableHead className="text-right">
                                                    Action
                                                </TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {unassignedPageItems.length ===
                                            0 ? (
                                                <TableRow>
                                                    <TableCell
                                                        colSpan={3}
                                                        className="py-6 text-center text-sm text-slate-500"
                                                    >
                                                        No unassigned
                                                        participants found.
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                unassignedPageItems.map(
                                                    (participant) => (
                                                        <TableRow
                                                            key={participant.id}
                                                        >
                                                            <TableCell>
                                                                <Checkbox
                                                                    checked={selectedIds.includes(
                                                                        participant.id,
                                                                    )}
                                                                    onCheckedChange={(
                                                                        checked,
                                                                    ) =>
                                                                        toggleUnassignedParticipant(
                                                                            participant.id,
                                                                            Boolean(
                                                                                checked,
                                                                            ),
                                                                        )
                                                                    }
                                                                />
                                                            </TableCell>
                                                            <TableCell>
                                                                <div className="font-medium">
                                                                    {
                                                                        participant.full_name
                                                                    }
                                                                </div>
                                                                <div className="text-xs text-slate-500">
                                                                    {participant.email ||
                                                                        '—'}
                                                                </div>
                                                            </TableCell>
                                                            <TableCell className="text-right">
                                                                <Button
                                                                    type="button"
                                                                    size="sm"
                                                                    variant="outline"
                                                                    onClick={() =>
                                                                        assignSingle(
                                                                            participant.id,
                                                                        )
                                                                    }
                                                                >
                                                                    Assign
                                                                </Button>
                                                            </TableCell>
                                                        </TableRow>
                                                    ),
                                                )
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>

                                <div className="flex items-center justify-between text-sm text-slate-500">
                                    <span>
                                        Page {unassignedPage} of{' '}
                                        {unassignedTotalPages}
                                    </span>
                                    <div className="flex gap-2">
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="outline"
                                            disabled={unassignedPage <= 1}
                                            onClick={() =>
                                                setUnassignedPage((page) =>
                                                    Math.max(1, page - 1),
                                                )
                                            }
                                        >
                                            Previous
                                        </Button>
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="outline"
                                            disabled={
                                                unassignedPage >=
                                                unassignedTotalPages
                                            }
                                            onClick={() =>
                                                setUnassignedPage((page) =>
                                                    Math.min(
                                                        unassignedTotalPages,
                                                        page + 1,
                                                    ),
                                                )
                                            }
                                        >
                                            Next
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ) : null}
                </div>
            </div>

            <Dialog
                open={Boolean(idPreviewParticipant)}
                onOpenChange={(open) => !open && setIdPreviewParticipant(null)}
            >
                <DialogContent className="w-[calc(100vw-1rem)] max-w-[900px] p-3 sm:p-6">
                    <DialogHeader>
                        <DialogTitle>
                            Participant Virtual ID (Landscape)
                        </DialogTitle>
                    </DialogHeader>
                    {idPreviewParticipant ? (
                        <VirtualLandscapeId
                            participant={idPreviewParticipant}
                        />
                    ) : null}
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
