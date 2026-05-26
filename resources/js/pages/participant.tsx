import AppLayout from '@/layouts/app-layout';
import { splitCountriesByAsean } from '@/lib/countries';
import { cn, toDateOnlyTimestamp } from '@/lib/utils';
import { participant } from '@/routes';
import { type BreadcrumbItem } from '@/types';
import { Head, router, useForm } from '@inertiajs/react';
import * as React from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
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
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';

import { Checkbox } from '@/components/ui/checkbox';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

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
    BadgeCheck,
    CalendarDays,
    Check,
    CheckCircle2,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    ChevronsUpDown,
    Globe2,
    ImageUp,
    KeyRound,
    MapPin,
    MoreHorizontal,
    Pencil,
    Plus,
    Printer,
    QrCode as QrCodeIcon,
    Search,
    Trash2,
    Users,
    XCircle,
} from 'lucide-react';
import QRCode from 'qrcode';

type Country = {
    id: number;
    code: string; // e.g. PH
    name: string; // e.g. Philippines
    is_active: boolean;
    flag_url?: string | null; // ✅ display URL from backend (e.g. /storage/flags/ph.png)
};

type UserType = {
    id: number;
    name: string; // e.g. Prime Minister
    slug?: string;
    is_active: boolean;
    sequence_order?: number | null;
};

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
    is_active: boolean;
};

type ParticipantRow = {
    id: number;
    display_id?: string | null;
    qr_payload?: string | null;
    profile_image_url?: string | null;
    profile_photo_url?: string | null;
    profile_photo_path?: string | null;
    profile_image_path?: string | null;
    profile_image?: string | null;
    full_name: string;
    email: string;
    contact_number?: string | null;
    contact_country_code?: string | null;
    country_id: number | null;
    user_type_id: number | null;
    other_user_type?: string | null;
    honorific_title?: string | null;
    honorific_other?: string | null;
    given_name?: string | null;
    middle_name?: string | null;
    family_name?: string | null;
    suffix?: string | null;
    sex_assigned_at_birth?: string | null;
    organization_name?: string | null;
    position_title?: string | null;
    ip_affiliation?: boolean;
    ip_group_name?: string | null;
    is_active: boolean;
    consent_contact_sharing?: boolean;
    consent_photo_video?: boolean;
    has_food_restrictions?: boolean;
    food_restrictions?: string[];
    dietary_allergies?: string | null;
    dietary_other?: string | null;
    accessibility_needs?: string[];
    accessibility_other?: string | null;
    emergency_contact_name?: string | null;
    emergency_contact_relationship?: string | null;
    emergency_contact_phone?: string | null;
    emergency_contact_email?: string | null;
    created_at?: string | null;
    joined_programme_ids?: number[];
    checked_in_programme_ids?: number[];
    checked_in_programmes?: {
        programme_id: number;
        scanned_at?: string | null;
    }[];

    // optional expanded props if your backend includes them
    country?: Country | null;
    user_type?: UserType | null;
};

type PageProps = {
    countries?: Country[];
    userTypes?: UserType[];
    participants?: ParticipantRow[];
    programmes?: ProgrammeRow[];
};

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Participant',
        href: participant().url,
    },
];

/**
 * ✅ Update these endpoints to match your Laravel routes.
 * Suggestion:
 * Route::resource('participants', ParticipantController::class);
 * Route::resource('participants/countries', CountryController::class);
 * Route::resource('participants/user-types', UserTypeController::class);
 */
const ENDPOINTS = {
    participants: {
        store: '/participants',
        update: (id: number) => `/participants/${id}`,
        destroy: (id: number) => `/participants/${id}`,
    },
    participantProgrammes: {
        join: (participantId: number, programmeId: number) =>
            `/participants/${participantId}/programmes/${programmeId}`,
        leave: (participantId: number, programmeId: number) =>
            `/participants/${participantId}/programmes/${programmeId}`,
        revertAttendance: (participantId: number, programmeId: number) =>
            `/participants/${participantId}/programmes/${programmeId}/attendance`,
    },
    countries: {
        store: '/participants/countries',
        update: (id: number) => `/participants/countries/${id}`,
        destroy: (id: number) => `/participants/countries/${id}`,
    },
    userTypes: {
        store: '/participants/user-types',
        update: (id: number) => `/participants/user-types/${id}`,
        destroy: (id: number) => `/participants/user-types/${id}`,
    },
};

// ✅ Accent color requested (#00359c) — apply to all primary buttons
const PRIMARY_BTN =
    'bg-[#00359c] text-white hover:bg-[#00359c]/90 focus-visible:ring-[#00359c]/30 dark:bg-[#00359c] dark:hover:bg-[#00359c]/90';

const DIETARY_PREFERENCE_OPTIONS = [
    { value: 'vegetarian', label: 'Vegetarian' },
    { value: 'halal', label: 'Halal' },
    { value: 'allergies', label: 'Allergies (please specify)' },
    { value: 'other', label: 'Other (please specify)' },
] as const;

const HONORIFIC_OPTIONS = [
    { value: 'mr', label: 'Mr.' },
    { value: 'mrs', label: 'Mrs.' },
    { value: 'ms', label: 'Ms.' },
    { value: 'miss', label: 'Miss' },
    { value: 'dr', label: 'Dr.' },
    { value: 'prof', label: 'Prof.' },
    { value: 'other', label: 'Other' },
] as const;

const SEX_ASSIGNED_OPTIONS = [
    { value: 'male', label: 'Male' },
    { value: 'female', label: 'Female' },
] as const;

const PHONE_CODE_OPTIONS = [
    { value: '+673', label: 'Brunei (+673)' },
    { value: '+855', label: 'Cambodia (+855)' },
    { value: '+86', label: 'China (+86)' },
    { value: '+420', label: 'Czech Republic (+420)' },
    { value: '+358', label: 'Finland (+358)' },
    { value: '+33', label: 'France (+33)' },
    { value: '+49', label: 'Germany (+49)' },
    { value: '+36', label: 'Hungary (+36)' },
    { value: '+62', label: 'Indonesia (+62)' },
    { value: '+353', label: 'Ireland (+353)' },
    { value: '+39', label: 'Italy (+39)' },
    { value: '+856', label: 'Laos (+856)' },
    { value: '+60', label: 'Malaysia (+60)' },
    { value: '+95', label: 'Myanmar (+95)' },
    { value: '+31', label: 'Netherlands (+31)' },
    { value: '+63', label: 'Philippines (+63)' },
    { value: '+48', label: 'Poland (+48)' },
    { value: '+65', label: 'Singapore (+65)' },
    { value: '+386', label: 'Slovenia (+386)' },
    { value: '+34', label: 'Spain (+34)' },
    { value: '+66', label: 'Thailand (+66)' },
    { value: '+44', label: 'United Kingdom (+44)' },
    { value: '+84', label: 'Vietnam (+84)' },
    { value: '+670', label: 'Timor-Leste (+670)' },
    { value: '+86', label: 'China (+86)' },
    { value: '+420', label: 'Czech Republic (+420)' },
    { value: '+358', label: 'Finland (+358)' },
    { value: '+33', label: 'France (+33)' },
    { value: '+49', label: 'Germany (+49)' },
    { value: '+36', label: 'Hungary (+36)' },
    { value: '+353', label: 'Ireland (+353)' },
    { value: '+39', label: 'Italy (+39)' },
    { value: '+31', label: 'Netherlands (+31)' },
    { value: '+48', label: 'Poland (+48)' },
    { value: '+386', label: 'Slovenia (+386)' },
    { value: '+34', label: 'Spain (+34)' },
    { value: '+44', label: 'United Kingdom (+44)' },
] as const;

const PARTICIPANT_FORM_STEPS = [
    { id: 1, label: 'Personal Information' },
    { id: 2, label: 'Contact & Organization' },
    { id: 3, label: 'Dietary & Accessibility' },
    { id: 4, label: 'Additional Info' },
] as const;

type ParticipantFormStep = 1 | 2 | 3 | 4;

const STEP_FIELDS: Record<ParticipantFormStep, string[]> = {
    1: [
        'full_name',
        'honorific_title',
        'honorific_other',
        'given_name',
        'middle_name',
        'family_name',
        'suffix',
        'sex_assigned_at_birth',
        'email',
    ],
    2: [
        'contact_country_code',
        'contact_number',
        'organization_name',
        'position_title',
        'country_id',
        'user_type_id',
        'other_user_type',
    ],
    3: [
        'food_restrictions',
        'dietary_allergies',
        'dietary_other',
        'accessibility_needs',
        'accessibility_other',
    ],
    4: [
        'ip_affiliation',
        'ip_group_name',
        'emergency_contact_name',
        'emergency_contact_relationship',
        'emergency_contact_phone',
        'emergency_contact_email',
        'is_active',
    ],
};

const ENTRIES_PER_PAGE_OPTIONS = [10, 20, 50, 100, 1000] as const;

const ACCESSIBILITY_NEEDS_OPTIONS = [
    { value: 'wheelchair_access', label: 'Wheelchair access' },
    { value: 'sign_language_interpreter', label: 'Sign language interpreter' },
    {
        value: 'assistive_technology_support',
        label: 'Assistive technology support',
    },
    { value: 'other', label: 'Other accommodations' },
] as const;

