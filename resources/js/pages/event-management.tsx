import AppLayout from '@/layouts/app-layout';
import { cn, toDateOnlyTimestamp } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';
import { Head, router, useForm } from '@inertiajs/react';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

import {
    BadgeCheck,
    CalendarDays,
    CheckCircle2,
    ChevronDown,
    ExternalLink,
    FileText,
    MapPin,
    MoreHorizontal,
    Pencil,
    Plus,
    Search,
    Trash2,
    XCircle,
} from 'lucide-react';

type ProgrammeParticipant = {
    id: number;
    name: string;
    email?: string | null;
    display_id?: string | null;
    checked_in_at?: string | null;
};

type RegistrationFieldType =
    | 'section'
    | 'text'
    | 'textarea'
    | 'email'
    | 'tel'
    | 'date'
    | 'radio'
    | 'checkbox'
    | 'select';

type RegistrationFieldRow = {
    id?: number;
    field_key?: string | null;
    label: string;
    field_type: RegistrationFieldType;
    options: string[];
    placeholder?: string | null;
    help_text?: string | null;
    is_required: boolean;
    sort_order: number;
};

type ProgrammeRow = {
    id: number;
    title: string;
    description: string;
    created_by?: {
        name: string;
    } | null;

    starts_at: string | null; // ISO string
    ends_at: string | null; // ISO string
    location?: string | null;
    venue?: {
        id: number;
        name: string;
        address?: string | null;
        google_maps_url?: string | null;
        embed_url?: string | null;
        is_active?: boolean;
    } | null;

    image_url: string | null; // server-provided
    pdf_url: string | null; // server-provided (for "View more")
    materials?: {
        id: number;
        file_name: string;
        file_path: string;
        file_type: string | null;
    }[];
    registration_fields?: RegistrationFieldRow[];
    signatory_name?: string | null;
    signatory_title?: string | null;
    signatory_signature_url?: string | null;

    is_active: boolean;
    is_registration_active?: boolean;
    updated_at?: string | null;
    participants?: ProgrammeParticipant[];
    participant_count?: number;
    checked_in_count?: number;
};

type PageProps = {
    programmes?: ProgrammeRow[];
};

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Event Management', href: '/event-management' },
];

const ENDPOINTS = {
    programmes: {
        store: '/programmes',
        update: (id: number) => `/programmes/${id}`,
        destroy: (id: number) => `/programmes/${id}`,
        registrationFields: (id: number) =>
            `/programmes/${id}/registration-fields`,
        activeRegistration: (id: number) =>
            `/programmes/${id}/active-registration`,
    },
    venues: {
        store: '/venues',
        update: (id: number) => `/venues/${id}`,
        destroy: (id: number) => `/venues/${id}`,
    },
};

const PRIMARY_BTN =
    'bg-[#00359c] text-white hover:bg-[#00359c]/90 focus-visible:ring-[#00359c]/30 dark:bg-[#00359c] dark:hover:bg-[#00359c]/90';
const DEFAULT_EVENT_IMAGE = '/tumbnail.png';

const REGISTRATION_FIELD_TYPES: {
    value: RegistrationFieldType;
    label: string;
}[] = [
    { value: 'section', label: 'Section header' },
    { value: 'text', label: 'Text input' },
    { value: 'textarea', label: 'Long text' },
    { value: 'email', label: 'Email' },
    { value: 'tel', label: 'Phone' },
    { value: 'date', label: 'Date' },
    { value: 'radio', label: 'Radio buttons' },
    { value: 'checkbox', label: 'Checkboxes' },
    { value: 'select', label: 'Searchable dropdown' },
];

const ASEMME10_REGISTRATION_TEMPLATE: RegistrationFieldRow[] = [
    {
        label: 'Data Collection',
        field_type: 'section',
        options: [],
        is_required: false,
        sort_order: 0,
    },
    {
        label: 'I declare that I have read the Data Processing Policy.',
        field_type: 'radio',
        options: ['Yes'],
        is_required: true,
        sort_order: 1,
    },
    {
        label: 'I consent to our submitted data being collected and stored only for organising this Ministerial Meeting.',
        field_type: 'radio',
        options: ['Yes'],
        is_required: true,
        sort_order: 2,
    },
    {
        label: 'Photo, film, and meeting recording consent',
        field_type: 'radio',
        options: ['I agree to these terms and conditions'],
        is_required: true,
        sort_order: 3,
    },
    {
        label: 'I would like to register...',
        field_type: 'radio',
        options: [
            'Country Delegation',
            'Stakeholder Delegation',
            'ASEAN Secretariat',
            'European Union',
            'Single Participant',
            'Other',
        ],
        is_required: true,
        sort_order: 4,
    },
    {
        label: 'Head of Delegation / Participant',
        field_type: 'section',
        options: [],
        is_required: false,
        sort_order: 5,
    },
    {
        label: 'Title',
        field_type: 'radio',
        options: ['Ms', 'Mr', 'Other'],
        is_required: true,
        sort_order: 6,
    },
    {
        label: 'Given Name',
        field_type: 'text',
        options: [],
        is_required: true,
        sort_order: 7,
    },
    {
        label: 'Family Name / Surname',
        field_type: 'text',
        options: [],
        is_required: true,
        sort_order: 8,
    },
    {
        label: 'Name to be displayed on badge / name tag',
        field_type: 'text',
        options: [],
        is_required: true,
        sort_order: 9,
    },
    {
        label: 'Full Name of Ministry or Organisation',
        field_type: 'text',
        options: [],
        is_required: true,
        sort_order: 10,
    },
    {
        label: 'Position / Job title',
        field_type: 'text',
        options: [],
        is_required: true,
        sort_order: 11,
    },
    {
        label: 'E-mail address',
        field_type: 'email',
        options: [],
        is_required: true,
        sort_order: 12,
    },
    {
        label: 'Speech topic related to the overall theme',
        field_type: 'radio',
        options: [
            'Blue Economy and Green and Digital Transitions',
            'Lifelong Learning and Inclusion',
            'Mobility and Recognition',
            'No speech wanted',
        ],
        is_required: false,
        sort_order: 13,
    },
    {
        label: 'Delegation Details',
        field_type: 'section',
        options: [],
        is_required: false,
        sort_order: 14,
    },
    {
        label: 'Additional comments on delegation',
        field_type: 'textarea',
        options: [],
        is_required: false,
        sort_order: 15,
    },
    {
        label: 'Phone number (mobile) of one delegate who could be contacted in case of need',
        field_type: 'tel',
        options: [],
        placeholder: '+123 (0)4567890',
        is_required: true,
        sort_order: 16,
    },
    {
        label: 'Social activities',
        field_type: 'checkbox',
        options: [
            'Networking Reception on 24 November',
            'Gala Dinner on 25 November',
            'Other',
        ],
        is_required: true,
        sort_order: 17,
    },
    {
        label: 'Who and how many will participate in the Reception and Dinner?',
        field_type: 'textarea',
        options: [],
        is_required: false,
        sort_order: 18,
    },
    {
        label: 'Bilateral Meetings',
        field_type: 'section',
        options: [],
        is_required: false,
        sort_order: 19,
    },
    {
        label: 'Bilateral meeting preference',
        field_type: 'radio',
        options: [
            'Our delegation would like bilateral meetings and wants the below email address(es) added to the contact list',
            "We are not interested in bilateral meetings and don't want our email address added to the contact list",
            'Other',
        ],
        is_required: false,
        sort_order: 20,
    },
    {
        label: 'Email address(es) to add to the bilateral meetings contact list',
        field_type: 'textarea',
        options: [],
        is_required: false,
        sort_order: 21,
    },
    {
        label: 'Additional comments on bilateral meetings',
        field_type: 'textarea',
        options: [],
        is_required: false,
        sort_order: 22,
    },
    {
        label: 'Special Needs',
        field_type: 'section',
        options: [],
        is_required: false,
        sort_order: 23,
    },
    {
        label: 'Specific dietary requirements',
        field_type: 'textarea',
        options: [],
        is_required: false,
        sort_order: 24,
    },
    {
        label: 'Reduced mobility, extra assistance, or other specific needs',
        field_type: 'textarea',
        options: [],
        is_required: false,
        sort_order: 25,
    },
    {
        label: 'Any other comments',
        field_type: 'textarea',
        options: [],
        is_required: false,
        sort_order: 26,
    },
];

// -------------------- helpers --------------------
function formatDatePill(starts_at?: string | null, ends_at?: string | null) {
    if (!starts_at) return '—';
    const s = new Date(starts_at);
    const e = ends_at ? new Date(ends_at) : null;
    if (Number.isNaN(s.getTime())) return '—';

    const d = new Intl.DateTimeFormat('en-PH', {
        month: 'short',
        day: '2-digit',
        year: 'numeric',
    }).format(s);
    const time = (dt: Date) =>
        new Intl.DateTimeFormat('en-PH', {
            hour: 'numeric',
            minute: '2-digit',
        }).format(dt);

    if (!e || Number.isNaN(e.getTime())) return `${d} · ${time(s)}`;
    return `${d} · ${time(s)}–${time(e)}`;
}

function daysToGo(starts_at?: string | null) {
    if (!starts_at) return null;
    const s = new Date(starts_at);
    if (Number.isNaN(s.getTime())) return null;

    const now = new Date();
    const diff = s.getTime() - now.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

    if (days < 0) return 'Ended';
    if (days === 0) return 'Today';
    if (days === 1) return '1 day to go';
    return `${days} days to go`;
}

function formatDateTimeSafe(value?: string | null) {
    if (!value) return '—';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '—';
    return new Intl.DateTimeFormat('en-PH', {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    }).format(d);
}

