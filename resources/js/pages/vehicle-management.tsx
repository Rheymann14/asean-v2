import * as React from 'react';
import AppLayout from '@/layouts/app-layout';
import { Head, router, useForm } from '@inertiajs/react';
import { type BreadcrumbItem } from '@/types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command';
import { Bus, Check, CheckCircle2, ChevronsUpDown } from 'lucide-react';
import { toast } from 'sonner';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Vehicle Management', href: '/vehicle-management' }];

type EventRow = {
    id: number;
    title: string;
};

type ChedLoUser = {
    id: number;
    full_name: string;
    email: string | null;
};

type VehicleRow = {
    id: number;
    label: string;
    driver_name: string | null;
    plate_number: string | null;
    driver_contact_number: string | null;
    assignments_count: number;
    pickup_sent_at: string | null;
    participants: Array<{
        id: number;
        full_name: string | null;
        email: string | null;
        is_checked: boolean;
    }>;
    incharge: {
        id: number;
        full_name: string;
        email: string | null;
    } | null;
};

type PageProps = {
    events: EventRow[];
    selected_event_id?: number | null;
    ched_lo_users: ChedLoUser[];
    vehicles: VehicleRow[];
};

type SearchItem = {
    value: string;
    label: string;
    description?: string;
};

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
                <Button variant="outline" role="combobox" className="w-full justify-between" type="button">
                    <span className={cn('truncate', !selected && 'text-slate-500')}>
                        {selected ? selected.label : placeholder}
                    </span>
                    <ChevronsUpDown className="h-4 w-4 opacity-60" />
                </Button>
            </PopoverTrigger>
            <PopoverContent
                align="start"
                className="w-[--radix-popover-trigger-width] max-w-[min(22rem,calc(100vw-2rem))] p-0"
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
                                    className="gap-2"
                                >
                                    <Check className={cn('h-4 w-4', value === item.value ? 'opacity-100' : 'opacity-0')} />
                                    <div className="min-w-0">
                                        <div className="truncate">{item.label}</div>
                                        {item.description ? (
                                            <div className="truncate text-xs text-slate-500">{item.description}</div>
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
    toast.error(Array.isArray(first) ? first[0] : first || 'Please review the form and try again.');
}

export default function VehicleManagementPage({ events, selected_event_id, ched_lo_users, vehicles }: PageProps) {
    const selectedEventId = selected_event_id ? String(selected_event_id) : events[0] ? String(events[0].id) : '';
    const [vehicleFilter, setVehicleFilter] = React.useState('all');

    const form = useForm({
        programme_id: selectedEventId,
        label: '',
        driver_name: '',
        plate_number: '',
        driver_contact_number: '',
        incharge_user_id: ched_lo_users[0] ? String(ched_lo_users[0].id) : '',
    });

    const onChangeEvent = (value: string) => {
        form.setData('programme_id', value);
        router.get('/vehicle-management', { event_id: value || undefined }, { preserveState: true, preserveScroll: true, replace: true });
    };

    const submit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        form.post('/transport-vehicles', {
            preserveScroll: true,
            onSuccess: () => {
                toast.success('Vehicle added successfully.');
                form.reset('label', 'driver_name', 'plate_number', 'driver_contact_number');
            },
            onError: (errors) => showToastError(errors as Record<string, string | string[]>),
        });
    };

    const filteredVehicles = React.useMemo(() => {
        if (vehicleFilter === 'all') return vehicles;

        const selectedId = Number(vehicleFilter);
        if (Number.isNaN(selectedId)) return vehicles;

        return vehicles.filter((vehicle) => vehicle.id === selectedId);
    }, [vehicleFilter, vehicles]);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Vehicle Management" />

            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <Bus className="h-5 w-5 text-[#00359c]" />
                        <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">Vehicle Management</h1>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                        Add vehicles per event, set driver details, and assign CHED LO in charge.
                    </p>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Event filter</CardTitle>
                        <CardDescription>Show and add vehicles by event.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="space-y-1">
                            <Label>Event <span className="text-[11px] font-semibold text-red-600">*</span></Label>
                            <SearchableDropdown
                                value={form.data.programme_id}
                                onValueChange={onChangeEvent}
                                placeholder="Select event"
                                searchPlaceholder="Search events..."
                                emptyText="No events found."
                                items={events.map((event) => ({ value: String(event.id), label: event.title }))}
                            />
                            {form.errors.programme_id ? <p className="text-xs text-rose-500">{form.errors.programme_id}</p> : null}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Add Vehicle</CardTitle>
                        <CardDescription>Model/Color/Type Example: Innova Black SUV</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={submit} className="space-y-4">
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-1">
                                    <Label htmlFor="label">Vehicle name <span className="text-[11px] font-semibold text-red-600">*</span></Label>
                                    <Input
                                        id="label"
                                        placeholder="Innova Black SUV"
                                        value={form.data.label}
                                        onChange={(e) => form.setData('label', e.target.value)}
                                    />
                                    {form.errors.label ? <p className="text-xs text-rose-500">{form.errors.label}</p> : null}
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor="driver_name">Driver name <span className="text-[11px] font-semibold text-red-600">*</span></Label>
                                    <Input
                                        id="driver_name"
                                        value={form.data.driver_name}
                                        onChange={(e) => form.setData('driver_name', e.target.value)}
                                    />
                                    {form.errors.driver_name ? <p className="text-xs text-rose-500">{form.errors.driver_name}</p> : null}
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor="plate_number">Plate number</Label>
                                    <Input
                                        id="plate_number"
                                        placeholder="ABC-1234"
                                        value={form.data.plate_number}
                                        onChange={(e) => form.setData('plate_number', e.target.value)}
                                    />
                                    {form.errors.plate_number ? <p className="text-xs text-rose-500">{form.errors.plate_number}</p> : null}
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor="driver_contact_number">Driver contact number <span className="text-[11px] font-semibold text-red-600">*</span></Label>
                                    <Input
                                        id="driver_contact_number"
                                        value={form.data.driver_contact_number}
                                        onChange={(e) => form.setData('driver_contact_number', e.target.value)}
                                    />
                                    {form.errors.driver_contact_number ? (
                                        <p className="text-xs text-rose-500">{form.errors.driver_contact_number}</p>
                                    ) : null}
                                </div>
                                <div className="space-y-1">
                                    <Label>CHED LO in charge <span className="text-[11px] font-semibold text-red-600">*</span></Label>
                                    <SearchableDropdown
                                        value={form.data.incharge_user_id}
                                        onValueChange={(value) => form.setData('incharge_user_id', value)}
                                        placeholder="Select CHED LO"
                                        searchPlaceholder="Search CHED LO..."
                                        emptyText="No CHED LO found."
                                        items={ched_lo_users.map((user) => ({
                                            value: String(user.id),
                                            label: user.full_name,
                                            description: user.email ?? '',
                                        }))}
                                    />
                                    {form.errors.incharge_user_id ? <p className="text-xs text-rose-500">{form.errors.incharge_user_id}</p> : null}
                                </div>
                            </div>
                            <Button type="submit" className="bg-[#00359c] text-white hover:bg-[#00359c]/90" disabled={form.processing}>
                                {form.processing ? 'Adding...' : 'Add Vehicle'}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Vehicle List</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                <div className="space-y-1">
                                    <Label htmlFor="vehicle-filter">Filter vehicles</Label>
                                    <select
                                        id="vehicle-filter"
                                        className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-xs focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-slate-950 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50 dark:focus-visible:ring-slate-300"
                                        value={vehicleFilter}
                                        onChange={(e) => setVehicleFilter(e.target.value)}
                                    >
                                        <option value="all">All vehicles</option>
                                        {vehicles.map((vehicle) => (
                                            <option key={vehicle.id} value={String(vehicle.id)}>
                                                {vehicle.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="hidden overflow-hidden rounded-xl border md:block">
                                <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Vehicle</TableHead>
                                        <TableHead>Driver</TableHead>
                                        <TableHead>Plate #</TableHead>
                                        <TableHead>Contact</TableHead>
                                        <TableHead>CHED LO In Charge</TableHead>
                                        <TableHead>Passengers</TableHead>
                                        <TableHead>Picked Up At</TableHead>
                                        <TableHead className="text-right">Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredVehicles.length > 0 ? (
                                        filteredVehicles.map((vehicle) => (
                                            <TableRow key={vehicle.id}>
                                                <TableCell className="font-medium">{vehicle.label}</TableCell>
                                                <TableCell>{vehicle.driver_name || '—'}</TableCell>
                                                <TableCell>{vehicle.plate_number || '—'}</TableCell>
                                                <TableCell>{vehicle.driver_contact_number || '—'}</TableCell>
                                                <TableCell>{vehicle.incharge?.full_name || '—'}</TableCell>
                                                <TableCell className="text-sm text-slate-600 dark:text-slate-200">
                                                    {vehicle.participants.length ? (
                                                        <div className="space-y-1">
                                                            {vehicle.participants.map((participant) => (
                                                                <div key={participant.id} className="flex items-center gap-2">
                                                                    {participant.is_checked ? (
                                                                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                                                    ) : (
                                                                        <span className="h-4 w-4" />
                                                                    )}
                                                                    <span>{participant.full_name || participant.email || 'Participant'}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        '—'
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    {vehicle.pickup_sent_at ? (
                                                        <Badge className="border-emerald-200 bg-emerald-100 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-900/40 dark:text-emerald-200">
                                                            {new Date(vehicle.pickup_sent_at).toLocaleString()}
                                                        </Badge>
                                                    ) : (
                                                        '—'
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        disabled={vehicle.assignments_count > 0}
                                                        onClick={() => {
                                                            router.delete(`/transport-vehicles/${vehicle.id}`, {
                                                                preserveScroll: true,
                                                                onSuccess: () => toast.success('Vehicle removed.'),
                                                                onError: (errors) => showToastError(errors as Record<string, string | string[]>),
                                                            });
                                                        }}
                                                    >
                                                        Remove
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={8} className="py-6 text-center text-slate-500">
                                                No vehicles yet for this event.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                                </Table>
                            </div>

                            <div className="grid gap-4 md:hidden">
                                {filteredVehicles.length > 0 ? (
                                    filteredVehicles.map((vehicle) => (
                                        <Card key={vehicle.id} className="border-slate-200/80 p-4 shadow-sm dark:border-slate-800">
                                            <div className="space-y-3">
                                                <div>
                                                    <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Vehicle</p>
                                                    <p className="text-base font-semibold text-slate-900 dark:text-slate-100">{vehicle.label}</p>
                                                    <p className="text-sm text-slate-600 dark:text-slate-400">
                                                        {vehicle.plate_number || '—'}
                                                    </p>
                                                </div>
                                                <div className="grid gap-2">
                                                    <div>
                                                        <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Driver</p>
                                                        <p className="text-sm text-slate-700 dark:text-slate-200">{vehicle.driver_name || '—'}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Contact</p>
                                                        <p className="text-sm text-slate-700 dark:text-slate-200">
                                                            {vehicle.driver_contact_number || '—'}
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">CHED LO</p>
                                                        <p className="text-sm text-slate-700 dark:text-slate-200">
                                                            {vehicle.incharge?.full_name || '—'}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div>
                                                    <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Participants</p>
                                                    <div className="mt-2 space-y-1 text-sm text-slate-600 dark:text-slate-200">
                                                        {vehicle.participants.length ? (
                                                            vehicle.participants.map((participant) => (
                                                                <div key={participant.id} className="flex items-center gap-2">
                                                                    {participant.is_checked ? (
                                                                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                                                    ) : (
                                                                        <span className="h-4 w-4" />
                                                                    )}
                                                                    <span>{participant.full_name || participant.email || 'Participant'}</span>
                                                                </div>
                                                            ))
                                                        ) : (
                                                            <p>—</p>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="grid gap-1 text-xs text-slate-600 dark:text-slate-300">
                                                    <p>Picked up at:</p>
                                                    {vehicle.pickup_sent_at ? (
                                                        <Badge className="w-fit border-emerald-200 bg-emerald-100 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-900/40 dark:text-emerald-200">
                                                            {new Date(vehicle.pickup_sent_at).toLocaleString()}
                                                        </Badge>
                                                    ) : (
                                                        <p>—</p>
                                                    )}
                                                </div>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    className="w-full"
                                                    disabled={vehicle.assignments_count > 0}
                                                    onClick={() => {
                                                        router.delete(`/transport-vehicles/${vehicle.id}`, {
                                                            preserveScroll: true,
                                                            onSuccess: () => toast.success('Vehicle removed.'),
                                                            onError: (errors) => showToastError(errors as Record<string, string | string[]>),
                                                        });
                                                    }}
                                                >
                                                    Remove
                                                </Button>
                                            </div>
                                        </Card>
                                    ))
                                ) : (
                                    <Card className="border-dashed">
                                        <div className="px-5 py-6 text-center text-sm text-slate-500">
                                            No vehicles yet for this event.
                                        </div>
                                    </Card>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