function formatDateSafe(value?: string | null) {
    if (!value) return '—';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '—';
    return new Intl.DateTimeFormat('en-PH', {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
    }).format(d);
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

const FALLBACK_EVENT_IMAGE = '/img/asean_banner_logo.png';

type EventPhase = 'ongoing' | 'upcoming' | 'closed';

function resolveProgrammeImage(imageUrl?: string | null) {
    if (!imageUrl) return FALLBACK_EVENT_IMAGE;
    if (imageUrl.startsWith('http') || imageUrl.startsWith('/'))
        return imageUrl;
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

function getEventPhase(
    startsAt: string,
    endsAt: string | undefined,
    nowTs: number,
): EventPhase {
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

function StatusBadge({ active }: { active: boolean }) {
    return (
        <Badge
            variant={active ? 'default' : 'secondary'}
            className={cn(
                'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px]',
                active
                    ? 'bg-emerald-600/10 text-emerald-700 hover:bg-emerald-600/10 dark:bg-emerald-500/15 dark:text-emerald-300'
                    : 'bg-slate-200 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300',
            )}
        >
            {active ? (
                <CheckCircle2 className="h-3.5 w-3.5" />
            ) : (
                <XCircle className="h-3.5 w-3.5" />
            )}
            {active ? 'Active' : 'Inactive'}
        </Badge>
    );
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

function FlagThumb({
    country,
    size = 20,
    eager = false,
}: {
    country: Country;
    size?: number;
    eager?: boolean;
}) {
    const candidates = React.useMemo(
        () => buildFlagCandidates(country.code, country.name, country.flag_url),
        [country.code, country.name, country.flag_url],
    );
    const candidateKey = React.useMemo(
        () => candidates.join('|'),
        [candidates],
    );
    const [ok, setOk] = React.useState(true);
    const [idx, setIdx] = React.useState(0);

    const src = candidates[idx] ?? null;

    React.useEffect(() => {
        setOk(true);
        setIdx(0);
    }, [candidateKey]);

    return (
        <div
            className={cn(
                'grid shrink-0 place-items-center overflow-hidden rounded-md border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950',
            )}
            style={{ width: size, height: size }}
        >
            {src && ok ? (
                <img
                    src={src}
                    alt={`${country.name} flag`}
                    className="h-full w-full object-cover"
                    loading={eager ? 'eager' : 'lazy'}
                    decoding="async"
                    draggable={false}
                    onError={() => {
                        if (idx < candidates.length - 1) setIdx((v) => v + 1);
                        else setOk(false);
                    }}
                />
            ) : (
                <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-300">
                    {country.code}
                </span>
            )}
        </div>
    );
}

function FlagCell({ country }: { country: Country }) {
    return (
        <div className="flex items-center gap-3">
            <FlagThumb country={country} size={36} eager />
            <div className="min-w-0">
                <div className="truncate font-medium text-slate-900 dark:text-slate-100">
                    {country.name}
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-400">
                    {country.code}
                </div>
            </div>
        </div>
    );
}

type PrintOrientation = 'portrait' | 'landscape';

function getFlagSrc(country?: Country | null) {
    if (!country) return null;
    if (country.flag_url) return country.flag_url;

    const code = (country.code || '').toLowerCase().trim();
    if (!code) return null;

    return `/asean/${code}.png`;
}

function resolveParticipantProfileImage(participant?: ParticipantRow | null) {
    if (!participant) return null;

    const candidate =
        participant.profile_image_url ??
        participant.profile_photo_url ??
        participant.profile_photo_path ??
        participant.profile_image_path ??
        participant.profile_image ??
        null;

    if (!candidate) return null;
    if (
        candidate.startsWith('http://') ||
        candidate.startsWith('https://') ||
        candidate.startsWith('/')
    ) {
        return candidate;
    }

    return `/${candidate}`;
}

function isChedUserType(userType?: UserType | null) {
    const t = String(userType?.slug ?? userType?.name ?? '')
        .toLowerCase()
        .replace(/[_-]+/g, ' ')
        .trim();

    // covers "CHED", "CHED LO", "CHED staff", etc.
    return t === 'ched' || t.startsWith('ched ');
}

function isAdminUserType(userType?: UserType | null) {
    const t = String(userType?.slug ?? userType?.name ?? '')
        .toLowerCase()
        .replace(/[_-]+/g, ' ')
        .trim();

    return (
        t.includes('admin') ||
        t.includes('administrator') ||
        t === 'ched' ||
        t.startsWith('ched ')
    );
}

function isChedParticipant(p: ParticipantRow) {
    return isChedUserType(p.user_type);
}

/**
 * ✅ UPDATED:
 * - removes extra bottom space in landscape by stretching + pushing scan line to bottom (mt-auto)
 * - makes participant details larger in landscape
 * - makes QR panel fill height (h-full)
 */
function ParticipantIdPrintCard({
    participant,
    qrDataUrl,
    orientation,
}: {
    participant: ParticipantRow;
    qrDataUrl?: string;
    orientation: PrintOrientation;
}) {
    const isLandscape = orientation === 'landscape';

    // ✅ final physical print sizes
    const printSize = isLandscape
        ? 'print:w-[3.37in] print:h-[2.125in]'
        : 'print:w-[3.1in] print:h-[5.05in]';

    /**
     * ✅ IMPORTANT:
     * To be EXACTLY like participant-dashboard.tsx (Virtual ID),
     * we render at the same “design width” then SCALE DOWN in print.
     *
     * Landscape Virtual ID is designed around max-w-[520px].
     * Portrait Virtual ID is designed around max-w-[360px].
     */
    const designWrap = isLandscape
        ? 'w-[520px] aspect-[3.37/2.125]'
        : 'w-[360px] aspect-[3.46/5.51]';

    // CSS px/in ≈ 96. These scale factors keep final printed size correct.
    const printScale = isLandscape
        ? 'print:scale-[0.6222]'
        : 'print:scale-[0.8267]'; // 3.37in*96/520, 3.1in*96/360
    const printLayout =
        'print:absolute print:left-0 print:top-0 print:origin-top-left';

    // ✅ changed
    const pad = isLandscape ? 'px-4 pt-3 pb-2' : 'p-4';
    const qrPanelWidth = isLandscape ? 'w-[200px]' : '';
    const qrSize = isLandscape ? 160 : 200;

    const qrImgPad = isLandscape ? 'p-1.5' : 'p-2';
    const qrPanelPad = isLandscape ? 'p-1' : 'p-3';

    const headerLogo = isLandscape ? 'h-8 w-8' : 'h-9 w-9';

    const flagSrc = getFlagSrc(participant.country);
    const name = participant.full_name || '—';
    const displayId = participant.display_id ?? '—';

    return (
        <div
            className={cn(
                // this wrapper is the "real" printed size
                'id-print-card relative overflow-hidden',
                printSize,
            )}
            style={{
                WebkitPrintColorAdjust: 'exact',
                printColorAdjust: 'exact',
            }}
        >
            {/* This inner card is EXACTLY the Virtual ID layout, scaled down for print */}
            <div
                className={cn(
                    'id-print-card-inner relative',
                    designWrap,
                    // in print: use scaling only for landscape to avoid portrait print clipping
                    printLayout,
                    printScale,
                )}
            >
                <div className="relative h-full w-full overflow-hidden rounded-3xl border border-slate-200/70 bg-white shadow-sm dark:border-white/10 dark:bg-slate-950">
                    {/* Background */}
                    <div aria-hidden className="absolute inset-0">
                        <img
                            src="/img/bg.png"
                            alt=""
                            className={cn(
                                'absolute inset-0 h-full w-full object-cover',
                                'brightness-80 contrast-150 saturate-200 filter',
                                'dark:brightness-80 dark:contrast-110',
                                isLandscape
                                    ? 'opacity-100 dark:opacity-35'
                                    : 'opacity-100 dark:opacity-30',
                            )}
                            draggable={false}
                            loading="eager"
                            decoding="async"
                        />

                        <div className="absolute inset-0 bg-black/10 dark:bg-black/15" />
                        <div className="absolute inset-0 bg-gradient-to-b from-white/45 via-white/20 to-white/55 dark:from-slate-950/55 dark:via-slate-950/28 dark:to-slate-950/55" />
                        <div className="pointer-events-none absolute -top-10 -right-10 h-36 w-36 rounded-full bg-slate-200/60 blur-3xl dark:bg-slate-800/60" />
                    </div>

                    <div className={cn('relative flex h-full flex-col', pad)}>
                        {/* Header */}
                        <div className="flex items-center justify-between gap-2">
                            <div className="flex min-w-0 items-center gap-2.5">
                                <img
                                    src="/img/asean_logo.svg"
                                    alt="ASEAN"
                                    className={cn(
                                        'object-contain drop-shadow-sm',
                                        headerLogo,
                                    )}
                                    draggable={false}
                                    loading="eager"
                                    decoding="async"
                                />
                                <img
                                    src="/img/bagong_pilipinas.svg"
                                    alt="Bagong Pilipinas"
                                    className={cn(
                                        'object-contain drop-shadow-sm',
                                        headerLogo,
                                    )}
                                    draggable={false}
                                    loading="eager"
                                    decoding="async"
                                />

                                <div className="min-w-0">
                                    <div
                                        className={cn(
                                            'truncate font-semibold tracking-wide text-slate-700 dark:text-slate-200',
                                            'text-[11px]',
                                        )}
                                    >
                                        ASEAN Philippines 2026
                                    </div>
                                    <div className="truncate text-[10px] text-slate-500 dark:text-slate-400">
                                        Participant Identification
                                    </div>
                                </div>
                            </div>
                        </div>

                        <Separator
                            className={cn(
                                'bg-slate-200/70 dark:bg-white/10',
                                isLandscape ? 'my-2' : 'my-3',
                            )}
                        />

                        {/* Body */}
                        <div
                            className={cn(
                                'flex-1',
                                isLandscape
                                    ? 'grid grid-cols-[1fr_200px] items-stretch gap-3'
                                    : 'flex flex-col gap-3',
                            )}
                        >
                            {/* LEFT INFO */}
                            <div className="flex h-full min-w-0 flex-col">
                                <div
                                    className={cn(
                                        'font-medium tracking-wide text-slate-500 uppercase dark:text-slate-400',
                                        isLandscape
                                            ? 'text-[13px]'
                                            : 'text-[10px]',
                                    )}
                                >
                                    Participant
                                </div>

                                <div
                                    className={cn(
                                        'mt-0.5 line-clamp-2 font-semibold tracking-tight break-words text-slate-900 dark:text-slate-100',
                                        isLandscape
                                            ? 'text-[20px] leading-[18px]'
                                            : 'text-lg leading-6',
                                    )}
                                    title={name}
                                >
                                    {name}
                                </div>

                                <div
                                    className={cn(
                                        'flex items-center gap-2.5',
                                        isLandscape ? 'mt-2' : 'mt-2.5',
                                    )}
                                >
                                    <div
                                        className={cn(
                                            'overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-sm dark:border-white/10 dark:bg-slate-950',
                                            isLandscape
                                                ? 'h-[60px] w-[60px]'
                                                : 'h-9 w-9',
                                        )}
                                    >
                                        {flagSrc ? (
                                            <img
                                                src={flagSrc}
                                                alt={
                                                    participant.country?.name ??
                                                    'Country flag'
                                                }
                                                className="h-full w-full object-cover"
                                                draggable={false}
                                                loading="eager"
                                                decoding="async"
                                                onError={(e) => {
                                                    (
                                                        e.currentTarget as HTMLImageElement
                                                    ).style.display = 'none';
                                                }}
                                            />
                                        ) : null}
                                    </div>

                                    <div className="min-w-0">
                                        <div
                                            className={cn(
                                                'truncate font-semibold text-slate-900 dark:text-slate-100',
                                                isLandscape
                                                    ? 'text-[18px]'
                                                    : 'text-[12px]',
                                            )}
                                        >
                                            {participant.country?.name ?? '—'}
                                        </div>

                                        {participant.country?.code ? (
                                            <div
                                                className={cn(
                                                    'font-medium text-slate-500 dark:text-slate-400',
                                                    isLandscape
                                                        ? 'text-[15px]'
                                                        : 'text-[11px]',
                                                )}
                                            >
                                                {String(
                                                    participant.country.code ??
                                                        '',
                                                ).toUpperCase()}
                                            </div>
                                        ) : null}
                                    </div>
                                </div>

                                <div
                                    className={cn(
                                        isLandscape ? 'mt-2' : 'mt-3',
                                    )}
                                >
                                    <div className="text-[13px] font-medium tracking-wide text-slate-500 uppercase dark:text-slate-400">
                                        Participant ID
                                    </div>

                                    <div
                                        className={cn(
                                            'mt-1 inline-flex max-w-full rounded-2xl border border-slate-200/70 bg-white/80 font-mono break-words whitespace-normal text-slate-900 shadow-sm backdrop-blur dark:border-white/10 dark:bg-slate-950/45 dark:text-slate-100',
                                            isLandscape
                                                ? 'px-3 py-1.5 text-[16px] leading-4'
                                                : 'px-2.5 py-1.5 text-[11px] leading-4',
                                        )}
                                    >
                                        {displayId}
                                    </div>
                                </div>

                                {/* ✅ push to bottom in landscape (removes the “big empty bottom”) */}
                                <div
                                    className={cn(
                                        'text-slate-500 dark:text-slate-400',
                                        isLandscape
                                            ? 'mt-auto pt-1 text-[10px]'
                                            : 'mt-2 text-[10px]',
                                    )}
                                >
                                    Scan QR for attendance verification.
                                </div>
                            </div>

                            {/* RIGHT QR */}
                            <div
                                className={cn(
                                    'flex h-full flex-col items-center justify-center rounded-3xl border border-slate-200/70 bg-white/80 shadow-sm backdrop-blur dark:border-white/10 dark:bg-slate-950/45',
                                    qrPanelWidth,
                                    qrPanelPad,
                                )}
                            >
                                <div
                                    className={cn(
                                        'inline-flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-200',
                                        isLandscape
                                            ? 'mb-1 text-[10px]'
                                            : 'mb-1.5 text-[11px]',
                                    )}
                                >
                                    <QrCodeIcon
                                        className={cn(
                                            isLandscape
                                                ? 'h-3.5 w-3.5'
                                                : 'h-4 w-4',
                                        )}
                                    />
                                    QR Code
                                </div>

                                {qrDataUrl ? (
                                    <img
                                        src={qrDataUrl}
                                        alt="Participant QR code"
                                        className={cn(
                                            'rounded-2xl bg-white object-contain',
                                            qrImgPad,
                                        )}
                                        style={{
                                            width: qrSize,
                                            height: qrSize,
                                        }}
                                        draggable={false}
                                    />
                                ) : (
                                    <div
                                        className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-slate-200/70 bg-white/60 text-center dark:border-white/10 dark:bg-slate-950/30"
                                        style={{
                                            width: qrSize,
                                            height: qrSize,
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
                                        className={cn(
                                            'font-semibold text-slate-900 dark:text-slate-100',
                                            isLandscape
                                                ? 'text-[10px]'
                                                : 'text-[11px]',
                                        )}
                                    >
                                        <span
                                            className="line-clamp-2"
                                            title={`${String(participant.country?.code ?? '').toUpperCase()} • ${name}`}
                                        >
                                            {String(
                                                participant.country?.code ?? '',
                                            ).toUpperCase()}

                                            {participant.country?.code
                                                ? ' • '
                                                : ''}
                                            {name}
                                        </span>
                                    </div>
                                    <div
                                        className={cn(
                                            'mt-1 font-mono break-words text-slate-500 dark:text-slate-400',
                                            'text-[10px]',
                                        )}
                                    >
                                        {displayId}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer omitted (matches dashboard virtual ID) */}
                    </div>
                </div>
            </div>
        </div>
    );
}

function slugify(input: string) {
    return input
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-') // spaces -> dash
        .replace(/(^-|-$)/g, '');
}

function chunk<T>(arr: T[], size: number) {
    const out: T[][] = [];
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
    return out;
}

function buildFlagCandidates(
    code: string,
    name: string,
    preferred?: string | null,
) {
    const c = code.toLowerCase();
    const n = slugify(name);

    // Tries common patterns inside public/asean/
    const candidates = [
        preferred || undefined,
        `/asean/${c}.png`,
        `/asean/${c}.jpg`,
        `/asean/${c}.jpeg`,
        `/asean/${c}.svg`,
        `/asean/${n}.png`,
        `/asean/${n}.jpg`,
        `/asean/${n}.jpeg`,
        `/asean/${n}.svg`,
    ].filter(Boolean) as string[];

    // Remove duplicates
    return Array.from(new Set(candidates));
}

function showToastError(errors: Record<string, string | string[]>) {
    const first = Object.values(errors)[0];
    const message = Array.isArray(first) ? first[0] : first;
    toast.error(message || 'Something went wrong. Please try again.');
}

function FlagImage({
    code,
    name,
    preferredSrc,
    className,
}: {
    code: string;
    name: string;
    preferredSrc?: string | null;
    className?: string;
}) {
    const candidates = React.useMemo(
        () => buildFlagCandidates(code, name, preferredSrc),
        [code, name, preferredSrc],
    );
    const [idx, setIdx] = React.useState(0);
    const [failed, setFailed] = React.useState(false);

    React.useEffect(() => {
        setIdx(0);
        setFailed(false);
    }, [code, name, preferredSrc]);

    if (failed || candidates.length === 0) return null;

    return (
        <img
            src={candidates[idx]}
            alt={`${name} flag`}
            className={className}
            draggable={false}
            loading="lazy"
            onError={() => {
                if (idx < candidates.length - 1) setIdx((v) => v + 1);
                else setFailed(true);
            }}
        />
    );
}

export default function ParticipantPage(props: PageProps) {
    const countries: Country[] = props.countries ?? [];
    const userTypes: UserType[] = props.userTypes ?? [];
    const participants: ParticipantRow[] = props.participants ?? [];
    const programmes: ProgrammeRow[] = props.programmes ?? [];

    // ---------------------------------------
    // UI state
    // ---------------------------------------
    const [activeTab, setActiveTab] = React.useState<
        'participants' | 'countries' | 'userTypes'
    >('participants');

    const [participantQuery, setParticipantQuery] = React.useState('');
    const [participantCountryFilter, setParticipantCountryFilter] =
        React.useState<string>('all');
    const [participantTypeFilter, setParticipantTypeFilter] =
        React.useState<string>('all');
    const [participantStatusFilter, setParticipantStatusFilter] =
        React.useState<'all' | 'active' | 'inactive'>('all');
    const [participantEventFilter, setParticipantEventFilter] =
        React.useState<string>('all');
    const [participantCountryOpen, setParticipantCountryOpen] =
        React.useState(false);
    const [participantTypeOpen, setParticipantTypeOpen] = React.useState(false);
    const [participantStatusOpen, setParticipantStatusOpen] =
        React.useState(false);
    const [participantEventOpen, setParticipantEventOpen] =
        React.useState(false);
    const [participantFormCountryOpen, setParticipantFormCountryOpen] =
        React.useState(false);
    const [participantFormTypeOpen, setParticipantFormTypeOpen] =
        React.useState(false);
    const [participantFormHonorificOpen, setParticipantFormHonorificOpen] =
        React.useState(false);
    const [participantFormSexOpen, setParticipantFormSexOpen] =
        React.useState(false);
    const [participantFormPhoneCodeOpen, setParticipantFormPhoneCodeOpen] =
        React.useState(false);

    const [countryQuery, setCountryQuery] = React.useState('');
    const [userTypeQuery, setUserTypeQuery] = React.useState('');
    const [selectedParticipantIds, setSelectedParticipantIds] = React.useState<
        Set<number>
    >(new Set());
    const [expandedRowIds, setExpandedRowIds] = React.useState<Set<number>>(
        new Set(),
    );
    const [currentPage, setCurrentPage] = React.useState(1);
    const [entriesPerPage, setEntriesPerPage] = React.useState(10);
    const [participantFormStep, setParticipantFormStep] =
        React.useState<ParticipantFormStep>(1);
    const [printOrientation, setPrintOrientation] =
        React.useState<PrintOrientation>('portrait');
    const [qrDataUrls, setQrDataUrls] = React.useState<Record<number, string>>(
        {},
    );
    const qrCacheRef = React.useRef<Record<number, string>>({});

    async function ensureQrForParticipants(list: ParticipantRow[]) {
        const pending = list.filter(
            (p) => !!p.qr_payload && !qrCacheRef.current[p.id],
        );

        if (pending.length === 0) return;

        const results = await Promise.all(
            pending.map(async (p) => {
                try {
                    const dataUrl = await QRCode.toDataURL(p.qr_payload ?? '', {
                        margin: 1,
                        scale: 8,
                        errorCorrectionLevel: 'M',
                    });
                    return { id: p.id, dataUrl };
                } catch {
                    return null;
                }
            }),
        );

        const next = { ...qrCacheRef.current };
        let changed = false;

        for (const r of results) {
            if (!r) continue;
            next[r.id] = r.dataUrl;
            changed = true;
        }

        if (changed) {
            qrCacheRef.current = next;
            setQrDataUrls(next);
        }
    }

    const [printMounted, setPrintMounted] = React.useState(false);
    React.useEffect(() => setPrintMounted(true), []);

    // dialogs
    const [participantDialogOpen, setParticipantDialogOpen] =
        React.useState(false);
    const [virtualIdDialogOpen, setVirtualIdDialogOpen] = React.useState(false);
    const [virtualIdParticipant, setVirtualIdParticipant] =
        React.useState<ParticipantRow | null>(null);
    const [countryDialogOpen, setCountryDialogOpen] = React.useState(false);
    const [userTypeDialogOpen, setUserTypeDialogOpen] = React.useState(false);
    const [programmeDialogOpen, setProgrammeDialogOpen] = React.useState(false);
    const [programmeParticipant, setProgrammeParticipant] =
        React.useState<ParticipantRow | null>(null);
    const [programmeQuery, setProgrammeQuery] = React.useState('');

    // delete confirm
    const [deleteOpen, setDeleteOpen] = React.useState(false);
    const [deleteTarget, setDeleteTarget] = React.useState<{
        kind: 'participant' | 'country' | 'userType';
        id: number;
        label: string;
    } | null>(null);

    // editing state
    const [editingParticipant, setEditingParticipant] =
        React.useState<ParticipantRow | null>(null);
    const [editingCountry, setEditingCountry] = React.useState<Country | null>(
        null,
    );
    const [editingUserType, setEditingUserType] =
        React.useState<UserType | null>(null);

    const [participantProfilePreview, setParticipantProfilePreview] =
        React.useState<string | null>(null);
    const participantProfileInputRef = React.useRef<HTMLInputElement | null>(
        null,
    );

    async function openVirtualIdDialog(participant: ParticipantRow) {
        setVirtualIdParticipant(participant);
        setVirtualIdDialogOpen(true);
        await ensureQrForParticipants([participant]);
    }

    // ✅ Country flag preview
    const [countryFlagPreview, setCountryFlagPreview] = React.useState<
        string | null
    >(null);

    React.useEffect(() => {
        return () => {
            if (countryFlagPreview?.startsWith('blob:'))
                URL.revokeObjectURL(countryFlagPreview);
        };
    }, [countryFlagPreview]);

    React.useEffect(() => {
        return () => {
            if (participantProfilePreview?.startsWith('blob:')) {
                URL.revokeObjectURL(participantProfilePreview);
            }
        };
    }, [participantProfilePreview]);

    // ---------------------------------------
    // Forms (Inertia)
    // ---------------------------------------
    const participantForm = useForm<{
        full_name: string;
        email: string;
        contact_number: string;
        contact_country_code: string;
        country_id: string; // Select uses string
        user_type_id: string; // Select uses string
        other_user_type: string;
        honorific_title: string;
        honorific_other: string;
        given_name: string;
        middle_name: string;
        family_name: string;
        suffix: string;
        sex_assigned_at_birth: string;
        organization_name: string;
        position_title: string;
        ip_affiliation: boolean;
        ip_group_name: string;
        is_active: boolean;
        password: string;
        has_food_restrictions: boolean;
        food_restrictions: string[];
        dietary_allergies: string;
        dietary_other: string;
        accessibility_needs: string[];
        accessibility_other: string;
        emergency_contact_name: string;
        emergency_contact_relationship: string;
        emergency_contact_phone: string;
        emergency_contact_email: string;
        profile_image: File | null;
        remove_profile_image: boolean;
    }>({
        full_name: '',
        email: '',
        contact_number: '',
        contact_country_code: '',
        country_id: '',
        user_type_id: '',
        other_user_type: '',
        honorific_title: '',
        honorific_other: '',
        given_name: '',
        middle_name: '',
        family_name: '',
        suffix: '',
        sex_assigned_at_birth: '',
        organization_name: '',
        position_title: '',
        ip_affiliation: false,
        ip_group_name: '',
        is_active: true,
        password: 'aseanph2026',
        has_food_restrictions: false,
        food_restrictions: [],
        dietary_allergies: '',
        dietary_other: '',
        accessibility_needs: [],
        accessibility_other: '',
        emergency_contact_name: '',
        emergency_contact_relationship: '',
        emergency_contact_phone: '',
        emergency_contact_email: '',
        profile_image: null,
        remove_profile_image: false,
    });

    const countryForm = useForm<{
        code: string;
        name: string;
        is_active: boolean;
        flag: File | null; // ✅ upload
    }>({
        code: '',
        name: '',
        is_active: true,
        flag: null,
    });

    const userTypeForm = useForm<{
        name: string;
        is_active: boolean;
        sequence_order: string;
    }>({
        name: '',
        is_active: true,
        sequence_order: '',
    });

    // ---------------------------------------
    // Derived maps/helpers
    // ---------------------------------------
    const countryById = React.useMemo(
        () => new Map(countries.map((c) => [c.id, c])),
        [countries],
    );
    const userTypeById = React.useMemo(
        () => new Map(userTypes.map((u) => [u.id, u])),
        [userTypes],
    );

    const resolvedParticipants = React.useMemo(() => {
        // if backend didn't include relations, resolve from ids for display
        return participants.map((p) => ({
            ...p,
            country:
                p.country ??
                (p.country_id ? (countryById.get(p.country_id) ?? null) : null),
            user_type:
                p.user_type ??
                (p.user_type_id
                    ? (userTypeById.get(p.user_type_id) ?? null)
                    : null),
        }));
    }, [participants, countryById, userTypeById]);

    const nowTs = useNowTs();

    const normalizedProgrammes = React.useMemo(
        () =>
            programmes
                .map((programme) => {
                    const startsAt =
                        programme.starts_at ??
                        programme.ends_at ??
                        new Date(nowTs).toISOString();
                    const endsAt = programme.ends_at ?? undefined;
                    const isActive = programme.is_active ?? true;
                    const phase = isActive
                        ? getEventPhase(startsAt, endsAt, nowTs)
                        : 'closed';
                    const venueName = programme.venue?.name?.trim() ?? '';
                    const venueAddress = programme.venue?.address?.trim() ?? '';
                    const venueLabel =
                        venueName && venueAddress
                            ? `${venueName} • ${venueAddress}`
                            : venueName || venueAddress || '';

                    return {
                        id: programme.id,
                        tag: programme.tag ?? '',
                        title: programme.title,
                        description: programme.description,
                        startsAt,
                        endsAt,
                        location: venueLabel || (programme.location ?? ''),
                        imageUrl: resolveProgrammeImage(programme.image_url),
                        phase,
                        isActive,
                    };
                })
                .sort(
                    (a, b) =>
                        new Date(a.startsAt).getTime() -
                        new Date(b.startsAt).getTime(),
                ),
        [programmes, nowTs],
    );
    const programmeById = React.useMemo(
        () =>
            new Map(
                normalizedProgrammes.map((programme) => [
                    String(programme.id),
                    programme,
                ]),
            ),
        [normalizedProgrammes],
    );

    const filteredProgrammes = React.useMemo(() => {
        const q = programmeQuery.trim().toLowerCase();
        if (!q) return normalizedProgrammes;
        return normalizedProgrammes.filter((event) => {
            return (
                event.title.toLowerCase().includes(q) ||
                event.description.toLowerCase().includes(q) ||
                event.tag.toLowerCase().includes(q) ||
                event.location.toLowerCase().includes(q)
            );
        });
    }, [normalizedProgrammes, programmeQuery]);

    const filteredParticipants = React.useMemo(() => {
        const q = participantQuery.trim().toLowerCase();
        return resolvedParticipants.filter((p) => {
            const matchesQuery =
                !q ||
                p.full_name.toLowerCase().includes(q) ||
                p.email.toLowerCase().includes(q) ||
                (p.contact_number ?? '').toLowerCase().includes(q) ||
                (p.country?.name ?? '').toLowerCase().includes(q) ||
                (p.user_type?.name ?? '').toLowerCase().includes(q);

            const matchesCountry =
                participantCountryFilter === 'all' ||
                String(p.country_id ?? '') === participantCountryFilter;

            const matchesType =
                participantTypeFilter === 'all' ||
                String(p.user_type_id ?? '') === participantTypeFilter;

            const matchesStatus =
                participantStatusFilter === 'all' ||
                (participantStatusFilter === 'active'
                    ? p.is_active
                    : !p.is_active);

            const matchesEvent =
                participantEventFilter === 'all' ||
                (p.joined_programme_ids ?? []).includes(
                    Number(participantEventFilter),
                );

            return (
                matchesQuery &&
                matchesCountry &&
                matchesType &&
                matchesStatus &&
                matchesEvent
            );
        });
    }, [
        resolvedParticipants,
        participantQuery,
        participantCountryFilter,
        participantTypeFilter,
        participantStatusFilter,
        participantEventFilter,
    ]);

    const totalPages = React.useMemo(
        () =>
            Math.max(
                1,
                Math.ceil(filteredParticipants.length / entriesPerPage),
            ),
        [filteredParticipants.length, entriesPerPage],
    );

    const paginatedParticipants = React.useMemo(() => {
        const start = (currentPage - 1) * entriesPerPage;
        return filteredParticipants.slice(start, start + entriesPerPage);
    }, [filteredParticipants, currentPage, entriesPerPage]);

    const filteredCountries = React.useMemo(() => {
        const q = countryQuery.trim().toLowerCase();
        return countries.filter((c) =>
            !q
                ? true
                : c.name.toLowerCase().includes(q) ||
                  c.code.toLowerCase().includes(q),
        );
    }, [countries, countryQuery]);

    const groupedCountries = React.useMemo(
        () => splitCountriesByAsean(countries),
        [countries],
    );
    const groupedActiveCountries = React.useMemo(
        () =>
            splitCountriesByAsean(
                countries.filter((country) => country.is_active),
            ),
        [countries],
    );

    const orderedUserTypes = React.useMemo(() => {
        return [...userTypes].sort((a, b) => {
            const orderA = a.sequence_order ?? 0;
            const orderB = b.sequence_order ?? 0;

            if (orderA !== orderB) return orderA - orderB;

            return a.id - b.id;
        });
    }, [userTypes]);

    const filteredUserTypes = React.useMemo(() => {
        const q = userTypeQuery.trim().toLowerCase();
        return orderedUserTypes.filter((u) =>
            !q
                ? true
                : u.name.toLowerCase().includes(q) ||
                  (u.slug ?? '').toLowerCase().includes(q),
        );
    }, [orderedUserTypes, userTypeQuery]);

    const participantById = React.useMemo(
        () => new Map(resolvedParticipants.map((p) => [p.id, p])),
        [resolvedParticipants],
    );

    const selectableVisibleParticipants = React.useMemo(
        () => paginatedParticipants,
        [paginatedParticipants],
    );

    const selectedParticipantsPrintable = React.useMemo(() => {
        const out: ParticipantRow[] = [];
        selectedParticipantIds.forEach((id) => {
            const p = participantById.get(id);
            if (p) out.push(p);
        });
        return out;
    }, [selectedParticipantIds, participantById]);

    const selectedParticipantUserType = React.useMemo(() => {
        if (participantForm.data.user_type_id) {
            return (
                userTypeById.get(Number(participantForm.data.user_type_id)) ??
                null
            );
        }

        if (editingParticipant?.user_type) {
            return editingParticipant.user_type;
        }

        return null;
    }, [participantForm.data.user_type_id, userTypeById, editingParticipant]);

    const showFoodRestrictionsField = true;

    const stepWithErrors = React.useMemo(() => {
        const result = new Set<ParticipantFormStep>();
        for (const [step, fields] of Object.entries(STEP_FIELDS)) {
            if (
                fields.some(
                    (field) =>
                        !!(participantForm.errors as Record<string, string>)[
                            field
                        ],
                )
            ) {
                result.add(Number(step) as ParticipantFormStep);
            }
        }
        return result;
    }, [participantForm.errors]);

    React.useEffect(() => {
        setCurrentPage(1);
    }, [
        participantQuery,
        participantCountryFilter,
        participantTypeFilter,
        participantStatusFilter,
        participantEventFilter,
        entriesPerPage,
    ]);

    const toggleRowExpand = React.useCallback((id: number) => {
        setExpandedRowIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }, []);

    const allVisibleSelected =
        selectableVisibleParticipants.length > 0 &&
        selectableVisibleParticipants.every((p) =>
            selectedParticipantIds.has(p.id),
        );
    const selectedCountry =
        participantCountryFilter === 'all'
            ? null
            : countryById.get(Number(participantCountryFilter));
    const selectedUserType =
        participantTypeFilter === 'all'
            ? null
            : userTypeById.get(Number(participantTypeFilter));
    const selectedEvent =
        participantEventFilter === 'all'
            ? null
            : programmeById.get(participantEventFilter);
    const selectedStatusLabel =
        participantStatusFilter === 'all'
            ? 'All Statuses'
            : participantStatusFilter === 'active'
              ? 'Active'
              : 'Inactive';
    const selectedFormCountry = participantForm.data.country_id
        ? countryById.get(Number(participantForm.data.country_id))
        : null;
    const selectedFormUserType = participantForm.data.user_type_id
        ? userTypeById.get(Number(participantForm.data.user_type_id))
        : null;
    const isOtherParticipantType =
        (selectedFormUserType?.slug ?? '').toLowerCase() === 'other' ||
        (selectedFormUserType?.name ?? '').toLowerCase() === 'other';

    React.useEffect(() => {
        let active = true;
        const pending = filteredParticipants.filter(
            (p) => p.qr_payload && !qrCacheRef.current[p.id],
        );

        if (pending.length === 0) return undefined;

        Promise.all(
            pending.map(async (p) => {
                try {
                    const dataUrl = await QRCode.toDataURL(p.qr_payload ?? '', {
                        margin: 1,
                        scale: 8,
                        errorCorrectionLevel: 'M',
                    });
                    return { id: p.id, dataUrl };
                } catch {
                    return null;
                }
            }),
        ).then((results) => {
            if (!active) return;
            const next = { ...qrCacheRef.current };
            let changed = false;
            results.forEach((result) => {
                if (!result) return;
                next[result.id] = result.dataUrl;
                changed = true;
            });
            if (changed) {
                qrCacheRef.current = next;
                setQrDataUrls(next);
            }
        });

        return () => {
            active = false;
        };
    }, [filteredParticipants]);

    React.useEffect(() => {
        if (!isOtherParticipantType && participantForm.data.other_user_type) {
            participantForm.setData('other_user_type', '');
        }
    }, [isOtherParticipantType, participantForm]);

    // ---------------------------------------
    // Actions (CRUD)
    // ---------------------------------------
    function resetParticipantProfilePreview(next: string | null) {
        setParticipantProfilePreview((prev) => {
            if (prev?.startsWith('blob:')) URL.revokeObjectURL(prev);
            return next;
        });
    }

    function handleParticipantProfileChange(
        e: React.ChangeEvent<HTMLInputElement>,
    ) {
        const file = e.target.files?.[0] ?? null;
        participantForm.setData('profile_image', file);
        participantForm.setData('remove_profile_image', false);

        if (!file) {
            resetParticipantProfilePreview(
                resolveParticipantProfileImage(editingParticipant),
            );
            return;
        }

        resetParticipantProfilePreview(URL.createObjectURL(file));
    }

    function removeParticipantProfileImage() {
        const currentProfileImage =
            resolveParticipantProfileImage(editingParticipant);

        participantForm.setData('profile_image', null);
        participantForm.setData('remove_profile_image', false);
        if (participantProfileInputRef.current) {
            participantProfileInputRef.current.value = '';
        }
        resetParticipantProfilePreview(currentProfileImage);
        toast.success('Uploaded profile image removed.');
    }

    function openAddParticipant() {
        setEditingParticipant(null);
        participantForm.reset();
        participantForm.setData('profile_image', null);
        participantForm.setData('remove_profile_image', false);
        if (participantProfileInputRef.current) {
            participantProfileInputRef.current.value = '';
        }
        resetParticipantProfilePreview(null);
        participantForm.clearErrors();
        setParticipantFormStep(1);
        setParticipantDialogOpen(true);
    }

    function openEditParticipant(p: ParticipantRow) {
        setEditingParticipant(p);
        participantForm.setData({
            full_name: p.full_name ?? '',
            email: p.email ?? '',
            contact_number: p.contact_number ?? '',
            contact_country_code: p.contact_country_code ?? '',
            country_id: p.country_id ? String(p.country_id) : '',
            user_type_id: p.user_type_id ? String(p.user_type_id) : '',
            other_user_type: p.other_user_type ?? '',
            honorific_title: p.honorific_title ?? '',
            honorific_other: p.honorific_other ?? '',
            given_name: p.given_name ?? '',
            middle_name: p.middle_name ?? '',
            family_name: p.family_name ?? '',
            suffix: p.suffix ?? '',
            sex_assigned_at_birth: p.sex_assigned_at_birth ?? '',
            organization_name: p.organization_name ?? '',
            position_title: p.position_title ?? '',
            ip_affiliation: !!p.ip_affiliation,
            ip_group_name: p.ip_group_name ?? '',
            is_active: !!p.is_active,
            has_food_restrictions: !!p.has_food_restrictions,
            food_restrictions: p.food_restrictions ?? [],
            dietary_allergies: p.dietary_allergies ?? '',
            dietary_other: p.dietary_other ?? '',
            accessibility_needs: p.accessibility_needs ?? [],
            accessibility_other: p.accessibility_other ?? '',
            emergency_contact_name: p.emergency_contact_name ?? '',
            emergency_contact_relationship:
                p.emergency_contact_relationship ?? '',
            emergency_contact_phone: p.emergency_contact_phone ?? '',
            emergency_contact_email: p.emergency_contact_email ?? '',
            profile_image: null,
            remove_profile_image: false,
        });
        if (participantProfileInputRef.current) {
            participantProfileInputRef.current.value = '';
        }
        resetParticipantProfilePreview(resolveParticipantProfileImage(p));
        participantForm.clearErrors();
        setParticipantFormStep(1);
        setParticipantDialogOpen(true);
    }

    function submitParticipant(e: React.FormEvent) {
        e.preventDefault();

        if (participantFormStep < 4) {
            setParticipantFormStep((s) => (s + 1) as ParticipantFormStep);
            return;
        }

        participantForm.transform((data) => ({
            ...(editingParticipant ? { _method: 'patch' as const } : {}),
            full_name: data.full_name.trim(),
            email: data.email.trim(),
            contact_number: data.contact_number.trim() || null,
            contact_country_code: data.contact_country_code.trim() || null,
            country_id: data.country_id ? Number(data.country_id) : null,
            user_type_id: data.user_type_id ? Number(data.user_type_id) : null,
            other_user_type: data.other_user_type.trim() || null,
            honorific_title: data.honorific_title.trim() || null,
            honorific_other: data.honorific_other.trim() || null,
            given_name: data.given_name.trim() || null,
            middle_name: data.middle_name.trim() || null,
            family_name: data.family_name.trim() || null,
            suffix: data.suffix.trim() || null,
            sex_assigned_at_birth: data.sex_assigned_at_birth.trim() || null,
            organization_name: data.organization_name.trim() || null,
            position_title: data.position_title.trim() || null,
            ip_affiliation: data.ip_affiliation,
            ip_group_name: data.ip_affiliation
                ? data.ip_group_name.trim() || null
                : null,
            is_active: data.is_active,
            food_restrictions: data.food_restrictions,
            has_food_restrictions: data.food_restrictions.length > 0,
            dietary_allergies: data.food_restrictions.includes('allergies')
                ? data.dietary_allergies.trim() || null
                : null,
            dietary_other: data.food_restrictions.includes('other')
                ? data.dietary_other.trim() || null
                : null,
            accessibility_needs: data.accessibility_needs,
            accessibility_other: data.accessibility_needs.includes('other')
                ? data.accessibility_other.trim() || null
                : null,
            emergency_contact_name: data.emergency_contact_name.trim() || null,
            emergency_contact_relationship:
                data.emergency_contact_relationship.trim() || null,
            emergency_contact_phone:
                data.emergency_contact_phone.trim() || null,
            emergency_contact_email:
                data.emergency_contact_email.trim() || null,
            remove_profile_image: data.remove_profile_image,
            ...(data.profile_image
                ? { profile_image: data.profile_image }
                : {}),
            ...(editingParticipant ? {} : { password: data.password }),
        }));

        const handleSubmitError = (
            errors: Record<string, string | string[]>,
        ) => {
            showToastError(errors);
            for (const [step, fields] of Object.entries(STEP_FIELDS)) {
                if (fields.some((field) => !!errors[field])) {
                    setParticipantFormStep(Number(step) as ParticipantFormStep);
                    break;
                }
            }
        };

        if (editingParticipant) {
            participantForm.post(
                ENDPOINTS.participants.update(editingParticipant.id),
                {
                    preserveScroll: true,
                    forceFormData: true,
                    onSuccess: () => {
                        setParticipantDialogOpen(false);
                        setEditingParticipant(null);
                        toast.success('Participant updated.');
                    },
                    onError: handleSubmitError,
                },
            );
        } else {
            participantForm.post(ENDPOINTS.participants.store, {
                preserveScroll: true,
                forceFormData: true,
                onSuccess: () => {
                    setParticipantDialogOpen(false);
                    toast.success('Participant added.');
                },
                onError: handleSubmitError,
            });
        }
    }

    function toggleParticipantActive(p: ParticipantRow) {
        router.patch(
            ENDPOINTS.participants.update(p.id),
            { is_active: !p.is_active },
            {
                preserveScroll: true,
                onSuccess: () =>
                    toast.success(
                        `Participant ${p.is_active ? 'deactivated' : 'activated'}.`,
                    ),
                onError: () =>
                    toast.error('Unable to update participant status.'),
            },
        );
    }

    function resetParticipantPassword(p: ParticipantRow) {
        router.patch(
            ENDPOINTS.participants.update(p.id),
            { password: 'aseanph2026' },
            {
                preserveScroll: true,
                onSuccess: () => toast.success('Participant password reset.'),
                onError: () =>
                    toast.error('Unable to reset participant password.'),
            },
        );
    }

    function openProgrammeManager(p: ParticipantRow) {
        setProgrammeParticipant(p);
        setProgrammeDialogOpen(true);
        setProgrammeQuery('');
    }

    function updateProgrammeSelection(programmeId: number, isJoined: boolean) {
        setProgrammeParticipant((prev) => {
            if (!prev) return prev;
            const current = new Set(prev.joined_programme_ids ?? []);
            if (isJoined) current.add(programmeId);
            else current.delete(programmeId);
            return { ...prev, joined_programme_ids: Array.from(current) };
        });
    }

    function updateProgrammeCheckIn(programmeId: number, isCheckedIn: boolean) {
        setProgrammeParticipant((prev) => {
            if (!prev) return prev;
            const current = new Set(prev.checked_in_programme_ids ?? []);
            if (isCheckedIn) current.add(programmeId);
            else current.delete(programmeId);
            return { ...prev, checked_in_programme_ids: Array.from(current) };
        });
    }

    function toggleProgrammeJoin(
        participant: ParticipantRow,
        programmeId: number,
        isJoined: boolean,
    ) {
        const endpoint = isJoined
            ? ENDPOINTS.participantProgrammes.leave(participant.id, programmeId)
            : ENDPOINTS.participantProgrammes.join(participant.id, programmeId);

        if (isJoined) {
            router.delete(endpoint, {
                preserveScroll: true,
                onSuccess: () => {
                    updateProgrammeSelection(programmeId, false);
                    updateProgrammeCheckIn(programmeId, false);
                    toast.success('Event removed from participant.');
                },
                onError: () =>
                    toast.error('Unable to update participant events.'),
            });
            return;
        }

        router.post(
            endpoint,
            {},
            {
                preserveScroll: true,
                onSuccess: () => {
                    updateProgrammeSelection(programmeId, true);
                    toast.success('Event added to participant.');
                },
                onError: () =>
                    toast.error('Unable to update participant events.'),
            },
        );
    }

    function revertProgrammeAttendance(
        participant: ParticipantRow,
        programmeId: number,
    ) {
        router.delete(
            ENDPOINTS.participantProgrammes.revertAttendance(
                participant.id,
                programmeId,
            ),
            {
                preserveScroll: true,
                onSuccess: () => {
                    updateProgrammeCheckIn(programmeId, false);
                    toast.success('Attendance reverted.');
                },
                onError: () => toast.error('Unable to revert attendance.'),
            },
        );
    }

    function requestDelete(
        kind: 'participant' | 'country' | 'userType',
        id: number,
        label: string,
    ) {
        setDeleteTarget({ kind, id, label });
        setDeleteOpen(true);
    }

    function confirmDelete() {
        if (!deleteTarget) return;

        const { kind, id } = deleteTarget;

        const destroyUrl =
            kind === 'participant'
                ? ENDPOINTS.participants.destroy(id)
                : kind === 'country'
                  ? ENDPOINTS.countries.destroy(id)
                  : ENDPOINTS.userTypes.destroy(id);

        router.delete(destroyUrl, {
            preserveScroll: true,
            onFinish: () => {
                setDeleteOpen(false);
                setDeleteTarget(null);
            },
            onSuccess: () => toast.success('Record deleted.'),
            onError: () => toast.error('Unable to delete record.'),
        });
    }

    // Countries
    function resetCountryPreview(next: string | null) {
        setCountryFlagPreview((prev) => {
            if (prev?.startsWith('blob:')) URL.revokeObjectURL(prev);
            return next;
        });
    }

    function openAddCountry() {
        setEditingCountry(null);
        countryForm.reset();
        countryForm.clearErrors();
        resetCountryPreview(null);
        setCountryDialogOpen(true);
    }

    function openEditCountry(c: Country) {
        setEditingCountry(c);
        countryForm.setData({
            code: c.code ?? '',
            name: c.name ?? '',
            is_active: !!c.is_active,
            flag: null, // only send if user uploads a new file
        });
        countryForm.clearErrors();
        resetCountryPreview(c.flag_url ?? null);
        setCountryDialogOpen(true);
    }

    function handleCountryFlagChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0] ?? null;
        countryForm.setData('flag', file);

        if (!file) {
            resetCountryPreview(editingCountry?.flag_url ?? null);
            return;
        }

        resetCountryPreview(URL.createObjectURL(file));
    }

    function submitCountry(e: React.FormEvent) {
        e.preventDefault();

        countryForm.transform((data) => {
            const payload: any = {
                code: data.code.trim().toUpperCase(),
                name: data.name.trim(),
                is_active: data.is_active,
            };
            if (data.flag) payload.flag = data.flag;
            return payload;
        });

        const options = {
            preserveScroll: true,
            forceFormData: true, // ✅ required for file uploads
            onSuccess: () => {
                setCountryDialogOpen(false);
                setEditingCountry(null);
                toast.success(
                    `Country ${editingCountry ? 'updated' : 'added'}.`,
                );
            },
            onError: showToastError,
        } as const;

        if (editingCountry) {
            countryForm.patch(
                ENDPOINTS.countries.update(editingCountry.id),
                options,
            );
        } else {
            countryForm.post(ENDPOINTS.countries.store, options);
        }
    }

    function toggleCountryActive(c: Country) {
        router.patch(
            ENDPOINTS.countries.update(c.id),
            { is_active: !c.is_active },
            {
                preserveScroll: true,
                onSuccess: () =>
                    toast.success(
                        `Country ${c.is_active ? 'deactivated' : 'activated'}.`,
                    ),
                onError: () => toast.error('Unable to update country status.'),
            },
        );
    }

    function submitUserType(e: React.FormEvent) {
        e.preventDefault();

        userTypeForm.transform((data) => ({
            name: data.name.trim(),
            is_active: data.is_active,
            sequence_order:
                data.sequence_order.trim() === ''
                    ? null
                    : Number(data.sequence_order),
        }));

        if (editingUserType) {
            userTypeForm.patch(ENDPOINTS.userTypes.update(editingUserType.id), {
                preserveScroll: true,
                onSuccess: () => {
                    setUserTypeDialogOpen(false);
                    setEditingUserType(null);
                    toast.success('User type updated.');
                },
                onError: showToastError,
            });
        } else {
            userTypeForm.post(ENDPOINTS.userTypes.store, {
                preserveScroll: true,
                onSuccess: () => {
                    setUserTypeDialogOpen(false);
                    toast.success('User type added.');
                },
                onError: showToastError,
            });
        }
    }

    function toggleUserTypeActive(u: UserType) {
        router.patch(
            ENDPOINTS.userTypes.update(u.id),
            { is_active: !u.is_active },
            {
                preserveScroll: true,
                onSuccess: () =>
                    toast.success(
                        `User type ${u.is_active ? 'deactivated' : 'activated'}.`,
                    ),
                onError: () =>
                    toast.error('Unable to update user type status.'),
            },
        );
    }

    function openAddUserType() {
        const maxOrder = userTypes.reduce(
            (acc, type) => Math.max(acc, type.sequence_order ?? 0),
            0,
        );
        const nextOrder = maxOrder + 1;
        setEditingUserType(null);
        userTypeForm.reset();
        userTypeForm.clearErrors();
        userTypeForm.setData({
            name: '',
            is_active: true,
            sequence_order: String(nextOrder),
        });
        setUserTypeDialogOpen(true);
    }

    function openEditUserType(u: UserType) {
        setEditingUserType(u);
        userTypeForm.setData({
            name: u.name ?? '',
            is_active: !!u.is_active,
            sequence_order:
                u.sequence_order === null || u.sequence_order === undefined
                    ? ''
                    : String(u.sequence_order),
        });
        userTypeForm.clearErrors();
        setUserTypeDialogOpen(true);
    }

    async function requestPrintIds(orientation: PrintOrientation) {
        if (selectedParticipantsPrintable.length === 0) {
            toast.error('Select at least one participant to print.');
            return;
        }

        setPrintOrientation(orientation);

        await ensureQrForParticipants(selectedParticipantsPrintable);

        requestAnimationFrame(() => {
            requestAnimationFrame(() => window.print());
        });
    }

    function toggleParticipantSelect(id: number, checked: boolean) {
        setSelectedParticipantIds((prev) => {
            const next = new Set(prev);
            if (checked) next.add(id);
            else next.delete(id);
            return next;
        });
    }

    function toggleSelectAll(checked: boolean) {
        setSelectedParticipantIds((prev) => {
            const next = new Set(prev);
            selectableVisibleParticipants.forEach((p) => {
                if (checked) next.add(p.id);
                else next.delete(p.id);
            });
            return next;
        });
    }

    const breadcrumbItems = React.useMemo(() => breadcrumbs, []);

    return (
        <AppLayout breadcrumbs={breadcrumbItems}>
            <Head title="Participant" />

            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
                <div className="space-y-2">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                                <Users className="h-5 w-5 text-[#00359c]" />
                                <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
                                    Participant Management
                                </h1>
                            </div>
                            <p className="text-sm text-slate-600 dark:text-slate-400">
                                Manage participants, ASEAN countries, and user
                                types.
                            </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            {activeTab === 'participants' ? (
                                <Button
                                    onClick={openAddParticipant}
                                    className={cn(
                                        'w-full sm:w-auto',
                                        PRIMARY_BTN,
                                    )}
                                >
                                    <Plus className="mr-2 h-4 w-4" />
                                    Add Participant
                                </Button>
                            ) : activeTab === 'countries' ? (
                                <Button
                                    onClick={openAddCountry}
                                    className={cn(
                                        'w-full sm:w-auto',
                                        PRIMARY_BTN,
                                    )}
                                >
                                    <Plus className="mr-2 h-4 w-4" />
                                    Add Country
                                </Button>
                            ) : (
                                <Button
                                    onClick={openAddUserType}
                                    className={cn(
                                        'w-full sm:w-auto',
                                        PRIMARY_BTN,
                                    )}
                                >
                                    <Plus className="mr-2 h-4 w-4" />
                                    Add User Type
                                </Button>
                            )}
                        </div>
                    </div>

                    <Separator className="bg-slate-200/70 dark:bg-slate-800" />
                </div>

                <Tabs
                    value={activeTab}
                    onValueChange={(v) => setActiveTab(v as any)}
                >
                    <TabsList className="flex flex-wrap gap-2 bg-transparent p-0">
                        <TabsTrigger value="participants">
                            Participants
                        </TabsTrigger>
                        <TabsTrigger value="countries">Countries</TabsTrigger>
                        <TabsTrigger value="userTypes">User Types</TabsTrigger>
                    </TabsList>

                    {/* -------------------- Participants -------------------- */}
                    <TabsContent value="participants" className="mt-4">
                        <Card className="border-slate-200/70 dark:border-slate-800">
                            <CardHeader className="space-y-3">
                                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                                    <div>
                                        <CardTitle className="text-base">
                                            Participants
                                        </CardTitle>
                                        <CardDescription></CardDescription>
                                    </div>

                                    <div className="flex w-full flex-col gap-2 rounded-xl border border-slate-200/70 bg-slate-50/70 p-2 sm:flex-row sm:flex-wrap lg:w-auto lg:justify-end dark:border-slate-800 dark:bg-slate-900/40">
                                        <div className="flex items-center px-1 text-[11px] font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400">
                                            Filters
                                        </div>
                                        <div className="relative w-full sm:w-[240px]">
                                            <Search className="pointer-events-none absolute top-2.5 left-3 h-4 w-4 text-slate-500" />
                                            <Input
                                                value={participantQuery}
                                                onChange={(e) =>
                                                    setParticipantQuery(
                                                        e.target.value,
                                                    )
                                                }
                                                placeholder="Search name, email, country, type..."
                                                className="h-9 pl-9 text-xs"
                                            />
                                        </div>

                                        <Popover
                                            open={participantCountryOpen}
                                            onOpenChange={
                                                setParticipantCountryOpen
                                            }
                                        >
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    role="combobox"
                                                    aria-expanded={
                                                        participantCountryOpen
                                                    }
                                                    className="h-9 w-full justify-between text-xs sm:w-[180px]"
                                                >
                                                    <span className="truncate">
                                                        {selectedCountry
                                                            ? selectedCountry.name
                                                            : 'All Countries'}
                                                    </span>
                                                    <ChevronsUpDown className="h-4 w-4 opacity-50" />
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent
                                                className="w-[--radix-popover-trigger-width] p-0"
                                                align="start"
                                            >
                                                <Command>
                                                    <CommandInput placeholder="Search country..." />
                                                    <CommandEmpty>
                                                        No country found.
                                                    </CommandEmpty>
                                                    <CommandList>
                                                        <CommandGroup>
                                                            <CommandItem
                                                                value="All Countries"
                                                                onSelect={() => {
                                                                    setParticipantCountryFilter(
                                                                        'all',
                                                                    );
                                                                    setParticipantCountryOpen(
                                                                        false,
                                                                    );
                                                                }}
                                                            >
                                                                All Countries
                                                                <Check
                                                                    className={cn(
                                                                        'ml-auto h-4 w-4',
                                                                        participantCountryFilter ===
                                                                            'all'
                                                                            ? 'opacity-100'
                                                                            : 'opacity-0',
                                                                    )}
                                                                />
                                                            </CommandItem>
                                                        </CommandGroup>
                                                        <CommandGroup heading="ASEAN Countries">
                                                            {groupedCountries.asean.map(
                                                                (c) => (
                                                                    <CommandItem
                                                                        key={
                                                                            c.id
                                                                        }
                                                                        value={`${c.name} ${c.code}`}
                                                                        onSelect={() => {
                                                                            setParticipantCountryFilter(
                                                                                String(
                                                                                    c.id,
                                                                                ),
                                                                            );
                                                                            setParticipantCountryOpen(
                                                                                false,
                                                                            );
                                                                        }}
                                                                        className="gap-2"
                                                                    >
                                                                        <div className="grid size-5 place-items-center overflow-hidden rounded-md border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
                                                                            <FlagImage
                                                                                code={
                                                                                    c.code
                                                                                }
                                                                                name={
                                                                                    c.name
                                                                                }
                                                                                preferredSrc={
                                                                                    c.flag_url
                                                                                }
                                                                                className="h-full w-full object-cover"
                                                                            />
                                                                        </div>
                                                                        <span className="truncate">
                                                                            {
                                                                                c.name
                                                                            }
                                                                        </span>
                                                                        <Check
                                                                            className={cn(
                                                                                'ml-auto h-4 w-4',
                                                                                participantCountryFilter ===
                                                                                    String(
                                                                                        c.id,
                                                                                    )
                                                                                    ? 'opacity-100'
                                                                                    : 'opacity-0',
                                                                            )}
                                                                        />
                                                                    </CommandItem>
                                                                ),
                                                            )}
                                                        </CommandGroup>
                                                        {groupedCountries
                                                            .nonAsean.length >
                                                        0 ? (
                                                            <CommandGroup heading="Non-ASEAN Countries">
                                                                {groupedCountries.nonAsean.map(
                                                                    (c) => (
                                                                        <CommandItem
                                                                            key={
                                                                                c.id
                                                                            }
                                                                            value={`${c.name} ${c.code}`}
                                                                            onSelect={() => {
                                                                                setParticipantCountryFilter(
                                                                                    String(
                                                                                        c.id,
                                                                                    ),
                                                                                );
                                                                                setParticipantCountryOpen(
                                                                                    false,
                                                                                );
                                                                            }}
                                                                            className="gap-2"
                                                                        >
                                                                            <div className="grid size-5 place-items-center overflow-hidden rounded-md border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
                                                                                <FlagImage
                                                                                    code={
                                                                                        c.code
                                                                                    }
                                                                                    name={
                                                                                        c.name
                                                                                    }
                                                                                    preferredSrc={
                                                                                        c.flag_url
                                                                                    }
                                                                                    className="h-full w-full object-cover"
                                                                                />
                                                                            </div>
                                                                            <span className="truncate">
                                                                                {
                                                                                    c.name
                                                                                }
                                                                            </span>
                                                                            <Check
                                                                                className={cn(
                                                                                    'ml-auto h-4 w-4',
                                                                                    participantCountryFilter ===
                                                                                        String(
                                                                                            c.id,
                                                                                        )
                                                                                        ? 'opacity-100'
                                                                                        : 'opacity-0',
                                                                                )}
                                                                            />
                                                                        </CommandItem>
                                                                    ),
                                                                )}
                                                            </CommandGroup>
                                                        ) : null}
                                                    </CommandList>
                                                </Command>
                                            </PopoverContent>
                                        </Popover>

                                        <Popover
                                            open={participantTypeOpen}
                                            onOpenChange={
                                                setParticipantTypeOpen
                                            }
                                        >
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    role="combobox"
                                                    aria-expanded={
                                                        participantTypeOpen
                                                    }
                                                    className="h-9 w-full justify-between text-xs sm:w-[170px]"
                                                >
                                                    <span className="truncate">
                                                        {selectedUserType
                                                            ? selectedUserType.name
                                                            : 'All Types'}
                                                    </span>
                                                    <ChevronsUpDown className="h-4 w-4 opacity-50" />
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent
                                                className="w-[--radix-popover-trigger-width] p-0"
                                                align="start"
                                            >
                                                <Command>
                                                    <CommandInput placeholder="Search user type..." />
                                                    <CommandEmpty>
                                                        No user type found.
                                                    </CommandEmpty>
                                                    <CommandList>
                                                        <CommandGroup>
                                                            <CommandItem
                                                                value="All Types"
                                                                onSelect={() => {
                                                                    setParticipantTypeFilter(
                                                                        'all',
                                                                    );
                                                                    setParticipantTypeOpen(
                                                                        false,
                                                                    );
                                                                }}
                                                            >
                                                                All Types
                                                                <Check
                                                                    className={cn(
                                                                        'ml-auto h-4 w-4',
                                                                        participantTypeFilter ===
                                                                            'all'
                                                                            ? 'opacity-100'
                                                                            : 'opacity-0',
                                                                    )}
                                                                />
                                                            </CommandItem>
                                                            {orderedUserTypes.map(
                                                                (u) => (
                                                                    <CommandItem
                                                                        key={
                                                                            u.id
                                                                        }
                                                                        value={`${u.name} ${u.slug ?? ''}`.trim()}
                                                                        onSelect={() => {
                                                                            setParticipantTypeFilter(
                                                                                String(
                                                                                    u.id,
                                                                                ),
                                                                            );
                                                                            setParticipantTypeOpen(
                                                                                false,
                                                                            );
                                                                        }}
                                                                    >
                                                                        {u.name}
                                                                        <Check
                                                                            className={cn(
                                                                                'ml-auto h-4 w-4',
                                                                                participantTypeFilter ===
                                                                                    String(
                                                                                        u.id,
                                                                                    )
                                                                                    ? 'opacity-100'
                                                                                    : 'opacity-0',
                                                                            )}
                                                                        />
                                                                    </CommandItem>
                                                                ),
                                                            )}
                                                        </CommandGroup>
                                                    </CommandList>
                                                </Command>
                                            </PopoverContent>
                                        </Popover>

                                        <Popover
                                            open={participantStatusOpen}
                                            onOpenChange={
                                                setParticipantStatusOpen
                                            }
                                        >
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    role="combobox"
                                                    aria-expanded={
                                                        participantStatusOpen
                                                    }
                                                    className="h-9 w-full justify-between text-xs sm:w-[150px]"
                                                >
                                                    <span className="truncate">
                                                        {selectedStatusLabel}
                                                    </span>
                                                    <ChevronsUpDown className="h-4 w-4 opacity-50" />
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent
                                                className="w-[--radix-popover-trigger-width] p-0"
                                                align="start"
                                            >
                                                <Command>
                                                    <CommandInput placeholder="Search status..." />
                                                    <CommandEmpty>
                                                        No status found.
                                                    </CommandEmpty>
                                                    <CommandList>
                                                        <CommandGroup>
                                                            {[
                                                                {
                                                                    value: 'all',
                                                                    label: 'All Statuses',
                                                                },
                                                                {
                                                                    value: 'active',
                                                                    label: 'Active',
                                                                },
                                                                {
                                                                    value: 'inactive',
                                                                    label: 'Inactive',
                                                                },
                                                            ].map((status) => (
                                                                <CommandItem
                                                                    key={
                                                                        status.value
                                                                    }
                                                                    value={
                                                                        status.label
                                                                    }
                                                                    onSelect={() => {
                                                                        setParticipantStatusFilter(
                                                                            status.value as any,
                                                                        );
                                                                        setParticipantStatusOpen(
                                                                            false,
                                                                        );
                                                                    }}
                                                                >
                                                                    {
                                                                        status.label
                                                                    }
                                                                    <Check
                                                                        className={cn(
                                                                            'ml-auto h-4 w-4',
                                                                            participantStatusFilter ===
                                                                                status.value
                                                                                ? 'opacity-100'
                                                                                : 'opacity-0',
                                                                        )}
                                                                    />
                                                                </CommandItem>
                                                            ))}
                                                        </CommandGroup>
                                                    </CommandList>
                                                </Command>
                                            </PopoverContent>
                                        </Popover>

                                        <Popover
                                            open={participantEventOpen}
                                            onOpenChange={
                                                setParticipantEventOpen
                                            }
                                        >
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    role="combobox"
                                                    aria-expanded={
                                                        participantEventOpen
                                                    }
                                                    className="h-9 w-full justify-between text-xs sm:w-[200px]"
                                                >
                                                    <span className="truncate">
                                                        {selectedEvent
                                                            ? selectedEvent.title
                                                            : 'All Events'}
                                                    </span>
                                                    <ChevronsUpDown className="h-4 w-4 opacity-50" />
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent
                                                className="w-72 max-w-[90vw] p-0"
                                                align="start"
                                            >
                                                <Command>
                                                    <CommandInput placeholder="Search event..." />
                                                    <CommandEmpty>
                                                        No event found.
                                                    </CommandEmpty>
                                                    <CommandList>
                                                        <CommandGroup>
                                                            <CommandItem
                                                                value="All Events"
                                                                onSelect={() => {
                                                                    setParticipantEventFilter(
                                                                        'all',
                                                                    );
                                                                    setParticipantEventOpen(
                                                                        false,
                                                                    );
                                                                }}
                                                            >
                                                                All Events
                                                                <Check
                                                                    className={cn(
                                                                        'ml-auto h-4 w-4',
                                                                        participantEventFilter ===
                                                                            'all'
                                                                            ? 'opacity-100'
                                                                            : 'opacity-0',
                                                                    )}
                                                                />
                                                            </CommandItem>
                                                            {normalizedProgrammes.map(
                                                                (event) => {
                                                                    const phaseLabel =
                                                                        event.phase ===
                                                                        'ongoing'
                                                                            ? 'Ongoing'
                                                                            : event.phase ===
                                                                                'upcoming'
                                                                              ? 'Upcoming'
                                                                              : 'Closed';
                                                                    const phaseTone =
                                                                        event.phase ===
                                                                        'ongoing'
                                                                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200'
                                                                            : event.phase ===
                                                                                'upcoming'
                                                                              ? 'bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-200'
                                                                              : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200';
                                                                    const dateLabel =
                                                                        event.endsAt
                                                                            ? `${formatDateSafe(event.startsAt)} - ${formatDateSafe(event.endsAt)}`
                                                                            : formatDateSafe(
                                                                                  event.startsAt,
                                                                              );

                                                                    return (
                                                                        <CommandItem
                                                                            key={
                                                                                event.id
                                                                            }
                                                                            value={
                                                                                event.title
                                                                            }
                                                                            onSelect={() => {
                                                                                setParticipantEventFilter(
                                                                                    String(
                                                                                        event.id,
                                                                                    ),
                                                                                );
                                                                                setParticipantEventOpen(
                                                                                    false,
                                                                                );
                                                                            }}
                                                                            className="flex items-start gap-2"
                                                                        >
                                                                            <div className="min-w-0 flex-1">
                                                                                <div className="truncate font-medium text-slate-900 dark:text-slate-100">
                                                                                    {
                                                                                        event.title
                                                                                    }
                                                                                </div>
                                                                                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                                                                                    {
                                                                                        dateLabel
                                                                                    }
                                                                                </div>
                                                                            </div>
                                                                            <Badge
                                                                                className={cn(
                                                                                    'rounded-full px-2 py-0.5 text-[10px]',
                                                                                    phaseTone,
                                                                                )}
                                                                            >
                                                                                {
                                                                                    phaseLabel
                                                                                }
                                                                            </Badge>
                                                                            <Check
                                                                                className={cn(
                                                                                    'ml-auto h-4 w-4',
                                                                                    participantEventFilter ===
                                                                                        String(
                                                                                            event.id,
                                                                                        )
                                                                                        ? 'opacity-100'
                                                                                        : 'opacity-0',
                                                                                )}
                                                                            />
                                                                        </CommandItem>
                                                                    );
                                                                },
                                                            )}
                                                        </CommandGroup>
                                                    </CommandList>
                                                </Command>
                                            </PopoverContent>
                                        </Popover>
                                    </div>
                                </div>

                                <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-300">
                                    <div>
                                        {selectedParticipantsPrintable.length}{' '}
                                        selected for ID printing
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        <Button
                                            type="button"
                                            size="sm"
                                            onClick={() =>
                                                requestPrintIds('portrait')
                                            }
                                            disabled={
                                                selectedParticipantsPrintable.length ===
                                                0
                                            }
                                            className={cn(
                                                'rounded-xl',
                                                'bg-sky-600 text-white hover:bg-sky-700',
                                                'focus-visible:ring-sky-600/30',
                                                'disabled:bg-sky-600/40 disabled:text-white/70 disabled:hover:bg-sky-600/40',
                                            )}
                                        >
                                            <Printer className="mr-2 h-4 w-4" />
                                            Print IDs (Portrait)
                                        </Button>

                                        <Button
                                            type="button"
                                            size="sm"
                                            onClick={() =>
                                                requestPrintIds('landscape')
                                            }
                                            disabled={
                                                selectedParticipantsPrintable.length ===
                                                0
                                            }
                                            className={cn(
                                                'rounded-xl',
                                                'bg-emerald-600 text-white hover:bg-emerald-700',
                                                'focus-visible:ring-emerald-600/30',
                                                'disabled:bg-emerald-600/40 disabled:text-white/70 disabled:hover:bg-emerald-600/40',
                                            )}
                                        >
                                            <Printer className="mr-2 h-4 w-4" />
                                            Print IDs (Landscape)
                                        </Button>
                                    </div>
                                </div>
                            </CardHeader>

                            <CardContent>
                                {filteredParticipants.length === 0 ? (
                                    <EmptyState
                                        icon={<Users className="h-5 w-5" />}
                                        title="No participants found"
                                        subtitle="Try adjusting your search or filters, or add a new participant."
                                    />
                                ) : (
                                    <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
                                        <div className="m-2 flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                                            <span>Show</span>
                                            <select
                                                className="h-8 w-[70px] rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-700 shadow-sm focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus-visible:ring-slate-600"
                                                value={String(entriesPerPage)}
                                                onChange={(event) =>
                                                    setEntriesPerPage(
                                                        Number(
                                                            event.target.value,
                                                        ),
                                                    )
                                                }
                                            >
                                                {ENTRIES_PER_PAGE_OPTIONS.map(
                                                    (n) => (
                                                        <option
                                                            key={n}
                                                            value={String(n)}
                                                        >
                                                            {n}
                                                        </option>
                                                    ),
                                                )}
                                            </select>
                                            <span>entries</span>
                                            <span className="ml-2">
                                                Showing{' '}
                                                {filteredParticipants.length ===
                                                0
                                                    ? 0
                                                    : (currentPage - 1) *
                                                          entriesPerPage +
                                                      1}{' '}
                                                to{' '}
                                                {Math.min(
                                                    currentPage *
                                                        entriesPerPage,
                                                    filteredParticipants.length,
                                                )}{' '}
                                                of {filteredParticipants.length}{' '}
                                                entries
                                            </span>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => {
                                                    const currentPageIds =
                                                        paginatedParticipants.map(
                                                            (p) => p.id,
                                                        );
                                                    const allExpanded =
                                                        currentPageIds.every(
                                                            (id) =>
                                                                expandedRowIds.has(
                                                                    id,
                                                                ),
                                                        );
                                                    if (allExpanded) {
                                                        setExpandedRowIds(
                                                            (prev) => {
                                                                const next =
                                                                    new Set(
                                                                        prev,
                                                                    );
                                                                currentPageIds.forEach(
                                                                    (id) =>
                                                                        next.delete(
                                                                            id,
                                                                        ),
                                                                );
                                                                return next;
                                                            },
                                                        );
                                                    } else {
                                                        setExpandedRowIds(
                                                            (prev) => {
                                                                const next =
                                                                    new Set(
                                                                        prev,
                                                                    );
                                                                currentPageIds.forEach(
                                                                    (id) =>
                                                                        next.add(
                                                                            id,
                                                                        ),
                                                                );
                                                                return next;
                                                            },
                                                        );
                                                    }
                                                }}
                                            >
                                                {paginatedParticipants.length >
                                                    0 &&
                                                paginatedParticipants.every(
                                                    (p) =>
                                                        expandedRowIds.has(
                                                            p.id,
                                                        ),
                                                )
                                                    ? 'Collapse All'
                                                    : 'View All'}
                                            </Button>
                                        </div>

                                        <Table>
                                            <TableHeader>
                                                <TableRow className="bg-slate-50 dark:bg-slate-900/40">
                                                    <TableHead className="w-[220px]">
                                                        Country
                                                    </TableHead>
                                                    <TableHead className="w-[240px]">
                                                        Name
                                                    </TableHead>
                                                    <TableHead className="w-[240px]">
                                                        <div className="flex items-center gap-2">
                                                            <Checkbox
                                                                checked={
                                                                    allVisibleSelected
                                                                }
                                                                onCheckedChange={(
                                                                    checked,
                                                                ) =>
                                                                    toggleSelectAll(
                                                                        !!checked,
                                                                    )
                                                                }
                                                                aria-label="Select all participants"
                                                            />
                                                            <span>
                                                                Participant ID
                                                                (QR)
                                                            </span>
                                                        </div>
                                                    </TableHead>
                                                    <TableHead>Email</TableHead>
                                                    <TableHead className="w-[200px]">
                                                        User Type
                                                    </TableHead>
                                                    <TableHead className="w-[140px]">
                                                        Status
                                                    </TableHead>
                                                    <TableHead className="w-[140px]">
                                                        Created
                                                    </TableHead>
                                                    <TableHead className="w-[80px] text-right">
                                                        Action
                                                    </TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {paginatedParticipants.map(
                                                    (p) => {
                                                        const isChed =
                                                            isChedParticipant(
                                                                p,
                                                            );
                                                        const isExpanded =
                                                            expandedRowIds.has(
                                                                p.id,
                                                            );

                                                        return (
                                                            <React.Fragment
                                                                key={p.id}
                                                            >
                                                                <TableRow
                                                                    className={cn(
                                                                        'cursor-pointer transition-colors',
                                                                        isChed
                                                                            ? 'bg-blue-50/70 hover:bg-blue-50 dark:bg-blue-950/30 dark:hover:bg-blue-950/40'
                                                                            : 'hover:bg-slate-50 dark:hover:bg-slate-900/40',
                                                                        isExpanded &&
                                                                            'border-b-0',
                                                                    )}
                                                                    onClick={() =>
                                                                        toggleRowExpand(
                                                                            p.id,
                                                                        )
                                                                    }
                                                                >
                                                                    <TableCell className="text-slate-700 dark:text-slate-300">
                                                                        {p.country ? (
                                                                            <div className="flex items-center gap-2">
                                                                                <FlagThumb
                                                                                    country={
                                                                                        p.country
                                                                                    }
                                                                                    size={
                                                                                        18
                                                                                    }
                                                                                />
                                                                                <span className="truncate">
                                                                                    {
                                                                                        p
                                                                                            .country
                                                                                            .name
                                                                                    }
                                                                                </span>
                                                                            </div>
                                                                        ) : (
                                                                            '—'
                                                                        )}
                                                                    </TableCell>

                                                                    <TableCell
                                                                        className={cn(
                                                                            'font-medium text-slate-900 dark:text-slate-100',
                                                                            isChed &&
                                                                                'text-blue-900 dark:text-blue-100',
                                                                        )}
                                                                    >
                                                                        <div className="flex items-center gap-1.5">
                                                                            <ChevronDown
                                                                                className={cn(
                                                                                    'h-3.5 w-3.5 text-slate-400 transition-transform',
                                                                                    isExpanded &&
                                                                                        'rotate-180',
                                                                                )}
                                                                            />
                                                                            {
                                                                                p.full_name
                                                                            }
                                                                        </div>
                                                                    </TableCell>

                                                                    <TableCell>
                                                                        <div
                                                                            className="flex items-center gap-3"
                                                                            onClick={(
                                                                                e,
                                                                            ) =>
                                                                                e.stopPropagation()
                                                                            }
                                                                        >
                                                                            <Checkbox
                                                                                checked={selectedParticipantIds.has(
                                                                                    p.id,
                                                                                )}
                                                                                onCheckedChange={(
                                                                                    checked,
                                                                                ) => {
                                                                                    toggleParticipantSelect(
                                                                                        p.id,
                                                                                        !!checked,
                                                                                    );
                                                                                }}
                                                                                aria-label={`Select ${p.full_name}`}
                                                                            />

                                                                            <button
                                                                                type="button"
                                                                                onClick={() =>
                                                                                    openVirtualIdDialog(
                                                                                        p,
                                                                                    )
                                                                                }
                                                                                className="rounded-md text-left transition hover:bg-slate-100/80 focus-visible:ring-2 focus-visible:ring-[#00359c]/30 focus-visible:outline-none dark:hover:bg-slate-800/70"
                                                                            >
                                                                                <div className="text-xs text-slate-500">
                                                                                    Participant
                                                                                    ID
                                                                                </div>

                                                                                <div className="text-xs font-semibold text-[#00359c] underline decoration-dotted underline-offset-2 dark:text-blue-300">
                                                                                    {p.display_id ??
                                                                                        '—'}
                                                                                </div>
                                                                            </button>
                                                                        </div>
                                                                    </TableCell>

                                                                    <TableCell className="text-slate-700 dark:text-slate-300">
                                                                        {
                                                                            p.email
                                                                        }
                                                                    </TableCell>
                                                                    <TableCell className="text-slate-700 dark:text-slate-300">
                                                                        {p
                                                                            .user_type
                                                                            ?.name ??
                                                                            '—'}
                                                                    </TableCell>

                                                                    <TableCell>
                                                                        <StatusBadge
                                                                            active={
                                                                                p.is_active
                                                                            }
                                                                        />
                                                                    </TableCell>

                                                                    <TableCell className="text-slate-700 dark:text-slate-300">
                                                                        {formatDateSafe(
                                                                            p.created_at,
                                                                        )}
                                                                    </TableCell>

                                                                    <TableCell
                                                                        className="text-right"
                                                                        onClick={(
                                                                            e,
                                                                        ) =>
                                                                            e.stopPropagation()
                                                                        }
                                                                    >
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
                                                                                className="w-44"
                                                                            >
                                                                                <DropdownMenuLabel>
                                                                                    Actions
                                                                                </DropdownMenuLabel>
                                                                                <DropdownMenuItem
                                                                                    onClick={() =>
                                                                                        openEditParticipant(
                                                                                            p,
                                                                                        )
                                                                                    }
                                                                                >
                                                                                    <Pencil className="mr-2 h-4 w-4" />
                                                                                    Edit
                                                                                </DropdownMenuItem>
                                                                                <DropdownMenuItem
                                                                                    onClick={() =>
                                                                                        openProgrammeManager(
                                                                                            p,
                                                                                        )
                                                                                    }
                                                                                >
                                                                                    <CalendarDays className="mr-2 h-4 w-4" />
                                                                                    Joined
                                                                                    events
                                                                                </DropdownMenuItem>
                                                                                <DropdownMenuItem
                                                                                    onClick={() =>
                                                                                        toggleParticipantActive(
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
                                                                                    onClick={() =>
                                                                                        resetParticipantPassword(
                                                                                            p,
                                                                                        )
                                                                                    }
                                                                                >
                                                                                    <KeyRound className="mr-2 h-4 w-4" />
                                                                                    Reset
                                                                                    password
                                                                                </DropdownMenuItem>
                                                                                <DropdownMenuSeparator />
                                                                                <DropdownMenuItem
                                                                                    className="text-red-600 focus:text-red-600"
                                                                                    onClick={() =>
                                                                                        requestDelete(
                                                                                            'participant',
                                                                                            p.id,
                                                                                            p.full_name,
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

                                                                {/* Expanded detail row */}
                                                                {isExpanded && (
                                                                    <TableRow
                                                                        className={cn(
                                                                            'border-b',
                                                                            isChed
                                                                                ? 'bg-blue-50/40 dark:bg-blue-950/20'
                                                                                : 'bg-slate-50/50 dark:bg-slate-900/20',
                                                                        )}
                                                                    >
                                                                        <TableCell
                                                                            colSpan={
                                                                                8
                                                                            }
                                                                            className="px-6 py-3"
                                                                        >
                                                                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                                                                                <div>
                                                                                    <div className="mb-1 text-xs font-semibold tracking-wider text-slate-500 uppercase">
                                                                                        Agency
                                                                                        /
                                                                                        Organization
                                                                                        /
                                                                                        Institution
                                                                                    </div>
                                                                                    {p.organization_name ? (
                                                                                        <div className="text-sm text-slate-700 dark:text-slate-300">
                                                                                            {
                                                                                                p.organization_name
                                                                                            }
                                                                                        </div>
                                                                                    ) : (
                                                                                        <div className="text-xs text-slate-400">
                                                                                            None
                                                                                            specified
                                                                                        </div>
                                                                                    )}
                                                                                </div>

                                                                                <div>
                                                                                    <div className="mb-1 text-xs font-semibold tracking-wider text-slate-500 uppercase">
                                                                                        Position
                                                                                        /
                                                                                        Designation
                                                                                    </div>
                                                                                    {p.position_title ? (
                                                                                        <div className="text-sm text-slate-700 dark:text-slate-300">
                                                                                            {
                                                                                                p.position_title
                                                                                            }
                                                                                        </div>
                                                                                    ) : (
                                                                                        <div className="text-xs text-slate-400">
                                                                                            None
                                                                                            specified
                                                                                        </div>
                                                                                    )}
                                                                                </div>

                                                                                <div>
                                                                                    <div className="mb-1 text-xs font-semibold tracking-wider text-slate-500 uppercase">
                                                                                        Dietary
                                                                                        Preferences
                                                                                    </div>
                                                                                    {(
                                                                                        p.food_restrictions ??
                                                                                        []
                                                                                    )
                                                                                        .length >
                                                                                    0 ? (
                                                                                        <div className="space-y-1">
                                                                                            <div className="flex flex-wrap gap-1">
                                                                                                {(
                                                                                                    p.food_restrictions ??
                                                                                                    []
                                                                                                ).map(
                                                                                                    (
                                                                                                        r,
                                                                                                    ) => {
                                                                                                        const label =
                                                                                                            DIETARY_PREFERENCE_OPTIONS.find(
                                                                                                                (
                                                                                                                    o,
                                                                                                                ) =>
                                                                                                                    o.value ===
                                                                                                                    r,
                                                                                                            )
                                                                                                                ?.label ??
                                                                                                            r;
                                                                                                        return (
                                                                                                            <Badge
                                                                                                                key={
                                                                                                                    r
                                                                                                                }
                                                                                                                variant="secondary"
                                                                                                                className="text-xs"
                                                                                                            >
                                                                                                                {
                                                                                                                    label
                                                                                                                }
                                                                                                            </Badge>
                                                                                                        );
                                                                                                    },
                                                                                                )}
                                                                                            </div>
                                                                                            {p.dietary_allergies && (
                                                                                                <div className="text-xs text-slate-600 dark:text-slate-400">
                                                                                                    <span className="font-medium">
                                                                                                        Allergies:
                                                                                                    </span>{' '}
                                                                                                    {
                                                                                                        p.dietary_allergies
                                                                                                    }
                                                                                                </div>
                                                                                            )}
                                                                                            {p.dietary_other && (
                                                                                                <div className="text-xs text-slate-600 dark:text-slate-400">
                                                                                                    <span className="font-medium">
                                                                                                        Other:
                                                                                                    </span>{' '}
                                                                                                    {
                                                                                                        p.dietary_other
                                                                                                    }
                                                                                                </div>
                                                                                            )}
                                                                                        </div>
                                                                                    ) : (
                                                                                        <div className="text-xs text-slate-400">
                                                                                            None
                                                                                            specified
                                                                                        </div>
                                                                                    )}
                                                                                </div>

                                                                                <div>
                                                                                    <div className="mb-1 text-xs font-semibold tracking-wider text-slate-500 uppercase">
                                                                                        Accessibility
                                                                                        Needs
                                                                                    </div>
                                                                                    {(
                                                                                        p.accessibility_needs ??
                                                                                        []
                                                                                    )
                                                                                        .length >
                                                                                    0 ? (
                                                                                        <div className="space-y-1">
                                                                                            <div className="flex flex-wrap gap-1">
                                                                                                {(
                                                                                                    p.accessibility_needs ??
                                                                                                    []
                                                                                                ).map(
                                                                                                    (
                                                                                                        n,
                                                                                                    ) => {
                                                                                                        const label =
                                                                                                            ACCESSIBILITY_NEEDS_OPTIONS.find(
                                                                                                                (
                                                                                                                    o,
                                                                                                                ) =>
                                                                                                                    o.value ===
                                                                                                                    n,
                                                                                                            )
                                                                                                                ?.label ??
                                                                                                            n;
                                                                                                        return (
                                                                                                            <Badge
                                                                                                                key={
                                                                                                                    n
                                                                                                                }
                                                                                                                variant="secondary"
                                                                                                                className="text-xs"
                                                                                                            >
                                                                                                                {
                                                                                                                    label
                                                                                                                }
                                                                                                            </Badge>
                                                                                                        );
                                                                                                    },
                                                                                                )}
                                                                                            </div>
                                                                                            {p.accessibility_other && (
                                                                                                <div className="text-xs text-slate-600 dark:text-slate-400">
                                                                                                    <span className="font-medium">
                                                                                                        Other:
                                                                                                    </span>{' '}
                                                                                                    {
                                                                                                        p.accessibility_other
                                                                                                    }
                                                                                                </div>
                                                                                            )}
                                                                                        </div>
                                                                                    ) : (
                                                                                        <div className="text-xs text-slate-400">
                                                                                            None
                                                                                            specified
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                        </TableCell>
                                                                    </TableRow>
                                                                )}
                                                            </React.Fragment>
                                                        );
                                                    },
                                                )}
                                            </TableBody>
                                        </Table>

                                        {/* Pagination controls */}
                                        <div className="flex flex-col gap-3 border-t border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
                                            {/* <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                                                <span>Show</span>
                                                <Select
                                                    value={String(entriesPerPage)}
                                                    onValueChange={(value) => setEntriesPerPage(Number(value))}
                                                >
                                                    <SelectTrigger className="h-8 w-[70px]">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {ENTRIES_PER_PAGE_OPTIONS.map((n) => (
                                                            <SelectItem key={n} value={String(n)}>
                                                                {n}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <span>entries</span>
                                                <span className="ml-2">
                                                    Showing{' '}
                                                    {filteredParticipants.length === 0
                                                        ? 0
                                                        : (currentPage - 1) * entriesPerPage + 1}{' '}
                                                    to {Math.min(currentPage * entriesPerPage, filteredParticipants.length)} of{' '}
                                                    {filteredParticipants.length} entries
                                                </span>
                                            </div> */}

                                            <div className="items-right flex gap-1">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() =>
                                                        setCurrentPage((p) =>
                                                            Math.max(1, p - 1),
                                                        )
                                                    }
                                                    disabled={currentPage === 1}
                                                    className="h-8 px-3 text-xs"
                                                >
                                                    <ChevronLeft className="mr-1 h-3 w-3" />
                                                    Previous
                                                </Button>

                                                {(() => {
                                                    const pages: (
                                                        | number
                                                        | '...'
                                                    )[] = [];
                                                    if (totalPages <= 7) {
                                                        for (
                                                            let i = 1;
                                                            i <= totalPages;
                                                            i++
                                                        )
                                                            pages.push(i);
                                                    } else {
                                                        pages.push(1);
                                                        if (currentPage > 3)
                                                            pages.push('...');
                                                        for (
                                                            let i = Math.max(
                                                                2,
                                                                currentPage - 1,
                                                            );
                                                            i <=
                                                            Math.min(
                                                                totalPages - 1,
                                                                currentPage + 1,
                                                            );
                                                            i++
                                                        ) {
                                                            pages.push(i);
                                                        }
                                                        if (
                                                            currentPage <
                                                            totalPages - 2
                                                        )
                                                            pages.push('...');
                                                        pages.push(totalPages);
                                                    }
                                                    return pages.map(
                                                        (page, idx) =>
                                                            page === '...' ? (
                                                                <span
                                                                    key={`ellipsis-${idx}`}
                                                                    className="px-2 text-xs text-slate-400"
                                                                >
                                                                    ...
                                                                </span>
                                                            ) : (
                                                                <Button
                                                                    key={page}
                                                                    variant={
                                                                        currentPage ===
                                                                        page
                                                                            ? 'default'
                                                                            : 'outline'
                                                                    }
                                                                    size="sm"
                                                                    onClick={() =>
                                                                        setCurrentPage(
                                                                            page,
                                                                        )
                                                                    }
                                                                    className={cn(
                                                                        'h-8 w-8 p-0 text-xs',
                                                                        currentPage ===
                                                                            page &&
                                                                            PRIMARY_BTN,
                                                                    )}
                                                                >
                                                                    {page}
                                                                </Button>
                                                            ),
                                                    );
                                                })()}

                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() =>
                                                        setCurrentPage((p) =>
                                                            Math.min(
                                                                totalPages,
                                                                p + 1,
                                                            ),
                                                        )
                                                    }
                                                    disabled={
                                                        currentPage ===
                                                        totalPages
                                                    }
                                                    className="h-8 px-3 text-xs"
                                                >
                                                    Next
                                                    <ChevronRight className="ml-1 h-3 w-3" />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* -------------------- Countries -------------------- */}
                    <TabsContent value="countries" className="mt-4">
                        <Card className="border-slate-200/70 dark:border-slate-800">
                            <CardHeader className="space-y-3">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                    <div>
                                        <CardTitle className="flex items-center gap-2 text-base">
                                            <Globe2 className="h-4 w-4 text-[#00359c]" />
                                            ASEAN Countries
                                        </CardTitle>
                                        <CardDescription>
                                            Manage country list and upload flag
                                            image per country.
                                        </CardDescription>
                                    </div>

                                    <div className="relative w-full sm:w-[320px]">
                                        <Search className="pointer-events-none absolute top-2.5 left-3 h-4 w-4 text-slate-500" />
                                        <Input
                                            value={countryQuery}
                                            onChange={(e) =>
                                                setCountryQuery(e.target.value)
                                            }
                                            placeholder="Search country or code..."
                                            className="pl-9"
                                        />
                                    </div>
                                </div>

                                <Separator />
                            </CardHeader>

                            <CardContent>
                                <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="bg-slate-50 dark:bg-slate-900/40">
                                                <TableHead>Country</TableHead>
                                                <TableHead className="w-[160px]">
                                                    Status
                                                </TableHead>
                                                <TableHead className="w-[80px] text-right">
                                                    Action
                                                </TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {filteredCountries.map((c) => (
                                                <TableRow key={c.id}>
                                                    <TableCell>
                                                        <FlagCell country={c} />
                                                    </TableCell>
                                                    <TableCell>
                                                        <StatusBadge
                                                            active={c.is_active}
                                                        />
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
                                                                className="w-44"
                                                            >
                                                                <DropdownMenuLabel>
                                                                    Actions
                                                                </DropdownMenuLabel>
                                                                <DropdownMenuItem
                                                                    onClick={() =>
                                                                        openEditCountry(
                                                                            c,
                                                                        )
                                                                    }
                                                                >
                                                                    <Pencil className="mr-2 h-4 w-4" />
                                                                    Edit
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem
                                                                    onClick={() =>
                                                                        toggleCountryActive(
                                                                            c,
                                                                        )
                                                                    }
                                                                >
                                                                    <BadgeCheck className="mr-2 h-4 w-4" />
                                                                    {c.is_active
                                                                        ? 'Set Inactive'
                                                                        : 'Set Active'}
                                                                </DropdownMenuItem>
                                                                <DropdownMenuSeparator />
                                                                <DropdownMenuItem
                                                                    className="text-red-600 focus:text-red-600"
                                                                    onClick={() =>
                                                                        requestDelete(
                                                                            'country',
                                                                            c.id,
                                                                            c.name,
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
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* -------------------- User Types -------------------- */}
                    <TabsContent value="userTypes" className="mt-4">
                        <Card className="border-slate-200/70 dark:border-slate-800">
                            <CardHeader className="space-y-3">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                    <div>
                                        <CardTitle className="text-base">
                                            User Types
                                        </CardTitle>
                                        <CardDescription>
                                            Prime Minister, Staff, CHED (and
                                            more if needed).
                                        </CardDescription>
                                    </div>

                                    <div className="relative w-full sm:w-[320px]">
                                        <Search className="pointer-events-none absolute top-2.5 left-3 h-4 w-4 text-slate-500" />
                                        <Input
                                            value={userTypeQuery}
                                            onChange={(e) =>
                                                setUserTypeQuery(e.target.value)
                                            }
                                            placeholder="Search user type..."
                                            className="pl-9"
                                        />
                                    </div>
                                </div>

                                <Separator />
                            </CardHeader>

                            <CardContent>
                                <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="bg-slate-50 dark:bg-slate-900/40">
                                                <TableHead>User Type</TableHead>
                                                <TableHead className="w-[90px]">
                                                    Order
                                                </TableHead>
                                                <TableHead className="w-[160px]">
                                                    Status
                                                </TableHead>
                                                <TableHead className="w-[80px] text-right">
                                                    Action
                                                </TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {filteredUserTypes.map((u) => (
                                                <TableRow key={u.id}>
                                                    <TableCell className="font-medium text-slate-900 dark:text-slate-100">
                                                        {u.name}
                                                    </TableCell>
                                                    <TableCell className="text-slate-600 dark:text-slate-300">
                                                        {u.sequence_order ??
                                                            '—'}
                                                    </TableCell>
                                                    <TableCell>
                                                        <StatusBadge
                                                            active={u.is_active}
                                                        />
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
                                                                className="w-44"
                                                            >
                                                                <DropdownMenuLabel>
                                                                    Actions
                                                                </DropdownMenuLabel>
                                                                <DropdownMenuItem
                                                                    onClick={() => {
                                                                        openEditUserType(
                                                                            u,
                                                                        );
                                                                    }}
                                                                >
                                                                    <Pencil className="mr-2 h-4 w-4" />
                                                                    Edit
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem
                                                                    onClick={() => {
                                                                        toggleUserTypeActive(
                                                                            u,
                                                                        );
                                                                    }}
                                                                >
                                                                    <BadgeCheck className="mr-2 h-4 w-4" />
                                                                    {u.is_active
                                                                        ? 'Set Inactive'
                                                                        : 'Set Active'}
                                                                </DropdownMenuItem>
                                                                <DropdownMenuSeparator />
                                                                <DropdownMenuItem
                                                                    className="text-red-600 focus:text-red-600"
                                                                    onClick={() => {
                                                                        requestDelete(
                                                                            'userType',
                                                                            u.id,
                                                                            u.name,
                                                                        );
                                                                    }}
                                                                >
                                                                    <Trash2 className="mr-2 h-4 w-4" />
                                                                    Delete
                                                                </DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>

            {/* -------------------- Participant Events Dialog -------------------- */}
            <Dialog
                open={programmeDialogOpen}
                onOpenChange={(open) => {
                    setProgrammeDialogOpen(open);
                    if (!open) setProgrammeParticipant(null);
                }}
            >
                <DialogContent className="flex max-h-[90vh] flex-col overflow-hidden sm:max-w-[900px]">
                    <DialogHeader className="space-y-1">
                        <DialogTitle>Participant joined events</DialogTitle>
                        <DialogDescription>
                            Review and update the events this participant has
                            joined.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex-1 overflow-y-auto pr-1">
                        {programmeParticipant ? (
                            <div className="space-y-4">
                                <div className="flex flex-col gap-2.5 rounded-2xl border border-slate-200/70 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/40">
                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                        <div className="flex items-start gap-3">
                                            {programmeParticipant.country ? (
                                                <FlagThumb
                                                    country={
                                                        programmeParticipant.country
                                                    }
                                                    size={36}
                                                    eager
                                                />
                                            ) : (
                                                <div className="grid size-9 place-items-center rounded-lg border border-slate-200 bg-white text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
                                                    —
                                                </div>
                                            )}
                                            <div>
                                                <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                                    {
                                                        programmeParticipant.full_name
                                                    }
                                                </div>
                                                <div className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                                                    {programmeParticipant.email}{' '}
                                                    •{' '}
                                                    {programmeParticipant
                                                        .user_type?.name ?? '—'}
                                                </div>
                                                <div className="text-xs text-slate-500 dark:text-slate-400">
                                                    {programmeParticipant
                                                        .country?.name ??
                                                        'Country unavailable'}
                                                </div>
                                            </div>
                                        </div>
                                        <Badge className="rounded-full bg-slate-900/5 text-slate-700 dark:bg-white/10 dark:text-slate-200">
                                            {
                                                (
                                                    programmeParticipant.joined_programme_ids ??
                                                    []
                                                ).length
                                            }{' '}
                                            joined
                                        </Badge>
                                    </div>
                                    <div className="text-xs text-slate-500 dark:text-slate-400">
                                        Use the buttons below to add or remove
                                        events from this participant.
                                    </div>
                                </div>

                                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                                        Events
                                    </div>
                                    <div className="relative w-full sm:w-[320px]">
                                        <Search className="pointer-events-none absolute top-2.5 left-3 h-4 w-4 text-slate-500" />
                                        <Input
                                            value={programmeQuery}
                                            onChange={(e) =>
                                                setProgrammeQuery(
                                                    e.target.value,
                                                )
                                            }
                                            placeholder="Search events..."
                                            className="pl-9"
                                        />
                                    </div>
                                </div>

                                {normalizedProgrammes.length === 0 ? (
                                    <EmptyState
                                        icon={
                                            <CalendarDays className="h-5 w-5" />
                                        }
                                        title="No events yet"
                                        subtitle="Create events first so you can assign participants."
                                    />
                                ) : filteredProgrammes.length === 0 ? (
                                    <EmptyState
                                        icon={<Search className="h-5 w-5" />}
                                        title="No matching events"
                                        subtitle="Try adjusting the search term to find an event."
                                    />
                                ) : (
                                    <div className="space-y-3">
                                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                            {filteredProgrammes.map((event) => {
                                                const joinedIds =
                                                    programmeParticipant.joined_programme_ids ??
                                                    [];
                                                const checkedInEntries =
                                                    programmeParticipant.checked_in_programmes ??
                                                    [];
                                                const checkedInIds =
                                                    programmeParticipant.checked_in_programme_ids ??
                                                    checkedInEntries.map(
                                                        (entry) =>
                                                            entry.programme_id,
                                                    );
                                                const checkedInEntry =
                                                    checkedInEntries.find(
                                                        (entry) =>
                                                            entry.programme_id ===
                                                            event.id,
                                                    );
                                                const isJoined =
                                                    joinedIds.includes(
                                                        event.id,
                                                    );
                                                const isCheckedIn =
                                                    checkedInIds.includes(
                                                        event.id,
                                                    );
                                                const isClosed =
                                                    event.phase === 'closed';
                                                const isAddDisabled =
                                                    isClosed && !isJoined;

                                                return (
                                                    <Card
                                                        key={event.id}
                                                        className="border-slate-200/70 dark:border-slate-800"
                                                    >
                                                        <div className="flex h-full flex-col gap-3 p-3">
                                                            <div className="space-y-2">
                                                                <div className="flex flex-wrap items-center gap-1.5">
                                                                    <div className="flex flex-wrap items-center gap-1.5">
                                                                        {event.tag ? (
                                                                            <Badge className="border-transparent bg-slate-900/80 text-[10px] text-white">
                                                                                {
                                                                                    event.tag
                                                                                }
                                                                            </Badge>
                                                                        ) : null}

                                                                        <Badge
                                                                            className={cn(
                                                                                'border text-[10px]',
                                                                                phaseBadgeClass(
                                                                                    event.phase,
                                                                                ),
                                                                            )}
                                                                        >
                                                                            {phaseLabel(
                                                                                event.phase,
                                                                            )}
                                                                        </Badge>
                                                                    </div>

                                                                    <Button
                                                                        type="button"
                                                                        size="sm"
                                                                        variant={
                                                                            isJoined
                                                                                ? 'outline'
                                                                                : 'default'
                                                                        }
                                                                        className={cn(
                                                                            'ml-auto h-8 rounded-xl px-3 text-[11px]',
                                                                            isJoined
                                                                                ? 'border-red-200 text-red-600 hover:bg-red-50 hover:text-red-600 dark:border-red-500/40 dark:hover:bg-red-500/10'
                                                                                : PRIMARY_BTN,
                                                                        )}
                                                                        disabled={
                                                                            isAddDisabled
                                                                        }
                                                                        title={
                                                                            isAddDisabled
                                                                                ? 'Closed events cannot be added.'
                                                                                : undefined
                                                                        }
                                                                        onClick={() =>
                                                                            toggleProgrammeJoin(
                                                                                programmeParticipant,
                                                                                event.id,
                                                                                isJoined,
                                                                            )
                                                                        }
                                                                    >
                                                                        {isJoined
                                                                            ? 'Remove Event'
                                                                            : 'Add to list'}
                                                                    </Button>
                                                                </div>

                                                                <div>
                                                                    <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                                                        {
                                                                            event.title
                                                                        }
                                                                    </div>
                                                                    <div className="mt-1 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">
                                                                        {
                                                                            event.description
                                                                        }
                                                                    </div>
                                                                </div>
                                                                <div className="space-y-1 text-[11px] text-slate-600 dark:text-slate-300">
                                                                    <div className="flex items-center gap-2">
                                                                        <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                                                                        <span>
                                                                            {formatEventWindow(
                                                                                event.startsAt,
                                                                                event.endsAt,
                                                                            )}
                                                                        </span>
                                                                    </div>
                                                                    <div className="flex items-center gap-2">
                                                                        <MapPin className="h-3.5 w-3.5 shrink-0" />
                                                                        <span>
                                                                            {event.location?.trim() ||
                                                                                'Location to be announced'}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="mt-auto flex items-center justify-between gap-2">
                                                                <div className="flex flex-wrap items-center gap-1.5">
                                                                    <Badge
                                                                        className={cn(
                                                                            'rounded-full border border-transparent px-2.5 py-1 text-[11px]',
                                                                            isJoined
                                                                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200'
                                                                                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
                                                                        )}
                                                                    >
                                                                        {isJoined
                                                                            ? 'Joined'
                                                                            : 'Not joined'}
                                                                    </Badge>
                                                                    {isCheckedIn ? (
                                                                        <>
                                                                            <Badge className="rounded-full border border-transparent bg-blue-100 px-2.5 py-1 text-[11px] text-blue-700 dark:bg-blue-500/15 dark:text-blue-200">
                                                                                Checked
                                                                                in
                                                                            </Badge>
                                                                            {checkedInEntry?.scanned_at ? (
                                                                                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                                                                                    Scanned{' '}
                                                                                    {formatDateTimeSafe(
                                                                                        checkedInEntry.scanned_at,
                                                                                    )}
                                                                                </span>
                                                                            ) : null}
                                                                            <Button
                                                                                type="button"
                                                                                size="sm"
                                                                                variant="outline"
                                                                                className="h-7 rounded-full border-red-200 px-2.5 text-[11px] text-red-600 hover:bg-red-50 hover:text-red-600 dark:border-red-500/40 dark:hover:bg-red-500/10"
                                                                                onClick={() =>
                                                                                    revertProgrammeAttendance(
                                                                                        programmeParticipant,
                                                                                        event.id,
                                                                                    )
                                                                                }
                                                                            >
                                                                                Revert
                                                                            </Button>
                                                                        </>
                                                                    ) : null}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </Card>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : null}
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setProgrammeDialogOpen(false)}
                        >
                            Done
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* -------------------- Participant Dialog -------------------- */}

            <Dialog
                open={virtualIdDialogOpen}
                onOpenChange={(open) => {
                    setVirtualIdDialogOpen(open);
                    if (!open) setVirtualIdParticipant(null);
                }}
            >
                <DialogContent className="max-h-[92vh] w-[calc(100vw-1.5rem)] max-w-[calc(100vw-1.5rem)] overflow-hidden p-0 sm:max-w-[620px] sm:p-6">
                    <div className="flex max-h-[92vh] flex-col">
                        <DialogHeader className="shrink-0 border-b border-slate-200/70 px-4 py-4 sm:border-0 sm:px-0 sm:py-0 dark:border-slate-800">
                            <DialogTitle>Participant Virtual ID</DialogTitle>
                            <DialogDescription className="text-balance"></DialogDescription>
                        </DialogHeader>

                        <div className="flex-1 overflow-y-auto px-4 pb-4 sm:px-0 sm:pb-0">
                            {virtualIdParticipant ? (
                                <div className="mx-auto w-full">
                                    {/* Horizontal scroll for landscape card on small screens */}
                                    <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
                                        <div className="mx-auto w-fit max-w-full">
                                            <div className="min-w-[520px] sm:min-w-0">
                                                <ParticipantIdPrintCard
                                                    participant={
                                                        virtualIdParticipant
                                                    }
                                                    qrDataUrl={
                                                        qrDataUrls[
                                                            virtualIdParticipant
                                                                .id
                                                        ]
                                                    }
                                                    orientation="landscape"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <p className="mt-2 text-center text-xs text-slate-500 sm:hidden">
                                        Tip: swipe left/right to view the full
                                        ID.
                                    </p>
                                </div>
                            ) : (
                                <div className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                                    No participant selected.
                                </div>
                            )}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog
                open={participantDialogOpen}
                onOpenChange={(open) => {
                    setParticipantDialogOpen(open);
                    if (!open) {
                        setParticipantFormStep(1);
                        if (participantProfileInputRef.current) {
                            participantProfileInputRef.current.value = '';
                        }
                        resetParticipantProfilePreview(null);
                        participantForm.setData('profile_image', null);
                        participantForm.setData('remove_profile_image', false);
                    }
                }}
            >
                <DialogContent
                    className={cn(
                        // ✅ bigger + responsive
                        'flex max-h-[90vh] w-[calc(100vw-1.5rem)] flex-col overflow-hidden',
                        // ✅ large width (adjust if you want wider)
                        'sm:max-w-4xl lg:max-w-5xl',
                    )}
                >
                    <DialogHeader>
                        <DialogTitle>
                            {editingParticipant
                                ? 'Edit Participant'
                                : 'Add Participant'}
                        </DialogTitle>
                        <DialogDescription>
                            Fill out the participant details below.
                        </DialogDescription>
                    </DialogHeader>

                    {/* Stepper indicator */}
                    <div className="flex items-center justify-between px-2 pt-2 pb-1">
                        {PARTICIPANT_FORM_STEPS.map((step, index) => (
                            <React.Fragment key={step.id}>
                                <button
                                    type="button"
                                    onClick={() =>
                                        setParticipantFormStep(
                                            step.id as ParticipantFormStep,
                                        )
                                    }
                                    className={cn(
                                        'flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                                        participantFormStep === step.id
                                            ? 'bg-[#00359c] text-white'
                                            : stepWithErrors.has(
                                                    step.id as ParticipantFormStep,
                                                )
                                              ? 'bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400'
                                              : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200',
                                    )}
                                >
                                    <span
                                        className={cn(
                                            'flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold',
                                            participantFormStep === step.id
                                                ? 'bg-white/20 text-white'
                                                : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
                                        )}
                                    >
                                        {step.id}
                                    </span>
                                    <span className="hidden sm:inline">
                                        {step.label}
                                    </span>
                                </button>
                                {index < PARTICIPANT_FORM_STEPS.length - 1 && (
                                    <div className="mx-1 h-px flex-1 bg-slate-200 dark:bg-slate-700" />
                                )}
                            </React.Fragment>
                        ))}
                    </div>
                    <Separator />

                    {/* ✅ Make body scrollable, keep footer visible */}
                    <form
                        onSubmit={submitParticipant}
                        onKeyDown={(e) => {
                            if (
                                e.key === 'Enter' &&
                                participantFormStep < 4 &&
                                (e.target as HTMLElement).tagName !== 'TEXTAREA'
                            ) {
                                e.preventDefault();
                                setParticipantFormStep(
                                    (s) =>
                                        Math.min(
                                            s + 1,
                                            4,
                                        ) as ParticipantFormStep,
                                );
                            }
                        }}
                        className="flex flex-1 flex-col overflow-hidden"
                    >
                        <div className="flex-1 overflow-y-auto pr-1">
                            <div className="space-y-4">
                                {/* Step 1: Personal Information */}
                                {participantFormStep === 1 && (
                                    <div className="grid gap-3 sm:grid-cols-2">
                                        <div className="space-y-1.5 sm:col-span-2">
                                            <div className="text-sm font-medium">
                                                Full name{' '}
                                                <span className="text-[11px] font-semibold text-red-600">
                                                    {' '}
                                                    *
                                                </span>
                                            </div>
                                            <Input
                                                value={
                                                    participantForm.data
                                                        .full_name
                                                }
                                                onChange={(e) =>
                                                    participantForm.setData(
                                                        'full_name',
                                                        e.target.value,
                                                    )
                                                }
                                                placeholder="e.g. Juan Dela Cruz"
                                            />
                                            {participantForm.errors
                                                .full_name ? (
                                                <div className="text-xs text-red-600">
                                                    {
                                                        participantForm.errors
                                                            .full_name
                                                    }
                                                </div>
                                            ) : null}
                                        </div>

                                        <div className="space-y-2 sm:col-span-2">
                                            <div className="flex items-center justify-between">
                                                <div className="text-sm font-medium">
                                                    Profile image
                                                </div>
                                            </div>

                                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                                                <div className="grid h-20 w-full place-items-center overflow-hidden rounded-xl border border-slate-200 bg-white sm:w-[140px] dark:border-slate-800 dark:bg-slate-950">
                                                    {participantProfilePreview ? (
                                                        <img
                                                            src={
                                                                participantProfilePreview
                                                            }
                                                            alt="Profile preview"
                                                            className="h-full w-full object-cover"
                                                            draggable={false}
                                                        />
                                                    ) : (
                                                        <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                                                            <ImageUp className="h-4 w-4" />
                                                            No image
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="w-full space-y-2">
                                                    <Input
                                                        ref={
                                                            participantProfileInputRef
                                                        }
                                                        type="file"
                                                        accept="image/*"
                                                        onChange={
                                                            handleParticipantProfileChange
                                                        }
                                                    />
                                                    {participantForm.errors
                                                        .profile_image ? (
                                                        <div className="text-xs text-red-600">
                                                            {
                                                                participantForm
                                                                    .errors
                                                                    .profile_image
                                                            }
                                                        </div>
                                                    ) : null}
                                                    <div className="flex gap-2">
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            size="sm"
                                                            disabled={
                                                                !participantForm
                                                                    .data
                                                                    .profile_image
                                                            }
                                                            onClick={
                                                                removeParticipantProfileImage
                                                            }
                                                        >
                                                            Remove
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-1.5">
                                            <div className="text-sm font-medium">
                                                Honorific / Title{' '}
                                                <span className="text-[11px] font-semibold text-red-600">
                                                    {' '}
                                                    *
                                                </span>
                                            </div>
                                            <Popover
                                                open={
                                                    participantFormHonorificOpen
                                                }
                                                onOpenChange={
                                                    setParticipantFormHonorificOpen
                                                }
                                            >
                                                <PopoverTrigger asChild>
                                                    <Button
                                                        variant="outline"
                                                        role="combobox"
                                                        aria-expanded={
                                                            participantFormHonorificOpen
                                                        }
                                                        className="w-full justify-between"
                                                    >
                                                        <span className="truncate">
                                                            {participantForm
                                                                .data
                                                                .honorific_title
                                                                ? (HONORIFIC_OPTIONS.find(
                                                                      (o) =>
                                                                          o.value ===
                                                                          participantForm
                                                                              .data
                                                                              .honorific_title,
                                                                  )?.label ??
                                                                  participantForm
                                                                      .data
                                                                      .honorific_title)
                                                                : 'Select honorific…'}
                                                        </span>
                                                        <ChevronsUpDown className="h-4 w-4 opacity-50" />
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent
                                                    className="w-[--radix-popover-trigger-width] p-0"
                                                    align="start"
                                                >
                                                    <Command>
                                                        <CommandInput placeholder="Search honorific…" />
                                                        <CommandEmpty>
                                                            No honorific found.
                                                        </CommandEmpty>
                                                        <CommandGroup>
                                                            {HONORIFIC_OPTIONS.map(
                                                                (item) => (
                                                                    <CommandItem
                                                                        key={
                                                                            item.value
                                                                        }
                                                                        value={
                                                                            item.label
                                                                        }
                                                                        onSelect={() => {
                                                                            participantForm.setData(
                                                                                'honorific_title',
                                                                                item.value,
                                                                            );
                                                                            if (
                                                                                item.value !==
                                                                                'other'
                                                                            ) {
                                                                                participantForm.setData(
                                                                                    'honorific_other',
                                                                                    '',
                                                                                );
                                                                            }
                                                                            setParticipantFormHonorificOpen(
                                                                                false,
                                                                            );
                                                                        }}
                                                                    >
                                                                        {
                                                                            item.label
                                                                        }
                                                                        <Check
                                                                            className={cn(
                                                                                'ml-auto h-4 w-4',
                                                                                participantForm
                                                                                    .data
                                                                                    .honorific_title ===
                                                                                    item.value
                                                                                    ? 'opacity-100'
                                                                                    : 'opacity-0',
                                                                            )}
                                                                        />
                                                                    </CommandItem>
                                                                ),
                                                            )}
                                                        </CommandGroup>
                                                    </Command>
                                                </PopoverContent>
                                            </Popover>
                                            {participantForm.errors
                                                .honorific_title ? (
                                                <div className="text-xs text-red-600">
                                                    {
                                                        participantForm.errors
                                                            .honorific_title
                                                    }
                                                </div>
                                            ) : null}
                                        </div>

                                        {participantForm.data
                                            .honorific_title === 'other' ? (
                                            <div className="space-y-1.5">
                                                <div className="text-sm font-medium">
                                                    Other honorific
                                                </div>
                                                <Input
                                                    value={
                                                        participantForm.data
                                                            .honorific_other
                                                    }
                                                    onChange={(e) =>
                                                        participantForm.setData(
                                                            'honorific_other',
                                                            e.target.value,
                                                        )
                                                    }
                                                    placeholder="Please specify"
                                                />
                                                {participantForm.errors
                                                    .honorific_other ? (
                                                    <div className="text-xs text-red-600">
                                                        {
                                                            participantForm
                                                                .errors
                                                                .honorific_other
                                                        }
                                                    </div>
                                                ) : null}
                                            </div>
                                        ) : null}

                                        <div className="space-y-1.5">
                                            <div className="text-sm font-medium">
                                                Given name
                                            </div>
                                            <Input
                                                value={
                                                    participantForm.data
                                                        .given_name
                                                }
                                                onChange={(e) =>
                                                    participantForm.setData(
                                                        'given_name',
                                                        e.target.value,
                                                    )
                                                }
                                                placeholder="First name"
                                            />
                                        </div>

                                        <div className="space-y-1.5">
                                            <div className="text-sm font-medium">
                                                Middle name
                                            </div>
                                            <Input
                                                value={
                                                    participantForm.data
                                                        .middle_name
                                                }
                                                onChange={(e) =>
                                                    participantForm.setData(
                                                        'middle_name',
                                                        e.target.value,
                                                    )
                                                }
                                                placeholder="Middle name"
                                            />
                                        </div>

                                        <div className="space-y-1.5">
                                            <div className="text-sm font-medium">
                                                Family name / Surname
                                            </div>
                                            <Input
                                                value={
                                                    participantForm.data
                                                        .family_name
                                                }
                                                onChange={(e) =>
                                                    participantForm.setData(
                                                        'family_name',
                                                        e.target.value,
                                                    )
                                                }
                                                placeholder="Surname"
                                            />
                                        </div>

                                        <div className="space-y-1.5">
                                            <div className="text-sm font-medium">
                                                Suffix
                                            </div>
                                            <Input
                                                value={
                                                    participantForm.data.suffix
                                                }
                                                onChange={(e) =>
                                                    participantForm.setData(
                                                        'suffix',
                                                        e.target.value,
                                                    )
                                                }
                                                placeholder="e.g. Jr., III"
                                            />
                                        </div>

                                        <div className="space-y-1.5">
                                            <div className="text-sm font-medium">
                                                Sex assigned at birth{' '}
                                                <span className="text-[11px] font-semibold text-red-600">
                                                    {' '}
                                                    *
                                                </span>
                                            </div>
                                            <Popover
                                                open={participantFormSexOpen}
                                                onOpenChange={
                                                    setParticipantFormSexOpen
                                                }
                                            >
                                                <PopoverTrigger asChild>
                                                    <Button
                                                        variant="outline"
                                                        role="combobox"
                                                        aria-expanded={
                                                            participantFormSexOpen
                                                        }
                                                        className="w-full justify-between"
                                                    >
                                                        <span className="truncate">
                                                            {participantForm
                                                                .data
                                                                .sex_assigned_at_birth
                                                                ? (SEX_ASSIGNED_OPTIONS.find(
                                                                      (o) =>
                                                                          o.value ===
                                                                          participantForm
                                                                              .data
                                                                              .sex_assigned_at_birth,
                                                                  )?.label ??
                                                                  participantForm
                                                                      .data
                                                                      .sex_assigned_at_birth)
                                                                : 'Select…'}
                                                        </span>
                                                        <ChevronsUpDown className="h-4 w-4 opacity-50" />
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent
                                                    className="w-[--radix-popover-trigger-width] p-0"
                                                    align="start"
                                                >
                                                    <Command>
                                                        <CommandInput placeholder="Search…" />
                                                        <CommandEmpty>
                                                            No option found.
                                                        </CommandEmpty>
                                                        <CommandGroup>
                                                            {SEX_ASSIGNED_OPTIONS.map(
                                                                (item) => (
                                                                    <CommandItem
                                                                        key={
                                                                            item.value
                                                                        }
                                                                        value={
                                                                            item.label
                                                                        }
                                                                        onSelect={() => {
                                                                            participantForm.setData(
                                                                                'sex_assigned_at_birth',
                                                                                item.value,
                                                                            );
                                                                            setParticipantFormSexOpen(
                                                                                false,
                                                                            );
                                                                        }}
                                                                    >
                                                                        {
                                                                            item.label
                                                                        }
                                                                        <Check
                                                                            className={cn(
                                                                                'ml-auto h-4 w-4',
                                                                                participantForm
                                                                                    .data
                                                                                    .sex_assigned_at_birth ===
                                                                                    item.value
                                                                                    ? 'opacity-100'
                                                                                    : 'opacity-0',
                                                                            )}
                                                                        />
                                                                    </CommandItem>
                                                                ),
                                                            )}
                                                        </CommandGroup>
                                                    </Command>
                                                </PopoverContent>
                                            </Popover>
                                            {participantForm.errors
                                                .sex_assigned_at_birth ? (
                                                <div className="text-xs text-red-600">
                                                    {
                                                        participantForm.errors
                                                            .sex_assigned_at_birth
                                                    }
                                                </div>
                                            ) : null}
                                        </div>

                                        <div className="space-y-1.5 sm:col-span-2">
                                            <div className="text-sm font-medium">
                                                Email{' '}
                                                <span className="text-[11px] font-semibold text-red-600">
                                                    {' '}
                                                    *
                                                </span>
                                            </div>
                                            <Input
                                                value={
                                                    participantForm.data.email
                                                }
                                                onChange={(e) =>
                                                    participantForm.setData(
                                                        'email',
                                                        e.target.value,
                                                    )
                                                }
                                                placeholder="e.g. juan@example.com"
                                            />
                                            {!editingParticipant ? (
                                                <div className="text-xs text-slate-500">
                                                    We will send the welcome
                                                    email with the participant
                                                    QR badge after you create
                                                    the record.
                                                </div>
                                            ) : null}
                                            {participantForm.errors.email ? (
                                                <div className="text-xs text-red-600">
                                                    {
                                                        participantForm.errors
                                                            .email
                                                    }
                                                </div>
                                            ) : null}
                                        </div>
                                    </div>
                                )}

                                {/* Step 2: Contact & Organization */}
                                {participantFormStep === 2 && (
                                    <div className="grid gap-3 sm:grid-cols-2">
                                        <div className="space-y-1.5 sm:col-span-2">
                                            <div className="text-sm font-medium">
                                                Contact number{' '}
                                                <span className="text-[11px] font-semibold text-red-600">
                                                    {' '}
                                                    *
                                                </span>
                                            </div>
                                            <div className="grid gap-2 sm:grid-cols-[180px_1fr]">
                                                <Popover
                                                    open={
                                                        participantFormPhoneCodeOpen
                                                    }
                                                    onOpenChange={
                                                        setParticipantFormPhoneCodeOpen
                                                    }
                                                >
                                                    <PopoverTrigger asChild>
                                                        <Button
                                                            variant="outline"
                                                            role="combobox"
                                                            aria-expanded={
                                                                participantFormPhoneCodeOpen
                                                            }
                                                            className="w-full justify-between"
                                                        >
                                                            <span className="truncate">
                                                                {participantForm
                                                                    .data
                                                                    .contact_country_code
                                                                    ? (PHONE_CODE_OPTIONS.find(
                                                                          (o) =>
                                                                              o.value ===
                                                                              participantForm
                                                                                  .data
                                                                                  .contact_country_code,
                                                                      )
                                                                          ?.label ??
                                                                      participantForm
                                                                          .data
                                                                          .contact_country_code)
                                                                    : 'Country code…'}
                                                            </span>
                                                            <ChevronsUpDown className="h-4 w-4 opacity-50" />
                                                        </Button>
                                                    </PopoverTrigger>
                                                    <PopoverContent
                                                        className="w-[--radix-popover-trigger-width] p-0"
                                                        align="start"
                                                    >
                                                        <Command>
                                                            <CommandInput placeholder="Search country code…" />
                                                            <CommandEmpty>
                                                                No country code
                                                                found.
                                                            </CommandEmpty>
                                                            <CommandList className="max-h-[240px] overflow-auto">
                                                                <CommandGroup>
                                                                    {PHONE_CODE_OPTIONS.map(
                                                                        (
                                                                            item,
                                                                        ) => (
                                                                            <CommandItem
                                                                                key={
                                                                                    item.value
                                                                                }
                                                                                value={`${item.label} ${item.value}`}
                                                                                onSelect={() => {
                                                                                    participantForm.setData(
                                                                                        'contact_country_code',
                                                                                        item.value,
                                                                                    );
                                                                                    setParticipantFormPhoneCodeOpen(
                                                                                        false,
                                                                                    );
                                                                                }}
                                                                            >
                                                                                {
                                                                                    item.label
                                                                                }
                                                                                <Check
                                                                                    className={cn(
                                                                                        'ml-auto h-4 w-4',
                                                                                        participantForm
                                                                                            .data
                                                                                            .contact_country_code ===
                                                                                            item.value
                                                                                            ? 'opacity-100'
                                                                                            : 'opacity-0',
                                                                                    )}
                                                                                />
                                                                            </CommandItem>
                                                                        ),
                                                                    )}
                                                                </CommandGroup>
                                                            </CommandList>
                                                        </Command>
                                                    </PopoverContent>
                                                </Popover>
                                                <Input
                                                    type="tel"
                                                    inputMode="numeric"
                                                    pattern="[0-9]*"
                                                    value={
                                                        participantForm.data
                                                            .contact_number
                                                    }
                                                    onChange={(e) =>
                                                        participantForm.setData(
                                                            'contact_number',
                                                            e.target.value,
                                                        )
                                                    }
                                                    onInput={(event) => {
                                                        event.currentTarget.value =
                                                            event.currentTarget.value.replace(
                                                                /[^0-9]/g,
                                                                '',
                                                            );
                                                    }}
                                                    placeholder="e.g. 9123456789"
                                                />
                                            </div>
                                            {participantForm.errors
                                                .contact_country_code ? (
                                                <div className="text-xs text-red-600">
                                                    {
                                                        participantForm.errors
                                                            .contact_country_code
                                                    }
                                                </div>
                                            ) : participantForm.errors
                                                  .contact_number ? (
                                                <div className="text-xs text-red-600">
                                                    {
                                                        participantForm.errors
                                                            .contact_number
                                                    }
                                                </div>
                                            ) : null}
                                        </div>

                                        <div className="space-y-1.5 sm:col-span-2">
                                            <div className="text-sm font-medium">
                                                Agency / Organization /
                                                Institution
                                            </div>
                                            <Input
                                                value={
                                                    participantForm.data
                                                        .organization_name
                                                }
                                                onChange={(e) =>
                                                    participantForm.setData(
                                                        'organization_name',
                                                        e.target.value,
                                                    )
                                                }
                                                placeholder="Name of organization"
                                            />
                                        </div>

                                        <div className="space-y-1.5 sm:col-span-2">
                                            <div className="text-sm font-medium">
                                                Position / Designation
                                            </div>
                                            <Input
                                                value={
                                                    participantForm.data
                                                        .position_title
                                                }
                                                onChange={(e) =>
                                                    participantForm.setData(
                                                        'position_title',
                                                        e.target.value,
                                                    )
                                                }
                                                placeholder="Job title / role"
                                            />
                                        </div>

                                        <div className="space-y-1.5">
                                            <div className="text-sm font-medium">
                                                Country of Origin{' '}
                                                <span className="text-[11px] font-semibold text-red-600">
                                                    {' '}
                                                    *
                                                </span>
                                            </div>
                                            <Popover
                                                open={
                                                    participantFormCountryOpen
                                                }
                                                onOpenChange={
                                                    setParticipantFormCountryOpen
                                                }
                                            >
                                                <PopoverTrigger asChild>
                                                    <Button
                                                        variant="outline"
                                                        role="combobox"
                                                        aria-expanded={
                                                            participantFormCountryOpen
                                                        }
                                                        className="w-full justify-between"
                                                    >
                                                        <span className="truncate">
                                                            {selectedFormCountry
                                                                ? selectedFormCountry.name
                                                                : 'Select country…'}
                                                        </span>
                                                        <ChevronsUpDown className="h-4 w-4 opacity-50" />
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent
                                                    className="w-[--radix-popover-trigger-width] p-0"
                                                    align="start"
                                                >
                                                    <Command>
                                                        <CommandInput placeholder="Search country…" />
                                                        <CommandEmpty>
                                                            No country found.
                                                        </CommandEmpty>
                                                        <CommandList>
                                                            <CommandGroup heading="ASEAN Countries">
                                                                {groupedActiveCountries.asean.map(
                                                                    (c) => (
                                                                        <CommandItem
                                                                            key={
                                                                                c.id
                                                                            }
                                                                            value={`${c.name} ${c.code}`}
                                                                            onSelect={() => {
                                                                                participantForm.setData(
                                                                                    'country_id',
                                                                                    String(
                                                                                        c.id,
                                                                                    ),
                                                                                );
                                                                                setParticipantFormCountryOpen(
                                                                                    false,
                                                                                );
                                                                            }}
                                                                            className="gap-2"
                                                                        >
                                                                            <FlagThumb
                                                                                country={
                                                                                    c
                                                                                }
                                                                                size={
                                                                                    18
                                                                                }
                                                                            />
                                                                            <span className="truncate">
                                                                                {
                                                                                    c.name
                                                                                }
                                                                            </span>
                                                                            <Check
                                                                                className={cn(
                                                                                    'ml-auto h-4 w-4',
                                                                                    participantForm
                                                                                        .data
                                                                                        .country_id ===
                                                                                        String(
                                                                                            c.id,
                                                                                        )
                                                                                        ? 'opacity-100'
                                                                                        : 'opacity-0',
                                                                                )}
                                                                            />
                                                                        </CommandItem>
                                                                    ),
                                                                )}
                                                            </CommandGroup>
                                                            {groupedActiveCountries
                                                                .nonAsean
                                                                .length > 0 ? (
                                                                <CommandGroup heading="Non-ASEAN Countries">
                                                                    {groupedActiveCountries.nonAsean.map(
                                                                        (c) => (
                                                                            <CommandItem
                                                                                key={
                                                                                    c.id
                                                                                }
                                                                                value={`${c.name} ${c.code}`}
                                                                                onSelect={() => {
                                                                                    participantForm.setData(
                                                                                        'country_id',
                                                                                        String(
                                                                                            c.id,
                                                                                        ),
                                                                                    );
                                                                                    setParticipantFormCountryOpen(
                                                                                        false,
                                                                                    );
                                                                                }}
                                                                                className="gap-2"
                                                                            >
                                                                                <FlagThumb
                                                                                    country={
                                                                                        c
                                                                                    }
                                                                                    size={
                                                                                        18
                                                                                    }
                                                                                />
                                                                                <span className="truncate">
                                                                                    {
                                                                                        c.name
                                                                                    }
                                                                                </span>
                                                                                <Check
                                                                                    className={cn(
                                                                                        'ml-auto h-4 w-4',
                                                                                        participantForm
                                                                                            .data
                                                                                            .country_id ===
                                                                                            String(
                                                                                                c.id,
                                                                                            )
                                                                                            ? 'opacity-100'
                                                                                            : 'opacity-0',
                                                                                    )}
                                                                                />
                                                                            </CommandItem>
                                                                        ),
                                                                    )}
                                                                </CommandGroup>
                                                            ) : null}
                                                        </CommandList>
                                                    </Command>
                                                </PopoverContent>
                                            </Popover>
                                            {participantForm.errors
                                                .country_id ? (
                                                <div className="text-xs text-red-600">
                                                    {
                                                        participantForm.errors
                                                            .country_id
                                                    }
                                                </div>
                                            ) : null}
                                        </div>

                                        <div className="space-y-1.5">
                                            <div className="text-sm font-medium">
                                                Registrant Type{' '}
                                                <span className="text-[11px] font-semibold text-red-600">
                                                    {' '}
                                                    *
                                                </span>
                                            </div>
                                            <Popover
                                                open={participantFormTypeOpen}
                                                onOpenChange={
                                                    setParticipantFormTypeOpen
                                                }
                                            >
                                                <PopoverTrigger asChild>
                                                    <Button
                                                        variant="outline"
                                                        role="combobox"
                                                        aria-expanded={
                                                            participantFormTypeOpen
                                                        }
                                                        className="w-full justify-between"
                                                    >
                                                        <span className="truncate">
                                                            {selectedFormUserType
                                                                ? selectedFormUserType.name
                                                                : 'Select registrant type…'}
                                                        </span>
                                                        <ChevronsUpDown className="h-4 w-4 opacity-50" />
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent
                                                    className="w-[--radix-popover-trigger-width] p-0"
                                                    align="start"
                                                >
                                                    <Command>
                                                        <CommandInput placeholder="Search type…" />
                                                        <CommandEmpty>
                                                            No user type found.
                                                        </CommandEmpty>
                                                        <CommandList>
                                                            <CommandGroup>
                                                                {orderedUserTypes.map(
                                                                    (u) => (
                                                                        <CommandItem
                                                                            key={
                                                                                u.id
                                                                            }
                                                                            value={`${u.name} ${u.slug ?? ''}`.trim()}
                                                                            onSelect={() => {
                                                                                participantForm.setData(
                                                                                    'user_type_id',
                                                                                    String(
                                                                                        u.id,
                                                                                    ),
                                                                                );
                                                                                setParticipantFormTypeOpen(
                                                                                    false,
                                                                                );
                                                                            }}
                                                                        >
                                                                            {
                                                                                u.name
                                                                            }
                                                                            <Check
                                                                                className={cn(
                                                                                    'ml-auto h-4 w-4',
                                                                                    participantForm
                                                                                        .data
                                                                                        .user_type_id ===
                                                                                        String(
                                                                                            u.id,
                                                                                        )
                                                                                        ? 'opacity-100'
                                                                                        : 'opacity-0',
                                                                                )}
                                                                            />
                                                                        </CommandItem>
                                                                    ),
                                                                )}
                                                            </CommandGroup>
                                                        </CommandList>
                                                    </Command>
                                                </PopoverContent>
                                            </Popover>
                                            {participantForm.errors
                                                .user_type_id ? (
                                                <div className="text-xs text-red-600">
                                                    {
                                                        participantForm.errors
                                                            .user_type_id
                                                    }
                                                </div>
                                            ) : null}
                                        </div>

                                        {isOtherParticipantType ? (
                                            <div className="space-y-1.5">
                                                <div className="text-sm font-medium">
                                                    Please specify
                                                </div>
                                                <Input
                                                    value={
                                                        participantForm.data
                                                            .other_user_type
                                                    }
                                                    onChange={(event) =>
                                                        participantForm.setData(
                                                            'other_user_type',
                                                            event.target.value,
                                                        )
                                                    }
                                                    placeholder="Enter your role"
                                                />
                                            </div>
                                        ) : null}
                                    </div>
                                )}

                                {/* Step 3: Dietary & Accessibility */}
                                {participantFormStep === 3 && (
                                    <div className="grid gap-3 sm:grid-cols-2">
                                        {showFoodRestrictionsField ? (
                                            <div className="rounded-xl border border-slate-200 px-3 py-3 sm:col-span-2 dark:border-slate-800">
                                                <div className="space-y-0.5">
                                                    <div className="text-sm font-medium">
                                                        Dietary Preferences
                                                    </div>
                                                    <div className="text-xs text-slate-600 dark:text-slate-400">
                                                        Select all that apply.
                                                    </div>
                                                </div>
                                                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                                                    {DIETARY_PREFERENCE_OPTIONS.map(
                                                        (option) => {
                                                            const checked =
                                                                participantForm.data.food_restrictions.includes(
                                                                    option.value,
                                                                );

                                                            return (
                                                                <label
                                                                    key={
                                                                        option.value
                                                                    }
                                                                    className="flex items-center gap-2 rounded-md border border-slate-200 px-2.5 py-2 text-sm dark:border-slate-700"
                                                                >
                                                                    <Checkbox
                                                                        checked={
                                                                            checked
                                                                        }
                                                                        onCheckedChange={(
                                                                            value,
                                                                        ) => {
                                                                            const current =
                                                                                participantForm
                                                                                    .data
                                                                                    .food_restrictions;

                                                                            if (
                                                                                value
                                                                            ) {
                                                                                participantForm.setData(
                                                                                    'food_restrictions',
                                                                                    current.includes(
                                                                                        option.value,
                                                                                    )
                                                                                        ? current
                                                                                        : [
                                                                                              ...current,
                                                                                              option.value,
                                                                                          ],
                                                                                );
                                                                                return;
                                                                            }

                                                                            participantForm.setData(
                                                                                'food_restrictions',
                                                                                current.filter(
                                                                                    (
                                                                                        item,
                                                                                    ) =>
                                                                                        item !==
                                                                                        option.value,
                                                                                ),
                                                                            );
                                                                        }}
                                                                    />
                                                                    <span>
                                                                        {
                                                                            option.label
                                                                        }
                                                                    </span>
                                                                </label>
                                                            );
                                                        },
                                                    )}
                                                </div>
                                                {participantForm.data.food_restrictions.includes(
                                                    'allergies',
                                                ) ? (
                                                    <div className="mt-3 space-y-1.5">
                                                        <div className="text-sm font-medium">
                                                            Allergies (please
                                                            specify)
                                                        </div>
                                                        <Input
                                                            value={
                                                                participantForm
                                                                    .data
                                                                    .dietary_allergies
                                                            }
                                                            onChange={(e) =>
                                                                participantForm.setData(
                                                                    'dietary_allergies',
                                                                    e.target
                                                                        .value,
                                                                )
                                                            }
                                                            placeholder="Please specify"
                                                        />
                                                    </div>
                                                ) : null}
                                                {participantForm.data.food_restrictions.includes(
                                                    'other',
                                                ) ? (
                                                    <div className="mt-3 space-y-1.5">
                                                        <div className="text-sm font-medium">
                                                            Other (please
                                                            specify)
                                                        </div>
                                                        <Input
                                                            value={
                                                                participantForm
                                                                    .data
                                                                    .dietary_other
                                                            }
                                                            onChange={(e) =>
                                                                participantForm.setData(
                                                                    'dietary_other',
                                                                    e.target
                                                                        .value,
                                                                )
                                                            }
                                                            placeholder="Please specify"
                                                        />
                                                    </div>
                                                ) : null}
                                            </div>
                                        ) : null}

                                        <div className="rounded-xl border border-slate-200 px-3 py-3 sm:col-span-2 dark:border-slate-800">
                                            <div className="space-y-0.5">
                                                <div className="text-sm font-medium">
                                                    Accessibility needs
                                                </div>
                                                <div className="text-xs text-slate-600 dark:text-slate-400">
                                                    Select all applicable
                                                    accessibility
                                                    accommodations.
                                                </div>
                                            </div>
                                            <div className="mt-3 grid gap-2 sm:grid-cols-2">
                                                {ACCESSIBILITY_NEEDS_OPTIONS.map(
                                                    (option) => {
                                                        const checked =
                                                            participantForm.data.accessibility_needs.includes(
                                                                option.value,
                                                            );

                                                        return (
                                                            <label
                                                                key={
                                                                    option.value
                                                                }
                                                                className="flex items-center gap-2 rounded-md border border-slate-200 px-2.5 py-2 text-sm dark:border-slate-700"
                                                            >
                                                                <Checkbox
                                                                    checked={
                                                                        checked
                                                                    }
                                                                    onCheckedChange={(
                                                                        value,
                                                                    ) => {
                                                                        const current =
                                                                            participantForm
                                                                                .data
                                                                                .accessibility_needs;

                                                                        if (
                                                                            value
                                                                        ) {
                                                                            participantForm.setData(
                                                                                'accessibility_needs',
                                                                                current.includes(
                                                                                    option.value,
                                                                                )
                                                                                    ? current
                                                                                    : [
                                                                                          ...current,
                                                                                          option.value,
                                                                                      ],
                                                                            );
                                                                            return;
                                                                        }

                                                                        participantForm.setData(
                                                                            'accessibility_needs',
                                                                            current.filter(
                                                                                (
                                                                                    item,
                                                                                ) =>
                                                                                    item !==
                                                                                    option.value,
                                                                            ),
                                                                        );
                                                                    }}
                                                                />
                                                                <span>
                                                                    {
                                                                        option.label
                                                                    }
                                                                </span>
                                                            </label>
                                                        );
                                                    },
                                                )}
                                            </div>
                                            {participantForm.data.accessibility_needs.includes(
                                                'other',
                                            ) ? (
                                                <div className="mt-3 space-y-1.5">
                                                    <div className="text-sm font-medium">
                                                        Other accommodations
                                                    </div>
                                                    <Input
                                                        value={
                                                            participantForm.data
                                                                .accessibility_other
                                                        }
                                                        onChange={(e) =>
                                                            participantForm.setData(
                                                                'accessibility_other',
                                                                e.target.value,
                                                            )
                                                        }
                                                        placeholder="Specify other accommodations"
                                                    />
                                                </div>
                                            ) : null}
                                        </div>
                                    </div>
                                )}

                                {/* Step 4: Additional Info */}
                                {participantFormStep === 4 && (
                                    <div className="grid gap-3 sm:grid-cols-2">
                                        <div className="rounded-xl border border-slate-200 px-3 py-3 sm:col-span-2 dark:border-slate-800">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <div className="text-sm font-medium">
                                                        Indigenous Peoples (IP)
                                                        affiliation
                                                    </div>
                                                    <div className="text-xs text-slate-600 dark:text-slate-400">
                                                        Is the participant part
                                                        of an Indigenous Peoples
                                                        group?
                                                    </div>
                                                </div>
                                                <Switch
                                                    checked={
                                                        participantForm.data
                                                            .ip_affiliation
                                                    }
                                                    onCheckedChange={(value) =>
                                                        participantForm.setData(
                                                            'ip_affiliation',
                                                            !!value,
                                                        )
                                                    }
                                                />
                                            </div>
                                            {participantForm.data
                                                .ip_affiliation ? (
                                                <div className="mt-3 space-y-1.5">
                                                    <div className="text-sm font-medium">
                                                        IP group name
                                                    </div>
                                                    <Input
                                                        value={
                                                            participantForm.data
                                                                .ip_group_name
                                                        }
                                                        onChange={(e) =>
                                                            participantForm.setData(
                                                                'ip_group_name',
                                                                e.target.value,
                                                            )
                                                        }
                                                        placeholder="Specify IP group"
                                                    />
                                                </div>
                                            ) : null}
                                        </div>

                                        <div className="rounded-xl border border-slate-200 px-3 py-3 sm:col-span-2 dark:border-slate-800">
                                            <div className="text-sm font-medium">
                                                Emergency contact information
                                            </div>
                                            <div className="mt-3 grid gap-3 sm:grid-cols-2">
                                                <Input
                                                    value={
                                                        participantForm.data
                                                            .emergency_contact_name
                                                    }
                                                    onChange={(e) =>
                                                        participantForm.setData(
                                                            'emergency_contact_name',
                                                            e.target.value,
                                                        )
                                                    }
                                                    placeholder="Name"
                                                />
                                                <Input
                                                    value={
                                                        participantForm.data
                                                            .emergency_contact_relationship
                                                    }
                                                    onChange={(e) =>
                                                        participantForm.setData(
                                                            'emergency_contact_relationship',
                                                            e.target.value,
                                                        )
                                                    }
                                                    placeholder="Relationship"
                                                />
                                                <Input
                                                    value={
                                                        participantForm.data
                                                            .emergency_contact_phone
                                                    }
                                                    onChange={(e) =>
                                                        participantForm.setData(
                                                            'emergency_contact_phone',
                                                            e.target.value,
                                                        )
                                                    }
                                                    placeholder="Phone number"
                                                />
                                                <Input
                                                    type="email"
                                                    value={
                                                        participantForm.data
                                                            .emergency_contact_email
                                                    }
                                                    onChange={(e) =>
                                                        participantForm.setData(
                                                            'emergency_contact_email',
                                                            e.target.value,
                                                        )
                                                    }
                                                    placeholder="Email address"
                                                />
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-3 sm:col-span-2 dark:border-slate-800">
                                            <div className="space-y-0.5">
                                                <div className="text-sm font-medium">
                                                    Active
                                                </div>
                                                <div className="text-xs text-slate-600 dark:text-slate-400">
                                                    Inactive users will not
                                                    appear in active selection
                                                    lists.
                                                </div>
                                            </div>
                                            <Switch
                                                checked={
                                                    participantForm.data
                                                        .is_active
                                                }
                                                onCheckedChange={(v) =>
                                                    participantForm.setData(
                                                        'is_active',
                                                        !!v,
                                                    )
                                                }
                                            />
                                        </div>

                                        {editingParticipant ? (
                                            <div className="rounded-xl border border-slate-200 px-3 py-3 sm:col-span-2 dark:border-slate-800">
                                                <div className="text-sm font-medium">
                                                    Consents
                                                </div>
                                                <div className="mt-2 grid gap-2 text-xs text-slate-600 dark:text-slate-400">
                                                    <div className="flex items-center justify-between gap-3">
                                                        <span>
                                                            Contact Information
                                                            Sharing
                                                        </span>
                                                        <Badge
                                                            className={cn(
                                                                'rounded-full border border-transparent px-2.5 py-1 text-[11px]',
                                                                editingParticipant.consent_contact_sharing
                                                                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200'
                                                                    : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
                                                            )}
                                                        >
                                                            {editingParticipant.consent_contact_sharing
                                                                ? 'Consented'
                                                                : 'Not consented'}
                                                        </Badge>
                                                    </div>
                                                    <div className="flex items-center justify-between gap-3">
                                                        <span>
                                                            Photo and Videos
                                                            Consent
                                                        </span>
                                                        <Badge
                                                            className={cn(
                                                                'rounded-full border border-transparent px-2.5 py-1 text-[11px]',
                                                                editingParticipant.consent_photo_video
                                                                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200'
                                                                    : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
                                                            )}
                                                        >
                                                            {editingParticipant.consent_photo_video
                                                                ? 'Consented'
                                                                : 'Not consented'}
                                                        </Badge>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : null}
                                    </div>
                                )}
                            </div>
                        </div>

                        <DialogFooter className="mt-4 gap-2 border-t border-slate-200/70 pt-4 dark:border-slate-800">
                            <div className="flex w-full items-center justify-between">
                                <div>
                                    {participantFormStep > 1 && (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() =>
                                                setParticipantFormStep(
                                                    (s) =>
                                                        (s -
                                                            1) as ParticipantFormStep,
                                                )
                                            }
                                            disabled={
                                                participantForm.processing
                                            }
                                        >
                                            <ChevronLeft className="mr-1 h-4 w-4" />
                                            Previous
                                        </Button>
                                    )}
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() =>
                                            setParticipantDialogOpen(false)
                                        }
                                        disabled={participantForm.processing}
                                    >
                                        Cancel
                                    </Button>
                                    {participantFormStep < 4 ? (
                                        <Button
                                            key="step-next"
                                            type="button"
                                            onClick={() =>
                                                setParticipantFormStep(
                                                    (s) =>
                                                        (s +
                                                            1) as ParticipantFormStep,
                                                )
                                            }
                                            className={PRIMARY_BTN}
                                        >
                                            Next
                                            <ChevronRight className="ml-1 h-4 w-4" />
                                        </Button>
                                    ) : (
                                        <Button
                                            key="step-submit"
                                            type="submit"
                                            disabled={
                                                participantForm.processing
                                            }
                                            className={PRIMARY_BTN}
                                        >
                                            {editingParticipant
                                                ? 'Save changes'
                                                : 'Create'}
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* -------------------- Country Dialog (flag upload) -------------------- */}
            <Dialog
                open={countryDialogOpen}
                onOpenChange={setCountryDialogOpen}
            >
                <DialogContent className="sm:max-w-[640px]">
                    <DialogHeader>
                        <DialogTitle>
                            {editingCountry ? 'Edit Country' : 'Add Country'}
                        </DialogTitle>
                        <DialogDescription>
                            ASEAN country record (code + name) with optional
                            flag image.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={submitCountry} className="space-y-4">
                        <div className="grid gap-3 sm:grid-cols-2">
                            <div className="space-y-1.5">
                                <div className="text-sm font-medium">Code</div>
                                <Input
                                    value={countryForm.data.code}
                                    onChange={(e) =>
                                        countryForm.setData(
                                            'code',
                                            e.target.value,
                                        )
                                    }
                                    placeholder="e.g. PH"
                                    maxLength={4}
                                />
                                {countryForm.errors.code ? (
                                    <div className="text-xs text-red-600">
                                        {countryForm.errors.code}
                                    </div>
                                ) : null}
                            </div>

                            <div className="space-y-1.5">
                                <div className="text-sm font-medium">
                                    Country name
                                </div>
                                <Input
                                    value={countryForm.data.name}
                                    onChange={(e) =>
                                        countryForm.setData(
                                            'name',
                                            e.target.value,
                                        )
                                    }
                                    placeholder="e.g. Philippines"
                                />
                                {countryForm.errors.name ? (
                                    <div className="text-xs text-red-600">
                                        {countryForm.errors.name}
                                    </div>
                                ) : null}
                            </div>

                            <div className="space-y-1.5 sm:col-span-2">
                                <div className="flex items-center justify-between">
                                    <div className="text-sm font-medium">
                                        Flag image
                                    </div>
                                    <div className="text-xs text-slate-600 dark:text-slate-400">
                                        PNG/JPG • recommended 512×512
                                    </div>
                                </div>

                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                                    <div className="grid h-14 w-full place-items-center overflow-hidden rounded-xl border border-slate-200 bg-white sm:w-[140px] dark:border-slate-800 dark:bg-slate-950">
                                        {countryFlagPreview ? (
                                            <img
                                                src={countryFlagPreview}
                                                alt="Flag preview"
                                                className="h-full w-full object-cover"
                                                draggable={false}
                                            />
                                        ) : (
                                            <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                                                <ImageUp className="h-4 w-4" />
                                                No flag
                                            </div>
                                        )}
                                    </div>

                                    <div className="w-full space-y-1.5">
                                        <Input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleCountryFlagChange}
                                        />
                                        {(countryForm.errors as any).flag ? (
                                            <div className="text-xs text-red-600">
                                                {
                                                    (countryForm.errors as any)
                                                        .flag
                                                }
                                            </div>
                                        ) : null}
                                        <div className="text-xs text-slate-600 dark:text-slate-400">
                                            Uploading a new file will replace
                                            the current flag.
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <DialogFooter className="gap-2 sm:gap-0">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setCountryDialogOpen(false)}
                                disabled={countryForm.processing}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={countryForm.processing}
                                className={PRIMARY_BTN}
                            >
                                {editingCountry ? 'Save changes' : 'Create'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* -------------------- User Type Dialog -------------------- */}
            <Dialog
                open={userTypeDialogOpen}
                onOpenChange={setUserTypeDialogOpen}
            >
                <DialogContent className="sm:max-w-[520px]">
                    <DialogHeader>
                        <DialogTitle>
                            {editingUserType
                                ? 'Edit User Type'
                                : 'Add User Type'}
                        </DialogTitle>
                        <DialogDescription>
                            Example: Prime Minister, Staff, CHED.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={submitUserType} className="space-y-4">
                        <div className="grid gap-3">
                            <div className="space-y-1.5">
                                <div className="text-sm font-medium">Name</div>
                                <Input
                                    value={userTypeForm.data.name}
                                    onChange={(e) =>
                                        userTypeForm.setData(
                                            'name',
                                            e.target.value,
                                        )
                                    }
                                    placeholder="e.g. Staff"
                                />
                                {userTypeForm.errors.name ? (
                                    <div className="text-xs text-red-600">
                                        {userTypeForm.errors.name}
                                    </div>
                                ) : null}
                            </div>

                            <div className="space-y-1.5">
                                <div className="text-sm font-medium">
                                    Sequence order
                                </div>
                                <Input
                                    type="number"
                                    min={0}
                                    value={userTypeForm.data.sequence_order}
                                    onChange={(e) =>
                                        userTypeForm.setData(
                                            'sequence_order',
                                            e.target.value,
                                        )
                                    }
                                    placeholder="e.g. 1"
                                />
                                {userTypeForm.errors.sequence_order ? (
                                    <div className="text-xs text-red-600">
                                        {userTypeForm.errors.sequence_order}
                                    </div>
                                ) : (
                                    <div className="text-xs text-slate-600 dark:text-slate-400">
                                        Lower numbers appear first in registrant
                                        and user type dropdowns.
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-3 dark:border-slate-800">
                                <div className="space-y-0.5">
                                    <div className="text-sm font-medium">
                                        Active
                                    </div>
                                    <div className="text-xs text-slate-600 dark:text-slate-400">
                                        Inactive types will not be selectable in
                                        participant forms.
                                    </div>
                                </div>
                                <Switch
                                    checked={userTypeForm.data.is_active}
                                    onCheckedChange={(v) =>
                                        userTypeForm.setData('is_active', !!v)
                                    }
                                />
                            </div>
                        </div>

                        <DialogFooter className="gap-2 sm:gap-0">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setUserTypeDialogOpen(false)}
                                disabled={userTypeForm.processing}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={userTypeForm.processing}
                                className={PRIMARY_BTN}
                            >
                                {editingUserType ? 'Save changes' : 'Create'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* -------------------- Delete Confirm -------------------- */}
            <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete this record?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete{' '}
                            <span className="font-semibold text-slate-900 dark:text-slate-100">
                                {deleteTarget?.label ?? 'this item'}
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

            {printMounted
                ? createPortal(
                      <div
                          id="participant-print-root"
                          data-orientation={printOrientation}
                          className="hidden print:block"
                      >
                          <style>{`
                  @media print {
                      @page { size: ${printOrientation === 'landscape' ? '297mm 210mm' : '210mm 297mm'}; margin: 0; }
                      html, body { margin: 0 !important; padding: 0 !important; height: auto !important; background: #fff !important; }
                      * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }

                      body > * { display: none !important; }
                      #participant-print-root { display: block !important; }

                      .print-page { box-sizing: border-box; padding: 0.25in; page-break-after: always; break-after: page; }
                      .print-page:last-of-type { page-break-after: auto; break-after: auto; }

                      .print-grid {
                          display: grid;
                          gap: ${printOrientation === 'landscape' ? '0.12in' : '0.08in'};
                          align-content: start;
                          justify-content: start;
                          grid-template-columns: repeat(${printOrientation === 'landscape' ? 3 : 2}, ${printOrientation === 'landscape' ? '3.37in' : '3.1in'});
                          grid-auto-rows: ${printOrientation === 'landscape' ? '2.125in' : '5.05in'};
                          max-width: ${printOrientation === 'landscape' ? '10.35in' : '6.28in'};
                      }

                      .id-print-card { break-inside: avoid; page-break-inside: avoid; box-sizing: border-box; box-shadow: none !important; }

                      /* ✅ EXTRA PRINT SAFETY (prevents missing layers) */
                      .id-print-card { isolation: isolate; }

                  }
              `}</style>

                          {chunk(
                              selectedParticipantsPrintable,
                              printOrientation === 'landscape' ? 9 : 4,
                          ).map((page, pageIndex) => (
                              <div key={pageIndex} className="print-page">
                                  <div className="print-grid">
                                      {page.map((p) => (
                                          <ParticipantIdPrintCard
                                              key={p.id}
                                              participant={p}
                                              qrDataUrl={qrDataUrls[p.id]}
                                              orientation={printOrientation}
                                          />
                                      ))}
                                  </div>
                              </div>
                          ))}
                      </div>,
                      document.body,
                  )
                : null}
        </AppLayout>
    );
}