function toLocalInputValue(iso: string | null | undefined) {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function basename(u: string) {
    const s = u.split('?')[0].split('#')[0];
    const parts = s.split('/').filter(Boolean);
    return parts[parts.length - 1] ?? u;
}

function resolvePdfUrl(pdfUrl?: string | null) {
    if (!pdfUrl) return null;
    if (pdfUrl.startsWith('http') || pdfUrl.startsWith('/')) return pdfUrl;
    const normalized = pdfUrl.replace(/^\.?\/?downloadables\//i, '');
    return `/downloadables/${normalized}`;
}

function resolveImageUrl(imageUrl?: string | null) {
    if (!imageUrl) return DEFAULT_EVENT_IMAGE;
    if (imageUrl.startsWith('http') || imageUrl.startsWith('/'))
        return imageUrl;
    return `/event-images/${imageUrl}`;
}

function getEventStatus(starts_at?: string | null, ends_at?: string | null) {
    if (!starts_at) return 'upcoming';
    const start = new Date(starts_at);
    if (Number.isNaN(start.getTime())) return 'upcoming';

    const end = ends_at ? new Date(ends_at) : null;
    const now = new Date();
    const nowDateTs = toDateOnlyTimestamp(now);
    const startDateTs = toDateOnlyTimestamp(start);
    const endDateTs =
        end && !Number.isNaN(end.getTime()) ? toDateOnlyTimestamp(end) : null;

    if (endDateTs !== null && nowDateTs > endDateTs) return 'closed';
    if (nowDateTs < startDateTs) return 'upcoming';
    return 'ongoing';
}

function StatusBadge({ active }: { active: boolean }) {
    return (
        <span
            className={cn(
                'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-medium',
                active
                    ? 'bg-emerald-600/10 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
                    : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
            )}
        >
            {active ? (
                <CheckCircle2 className="h-3.5 w-3.5" />
            ) : (
                <XCircle className="h-3.5 w-3.5" />
            )}
            {active ? 'Active' : 'Inactive'}
        </span>
    );
}

function RegistrationStatusBadge({ active }: { active: boolean }) {
    if (!active) return null;

    return (
        <span className="inline-flex items-center gap-1 rounded-full bg-[#00359c]/10 px-2.5 py-1 text-[12px] font-medium text-[#00359c] dark:bg-[#4f7cff]/15 dark:text-[#9db5ff]">
            <BadgeCheck className="h-3.5 w-3.5" />
            Active registration
        </span>
    );
}

function EventStatusBadge({
    status,
}: {
    status: 'upcoming' | 'ongoing' | 'closed';
}) {
    const styles = {
        upcoming:
            'bg-sky-600/10 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300',
        ongoing:
            'bg-amber-500/10 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
        closed: 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    } as const;

    const labels = {
        upcoming: 'Upcoming',
        ongoing: 'Ongoing',
        closed: 'Closed',
    } as const;

    return (
        <span
            className={cn(
                'inline-flex rounded-full px-2.5 py-1 text-[12px] font-medium',
                styles[status],
            )}
        >
            {labels[status]}
        </span>
    );
}

function showToastError(errors: Record<string, string | string[]>) {
    const firstError = Object.values(errors ?? {})[0];
    const message = Array.isArray(firstError) ? firstError[0] : firstError;
    toast.error(message || 'Something went wrong. Please try again.');
}

function EmptyState({
    icon,
    title,
    subtitle,
    action,
}: {
    icon: React.ReactNode;
    title: string;
    subtitle: string;
    action?: React.ReactNode;
}) {
    return (
        <div className="grid place-items-center rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center dark:border-slate-800 dark:bg-slate-950">
            <div className="grid place-items-center gap-2">
                <div className="grid size-12 place-items-center rounded-2xl bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-200">
                    {icon}
                </div>
                <div className="mt-2 text-base font-semibold text-slate-900 dark:text-slate-100">
                    {title}
                </div>
                <div className="max-w-md text-sm text-slate-600 dark:text-slate-400">
                    {subtitle}
                </div>
                {action ? <div className="mt-4">{action}</div> : null}
            </div>
        </div>
    );
}

function VenueMapPreview({
    embedUrl,
    googleMapsUrl,
}: {
    embedUrl?: string | null;
    googleMapsUrl?: string | null;
}) {
    if (!embedUrl) {
        return (
            <div className="grid h-[320px] place-items-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-center dark:border-slate-800 dark:bg-slate-900/30">
                <div className="grid place-items-center gap-2 px-6">
                    <MapPin className="h-7 w-7 text-slate-500" />
                    <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        No map embed yet
                    </div>
                    <div className="text-sm text-slate-600 dark:text-slate-400">
                        Enter a venue name or address to preview the map here.
                    </div>

                    {googleMapsUrl ? (
                        <Button
                            asChild
                            variant="secondary"
                            className="mt-2 rounded-full"
                        >
                            <a
                                href={googleMapsUrl}
                                target="_blank"
                                rel="noreferrer"
                            >
                                <ExternalLink className="mr-2 h-4 w-4" />
                                Open in Google Maps
                            </a>
                        </Button>
                    ) : null}
                </div>
            </div>
        );
    }

    return (
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
            <iframe
                title="Venue map preview"
                src={embedUrl}
                className="pointer-events-none h-[320px] w-full"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
            />
            <div
                aria-hidden
                className="pointer-events-none absolute top-3 left-3 h-16 w-52 rounded-lg bg-white/90 shadow-sm dark:bg-slate-900/90"
            />
            <div
                aria-hidden
                className="pointer-events-none absolute top-3 right-3 h-12 w-12 rounded-lg bg-white/90 shadow-sm dark:bg-slate-900/90"
            />
        </div>
    );
}

function extractIframeSrc(value: string) {
    const trimmed = value.trim();
    if (!trimmed) return '';
    if (!trimmed.includes('<iframe')) return trimmed;
    const match = trimmed.match(/src=["']([^"']+)["']/i);
    return match?.[1] ?? trimmed;
}

function resolveVenueEmbedUrl(name: string, address: string, embedUrl: string) {
    const explicitEmbed = extractIframeSrc(embedUrl);
    if (explicitEmbed) return explicitEmbed;

    const query = [name, address].filter(Boolean).join(', ').trim();
    if (!query) return '';

    return `https://maps.google.com/maps?output=embed&z=16&q=${encodeURIComponent(query)}`;
}

export default function EventManagement(props: PageProps) {
    const serverProgrammes: ProgrammeRow[] = props.programmes ?? [];

    const programmes: ProgrammeRow[] = React.useMemo(
        () => serverProgrammes,
        [serverProgrammes],
    );

    // filters
    const [q, setQ] = React.useState('');
    const [statusFilter, setStatusFilter] = React.useState<
        'all' | 'active' | 'inactive' | 'registration'
    >('all');
    const [eventFilter, setEventFilter] = React.useState<
        'all' | 'upcoming' | 'ongoing' | 'closed'
    >('all');
    const [expandedRows, setExpandedRows] = React.useState<Set<number>>(
        new Set(),
    );

    const filtered = React.useMemo(() => {
        const query = q.trim().toLowerCase();
        return programmes.filter((p) => {
            const createdBy = p.created_by?.name ?? '';
            const venueText = `${p.venue?.name ?? ''} ${p.venue?.address ?? ''}`;
            const matchesQuery =
                !query ||
                `${p.title} ${p.description} ${createdBy} ${venueText}`
                    .toLowerCase()
                    .includes(query);
            const matchesStatus =
                statusFilter === 'all' ||
                (statusFilter === 'registration'
                    ? !!p.is_registration_active
                    : statusFilter === 'active'
                      ? p.is_active
                      : !p.is_active);
            const phase = getEventStatus(p.starts_at, p.ends_at);
            const matchesEvent = eventFilter === 'all' || phase === eventFilter;
            return matchesQuery && matchesStatus && matchesEvent;
        });
    }, [programmes, q, statusFilter, eventFilter]);

    // dialogs + editing
    const [dialogOpen, setDialogOpen] = React.useState(false);
    const [editing, setEditing] = React.useState<ProgrammeRow | null>(null);

    // delete
    const [deleteOpen, setDeleteOpen] = React.useState(false);
    const [deleteTarget, setDeleteTarget] = React.useState<ProgrammeRow | null>(
        null,
    );
    const [registrationTarget, setRegistrationTarget] =
        React.useState<ProgrammeRow | null>(null);

    type MaterialRow = NonNullable<ProgrammeRow['materials']>[number];

    const [existingMaterials, setExistingMaterials] = React.useState<
        MaterialRow[]
    >([]);
    const [removedMaterials, setRemovedMaterials] = React.useState<
        MaterialRow[]
    >([]);
    const [removedMaterialIds, setRemovedMaterialIds] = React.useState<
        number[]
    >([]);

    // new uploads (client)
    const [materialsFiles, setMaterialsFiles] = React.useState<File[]>([]);

    function resolveMaterialUrl(path: string) {
        if (!path) return '#';
        if (path.startsWith('http') || path.startsWith('/')) return path;
        // typical Laravel Storage::url() stores "folder/file.ext" -> /storage/folder/file.ext
        return `/storage/${path}`;
    }

    // ✅ existing file urls (server) when editing
    const [currentImageUrl, setCurrentImageUrl] = React.useState<string | null>(
        null,
    );
    const [currentPdfUrl, setCurrentPdfUrl] = React.useState<string | null>(
        null,
    );

    // image preview
    const [imagePreview, setImagePreview] = React.useState<string | null>(null);

    // pdf label
    const [pdfLabel, setPdfLabel] = React.useState<string>('');
    const [materialsLabel, setMaterialsLabel] = React.useState<string>('');

    React.useEffect(() => {
        return () => {
            if (imagePreview?.startsWith('blob:'))
                URL.revokeObjectURL(imagePreview);
        };
    }, [imagePreview]);

    const form = useForm<{
        title: string;
        description: string;
        starts_at: string; // datetime-local
        ends_at: string; // datetime-local
        image: File | null;
        pdf: File | null;
        materials: File[];
        is_active: boolean;
    }>({
        title: '',
        description: '',
        starts_at: '',
        ends_at: '',
        image: null,
        pdf: null,
        materials: [],
        is_active: true,
    });

    const [venueTarget, setVenueTarget] = React.useState<ProgrammeRow | null>(
        null,
    );
    const [venueDeleteOpen, setVenueDeleteOpen] = React.useState(false);
    const [venueDeleteTarget, setVenueDeleteTarget] =
        React.useState<ProgrammeRow | null>(null);
    const [venueDeleting, setVenueDeleting] = React.useState(false);

    const venueForm = useForm<{
        name: string;
        address: string;
        google_maps_url: string;
        embed_url: string;
        is_active: boolean;
    }>({
        name: '',
        address: '',
        google_maps_url: '',
        embed_url: '',
        is_active: true,
    });

    const registrationForm = useForm<{
        registration_fields: RegistrationFieldRow[];
    }>({
        registration_fields: [],
    });

    const venueEmbedPreviewUrl = React.useMemo(
        () =>
            resolveVenueEmbedUrl(
                venueForm.data.name,
                venueForm.data.address,
                venueForm.data.embed_url,
            ),
        [venueForm.data.name, venueForm.data.address, venueForm.data.embed_url],
    );

    function resetImagePreview(next: string | null) {
        setImagePreview((prev) => {
            if (prev?.startsWith('blob:')) URL.revokeObjectURL(prev);
            return next;
        });
    }

    function openAdd() {
        setEditing(null);
        form.reset();
        form.clearErrors();

        setCurrentImageUrl(null);
        setCurrentPdfUrl(null);

        resetImagePreview(DEFAULT_EVENT_IMAGE);
        setPdfLabel('');
        setMaterialsLabel('');

        setExistingMaterials([]);
        setRemovedMaterials([]);
        setRemovedMaterialIds([]);
        setMaterialsFiles([]);
        form.setData('materials', []);
        setMaterialsLabel('');

        setDialogOpen(true);
    }

    function openEdit(item: ProgrammeRow) {
        setEditing(item);

        setCurrentImageUrl(
            item.image_url ? resolveImageUrl(item.image_url) : null,
        );
        setCurrentPdfUrl(resolvePdfUrl(item.pdf_url));

        setExistingMaterials(item.materials ?? []);
        setRemovedMaterials([]);
        setRemovedMaterialIds([]);
        setMaterialsFiles([]);
        form.setData('materials', []);
        setMaterialsLabel('');

        form.setData({
            title: item.title ?? '',
            description: item.description ?? '',
            starts_at: toLocalInputValue(item.starts_at),
            ends_at: toLocalInputValue(item.ends_at),
            image: null,
            pdf: null,
            materials: [],
            is_active: !!item.is_active,
        });

        form.clearErrors();

        // show existing as "preview" until new upload
        resetImagePreview(resolveImageUrl(item.image_url));
        setPdfLabel(
            item.pdf_url
                ? basename(resolvePdfUrl(item.pdf_url) ?? item.pdf_url)
                : '',
        );
        setMaterialsLabel('');

        setDialogOpen(true);
    }

    function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0] ?? null;
        form.setData('image', file);

        if (!file) {
            resetImagePreview(currentImageUrl);
            return;
        }

        resetImagePreview(URL.createObjectURL(file));
    }

    function handlePdfUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0] ?? null;
        form.setData('pdf', file);

        if (!file) {
            setPdfLabel(currentPdfUrl ? basename(currentPdfUrl) : '');
            return;
        }

        setPdfLabel(file.name);
    }

    function handleMaterialsUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const picked = Array.from(e.target.files ?? []);
        if (!picked.length) return;

        const keyOf = (f: File) => `${f.name}-${f.size}-${f.lastModified}`;

        setMaterialsFiles((prev) => {
            const existingKeys = new Set(prev.map(keyOf));
            const next = [...prev];
            for (const f of picked) {
                const k = keyOf(f);
                if (!existingKeys.has(k)) next.push(f);
            }

            form.setData('materials', next);
            setMaterialsLabel(
                next.length ? `${next.length} file(s) selected` : '',
            );
            return next;
        });

        // allow selecting the same file again later
        e.currentTarget.value = '';
    }

    function submit(e: React.FormEvent) {
        e.preventDefault();

        const hasUploads = Boolean(
            form.data.image || form.data.pdf || form.data.materials.length,
        );
        form.transform((data) => {
            const payload: any = {
                title: data.title.trim(),
                description: data.description.trim(),
                starts_at: data.starts_at
                    ? new Date(data.starts_at).toISOString()
                    : null,
                ends_at: data.ends_at
                    ? new Date(data.ends_at).toISOString()
                    : null,
                is_active: editing ? !!editing.is_active : !!data.is_active,
            };

            // only send if selected (so editing won't overwrite existing files)
            if (data.image) payload.image = data.image;
            if (data.pdf) payload.pdf = data.pdf;
            if (data.materials.length) payload.materials = data.materials;
            if (removedMaterialIds.length)
                payload.materials_remove = removedMaterialIds;
            if (editing) payload._method = 'patch';

            return payload;
        });

        const options = {
            preserveScroll: true,
            forceFormData: hasUploads,
            onSuccess: () => {
                setDialogOpen(false);
                setEditing(null);
                toast.success(`Event ${editing ? 'updated' : 'created'}.`);
            },
            onError: (errors: Record<string, string | string[]>) =>
                showToastError(errors),
        } as const;

        if (editing)
            form.post(ENDPOINTS.programmes.update(editing.id), options);
        else form.post(ENDPOINTS.programmes.store, options);
    }

    function toggleActive(item: ProgrammeRow) {
        router.patch(
            ENDPOINTS.programmes.update(item.id),
            { is_active: !item.is_active },
            {
                preserveScroll: true,
                onSuccess: () =>
                    toast.success(
                        `Event ${item.is_active ? 'deactivated' : 'activated'}.`,
                    ),
                onError: () => toast.error('Unable to update event status.'),
            },
        );
    }

    function setActiveRegistration(item: ProgrammeRow) {
        router.patch(
            ENDPOINTS.programmes.activeRegistration(item.id),
            {},
            {
                preserveScroll: true,
                onSuccess: () =>
                    toast.success('Active registration event updated.'),
                onError: () =>
                    toast.error('Unable to update active registration event.'),
            },
        );
    }

    function requestDelete(item: ProgrammeRow) {
        setDeleteTarget(item);
        setDeleteOpen(true);
    }

    function confirmDelete() {
        if (!deleteTarget) return;

        router.delete(ENDPOINTS.programmes.destroy(deleteTarget.id), {
            preserveScroll: true,
            onFinish: () => {
                setDeleteOpen(false);
                setDeleteTarget(null);
            },
            onSuccess: () => toast.success('Event deleted.'),
            onError: () => toast.error('Unable to delete event.'),
        });
    }

    function openParticipants(item: ProgrammeRow) {
        router.get(`/event-management/${item.id}/participants`);
    }

    function normalizeRegistrationFields(fields: RegistrationFieldRow[]) {
        return fields.map((field, index) => ({
            ...field,
            options: Array.isArray(field.options) ? field.options : [],
            is_required:
                field.field_type === 'section' ? false : !!field.is_required,
            sort_order: index,
        }));
    }

    function openRegistrationFields(item: ProgrammeRow) {
        setRegistrationTarget(item);
        registrationForm.setData(
            'registration_fields',
            normalizeRegistrationFields(item.registration_fields ?? []),
        );
        registrationForm.clearErrors();
    }

    function closeRegistrationFields() {
        if (registrationForm.processing) return;
        setRegistrationTarget(null);
        registrationForm.reset();
        registrationForm.clearErrors();
    }

    function addRegistrationField(field?: Partial<RegistrationFieldRow>) {
        registrationForm.setData(
            'registration_fields',
            normalizeRegistrationFields([
                ...registrationForm.data.registration_fields,
                {
                    label: '',
                    field_type: 'text',
                    options: [],
                    placeholder: '',
                    help_text: '',
                    is_required: false,
                    sort_order:
                        registrationForm.data.registration_fields.length,
                    ...field,
                },
            ]),
        );
    }

    function updateRegistrationField(
        index: number,
        patch: Partial<RegistrationFieldRow>,
    ) {
        registrationForm.setData(
            'registration_fields',
            normalizeRegistrationFields(
                registrationForm.data.registration_fields.map(
                    (field, fieldIndex) =>
                        fieldIndex === index ? { ...field, ...patch } : field,
                ),
            ),
        );
    }

    function removeRegistrationField(index: number) {
        registrationForm.setData(
            'registration_fields',
            normalizeRegistrationFields(
                registrationForm.data.registration_fields.filter(
                    (_, fieldIndex) => fieldIndex !== index,
                ),
            ),
        );
    }

    function moveRegistrationField(index: number, direction: -1 | 1) {
        const next = [...registrationForm.data.registration_fields];
        const targetIndex = index + direction;
        if (targetIndex < 0 || targetIndex >= next.length) return;
        [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
        registrationForm.setData(
            'registration_fields',
            normalizeRegistrationFields(next),
        );
    }

    function applyAsemmeTemplate() {
        registrationForm.setData(
            'registration_fields',
            normalizeRegistrationFields([
                ...registrationForm.data.registration_fields,
                ...ASEMME10_REGISTRATION_TEMPLATE.map((field) => ({
                    ...field,
                    id: undefined,
                    field_key: undefined,
                })),
            ]),
        );
    }

    function submitRegistrationFields(e: React.FormEvent) {
        e.preventDefault();
        if (!registrationTarget) return;

        registrationForm.transform((data) => ({
            registration_fields: normalizeRegistrationFields(
                data.registration_fields,
            ).map((field) => ({
                ...field,
                label: field.label.trim(),
                field_key: field.field_key?.trim() || null,
                placeholder: field.placeholder?.trim() || null,
                help_text: field.help_text?.trim() || null,
                options: field.options
                    .map((option) => option.trim())
                    .filter(Boolean),
            })),
        }));

        registrationForm.patch(
            ENDPOINTS.programmes.registrationFields(registrationTarget.id),
            {
                preserveScroll: true,
                onSuccess: () => {
                    setRegistrationTarget(null);
                    registrationForm.reset();
                    registrationForm.clearErrors();
                    toast.success('Registration fields saved.');
                },
                onError: (errors: Record<string, string | string[]>) =>
                    showToastError(errors),
            },
        );
    }

    function openVenueDialog(item: ProgrammeRow) {
        setVenueTarget(item);
        venueForm.setData({
            name: item.venue?.name ?? '',
            address: item.venue?.address ?? '',
            google_maps_url: item.venue?.google_maps_url ?? '',
            embed_url: item.venue?.embed_url ?? '',
            is_active: item.venue?.is_active ?? true,
        });
        venueForm.clearErrors();
    }

    function closeVenueDialog() {
        if (venueForm.processing) return;

        setVenueTarget(null);
        venueForm.reset();
        venueForm.clearErrors();
    }

    function submitVenue(e: React.FormEvent) {
        e.preventDefault();

        if (!venueTarget) return;

        venueForm.transform((data) => ({
            programme_id: venueTarget.id,
            name: data.name.trim(),
            address: data.address.trim(),
            google_maps_url: data.google_maps_url.trim() || null,
            embed_url:
                resolveVenueEmbedUrl(
                    data.name.trim(),
                    data.address.trim(),
                    data.embed_url,
                ) || null,
            is_active: !!data.is_active,
        }));

        const options = {
            preserveScroll: true,
            onSuccess: () => {
                setVenueTarget(null);
                venueForm.reset();
                venueForm.clearErrors();
                toast.success('Venue saved.');
            },
            onError: (errors: Record<string, string | string[]>) =>
                showToastError(errors),
        } as const;

        if (venueTarget.venue?.id) {
            venueForm.patch(
                ENDPOINTS.venues.update(venueTarget.venue.id),
                options,
            );
        } else {
            venueForm.post(ENDPOINTS.venues.store, options);
        }
    }

    function requestVenueDelete(item: ProgrammeRow) {
        if (!item.venue?.id) return;

        setVenueDeleteTarget(item);
        setVenueDeleteOpen(true);
    }

    function confirmVenueDelete() {
        const venueId = venueDeleteTarget?.venue?.id;
        if (!venueId) return;

        router.delete(ENDPOINTS.venues.destroy(venueId), {
            preserveScroll: true,
            onStart: () => setVenueDeleting(true),
            onFinish: () => {
                setVenueDeleting(false);
                setVenueDeleteOpen(false);
                setVenueDeleteTarget(null);
            },
            onSuccess: () => {
                setVenueTarget(null);
                venueForm.reset();
                venueForm.clearErrors();
                toast.success('Venue removed.');
            },
            onError: () => toast.error('Unable to remove venue.'),
        });
    }

    function toggleExpanded(id: number) {
        setExpandedRows((current) => {
            const next = new Set(current);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }

    function renderPdfLink(item: ProgrammeRow, compact = false) {
        const pdfUrl = resolvePdfUrl(item.pdf_url);
        if (!pdfUrl) {
            return (
                <span className="text-xs text-slate-500 dark:text-slate-400">
                    No PDF uploaded
                </span>
            );
        }

        return (
            <a
                href={pdfUrl}
                target="_blank"
                rel="noreferrer"
                className={cn(
                    'inline-flex max-w-full items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 transition hover:border-[#00359c] hover:text-[#00359c] dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200',
                    compact ? 'w-full justify-center sm:w-auto' : '',
                )}
            >
                <FileText className="h-4 w-4 shrink-0 text-[#00359c]" />
                <span className="truncate">{basename(pdfUrl)}</span>
            </a>
        );
    }

    function renderVenueSummary(item: ProgrammeRow, compact = false) {
        if (!item.venue) {
            return (
                <span className="text-xs text-slate-500 dark:text-slate-400">
                    No venue yet
                </span>
            );
        }

        return (
            <div className="space-y-1">
                <div className="flex min-w-0 items-center gap-2 font-medium text-slate-900 dark:text-slate-100">
                    <MapPin className="h-4 w-4 shrink-0 text-slate-500" />
                    <span className="truncate">{item.venue.name}</span>
                </div>
                {item.venue.address ? (
                    <div
                        className={cn(
                            'text-xs text-slate-500 dark:text-slate-400',
                            compact ? '' : 'line-clamp-2',
                        )}
                    >
                        {item.venue.address}
                    </div>
                ) : null}
                <div className="flex flex-wrap items-center gap-2 text-xs">
                    {item.venue.google_maps_url ? (
                        <a
                            href={item.venue.google_maps_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 font-medium text-[#00359c] hover:underline"
                        >
                            <ExternalLink className="h-3.5 w-3.5" />
                            Google Maps
                        </a>
                    ) : null}
                    {item.venue.is_active === false ? (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-500 dark:bg-slate-900">
                            Inactive
                        </span>
                    ) : null}
                </div>
            </div>
        );
    }

    function renderParticipantsButton(item: ProgrammeRow, fullWidth = false) {
        return (
            <button
                type="button"
                onClick={() => openParticipants(item)}
                className={cn(
                    'inline-flex items-center justify-center gap-2 rounded-full border border-[#00359c]/20 bg-[#00359c]/5 px-3 py-1 text-sm font-semibold text-[#00359c] shadow-sm hover:bg-[#00359c]/10 focus-visible:ring-2 focus-visible:ring-[#00359c]/30 focus-visible:outline-none',
                    fullWidth ? 'w-full' : '',
                )}
            >
                {(
                    item.participant_count ??
                    item.participants?.length ??
                    0
                ).toLocaleString()}{' '}
                joined
                <span className="text-xs font-medium opacity-70">View</span>
            </button>
        );
    }

    function renderActionMenu(item: ProgrammeRow) {
        return (
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-full"
                    >
                        <MoreHorizontal className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>

                <DropdownMenuContent align="end" className="w-52">
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    <DropdownMenuItem onSelect={() => openEdit(item)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => openVenueDialog(item)}>
                        <MapPin className="mr-2 h-4 w-4" />
                        Add venue
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        onSelect={() => openRegistrationFields(item)}
                    >
                        <FileText className="mr-2 h-4 w-4" />
                        Registration fields
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => toggleActive(item)}>
                        <BadgeCheck className="mr-2 h-4 w-4" />
                        {item.is_active ? 'Set Inactive' : 'Set Active'}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        disabled={!!item.is_registration_active}
                        onSelect={() => setActiveRegistration(item)}
                    >
                        <BadgeCheck className="mr-2 h-4 w-4" />
                        {item.is_registration_active
                            ? 'Active registration'
                            : 'Set active registration'}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                        className="text-red-600 focus:text-red-600"
                        onSelect={() => requestDelete(item)}
                    >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        );
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Event Management" />

            {/* ✅ removed overflow-x-auto here */}
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                {/* header */}
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                        <CalendarDays className="h-5 w-5 text-[#00359c]" />
                        <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
                            Event Management
                        </h1>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                        Manage event cards shown on the public Event page.
                    </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto">
                            <div className="relative w-full sm:w-[360px]">
                                <Search className="pointer-events-none absolute top-2.5 left-3 h-4 w-4 text-slate-500" />
                                <Input
                                    value={q}
                                    onChange={(e) => setQ(e.target.value)}
                                    placeholder="Search title or description..."
                                    className="pl-9"
                                />
                            </div>

                            <Select
                                value={statusFilter}
                                onValueChange={(v) => setStatusFilter(v as any)}
                            >
                                <SelectTrigger className="w-full sm:w-[170px]">
                                    <SelectValue placeholder="Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All</SelectItem>
                                    <SelectItem value="active">
                                        Active
                                    </SelectItem>
                                    <SelectItem value="inactive">
                                        Inactive
                                    </SelectItem>
                                    <SelectItem value="registration">
                                        Active registration
                                    </SelectItem>
                                </SelectContent>
                            </Select>

                            <Select
                                value={eventFilter}
                                onValueChange={(v) => setEventFilter(v as any)}
                            >
                                <SelectTrigger className="w-full sm:w-[190px]">
                                    <SelectValue placeholder="Event phase" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">
                                        All phases
                                    </SelectItem>
                                    <SelectItem value="ongoing">
                                        Ongoing
                                    </SelectItem>
                                    <SelectItem value="upcoming">
                                        Upcoming
                                    </SelectItem>
                                    <SelectItem value="closed">
                                        Closed
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <Button
                            onClick={openAdd}
                            className={cn('w-full sm:w-auto', PRIMARY_BTN)}
                        >
                            <Plus className="mr-2 h-4 w-4" />
                            Add Event
                        </Button>
                    </div>

                    <Separator className="my-4" />

                    <div className="text-sm text-slate-600 dark:text-slate-400">
                        Showing{' '}
                        <span className="font-semibold text-slate-900 dark:text-slate-100">
                            {filtered.length}
                        </span>{' '}
                        item{filtered.length === 1 ? '' : 's'}
                    </div>

                    <div className="mt-4">
                        {filtered.length === 0 ? (
                            <EmptyState
                                icon={<CalendarDays className="h-5 w-5" />}
                                title="No event items found"
                                subtitle="Try adjusting your search/filter, or add a new event item."
                            />
                        ) : (
                            // ✅ scrollbar only in table area
                            <>
                                <div className="space-y-3 xl:hidden">
                                    {filtered.map((p) => (
                                        <div
                                            key={p.id}
                                            className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950"
                                        >
                                            <div className="flex items-start gap-3">
                                                <div className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
                                                    <img
                                                        src={resolveImageUrl(
                                                            p.image_url,
                                                        )}
                                                        alt={p.title}
                                                        className="h-full w-full object-cover"
                                                        loading="lazy"
                                                        draggable={false}
                                                    />
                                                </div>

                                                <div className="min-w-0 flex-1">
                                                    <div className="line-clamp-2 font-semibold text-slate-900 dark:text-slate-100">
                                                        {p.title}
                                                    </div>
                                                    <div className="mt-1 text-sm text-slate-700 dark:text-slate-300">
                                                        {formatDatePill(
                                                            p.starts_at,
                                                            p.ends_at,
                                                        )}
                                                    </div>
                                                    <div className="text-xs text-slate-500 dark:text-slate-400">
                                                        {daysToGo(
                                                            p.starts_at,
                                                        ) ?? '—'}
                                                    </div>
                                                </div>

                                                {renderActionMenu(p)}
                                            </div>

                                            <div className="mt-3 grid gap-3">
                                                {renderVenueSummary(p, true)}

                                                <div className="flex flex-wrap gap-2">
                                                    <EventStatusBadge
                                                        status={getEventStatus(
                                                            p.starts_at,
                                                            p.ends_at,
                                                        )}
                                                    />
                                                    <StatusBadge
                                                        active={p.is_active}
                                                    />
                                                    <RegistrationStatusBadge
                                                        active={
                                                            !!p.is_registration_active
                                                        }
                                                    />
                                                </div>

                                                <div className="grid gap-2 sm:grid-cols-2">
                                                    {renderParticipantsButton(
                                                        p,
                                                        true,
                                                    )}
                                                    {renderPdfLink(p, true)}
                                                </div>

                                                <div className="text-xs text-slate-500 dark:text-slate-400">
                                                    Updated{' '}
                                                    {formatDateTimeSafe(
                                                        p.updated_at,
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="hidden overflow-hidden rounded-2xl border border-slate-200 xl:block dark:border-slate-800">
                                    <div className="grid grid-cols-[minmax(300px,1fr)_220px_150px_185px_170px_72px] items-center gap-4 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 dark:bg-slate-900/40 dark:text-slate-100">
                                        <div>Event</div>
                                        <div>Schedule</div>
                                        <div>Event Status</div>
                                        <div>Status</div>
                                        <div>Participants</div>
                                        <div className="text-right">Action</div>
                                    </div>

                                    <div className="divide-y divide-slate-200 dark:divide-slate-800">
                                        {filtered.map((p) => {
                                            const expanded = expandedRows.has(
                                                p.id,
                                            );

                                            return (
                                                <div
                                                    key={p.id}
                                                    className="bg-white dark:bg-slate-950"
                                                >
                                                    <div className="grid grid-cols-[minmax(300px,1fr)_220px_150px_185px_170px_72px] items-center gap-4 px-4 py-3">
                                                        <div className="flex min-w-0 items-center gap-3">
                                                            <div className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
                                                                <img
                                                                    src={resolveImageUrl(
                                                                        p.image_url,
                                                                    )}
                                                                    alt={
                                                                        p.title
                                                                    }
                                                                    className="h-full w-full object-cover"
                                                                    loading="lazy"
                                                                    draggable={
                                                                        false
                                                                    }
                                                                />
                                                            </div>

                                                            <div className="min-w-0">
                                                                <div className="line-clamp-2 leading-snug font-semibold text-slate-900 dark:text-slate-100">
                                                                    {p.title}
                                                                </div>
                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        toggleExpanded(
                                                                            p.id,
                                                                        )
                                                                    }
                                                                    className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-[#00359c] hover:underline"
                                                                >
                                                                    <ChevronDown
                                                                        className={cn(
                                                                            'h-3.5 w-3.5 transition-transform',
                                                                            expanded
                                                                                ? 'rotate-180'
                                                                                : '',
                                                                        )}
                                                                    />
                                                                    {expanded
                                                                        ? 'Hide details'
                                                                        : 'Show details'}
                                                                </button>
                                                            </div>
                                                        </div>

                                                        <div className="min-w-0 text-sm text-slate-700 dark:text-slate-300">
                                                            <div className="leading-snug font-medium">
                                                                {formatDatePill(
                                                                    p.starts_at,
                                                                    p.ends_at,
                                                                )}
                                                            </div>
                                                            <div className="text-xs text-slate-500 dark:text-slate-400">
                                                                {daysToGo(
                                                                    p.starts_at,
                                                                ) ?? '—'}
                                                            </div>
                                                        </div>

                                                        <div>
                                                            <EventStatusBadge
                                                                status={getEventStatus(
                                                                    p.starts_at,
                                                                    p.ends_at,
                                                                )}
                                                            />
                                                        </div>

                                                        <div>
                                                            <div className="flex flex-wrap gap-2">
                                                                <StatusBadge
                                                                    active={
                                                                        p.is_active
                                                                    }
                                                                />
                                                                <RegistrationStatusBadge
                                                                    active={
                                                                        !!p.is_registration_active
                                                                    }
                                                                />
                                                            </div>
                                                        </div>

                                                        <div>
                                                            {renderParticipantsButton(
                                                                p,
                                                            )}
                                                        </div>

                                                        <div className="text-right">
                                                            {renderActionMenu(
                                                                p,
                                                            )}
                                                        </div>
                                                    </div>

                                                    {expanded ? (
                                                        <div className="border-t border-slate-100 bg-slate-50/70 px-6 py-5 dark:border-slate-800 dark:bg-slate-900/30">
                                                            <div className="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)_minmax(0,0.75fr)_minmax(0,0.8fr)]">
                                                                <div className="min-w-0">
                                                                    <div className="text-xs font-semibold text-slate-500 uppercase dark:text-slate-400">
                                                                        Description
                                                                    </div>
                                                                    <div className="mt-2 text-sm leading-6 break-words text-slate-700 dark:text-slate-300">
                                                                        {
                                                                            p.description
                                                                        }
                                                                    </div>
                                                                </div>

                                                                <div className="min-w-0">
                                                                    <div className="text-xs font-semibold text-slate-500 uppercase dark:text-slate-400">
                                                                        Venue
                                                                    </div>
                                                                    <div className="mt-2 text-sm break-words text-slate-700 dark:text-slate-300">
                                                                        {renderVenueSummary(
                                                                            p,
                                                                            true,
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                <div className="min-w-0">
                                                                    <div className="text-xs font-semibold text-slate-500 uppercase dark:text-slate-400">
                                                                        View
                                                                        More
                                                                    </div>
                                                                    <div className="mt-2">
                                                                        {renderPdfLink(
                                                                            p,
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                <div>
                                                                    <div className="text-xs font-semibold text-slate-500 uppercase dark:text-slate-400">
                                                                        Updated
                                                                    </div>
                                                                    <div className="mt-2 text-sm text-slate-700 dark:text-slate-300">
                                                                        {formatDateTimeSafe(
                                                                            p.updated_at,
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ) : null}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="hidden">
                                    <Table className="w-full table-fixed">
                                        <TableHeader>
                                            <TableRow className="bg-slate-50 dark:bg-slate-900/40">
                                                <TableHead>Event</TableHead>

                                                <TableHead className="w-[220px]">
                                                    Schedule
                                                </TableHead>
                                                <TableHead className="hidden">
                                                    Venue
                                                </TableHead>
                                                <TableHead className="hidden">
                                                    View more (PDF)
                                                </TableHead>
                                                <TableHead className="w-[150px]">
                                                    Event Status
                                                </TableHead>
                                                <TableHead className="w-[125px]">
                                                    Status
                                                </TableHead>
                                                <TableHead className="w-[170px]">
                                                    Participants
                                                </TableHead>
                                                <TableHead className="hidden">
                                                    Updated
                                                </TableHead>
                                                <TableHead className="w-[72px] text-right">
                                                    Action
                                                </TableHead>
                                            </TableRow>
                                        </TableHeader>

                                        <TableBody>
                                            {filtered.map((p) => {
                                                const expanded =
                                                    expandedRows.has(p.id);

                                                return (
                                                    <React.Fragment key={p.id}>
                                                        <TableRow>
                                                            <TableCell className="font-semibold whitespace-normal text-slate-900 dark:text-slate-100">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="grid size-10 place-items-center overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
                                                                        {(() => {
                                                                            const imageUrl =
                                                                                resolveImageUrl(
                                                                                    p.image_url,
                                                                                );
                                                                            return (
                                                                                <img
                                                                                    src={
                                                                                        imageUrl
                                                                                    }
                                                                                    alt={
                                                                                        p.title
                                                                                    }
                                                                                    className="h-full w-full object-cover"
                                                                                    loading="lazy"
                                                                                    draggable={
                                                                                        false
                                                                                    }
                                                                                />
                                                                            );
                                                                        })()}
                                                                    </div>

                                                                    <div className="min-w-0">
                                                                        <div className="line-clamp-2 leading-snug">
                                                                            {
                                                                                p.title
                                                                            }
                                                                        </div>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() =>
                                                                                toggleExpanded(
                                                                                    p.id,
                                                                                )
                                                                            }
                                                                            className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-[#00359c] hover:underline"
                                                                        >
                                                                            <ChevronDown
                                                                                className={cn(
                                                                                    'h-3.5 w-3.5 transition-transform',
                                                                                    expanded
                                                                                        ? 'rotate-180'
                                                                                        : '',
                                                                                )}
                                                                            />
                                                                            {expanded
                                                                                ? 'Hide details'
                                                                                : 'Show details'}
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            </TableCell>

                                                            <TableCell className="whitespace-normal text-slate-700 dark:text-slate-300">
                                                                <div className="font-medium">
                                                                    {formatDatePill(
                                                                        p.starts_at,
                                                                        p.ends_at,
                                                                    )}
                                                                </div>
                                                                <div className="text-xs text-slate-500 dark:text-slate-400">
                                                                    {daysToGo(
                                                                        p.starts_at,
                                                                    ) ?? '—'}
                                                                </div>
                                                            </TableCell>

                                                            <TableCell className="hidden text-slate-700 dark:text-slate-300">
                                                                {p.venue ? (
                                                                    <div className="space-y-1">
                                                                        <div className="flex min-w-0 items-center gap-2 font-medium text-slate-900 dark:text-slate-100">
                                                                            <MapPin className="h-4 w-4 shrink-0 text-slate-500" />
                                                                            <span className="truncate">
                                                                                {
                                                                                    p
                                                                                        .venue
                                                                                        .name
                                                                                }
                                                                            </span>
                                                                        </div>
                                                                        {p.venue
                                                                            .address ? (
                                                                            <div className="line-clamp-2 text-xs text-slate-500 dark:text-slate-400">
                                                                                {
                                                                                    p
                                                                                        .venue
                                                                                        .address
                                                                                }
                                                                            </div>
                                                                        ) : null}
                                                                        <div className="flex flex-wrap items-center gap-2 text-xs">
                                                                            {p
                                                                                .venue
                                                                                .google_maps_url ? (
                                                                                <a
                                                                                    href={
                                                                                        p
                                                                                            .venue
                                                                                            .google_maps_url
                                                                                    }
                                                                                    target="_blank"
                                                                                    rel="noreferrer"
                                                                                    className="inline-flex items-center gap-1 font-medium text-[#00359c] hover:underline"
                                                                                >
                                                                                    <ExternalLink className="h-3.5 w-3.5" />
                                                                                    Google
                                                                                    Maps
                                                                                </a>
                                                                            ) : null}
                                                                            {p
                                                                                .venue
                                                                                .is_active ===
                                                                            false ? (
                                                                                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-500 dark:bg-slate-900">
                                                                                    Inactive
                                                                                </span>
                                                                            ) : null}
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    <span className="text-xs text-slate-500 dark:text-slate-400">
                                                                        No venue
                                                                        yet
                                                                    </span>
                                                                )}
                                                            </TableCell>

                                                            <TableCell className="hidden text-slate-700 dark:text-slate-300">
                                                                {(() => {
                                                                    const pdfUrl =
                                                                        resolvePdfUrl(
                                                                            p.pdf_url,
                                                                        );
                                                                    if (
                                                                        !pdfUrl
                                                                    ) {
                                                                        return (
                                                                            <span className="text-xs text-slate-500 dark:text-slate-400">
                                                                                —
                                                                            </span>
                                                                        );
                                                                    }

                                                                    return (
                                                                        <a
                                                                            href={
                                                                                pdfUrl
                                                                            }
                                                                            target="_blank"
                                                                            rel="noreferrer"
                                                                            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 transition hover:border-[#00359c] hover:text-[#00359c] dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
                                                                        >
                                                                            <FileText className="h-4 w-4 text-[#00359c]" />
                                                                            <span className="max-w-[260px] truncate">
                                                                                {basename(
                                                                                    pdfUrl,
                                                                                )}
                                                                            </span>
                                                                        </a>
                                                                    );
                                                                })()}
                                                            </TableCell>

                                                            <TableCell>
                                                                <EventStatusBadge
                                                                    status={getEventStatus(
                                                                        p.starts_at,
                                                                        p.ends_at,
                                                                    )}
                                                                />
                                                            </TableCell>

                                                            <TableCell>
                                                                <div className="flex flex-wrap gap-2">
                                                                    <StatusBadge
                                                                        active={
                                                                            p.is_active
                                                                        }
                                                                    />
                                                                    <RegistrationStatusBadge
                                                                        active={
                                                                            !!p.is_registration_active
                                                                        }
                                                                    />
                                                                </div>
                                                            </TableCell>

                                                            <TableCell>
                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        openParticipants(
                                                                            p,
                                                                        )
                                                                    }
                                                                    className="inline-flex items-center gap-2 rounded-full border border-[#00359c]/20 bg-[#00359c]/5 px-3 py-1 text-sm font-semibold text-[#00359c] shadow-sm hover:bg-[#00359c]/10 focus-visible:ring-2 focus-visible:ring-[#00359c]/30 focus-visible:outline-none"
                                                                >
                                                                    {(
                                                                        p.participant_count ??
                                                                        p
                                                                            .participants
                                                                            ?.length ??
                                                                        0
                                                                    ).toLocaleString()}{' '}
                                                                    joined
                                                                    <span className="text-xs font-medium opacity-70">
                                                                        View
                                                                    </span>
                                                                </button>
                                                            </TableCell>

                                                            <TableCell className="hidden text-slate-700 dark:text-slate-300">
                                                                {formatDateTimeSafe(
                                                                    p.updated_at,
                                                                )}
                                                            </TableCell>

                                                            <TableCell className="text-right">
                                                                <DropdownMenu>
                                                                    <DropdownMenuTrigger
                                                                        asChild
                                                                    >
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            className="rounded-full"
                                                                        >
                                                                            <MoreHorizontal className="h-4 w-4" />
                                                                        </Button>
                                                                    </DropdownMenuTrigger>

                                                                    <DropdownMenuContent
                                                                        align="end"
                                                                        className="w-52"
                                                                    >
                                                                        <DropdownMenuLabel>
                                                                            Actions
                                                                        </DropdownMenuLabel>
                                                                        <DropdownMenuItem
                                                                            onSelect={() =>
                                                                                openEdit(
                                                                                    p,
                                                                                )
                                                                            }
                                                                        >
                                                                            <Pencil className="mr-2 h-4 w-4" />
                                                                            Edit
                                                                        </DropdownMenuItem>
                                                                        <DropdownMenuItem
                                                                            onSelect={() =>
                                                                                openVenueDialog(
                                                                                    p,
                                                                                )
                                                                            }
                                                                        >
                                                                            <MapPin className="mr-2 h-4 w-4" />
                                                                            Add
                                                                            venue
                                                                        </DropdownMenuItem>
                                                                        <DropdownMenuItem
                                                                            onSelect={() =>
                                                                                openRegistrationFields(
                                                                                    p,
                                                                                )
                                                                            }
                                                                        >
                                                                            <FileText className="mr-2 h-4 w-4" />
                                                                            Registration
                                                                            fields
                                                                        </DropdownMenuItem>
                                                                        <DropdownMenuItem
                                                                            onSelect={() =>
                                                                                toggleActive(
                                                                                    p,
                                                                                )
                                                                            }
                                                                        >
                                                                            <BadgeCheck className="mr-2 h-4 w-4" />
                                                                            {p.is_active
                                                                                ? 'Set Inactive'
                                                                                : 'Set Active'}
                                                                        </DropdownMenuItem>
                                                                        <DropdownMenuItem
                                                                            disabled={
                                                                                !!p.is_registration_active
                                                                            }
                                                                            onSelect={() =>
                                                                                setActiveRegistration(
                                                                                    p,
                                                                                )
                                                                            }
                                                                        >
                                                                            <BadgeCheck className="mr-2 h-4 w-4" />
                                                                            {p.is_registration_active
                                                                                ? 'Active registration'
                                                                                : 'Set active registration'}
                                                                        </DropdownMenuItem>
                                                                        <DropdownMenuSeparator />
                                                                        <DropdownMenuItem
                                                                            className="text-red-600 focus:text-red-600"
                                                                            onSelect={() =>
                                                                                requestDelete(
                                                                                    p,
                                                                                )
                                                                            }
                                                                        >
                                                                            <Trash2 className="mr-2 h-4 w-4" />
                                                                            Delete
                                                                        </DropdownMenuItem>
                                                                    </DropdownMenuContent>
                                                                </DropdownMenu>
                                                            </TableCell>
                                                        </TableRow>
                                                        {expanded ? (
                                                            <TableRow className="bg-slate-50/70 dark:bg-slate-900/30">
                                                                <TableCell
                                                                    colSpan={9}
                                                                    className="whitespace-normal"
                                                                >
                                                                    <div className="grid gap-4 p-3 lg:grid-cols-[1.4fr_1.1fr_1fr_1fr]">
                                                                        <div className="min-w-0">
                                                                            <div className="text-xs font-semibold text-slate-500 uppercase dark:text-slate-400">
                                                                                Description
                                                                            </div>
                                                                            <div className="mt-1 text-sm leading-6 break-words text-slate-700 dark:text-slate-300">
                                                                                {
                                                                                    p.description
                                                                                }
                                                                            </div>
                                                                        </div>

                                                                        <div className="min-w-0">
                                                                            <div className="text-xs font-semibold text-slate-500 uppercase dark:text-slate-400">
                                                                                Venue
                                                                            </div>
                                                                            <div className="mt-1 text-sm break-words text-slate-700 dark:text-slate-300">
                                                                                {renderVenueSummary(
                                                                                    p,
                                                                                    true,
                                                                                )}
                                                                            </div>
                                                                        </div>

                                                                        <div className="min-w-0">
                                                                            <div className="text-xs font-semibold text-slate-500 uppercase dark:text-slate-400">
                                                                                View
                                                                                More
                                                                            </div>
                                                                            <div className="mt-2">
                                                                                {renderPdfLink(
                                                                                    p,
                                                                                )}
                                                                            </div>
                                                                        </div>

                                                                        <div>
                                                                            <div className="text-xs font-semibold text-slate-500 uppercase dark:text-slate-400">
                                                                                Updated
                                                                            </div>
                                                                            <div className="mt-1 text-sm text-slate-700 dark:text-slate-300">
                                                                                {formatDateTimeSafe(
                                                                                    p.updated_at,
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </TableCell>
                                                            </TableRow>
                                                        ) : null}
                                                    </React.Fragment>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Add/Edit Dialog (NO live preview, NO URL inputs) */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent
                    className={cn(
                        'w-[calc(100vw-1.5rem)] sm:w-full sm:max-w-[760px]',
                        'max-h-[85vh] overflow-hidden p-0',
                    )}
                >
                    <form
                        onSubmit={submit}
                        className="flex max-h-[85vh] flex-col"
                    >
                        <div className="px-6 pt-6">
                            <DialogHeader>
                                <DialogTitle>
                                    {editing ? 'Edit Event' : 'Add Event'}
                                </DialogTitle>
                                <DialogDescription>
                                    Upload image + PDF for “View more” on the
                                    public page.
                                </DialogDescription>
                            </DialogHeader>
                        </div>

                        <div className="flex-1 overflow-y-auto px-6 pb-6">
                            <div className="mt-4 grid gap-4">
                                <div className="grid gap-3 sm:grid-cols-2">
                                    <div className="space-y-1.5 sm:col-span-2">
                                        <div className="text-sm font-medium">
                                            Title
                                        </div>
                                        <Input
                                            value={form.data.title}
                                            onChange={(e) =>
                                                form.setData(
                                                    'title',
                                                    e.target.value,
                                                )
                                            }
                                            placeholder="e.g. Track Discussions"
                                        />
                                        {form.errors.title ? (
                                            <div className="text-xs text-red-600">
                                                {form.errors.title}
                                            </div>
                                        ) : null}
                                    </div>

                                    <div className="space-y-1.5 sm:col-span-2">
                                        <div className="text-sm font-medium">
                                            Description
                                        </div>
                                        <Textarea
                                            value={form.data.description}
                                            onChange={(e) =>
                                                form.setData(
                                                    'description',
                                                    e.target.value,
                                                )
                                            }
                                            placeholder="Short description shown on the card"
                                            className="min-h-[96px]"
                                        />
                                        {form.errors.description ? (
                                            <div className="text-xs text-red-600">
                                                {form.errors.description}
                                            </div>
                                        ) : null}
                                    </div>

                                    <div className="space-y-1.5">
                                        <div className="text-sm font-medium">
                                            Starts at
                                        </div>
                                        <Input
                                            type="datetime-local"
                                            value={form.data.starts_at}
                                            onChange={(e) =>
                                                form.setData(
                                                    'starts_at',
                                                    e.target.value,
                                                )
                                            }
                                        />
                                        {form.errors.starts_at ? (
                                            <div className="text-xs text-red-600">
                                                {form.errors.starts_at}
                                            </div>
                                        ) : null}
                                    </div>

                                    <div className="space-y-1.5">
                                        <div className="text-sm font-medium">
                                            Ends at
                                        </div>
                                        <Input
                                            type="datetime-local"
                                            value={form.data.ends_at}
                                            onChange={(e) =>
                                                form.setData(
                                                    'ends_at',
                                                    e.target.value,
                                                )
                                            }
                                        />
                                        {form.errors.ends_at ? (
                                            <div className="text-xs text-red-600">
                                                {form.errors.ends_at}
                                            </div>
                                        ) : null}
                                    </div>

                                    {/* IMAGE (upload only) */}
                                    <div className="space-y-1.5 sm:col-span-2">
                                        <div className="text-sm font-medium">
                                            Image
                                        </div>

                                        <div className="grid gap-3 sm:grid-cols-[1fr_200px]">
                                            <div className="space-y-2">
                                                <Input
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={handleImageUpload}
                                                />
                                                {(form.errors as any).image ? (
                                                    <div className="text-xs text-red-600">
                                                        {
                                                            (form.errors as any)
                                                                .image
                                                        }
                                                    </div>
                                                ) : null}

                                                {currentImageUrl &&
                                                !form.data.image ? (
                                                    <div className="text-xs text-slate-500 dark:text-slate-400">
                                                        Current:{' '}
                                                        <span className="font-semibold">
                                                            {basename(
                                                                currentImageUrl,
                                                            )}
                                                        </span>
                                                    </div>
                                                ) : null}
                                            </div>

                                            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
                                                <div className="aspect-square bg-slate-100 dark:bg-slate-900">
                                                    <img
                                                        src={
                                                            imagePreview ??
                                                            DEFAULT_EVENT_IMAGE
                                                        }
                                                        alt="Preview"
                                                        className="h-full w-full object-cover"
                                                        draggable={false}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* PDF (upload only) */}
                                    <div className="space-y-1.5 sm:col-span-2">
                                        <div className="text-sm font-medium">
                                            PDF (View more)
                                        </div>

                                        <div className="grid gap-3 sm:grid-cols-[1fr_260px]">
                                            <div className="space-y-2">
                                                <Input
                                                    type="file"
                                                    accept="application/pdf"
                                                    onChange={handlePdfUpload}
                                                />
                                                {(form.errors as any).pdf ? (
                                                    <div className="text-xs text-red-600">
                                                        {
                                                            (form.errors as any)
                                                                .pdf
                                                        }
                                                    </div>
                                                ) : null}

                                                {currentPdfUrl &&
                                                !form.data.pdf ? (
                                                    <div className="text-xs text-slate-500 dark:text-slate-400">
                                                        Current:{' '}
                                                        <span className="font-semibold">
                                                            {basename(
                                                                currentPdfUrl,
                                                            )}
                                                        </span>
                                                    </div>
                                                ) : null}
                                            </div>

                                            <div className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950">
                                                <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                                                    Selected
                                                </div>
                                                <div className="mt-2 flex items-center gap-2">
                                                    <div className="grid size-9 place-items-center rounded-xl bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-200">
                                                        <FileText className="h-4 w-4" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                                                            {pdfLabel ||
                                                                'No PDF selected'}
                                                        </div>
                                                        <div className="text-xs text-slate-500 dark:text-slate-400">
                                                            Opens when users
                                                            click “View more”.
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* MATERIALS (upload only) */}
                                    <div className="space-y-2 sm:col-span-2">
                                        <div className="text-sm font-medium">
                                            Event kit materials
                                        </div>

                                        <Input
                                            type="file"
                                            multiple
                                            accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                                            onChange={handleMaterialsUpload}
                                        />

                                        {(form.errors as any).materials ? (
                                            <div className="text-xs text-red-600">
                                                {(form.errors as any).materials}
                                            </div>
                                        ) : null}

                                        <div className="rounded-xl border border-slate-200 bg-white p-2.5 dark:border-slate-800 dark:bg-slate-950">
                                            <div className="flex items-center justify-between gap-2">
                                                <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
                                                    <FileText className="h-3.5 w-3.5" />
                                                    <span>Files</span>
                                                </div>

                                                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                                                    {(editing
                                                        ? existingMaterials.length
                                                        : 0
                                                    ).toLocaleString()}{' '}
                                                    current
                                                    {materialsFiles.length
                                                        ? ` · ${materialsFiles.length} new`
                                                        : ''}
                                                </div>
                                            </div>

                                            {/* Existing (server) materials when editing */}
                                            {editing ? (
                                                <div className="mt-2 space-y-1.5">
                                                    {existingMaterials.length ? (
                                                        <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                                                            Existing uploads
                                                        </div>
                                                    ) : (
                                                        <div className="text-xs text-slate-500 dark:text-slate-400">
                                                            No existing
                                                            materials.
                                                        </div>
                                                    )}

                                                    {existingMaterials.map(
                                                        (m) => {
                                                            const href =
                                                                resolveMaterialUrl(
                                                                    m.file_path,
                                                                );
                                                            return (
                                                                <div
                                                                    key={m.id}
                                                                    className="flex items-center gap-2 rounded-lg border border-slate-200 px-2 py-1.5 text-xs dark:border-slate-800"
                                                                >
                                                                    <div className="grid size-7 place-items-center rounded-md bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-200">
                                                                        <FileText className="h-3.5 w-3.5" />
                                                                    </div>

                                                                    <a
                                                                        href={
                                                                            href
                                                                        }
                                                                        target="_blank"
                                                                        rel="noreferrer"
                                                                        className="min-w-0 flex-1 truncate font-medium text-slate-900 hover:underline dark:text-slate-100"
                                                                        title={
                                                                            m.file_name
                                                                        }
                                                                    >
                                                                        {
                                                                            m.file_name
                                                                        }
                                                                    </a>

                                                                    <Button
                                                                        type="button"
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        className="h-7 px-2 text-xs text-red-600 hover:text-red-700"
                                                                        onClick={() => {
                                                                            // move to "removed" (undo-able)
                                                                            setExistingMaterials(
                                                                                (
                                                                                    prev,
                                                                                ) =>
                                                                                    prev.filter(
                                                                                        (
                                                                                            x,
                                                                                        ) =>
                                                                                            x.id !==
                                                                                            m.id,
                                                                                    ),
                                                                            );
                                                                            setRemovedMaterials(
                                                                                (
                                                                                    prev,
                                                                                ) => [
                                                                                    m,
                                                                                    ...prev,
                                                                                ],
                                                                            );
                                                                            setRemovedMaterialIds(
                                                                                (
                                                                                    prev,
                                                                                ) =>
                                                                                    prev.includes(
                                                                                        m.id,
                                                                                    )
                                                                                        ? prev
                                                                                        : [
                                                                                              ...prev,
                                                                                              m.id,
                                                                                          ],
                                                                            );
                                                                        }}
                                                                    >
                                                                        <Trash2 className="mr-1 h-3.5 w-3.5" />
                                                                        Remove
                                                                    </Button>
                                                                </div>
                                                            );
                                                        },
                                                    )}

                                                    {/* Removed list (undo) */}
                                                    {removedMaterials.length ? (
                                                        <div className="mt-3 space-y-1.5">
                                                            <div className="text-[11px] font-medium text-amber-700 dark:text-amber-300">
                                                                Removed (will
                                                                delete on Save)
                                                            </div>

                                                            {removedMaterials.map(
                                                                (m) => (
                                                                    <div
                                                                        key={`removed-${m.id}`}
                                                                        className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-2 py-1.5 text-xs dark:border-amber-900/40 dark:bg-amber-950/20"
                                                                    >
                                                                        <div className="min-w-0 flex-1 truncate text-slate-800 dark:text-slate-100">
                                                                            {
                                                                                m.file_name
                                                                            }
                                                                        </div>

                                                                        <Button
                                                                            type="button"
                                                                            variant="ghost"
                                                                            size="sm"
                                                                            className="h-7 px-2 text-xs"
                                                                            onClick={() => {
                                                                                // undo remove
                                                                                setRemovedMaterials(
                                                                                    (
                                                                                        prev,
                                                                                    ) =>
                                                                                        prev.filter(
                                                                                            (
                                                                                                x,
                                                                                            ) =>
                                                                                                x.id !==
                                                                                                m.id,
                                                                                        ),
                                                                                );
                                                                                setExistingMaterials(
                                                                                    (
                                                                                        prev,
                                                                                    ) => [
                                                                                        m,
                                                                                        ...prev,
                                                                                    ],
                                                                                );
                                                                                setRemovedMaterialIds(
                                                                                    (
                                                                                        prev,
                                                                                    ) =>
                                                                                        prev.filter(
                                                                                            (
                                                                                                id,
                                                                                            ) =>
                                                                                                id !==
                                                                                                m.id,
                                                                                        ),
                                                                                );
                                                                            }}
                                                                        >
                                                                            Undo
                                                                        </Button>
                                                                    </div>
                                                                ),
                                                            )}
                                                        </div>
                                                    ) : null}
                                                </div>
                                            ) : null}

                                            {/* New uploads (client) */}
                                            <div
                                                className={cn(
                                                    'mt-3 space-y-1.5',
                                                    editing ? '' : 'mt-2',
                                                )}
                                            >
                                                {materialsFiles.length ? (
                                                    <>
                                                        <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                                                            New uploads
                                                        </div>
                                                        {materialsFiles.map(
                                                            (f, idx) => (
                                                                <div
                                                                    key={`${f.name}-${f.size}-${f.lastModified}-${idx}`}
                                                                    className="flex items-center gap-2 rounded-lg border border-slate-200 px-2 py-1.5 text-xs dark:border-slate-800"
                                                                >
                                                                    <div className="grid size-7 place-items-center rounded-md bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-200">
                                                                        <FileText className="h-3.5 w-3.5" />
                                                                    </div>

                                                                    <div className="min-w-0 flex-1">
                                                                        <div className="truncate font-medium text-slate-900 dark:text-slate-100">
                                                                            {
                                                                                f.name
                                                                            }
                                                                        </div>
                                                                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                                                                            {(
                                                                                f.size /
                                                                                1024
                                                                            ).toFixed(
                                                                                0,
                                                                            )}{' '}
                                                                            KB
                                                                        </div>
                                                                    </div>

                                                                    <Button
                                                                        type="button"
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        className="h-7 px-2 text-xs text-red-600 hover:text-red-700"
                                                                        onClick={() => {
                                                                            setMaterialsFiles(
                                                                                (
                                                                                    prev,
                                                                                ) => {
                                                                                    const next =
                                                                                        prev.filter(
                                                                                            (
                                                                                                _,
                                                                                                i,
                                                                                            ) =>
                                                                                                i !==
                                                                                                idx,
                                                                                        );
                                                                                    form.setData(
                                                                                        'materials',
                                                                                        next,
                                                                                    );
                                                                                    setMaterialsLabel(
                                                                                        next.length
                                                                                            ? `${next.length} file(s) selected`
                                                                                            : '',
                                                                                    );
                                                                                    return next;
                                                                                },
                                                                            );
                                                                        }}
                                                                    >
                                                                        <Trash2 className="mr-1 h-3.5 w-3.5" />
                                                                        Remove
                                                                    </Button>
                                                                </div>
                                                            ),
                                                        )}
                                                    </>
                                                ) : (
                                                    <div className="text-xs text-slate-500 dark:text-slate-400">
                                                        No new files selected.
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="sticky bottom-0 z-10 border-t border-slate-200 bg-white/85 px-6 py-4 backdrop-blur dark:border-slate-800 dark:bg-slate-950/85">
                            <DialogFooter className="gap-2 sm:gap-0">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setDialogOpen(false)}
                                    disabled={form.processing}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    className={PRIMARY_BTN}
                                    disabled={form.processing}
                                >
                                    {editing ? 'Save changes' : 'Create'}
                                </Button>
                            </DialogFooter>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Registration Fields Dialog */}
            <Dialog
                open={registrationTarget !== null}
                onOpenChange={(open) => {
                    if (!open) closeRegistrationFields();
                }}
            >
                <DialogContent className="max-h-[85vh] w-[calc(100vw-1.5rem)] overflow-hidden p-0 sm:max-w-[980px]">
                    <form
                        onSubmit={submitRegistrationFields}
                        className="flex max-h-[85vh] flex-col"
                    >
                        <div className="border-b border-slate-200 px-6 py-5 dark:border-slate-800">
                            <DialogHeader>
                                <DialogTitle>Registration fields</DialogTitle>
                                <DialogDescription>
                                    Configure the event-specific questions shown
                                    after a participant selects{' '}
                                    <span className="font-medium text-slate-900 dark:text-slate-100">
                                        {registrationTarget?.title}
                                    </span>
                                    .
                                </DialogDescription>
                            </DialogHeader>
                        </div>

                        <div className="flex-1 overflow-y-auto px-6 py-5">
                            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                                <div className="text-sm text-slate-600 dark:text-slate-400">
                                    Core identity, account, virtual ID, and QR
                                    fields remain part of the participant
                                    profile.
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <Button
                                        type="button"
                                        className={PRIMARY_BTN}
                                        onClick={() => addRegistrationField()}
                                    >
                                        <Plus className="mr-2 h-4 w-4" />
                                        Add field
                                    </Button>
                                </div>
                            </div>

                            {registrationForm.data.registration_fields
                                .length ? (
                                <div className="space-y-3">
                                    {registrationForm.data.registration_fields.map(
                                        (field, index) => {
                                            const needsOptions = [
                                                'radio',
                                                'checkbox',
                                                'select',
                                            ].includes(field.field_type);

                                            return (
                                                <div
                                                    key={`${field.id ?? 'new'}-${index}`}
                                                    className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950"
                                                >
                                                    <div className="grid gap-3 lg:grid-cols-[1fr_210px]">
                                                        <div className="space-y-1.5">
                                                            <div className="text-sm font-medium">
                                                                {field.field_type ===
                                                                'section'
                                                                    ? 'Section title'
                                                                    : 'Question label'}
                                                            </div>
                                                            <Input
                                                                value={
                                                                    field.label
                                                                }
                                                                onChange={(
                                                                    event,
                                                                ) =>
                                                                    updateRegistrationField(
                                                                        index,
                                                                        {
                                                                            label: event
                                                                                .target
                                                                                .value,
                                                                        },
                                                                    )
                                                                }
                                                                placeholder={
                                                                    field.field_type ===
                                                                    'section'
                                                                        ? 'e.g. Special Needs'
                                                                        : 'e.g. Dietary requirements'
                                                                }
                                                            />
                                                        </div>

                                                        <div className="space-y-1.5">
                                                            <div className="text-sm font-medium">
                                                                Type
                                                            </div>
                                                            <Select
                                                                value={
                                                                    field.field_type
                                                                }
                                                                onValueChange={(
                                                                    value,
                                                                ) =>
                                                                    updateRegistrationField(
                                                                        index,
                                                                        {
                                                                            field_type:
                                                                                value as RegistrationFieldType,
                                                                            is_required:
                                                                                value ===
                                                                                'section'
                                                                                    ? false
                                                                                    : field.is_required,
                                                                            options:
                                                                                [
                                                                                    'radio',
                                                                                    'checkbox',
                                                                                    'select',
                                                                                ].includes(
                                                                                    value,
                                                                                )
                                                                                    ? field.options
                                                                                    : [],
                                                                        },
                                                                    )
                                                                }
                                                            >
                                                                <SelectTrigger>
                                                                    <SelectValue />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    {REGISTRATION_FIELD_TYPES.map(
                                                                        (
                                                                            type,
                                                                        ) => (
                                                                            <SelectItem
                                                                                key={
                                                                                    type.value
                                                                                }
                                                                                value={
                                                                                    type.value
                                                                                }
                                                                            >
                                                                                {
                                                                                    type.label
                                                                                }
                                                                            </SelectItem>
                                                                        ),
                                                                    )}
                                                                </SelectContent>
                                                            </Select>
                                                        </div>
                                                    </div>

                                                    <div className="mt-3 grid gap-3 lg:grid-cols-2">
                                                        {field.field_type !==
                                                        'section' ? (
                                                            <>
                                                                <div className="space-y-1.5">
                                                                    <div className="text-sm font-medium">
                                                                        Placeholder
                                                                    </div>
                                                                    <Input
                                                                        value={
                                                                            field.placeholder ??
                                                                            ''
                                                                        }
                                                                        onChange={(
                                                                            event,
                                                                        ) =>
                                                                            updateRegistrationField(
                                                                                index,
                                                                                {
                                                                                    placeholder:
                                                                                        event
                                                                                            .target
                                                                                            .value,
                                                                                },
                                                                            )
                                                                        }
                                                                        placeholder="Optional"
                                                                    />
                                                                </div>
                                                                <div className="space-y-1.5">
                                                                    <div className="text-sm font-medium">
                                                                        Help
                                                                        text
                                                                    </div>
                                                                    <Input
                                                                        value={
                                                                            field.help_text ??
                                                                            ''
                                                                        }
                                                                        onChange={(
                                                                            event,
                                                                        ) =>
                                                                            updateRegistrationField(
                                                                                index,
                                                                                {
                                                                                    help_text:
                                                                                        event
                                                                                            .target
                                                                                            .value,
                                                                                },
                                                                            )
                                                                        }
                                                                        placeholder="Optional note shown under the field"
                                                                    />
                                                                </div>
                                                            </>
                                                        ) : null}

                                                        {needsOptions ? (
                                                            <div className="space-y-1.5 lg:col-span-2">
                                                                <div className="text-sm font-medium">
                                                                    Options
                                                                </div>
                                                                <Textarea
                                                                    value={field.options.join(
                                                                        '\n',
                                                                    )}
                                                                    onChange={(
                                                                        event,
                                                                    ) =>
                                                                        updateRegistrationField(
                                                                            index,
                                                                            {
                                                                                options:
                                                                                    event.target.value.split(
                                                                                        '\n',
                                                                                    ),
                                                                            },
                                                                        )
                                                                    }
                                                                    placeholder="One option per line"
                                                                    className="min-h-[96px]"
                                                                />
                                                            </div>
                                                        ) : null}
                                                    </div>

                                                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                                                        <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                                                            <input
                                                                type="checkbox"
                                                                checked={
                                                                    field.is_required
                                                                }
                                                                disabled={
                                                                    field.field_type ===
                                                                    'section'
                                                                }
                                                                onChange={(
                                                                    event,
                                                                ) =>
                                                                    updateRegistrationField(
                                                                        index,
                                                                        {
                                                                            is_required:
                                                                                event
                                                                                    .target
                                                                                    .checked,
                                                                        },
                                                                    )
                                                                }
                                                            />
                                                            Required
                                                        </label>

                                                        <div className="flex flex-wrap gap-2">
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() =>
                                                                    moveRegistrationField(
                                                                        index,
                                                                        -1,
                                                                    )
                                                                }
                                                                disabled={
                                                                    index === 0
                                                                }
                                                            >
                                                                Up
                                                            </Button>
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() =>
                                                                    moveRegistrationField(
                                                                        index,
                                                                        1,
                                                                    )
                                                                }
                                                                disabled={
                                                                    index ===
                                                                    registrationForm
                                                                        .data
                                                                        .registration_fields
                                                                        .length -
                                                                        1
                                                                }
                                                            >
                                                                Down
                                                            </Button>
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="sm"
                                                                className="text-red-600 hover:text-red-700"
                                                                onClick={() =>
                                                                    removeRegistrationField(
                                                                        index,
                                                                    )
                                                                }
                                                            >
                                                                <Trash2 className="mr-1 h-4 w-4" />
                                                                Remove
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        },
                                    )}
                                </div>
                            ) : (
                                <EmptyState
                                    icon={<FileText className="h-5 w-5" />}
                                    title="No custom fields yet"
                                    subtitle="Add questions for this event, or start from the ASEMME10 template."
                                    action={
                                        <Button
                                            type="button"
                                            className={PRIMARY_BTN}
                                            onClick={() =>
                                                addRegistrationField()
                                            }
                                        >
                                            Add field
                                        </Button>
                                    }
                                />
                            )}
                        </div>

                        <div className="border-t border-slate-200 bg-white/85 px-6 py-4 backdrop-blur dark:border-slate-800 dark:bg-slate-950/85">
                            <DialogFooter className="gap-2 sm:gap-0">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={closeRegistrationFields}
                                    disabled={registrationForm.processing}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    className={PRIMARY_BTN}
                                    disabled={registrationForm.processing}
                                >
                                    Save fields
                                </Button>
                            </DialogFooter>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Add/Edit Venue Dialog */}
            <Dialog
                open={venueTarget !== null}
                onOpenChange={(open) => {
                    if (!open) closeVenueDialog();
                }}
            >
                <DialogContent className="w-[calc(100vw-1.5rem)] sm:max-w-[980px]">
                    <DialogHeader>
                        <DialogTitle>
                            {venueTarget?.venue ? 'Edit Venue' : 'Add Venue'}
                        </DialogTitle>
                        <DialogDescription>
                            Set the venue for{' '}
                            <span className="font-medium text-slate-900 dark:text-slate-100">
                                {venueTarget?.title}
                            </span>
                            .
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={submitVenue} className="space-y-4">
                        <div className="grid gap-4 lg:grid-cols-[1fr_420px]">
                            <div className="space-y-4">
                                <div className="grid gap-3 sm:grid-cols-2">
                                    <div className="space-y-1.5 sm:col-span-2">
                                        <div className="text-sm font-medium">
                                            Venue name{' '}
                                            <span className="text-[11px] font-semibold text-red-600">
                                                *
                                            </span>
                                        </div>
                                        <Input
                                            value={venueForm.data.name}
                                            onChange={(e) =>
                                                venueForm.setData(
                                                    'name',
                                                    e.target.value,
                                                )
                                            }
                                            placeholder="e.g. Commission on Higher Education"
                                        />
                                        {venueForm.errors.name ? (
                                            <div className="text-xs text-red-600">
                                                {venueForm.errors.name}
                                            </div>
                                        ) : null}
                                    </div>

                                    <div className="space-y-1.5 sm:col-span-2">
                                        <div className="text-sm font-medium">
                                            Address{' '}
                                            <span className="text-[11px] font-semibold text-red-600">
                                                *
                                            </span>
                                        </div>
                                        <Textarea
                                            value={venueForm.data.address}
                                            onChange={(e) =>
                                                venueForm.setData(
                                                    'address',
                                                    e.target.value,
                                                )
                                            }
                                            placeholder="Full address shown on the public Venue page"
                                            className="min-h-[90px]"
                                        />
                                        {venueForm.errors.address ? (
                                            <div className="text-xs text-red-600">
                                                {venueForm.errors.address}
                                            </div>
                                        ) : null}
                                    </div>

                                    <div className="space-y-1.5 sm:col-span-2">
                                        <div className="text-sm font-medium">
                                            Google Maps link
                                        </div>
                                        <Input
                                            value={
                                                venueForm.data.google_maps_url
                                            }
                                            onChange={(e) =>
                                                venueForm.setData(
                                                    'google_maps_url',
                                                    e.target.value,
                                                )
                                            }
                                            placeholder="https://maps.google.com/?q=..."
                                        />
                                        {venueForm.errors.google_maps_url ? (
                                            <div className="text-xs text-red-600">
                                                {
                                                    venueForm.errors
                                                        .google_maps_url
                                                }
                                            </div>
                                        ) : null}
                                    </div>

                                    <div className="space-y-1.5 sm:col-span-2">
                                        <div className="text-sm font-medium">
                                            Embed URL or iframe
                                        </div>
                                        <Input
                                            value={venueForm.data.embed_url}
                                            onChange={(e) =>
                                                venueForm.setData(
                                                    'embed_url',
                                                    e.target.value,
                                                )
                                            }
                                            placeholder="https://www.google.com/maps/embed?pb=..."
                                        />
                                        <div className="text-xs text-slate-600 dark:text-slate-400">
                                            Optional. Leave blank to build the
                                            map from the venue name and address.
                                        </div>
                                        {venueForm.errors.embed_url ? (
                                            <div className="text-xs text-red-600">
                                                {venueForm.errors.embed_url}
                                            </div>
                                        ) : null}
                                    </div>

                                    <div className="space-y-1.5 sm:col-span-2">
                                        <div className="text-sm font-medium">
                                            Status
                                        </div>
                                        <Select
                                            value={
                                                venueForm.data.is_active
                                                    ? 'active'
                                                    : 'inactive'
                                            }
                                            onValueChange={(v) =>
                                                venueForm.setData(
                                                    'is_active',
                                                    v === 'active',
                                                )
                                            }
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select status" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="active">
                                                    Active
                                                </SelectItem>
                                                <SelectItem value="inactive">
                                                    Inactive
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <div className="text-xs text-slate-600 dark:text-slate-400">
                                            Inactive venues will not show on
                                            public pages.
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-center justify-between gap-3">
                                    <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                        Map Preview
                                    </div>
                                    {venueForm.data.google_maps_url ? (
                                        <Button
                                            asChild
                                            variant="secondary"
                                            className="rounded-full"
                                        >
                                            <a
                                                href={
                                                    venueForm.data
                                                        .google_maps_url
                                                }
                                                target="_blank"
                                                rel="noreferrer"
                                            >
                                                <ExternalLink className="mr-2 h-4 w-4" />
                                                Open in Google Maps
                                            </a>
                                        </Button>
                                    ) : null}
                                </div>

                                <VenueMapPreview
                                    embedUrl={venueEmbedPreviewUrl}
                                    googleMapsUrl={
                                        venueForm.data.google_maps_url
                                    }
                                />
                            </div>
                        </div>

                        <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-between">
                            <div>
                                {venueTarget?.venue ? (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-900/60 dark:hover:bg-red-950/40"
                                        onClick={() =>
                                            requestVenueDelete(venueTarget)
                                        }
                                        disabled={
                                            venueForm.processing ||
                                            venueDeleting
                                        }
                                    >
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Remove venue
                                    </Button>
                                ) : null}
                            </div>

                            <div className="flex flex-col-reverse gap-2 sm:flex-row">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={closeVenueDialog}
                                    disabled={venueForm.processing}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    className={PRIMARY_BTN}
                                    disabled={venueForm.processing}
                                >
                                    Save venue
                                </Button>
                            </div>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Delete Venue Confirm */}
            <AlertDialog
                open={venueDeleteOpen}
                onOpenChange={setVenueDeleteOpen}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            Remove this venue?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently remove{' '}
                            <span className="font-semibold text-slate-900 dark:text-slate-100">
                                {venueDeleteTarget?.venue?.name ??
                                    'this venue'}
                            </span>{' '}
                            from{' '}
                            <span className="font-semibold text-slate-900 dark:text-slate-100">
                                {venueDeleteTarget?.title ?? 'this event'}
                            </span>
                            . The event will remain.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel
                            onClick={() => setVenueDeleteOpen(false)}
                            disabled={venueDeleting}
                        >
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-red-600 hover:bg-red-700"
                            onClick={confirmVenueDelete}
                            disabled={venueDeleting}
                        >
                            Remove venue
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Delete Confirm */}
            <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete this event?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete{' '}
                            <span className="font-semibold text-slate-900 dark:text-slate-100">
                                {deleteTarget?.title ?? 'this item'}
                            </span>
                            . This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setDeleteOpen(false)}>
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-red-600 hover:bg-red-700"
                            onClick={confirmDelete}
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </AppLayout>
    );
}
