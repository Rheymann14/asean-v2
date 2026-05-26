import * as React from 'react';
import AppLayout from '@/layouts/app-layout';
import { Head, useForm } from '@inertiajs/react';
import { cn } from '@/lib/utils';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

import { toast } from 'sonner';
import QRCode from 'qrcode';
import {
    Copy,
    Download,
    Flag,
    Mail,
    Pencil,
    Phone,
    QrCode as QrCodeIcon,
    Smartphone,
    IdCard,
    Trash2,
    Upload,
    User2,
} from 'lucide-react';

type Country = {
    code: string;
    name: string;
    flag_url?: string | null;
};

type Participant = {
    display_id: string; // ✅ safe display ID (NOT user.id)
    qr_payload: string; // ✅ encrypted/opaque payload (NOT user.id)
    name: string;
    email: string;
    profile_photo_url?: string | null;
    contact_number?: string | null;
    contact_country_code?: string | null;
    honorific_title?: string | null;
    honorific_other?: string | null;
    given_name?: string | null;
    middle_name?: string | null;
    family_name?: string | null;
    suffix?: string | null;
    sex_assigned_at_birth?: string | null;
    country?: Country | null;
    organization_name?: string | null;
    position_title?: string | null;
    user_type?: string | null;
    other_user_type?: string | null;
    ip_group_name?: string | null;
    food_restrictions?: string[];
    dietary_allergies?: string | null;
    dietary_other?: string | null;
    accessibility_needs?: string[];
    accessibility_other?: string | null;
    emergency_contact_name?: string | null;
    emergency_contact_relationship?: string | null;
    emergency_contact_phone?: string | null;
    emergency_contact_email?: string | null;
    consent_contact_sharing?: boolean;
    consent_photo_video?: boolean;
};

type PageProps = {
    participant: Participant;
};

const FOOD_RESTRICTION_LABELS: Record<string, string> = {
    vegetarian: 'Vegetarian',
    halal: 'Halal',
    allergies: 'Allergies',
    other: 'Other',
};

const DIETARY_PREFERENCE_OPTIONS = [
    { value: 'vegetarian', label: 'Vegetarian' },
    { value: 'halal', label: 'Halal' },
    { value: 'allergies', label: 'Allergies (please specify)' },
    { value: 'other', label: 'Other (please specify)' },
] as const;

const ACCESSIBILITY_NEEDS_OPTIONS = [
    { value: 'wheelchair_access', label: 'Wheelchair access' },
    { value: 'sign_language_interpreter', label: 'Sign language interpreter' },
    { value: 'assistive_technology_support', label: 'Assistive technology support' },
    { value: 'other', label: 'Other accommodations' },
] as const;

const HONORIFIC_LABELS: Record<string, string> = {
    mr: 'Mr.',
    mrs: 'Mrs.',
    ms: 'Ms.',
    miss: 'Miss',
    dr: 'Dr.',
    prof: 'Prof.',
    other: 'Other',
};

const SEX_ASSIGNED_LABELS: Record<string, string> = {
    male: 'Male',
    female: 'Female',
};

function getFlagSrc(country?: Country | null) {
    if (!country) return null;
    if (country.flag_url) return country.flag_url;

    const code = (country.code || '').toLowerCase().trim();
    if (!code) return null;

    return `/asean/${code}.png`;
}

function InfoRow({
    icon,
    label,
    value,
    right,
}: {
    icon: React.ReactNode;
    label: string;
    value?: React.ReactNode;
    right?: React.ReactNode;
}) {
    return (
        <div className="flex items-start justify-between gap-4 px-4 py-3 sm:px-5">
            <div className="flex min-w-0 items-start gap-3">
                <div className="mt-0.5 inline-flex h-9 w-9 flex-none items-center justify-center rounded-xl border border-slate-200/70 bg-white/70 text-slate-700 shadow-sm dark:border-white/10 dark:bg-slate-950/40 dark:text-slate-200">
                    {icon}
                </div>

                <div className="min-w-0">
                    <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        {label}
                    </div>
                    <div className="mt-1 break-words text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {value ?? <span className="font-medium text-slate-500 dark:text-slate-400">—</span>}
                    </div>
                </div>
            </div>

            {right ? <div className="flex flex-none items-center gap-2">{right}</div> : null}
        </div>
    );
}

/**
 * ✅ Mobile fix (no QR cutting):
 * - DO NOT force aspect ratio on xs (mobile). Landscape gets too short and clips content.
 * - Keep aspect ratio on sm+ only.
 * - Make inner wrapper h-auto on xs so content defines height.
 */
function IdCardPreview({
    participant,
    flagSrc,
    qrDataUrl,
    loading,
    orientation,
}: {
    participant: Participant;
    flagSrc: string | null;
    qrDataUrl: string | null;
    loading: boolean;
    orientation: 'portrait' | 'landscape';
}) {
    const isLandscape = orientation === 'landscape';

    // ✅ aspect ratio ONLY on sm+ (mobile uses natural height to avoid clipping)
    const aspect = isLandscape ? 'sm:aspect-[3.37/2.125]' : 'sm:aspect-[3.46/5.51]';

    // ✅ print sizes (keep accurate)
    const printSize = isLandscape ? 'print:w-[3.37in] print:h-[2.125in]' : 'print:w-[3.46in] print:h-[5.51in]';

    // ✅ screen preview sizing
    const maxW = isLandscape ? 'max-w-[98vw] sm:max-w-[520px]' : 'max-w-[94vw] sm:max-w-[360px]';

    // ✅ landscape QR panel column smaller on mobile
    const qrPanelWidth = isLandscape ? 'w-[120px] sm:w-[150px]' : '';

    // ✅ QR size responsive (smaller on mobile)
    const qrBoxClass = isLandscape
        ? 'w-[84px] h-[84px] sm:w-[108px] sm:h-[108px]'
        : 'w-[128px] h-[128px] sm:w-[160px] sm:h-[160px]';

    // ✅ tighten padding + typography on xs
    const pad = isLandscape ? 'p-2 sm:p-3' : 'p-3 pb-2 sm:p-4 sm:pb-3';
    const headerLogo = isLandscape ? 'h-7 w-7 sm:h-8 sm:w-8' : 'h-7 w-7 sm:h-9 sm:w-9';

    return (
        <div
            className={cn(
                'relative mx-auto w-full overflow-hidden rounded-3xl border border-slate-200/70 bg-white shadow-sm dark:border-white/10 dark:bg-slate-950',
                maxW,
                // ✅ critical: allow natural height on mobile
                'aspect-auto',
                aspect,
                'print:max-w-none',
                printSize,
            )}
        >
            {/* Background */}
            <div aria-hidden className="absolute inset-0">
                <img
                    src="/img/bg.png"
                    alt=""
                    className={cn(
                        'absolute inset-0 h-full w-full object-cover',
                        'filter brightness-80 contrast-150 saturate-200',
                        'dark:brightness-80 dark:contrast-110',
                        isLandscape ? 'opacity-100 dark:opacity-35' : 'opacity-100 dark:opacity-30',
                    )}
                    draggable={false}
                    loading="lazy"
                    decoding="async"
                />

                <div className="absolute inset-0 bg-black/10 dark:bg-black/15" />
                <div className="absolute inset-0 bg-gradient-to-b from-white/45 via-white/20 to-white/55 dark:from-slate-950/55 dark:via-slate-950/28 dark:to-slate-950/55" />
                <div className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-slate-200/60 blur-3xl dark:bg-slate-800/60" />
            </div>

            <div className={cn('relative flex h-auto flex-col sm:h-full', pad)}>
                {/* Header */}
                <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2.5">
                        <img
                            src="/img/asean_logo.png"
                            alt="ASEAN"
                            className={cn('object-contain drop-shadow-sm', headerLogo)}
                            draggable={false}
                            loading="lazy"
                        />
                        <img
                            src="/img/bagong_pilipinas.png"
                            alt="Bagong Pilipinas"
                            className={cn('object-contain drop-shadow-sm', headerLogo)}
                            draggable={false}
                            loading="lazy"
                        />

                        <div className="min-w-0">
                            <div className="truncate text-[11px] font-semibold tracking-wide text-slate-700 dark:text-slate-200">
                                ASEAN Philippines 2026
                            </div>
                            <div className="truncate text-[10px] text-slate-500 dark:text-slate-400">
                                Participant Identification
                            </div>
                        </div>
                    </div>
                </div>

                <Separator className={cn('bg-slate-200/70 dark:bg-white/10', isLandscape ? 'my-2' : 'my-2 sm:my-2.5')} />

                {/* Body */}
                <div
                    className={cn(
                        'min-h-0',
                        // ✅ only use flex fill on sm+ when aspect is enforced
                        'sm:flex-1',
                        isLandscape
                            ? 'grid grid-cols-[1fr_120px] gap-2.5 sm:grid-cols-[1fr_150px] sm:gap-3'
                            : 'flex flex-col gap-2.5 sm:gap-3',
                    )}
                >
                    {/* LEFT INFO */}
                    <div className="min-w-0">
                        <div className="text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                            Participant
                        </div>

                        <div
                            className={cn(
                                'mt-0.5 break-words font-semibold tracking-tight text-slate-900 dark:text-slate-100',
                                isLandscape ? 'text-[13px] leading-4 sm:text-sm' : 'text-base leading-5 sm:text-lg sm:leading-6',
                                'line-clamp-2',
                            )}
                            title={participant.name}
                        >
                            {participant.name}
                        </div>

                        <div className={cn('flex items-center gap-2.5', isLandscape ? 'mt-1.5 sm:mt-2' : 'mt-2 sm:mt-2.5')}>
                            <div
                                className={cn(
                                    'overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-sm dark:border-white/10 dark:bg-slate-950',
                                    'h-8 w-8 sm:h-9 sm:w-9',
                                )}
                            >
                                {flagSrc ? (
                                    <img
                                        src={flagSrc}
                                        alt={participant.country?.name ?? 'Country flag'}
                                        className="h-full w-full object-cover"
                                        draggable={false}
                                        loading="lazy"
                                        onError={(e) => {
                                            (e.currentTarget as HTMLImageElement).style.display = 'none';
                                        }}
                                    />
                                ) : null}
                            </div>

                            <div className="min-w-0">
                                <div className="truncate text-[12px] font-semibold text-slate-900 dark:text-slate-100">
                                    {participant.country?.name ?? '—'}
                                </div>
                                {participant.country?.code ? (
                                    <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                                        {participant.country.code.toUpperCase()}
                                    </div>
                                ) : null}
                            </div>
                        </div>

                        <div className={cn(isLandscape ? 'mt-1.5 sm:mt-2' : 'mt-2 sm:mt-3')}>
                            <div className="text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                                Participant ID
                            </div>

                            <div
                                className={cn(
                                    'mt-1 inline-flex max-w-full whitespace-normal break-words rounded-2xl border border-slate-200/70 bg-white/80 px-2.5 py-1.5 font-mono text-slate-900 shadow-sm backdrop-blur dark:border-white/10 dark:bg-slate-950/45 dark:text-slate-100',
                                    isLandscape ? 'text-[10px] leading-4' : 'text-[11px] leading-4',
                                )}
                            >
                                {participant.display_id}
                            </div>
                        </div>

                        <div className={cn('text-[10px] text-slate-500 dark:text-slate-400', isLandscape ? 'mt-1' : 'mt-1.5 sm:mt-2')}>
                            Scan QR for attendance verification.
                        </div>
                    </div>

                    {/* RIGHT QR */}
                    <div
                        className={cn(
                            'flex flex-col items-center justify-center rounded-3xl border border-slate-200/70 bg-white/80 shadow-sm backdrop-blur dark:border-white/10 dark:bg-slate-950/45',
                            qrPanelWidth,
                            isLandscape ? 'p-2 sm:p-2.5' : 'p-2.5 sm:p-3',
                            // ✅ only push to bottom on larger screens; on mobile it can cause clipping
                            !isLandscape && 'sm:mt-auto',
                        )}
                    >
                        <div
                            className={cn(
                                'inline-flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-200',
                                isLandscape ? 'mb-1 text-[10px]' : 'mb-1 text-[11px] sm:mb-1.5',
                            )}
                        >
                            <QrCodeIcon className={cn(isLandscape ? 'h-3.5 w-3.5' : 'h-4 w-4')} />
                            QR Code
                        </div>

                        {loading ? (
                            <Skeleton className={cn('rounded-2xl', qrBoxClass)} />
                        ) : qrDataUrl ? (
                            <img
                                src={qrDataUrl}
                                alt="Participant QR code"
                                className={cn('rounded-2xl bg-white p-2 object-contain', qrBoxClass)}
                                draggable={false}
                            />
                        ) : (
                            <div
                                className={cn(
                                    'flex flex-col items-center justify-center gap-2 rounded-2xl border border-slate-200/70 bg-white/60 text-center dark:border-white/10 dark:bg-slate-950/30',
                                    qrBoxClass,
                                )}
                            >
                                <QrCodeIcon className="h-7 w-7 text-slate-400" />
                                <div className="text-[10px] font-medium text-slate-600 dark:text-slate-300">QR unavailable</div>
                            </div>
                        )}

                        <div className="mt-2 w-full text-center">
                            <div className={cn('font-semibold text-slate-900 dark:text-slate-100', isLandscape ? 'text-[10px]' : 'text-[11px]')}>
                                <span className="line-clamp-2" title={`${participant.country?.code?.toUpperCase() ?? ''} • ${participant.name}`}>
                                    {participant.country?.code?.toUpperCase() ?? ''}
                                    {participant.country?.code ? ' • ' : ''}
                                    {participant.name}
                                </span>
                            </div>
                            <div className="mt-1 break-words font-mono text-[10px] text-slate-500 dark:text-slate-400">
                                {participant.display_id}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function ParticipantDashboard({ participant }: PageProps) {
    const flagSrc = getFlagSrc(participant.country);
    const form = useForm({
        has_food_restrictions: (participant.food_restrictions ?? []).length > 0,
        food_restrictions: participant.food_restrictions ?? [],
        dietary_allergies: participant.dietary_allergies ?? '',
        dietary_other: participant.dietary_other ?? '',
        accessibility_needs: participant.accessibility_needs ?? [],
        accessibility_other: participant.accessibility_other ?? '',
    });

    const dietaryPreferenceLabels = React.useMemo(
        () =>
            (participant.food_restrictions ?? []).map(
                (value) => FOOD_RESTRICTION_LABELS[value] ?? value.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase()),
            ),
        [participant.food_restrictions],
    );
    const qrValue = participant.qr_payload;

    // ✅ DEFAULT OPEN = LANDSCAPE
    const [orientation, setOrientation] = React.useState<'portrait' | 'landscape'>('landscape');

    const [qrDataUrl, setQrDataUrl] = React.useState<string | null>(null);
    const [qrLoading, setQrLoading] = React.useState(true);
    const [profileImagePreview, setProfileImagePreview] = React.useState<string | null>(
        participant.profile_photo_url ?? null,
    );
    const [profileImageObjectUrl, setProfileImageObjectUrl] = React.useState<string | null>(null);
    const [selectedProfileImage, setSelectedProfileImage] = React.useState<File | null>(null);
    const photoForm = useForm<{ profile_photo: File | null }>({
        profile_photo: null,
    });

    // ✅ opens full-size preview only when needed
    const [previewOpen, setPreviewOpen] = React.useState(false);

    const uploadInputRef = React.useRef<HTMLInputElement | null>(null);
    const fullContactNumber = [participant.contact_country_code, participant.contact_number].filter(Boolean).join(' ');
    const honorificTitle =
        participant.honorific_title === 'other'
            ? participant.honorific_other || 'Other'
            : (participant.honorific_title ? HONORIFIC_LABELS[participant.honorific_title] : undefined);
    const sexAssignedLabel = participant.sex_assigned_at_birth ? SEX_ASSIGNED_LABELS[participant.sex_assigned_at_birth] : undefined;

    const accessibilityLabels = React.useMemo(
        () =>
            (participant.accessibility_needs ?? []).map(
                (value) => ACCESSIBILITY_NEEDS_OPTIONS.find((option) => option.value === value)?.label ?? value,
            ),
        [participant.accessibility_needs],
    );

    React.useEffect(() => {
        let mounted = true;

        async function buildQr() {
            try {
                setQrLoading(true);

                if (!qrValue || qrValue.trim().length < 10) {
                    if (mounted) setQrDataUrl(null);
                    return;
                }

                const dataUrl = await QRCode.toDataURL(qrValue, {
                    margin: 1,
                    scale: 8,
                    errorCorrectionLevel: 'M',
                });

                if (mounted) setQrDataUrl(dataUrl);
            } catch {
                if (mounted) {
                    setQrDataUrl(null);
                    toast.error('Failed to generate QR code.');
                }
            } finally {
                if (mounted) setQrLoading(false);
            }
        }

        buildQr();
        return () => {
            mounted = false;
        };
    }, [qrValue]);

    const copyToClipboard = async (text: string, label = 'Copied!') => {
        try {
            await navigator.clipboard.writeText(text);
            toast.success(label);
        } catch {
            toast.error('Copy failed. Please try again.');
        }
    };

    const downloadQr = () => {
        if (!qrDataUrl) return;
        const a = document.createElement('a');
        a.href = qrDataUrl;
        a.download = `asean-id-qr-${participant.display_id}.png`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        toast.success('QR code downloaded.');
    };

    const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        const url = URL.createObjectURL(file);
        if (profileImageObjectUrl) {
            URL.revokeObjectURL(profileImageObjectUrl);
        }
        setProfileImageObjectUrl(url);
        setProfileImagePreview(url);
        setSelectedProfileImage(file);
        photoForm.setData('profile_photo', file);
        event.target.value = '';
    };

    React.useEffect(() => {
        return () => {
            if (profileImageObjectUrl) {
                URL.revokeObjectURL(profileImageObjectUrl);
            }
        };
    }, [profileImageObjectUrl]);

    React.useEffect(() => {
        if (!selectedProfileImage && participant.profile_photo_url !== profileImagePreview) {
            setProfileImagePreview(participant.profile_photo_url ?? null);
        }
    }, [participant.profile_photo_url, profileImagePreview, selectedProfileImage]);

    const saveProfileImage = () => {
        if (!selectedProfileImage) return;
        photoForm.post('/participant-dashboard/photo', {
            preserveScroll: true,
            onSuccess: () => {
                toast.success('Profile photo saved.');
                setSelectedProfileImage(null);
                if (profileImageObjectUrl) {
                    URL.revokeObjectURL(profileImageObjectUrl);
                    setProfileImageObjectUrl(null);
                }
            },
            onError: () => toast.error('Unable to save profile photo.'),
        });
    };

    const removeProfileImage = () => {
        if (!profileImagePreview) return;
        photoForm.setData('profile_photo', null);
        photoForm.delete('/participant-dashboard/photo', {
            preserveScroll: true,
            onSuccess: () => {
                toast.success('Profile photo removed.');
                setSelectedProfileImage(null);
                setProfileImagePreview(null);
                if (profileImageObjectUrl) {
                    URL.revokeObjectURL(profileImageObjectUrl);
                }
                setProfileImageObjectUrl(null);
            },
            onError: () => toast.error('Unable to remove profile photo.'),
        });
    };

    const toggleFoodRestriction = (value: string) => {
        const currentlySelected = form.data.food_restrictions.includes(value);
        const next = currentlySelected
            ? form.data.food_restrictions.filter((item) => item !== value)
            : [...form.data.food_restrictions, value];
        form.setData('food_restrictions', next);
        form.setData('has_food_restrictions', next.length > 0);

        if (currentlySelected && value === 'allergies') {
            form.setData('dietary_allergies', '');
        }

        if (currentlySelected && value === 'other') {
            form.setData('dietary_other', '');
        }
    };

    const toggleAccessibilityNeed = (value: string) => {
        const currentlySelected = form.data.accessibility_needs.includes(value);
        const next = currentlySelected
            ? form.data.accessibility_needs.filter((item) => item !== value)
            : [...form.data.accessibility_needs, value];
        form.setData('accessibility_needs', next);

        if (currentlySelected && value === 'other') {
            form.setData('accessibility_other', '');
        }
    };

    const handleDietarySubmit = (event: React.FormEvent) => {
        event.preventDefault();
        form.patch('/participant-dashboard/preferences', {
            preserveScroll: true,
            onSuccess: () => toast.success('Dietary and accessibility preferences updated.'),
            onError: () => toast.error('Unable to update preferences.'),
        });
    };

    return (
        <AppLayout
            breadcrumbs={[
                { title: 'Dashboard', href: '/participant-dashboard' },
                { title: 'My Profile', href: '/participant-dashboard' },
            ]}
        >
            <Head title="Participant ID" />

            <div className="relative">
                <div
                    aria-hidden
                    className="pointer-events-none absolute inset-x-0 -top-10 -z-10 h-64 w-full rounded-[3rem]
                    bg-gradient-to-b from-slate-200/60 via-white to-transparent blur-2xl
                    dark:from-slate-800/50 dark:via-slate-950 dark:to-transparent"
                />

                <div className="w-full px-4 py-5 sm:px-6 lg:px-8">
                    <Card className="overflow-hidden rounded-3xl border-slate-200/70 bg-white/70 shadow-sm backdrop-blur dark:border-white/10 dark:bg-slate-900/40">
                        <div className="relative">
                            <img
                                src="/img/bg.png"
                                alt=""
                                className="absolute inset-0 h-full w-full object-cover opacity-25 dark:opacity-20"
                                draggable={false}
                                loading="lazy"
                            />
                            <div
                                aria-hidden
                                className="absolute inset-0 bg-gradient-to-r from-white/75 via-white/55 to-white/75 dark:from-slate-950/70 dark:via-slate-950/45 dark:to-slate-950/70"
                            />

                            <CardHeader className="relative py-5">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="space-y-1">
                                        <div className="flex flex-wrap items-center gap-3">
                                            <CardTitle className="text-balance text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
                                                Participant ID
                                            </CardTitle>

                                            <Badge
                                                className={cn(
                                                    'rounded-full px-3 py-1 font-mono text-xs font-semibold',
                                                    'border border-sky-200 bg-sky-50 text-sky-700',
                                                    'dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-200',
                                                )}
                                            >
                                                {participant.display_id}
                                            </Badge>
                                        </div>

                                        <div className="text-sm text-slate-600 dark:text-slate-300">
                                            ID card for attendance verification
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-2">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="rounded-xl"
                                            onClick={() => copyToClipboard(participant.display_id, 'Participant ID copied')}
                                        >
                                            <Copy className="mr-2 h-4 w-4" />
                                            Copy ID
                                        </Button>

                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="rounded-xl"
                                            onClick={downloadQr}
                                            disabled={!qrDataUrl || qrLoading}
                                        >
                                            <Download className="mr-2 h-4 w-4" />
                                            Download QR
                                        </Button>
                                    </div>
                                </div>
                            </CardHeader>
                        </div>
                        <CardContent className="space-y-4 p-4 sm:p-5">
                            <div className="mx-auto w-full max-w-6xl">
                                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-4">
                                    {/* LEFT */}
                                    <div className="min-w-0 flex-1 space-y-3">
                                        <div>
                                            <div className="text-base font-semibold text-slate-900 dark:text-slate-100">
                                                Profile Details
                                            </div>
                                            <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                                                Check your details to make sure they're correct.
                                            </div>
                                        </div>

                                        <div className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white/60 backdrop-blur dark:border-white/10 dark:bg-slate-950/30">
                                            <div className="divide-y divide-slate-200/60 dark:divide-white/10">
                                                <InfoRow
                                                    icon={<Flag className="h-4 w-4" />}
                                                    label="Country"
                                                    value={
                                                        <div className="flex items-center gap-3">
                                                            <div className="h-8 w-8 overflow-hidden rounded-xl border border-slate-200/70 bg-white shadow-sm dark:border-white/10 dark:bg-slate-950">
                                                                {flagSrc ? (
                                                                    <img
                                                                        src={flagSrc}
                                                                        alt={participant.country?.name ?? 'Country flag'}
                                                                        className="h-full w-full object-cover"
                                                                        loading="lazy"
                                                                        draggable={false}
                                                                        onError={(e) => {
                                                                            (e.currentTarget as HTMLImageElement).style.display = 'none';
                                                                        }}
                                                                    />
                                                                ) : null}
                                                            </div>
                                                            <div className="min-w-0">
                                                                <div className="truncate">
                                                                    {participant.country?.name ?? '—'}
                                                                </div>
                                                                {participant.country?.code ? (
                                                                    <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                                                                        {participant.country.code.toUpperCase()}
                                                                    </div>
                                                                ) : null}
                                                            </div>
                                                        </div>
                                                    }
                                                />

                                                <InfoRow
                                                    icon={<User2 className="h-4 w-4" />}
                                                    label="Name"
                                                    value={participant.name}
                                                    right={
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            className="rounded-xl"
                                                            onClick={() => copyToClipboard(participant.name, 'Name copied')}
                                                        >
                                                            <Copy className="h-4 w-4" />
                                                        </Button>
                                                    }
                                                />

                                                <InfoRow
                                                    icon={<Mail className="h-4 w-4" />}
                                                    label="Email"
                                                    value={participant.email}
                                                    right={
                                                        <a href={`mailto:${participant.email}`} className="inline-flex">
                                                            <Button size="sm" variant="ghost" className="rounded-xl">
                                                                <Mail className="h-4 w-4" />
                                                            </Button>
                                                        </a>
                                                    }
                                                />

                                                <InfoRow
                                                    icon={<Phone className="h-4 w-4" />}
                                                    label="Contact number"
                                                    value={participant.contact_number ?? '—'}
                                                    right={
                                                        participant.contact_number ? (
                                                            <a href={`tel:${participant.contact_number}`} className="inline-flex">
                                                                <Button size="sm" variant="ghost" className="rounded-xl">
                                                                    <Phone className="h-4 w-4" />
                                                                </Button>
                                                            </a>
                                                        ) : null
                                                    }
                                                />
                                            </div>
                                        </div>

                                        <div className="rounded-2xl border border-slate-200/70 bg-white/60 p-4 backdrop-blur dark:border-white/10 dark:bg-slate-950/30">
                                            <div className="text-base font-semibold text-slate-900 dark:text-slate-100">
                                                Registration Details
                                            </div>
                                            <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                                                Personal information, contact & organization, and additional info.
                                            </div>

                                            <div className="mt-4 grid gap-6 lg:grid-cols-2">
                                                <div className="space-y-2">
                                                    <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                                                        Personal information
                                                    </h4>
                                                    <dl className="space-y-2 text-sm">
                                                        <div className="flex items-center justify-between gap-4">
                                                            <dt className="text-slate-500 dark:text-slate-400">Honorific</dt>
                                                            <dd className="font-medium text-slate-900 dark:text-slate-100">
                                                                {honorificTitle || '—'}
                                                            </dd>
                                                        </div>
                                                        <div className="flex items-center justify-between gap-4">
                                                            <dt className="text-slate-500 dark:text-slate-400">Given name</dt>
                                                            <dd className="font-medium text-slate-900 dark:text-slate-100">
                                                                {participant.given_name || '—'}
                                                            </dd>
                                                        </div>
                                                        <div className="flex items-center justify-between gap-4">
                                                            <dt className="text-slate-500 dark:text-slate-400">Middle name</dt>
                                                            <dd className="font-medium text-slate-900 dark:text-slate-100">
                                                                {participant.middle_name || '—'}
                                                            </dd>
                                                        </div>
                                                        <div className="flex items-center justify-between gap-4">
                                                            <dt className="text-slate-500 dark:text-slate-400">Family name</dt>
                                                            <dd className="font-medium text-slate-900 dark:text-slate-100">
                                                                {participant.family_name || '—'}
                                                            </dd>
                                                        </div>
                                                        <div className="flex items-center justify-between gap-4">
                                                            <dt className="text-slate-500 dark:text-slate-400">Suffix</dt>
                                                            <dd className="font-medium text-slate-900 dark:text-slate-100">
                                                                {participant.suffix || '—'}
                                                            </dd>
                                                        </div>
                                                        <div className="flex items-center justify-between gap-4">
                                                            <dt className="text-slate-500 dark:text-slate-400">Sex assigned at birth</dt>
                                                            <dd className="font-medium text-slate-900 dark:text-slate-100">
                                                                {sexAssignedLabel || '—'}
                                                            </dd>
                                                        </div>
                                                    </dl>
                                                </div>

                                                <div className="space-y-2">
                                                    <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                                                        Contact & organization
                                                    </h4>
                                                    <dl className="space-y-2 text-sm">
                                                        <div className="flex items-center justify-between gap-4">
                                                            <dt className="text-slate-500 dark:text-slate-400">Email</dt>
                                                            <dd className="font-medium text-slate-900 dark:text-slate-100">
                                                                {participant.email}
                                                            </dd>
                                                        </div>
                                                        <div className="flex items-center justify-between gap-4">
                                                            <dt className="text-slate-500 dark:text-slate-400">Contact number</dt>
                                                            <dd className="font-medium text-slate-900 dark:text-slate-100">
                                                                {fullContactNumber || '—'}
                                                            </dd>
                                                        </div>
                                                        <div className="flex items-center justify-between gap-4">
                                                            <dt className="text-slate-500 dark:text-slate-400">Organization</dt>
                                                            <dd className="font-medium text-slate-900 dark:text-slate-100">
                                                                {participant.organization_name || '—'}
                                                            </dd>
                                                        </div>
                                                        <div className="flex items-center justify-between gap-4">
                                                            <dt className="text-slate-500 dark:text-slate-400">Position title</dt>
                                                            <dd className="font-medium text-slate-900 dark:text-slate-100">
                                                                {participant.position_title || '—'}
                                                            </dd>
                                                        </div>
                                                        <div className="flex items-center justify-between gap-4">
                                                            <dt className="text-slate-500 dark:text-slate-400">Registrant type</dt>
                                                            <dd className="font-medium text-slate-900 dark:text-slate-100">
                                                                {participant.user_type || participant.other_user_type || '—'}
                                                            </dd>
                                                        </div>
                                                        <div className="flex items-center justify-between gap-4">
                                                            <dt className="text-slate-500 dark:text-slate-400">IP group</dt>
                                                            <dd className="font-medium text-slate-900 dark:text-slate-100">
                                                                {participant.ip_group_name || '—'}
                                                            </dd>
                                                        </div>
                                                    </dl>
                                                </div>

                                                <div className="space-y-2 lg:col-span-2">
                                                    <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                                                        Additional info
                                                    </h4>
                                                    <dl className="grid gap-2 text-sm sm:grid-cols-2">
                                                        <div className="flex items-center justify-between gap-4">
                                                            <dt className="text-slate-500 dark:text-slate-400">Dietary preferences</dt>
                                                            <dd className="font-medium text-slate-900 dark:text-slate-100">
                                                                {dietaryPreferenceLabels.length
                                                                    ? dietaryPreferenceLabels.join(', ')
                                                                    : 'None'}
                                                            </dd>
                                                        </div>
                                                        <div className="flex items-center justify-between gap-4">
                                                            <dt className="text-slate-500 dark:text-slate-400">Dietary allergies</dt>
                                                            <dd className="font-medium text-slate-900 dark:text-slate-100">
                                                                {participant.dietary_allergies || '—'}
                                                            </dd>
                                                        </div>
                                                        <div className="flex items-center justify-between gap-4">
                                                            <dt className="text-slate-500 dark:text-slate-400">Dietary notes</dt>
                                                            <dd className="font-medium text-slate-900 dark:text-slate-100">
                                                                {participant.dietary_other || '—'}
                                                            </dd>
                                                        </div>
                                                        <div className="flex items-center justify-between gap-4">
                                                            <dt className="text-slate-500 dark:text-slate-400">Accessibility needs</dt>
                                                            <dd className="font-medium text-slate-900 dark:text-slate-100">
                                                                {accessibilityLabels.length ? accessibilityLabels.join(', ') : 'None'}
                                                            </dd>
                                                        </div>
                                                        <div className="flex items-center justify-between gap-4">
                                                            <dt className="text-slate-500 dark:text-slate-400">Accessibility notes</dt>
                                                            <dd className="font-medium text-slate-900 dark:text-slate-100">
                                                                {participant.accessibility_other || '—'}
                                                            </dd>
                                                        </div>
                                                    </dl>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Preferences form */}
                                        <form
                                            onSubmit={handleDietarySubmit}
                                            className="rounded-2xl border border-slate-200/70 bg-white/60 p-4 backdrop-blur dark:border-white/10 dark:bg-slate-950/30"
                                        >
                                            <div className="flex flex-col gap-1">
                                                <div className="text-base font-semibold text-slate-900 dark:text-slate-100">
                                                    Update dietary & accessibility
                                                </div>
                                                <div className="text-sm text-slate-600 dark:text-slate-300">
                                                    Adjust your dietary restrictions and accessibility needs.
                                                </div>
                                            </div>

                                            <div className="mt-4 space-y-4">
                                                <div className="rounded-2xl border border-slate-200/70 bg-white/80 p-4 shadow-sm dark:border-white/10 dark:bg-slate-950/40">
                                                    <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                                                        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#00359c]/10 text-[#00359c]">
                                                            1
                                                        </span>
                                                        Dietary preferences
                                                    </div>
                                                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                                                        Select all that apply.
                                                    </p>

                                                    <div className="mt-4 grid gap-4">
                                                        <div className="grid gap-2">
                                                            <Label className="text-sm font-medium">Dietary preferences</Label>
                                                            <div className="grid gap-3 sm:grid-cols-2">
                                                                {DIETARY_PREFERENCE_OPTIONS.map((option) => (
                                                                    <label
                                                                        key={option.value}
                                                                        className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-200"
                                                                    >
                                                                        <Checkbox
                                                                            checked={form.data.food_restrictions.includes(option.value)}
                                                                            onCheckedChange={() => toggleFoodRestriction(option.value)}
                                                                        />
                                                                        <span>{option.label}</span>
                                                                    </label>
                                                                ))}
                                                            </div>
                                                        </div>

                                                        {form.data.food_restrictions.includes('allergies') ? (
                                                            <div className="grid gap-2">
                                                                <Label htmlFor="dietary_allergies">Allergies (please specify)</Label>
                                                                <Input
                                                                    id="dietary_allergies"
                                                                    value={form.data.dietary_allergies}
                                                                    onChange={(event) =>
                                                                        form.setData('dietary_allergies', event.target.value)
                                                                    }
                                                                    placeholder="List any allergies"
                                                                />
                                                            </div>
                                                        ) : null}

                                                        {form.data.food_restrictions.includes('other') ? (
                                                            <div className="grid gap-2">
                                                                <Label htmlFor="dietary_other">Other (please specify)</Label>
                                                                <Input
                                                                    id="dietary_other"
                                                                    value={form.data.dietary_other}
                                                                    onChange={(event) =>
                                                                        form.setData('dietary_other', event.target.value)
                                                                    }
                                                                    placeholder="Other dietary requests"
                                                                />
                                                            </div>
                                                        ) : null}
                                                    </div>
                                                </div>

                                                <div className="rounded-2xl border border-slate-200/70 bg-white/80 p-4 shadow-sm dark:border-white/10 dark:bg-slate-950/40">
                                                    <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                                                        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#00359c]/10 text-[#00359c]">
                                                            2
                                                        </span>
                                                        Accessibility needs
                                                    </div>
                                                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                                                        Tell us what accommodations you need.
                                                    </p>

                                                    <div className="mt-4 grid gap-4">
                                                        <div className="grid gap-2">
                                                            <Label className="text-sm font-medium">Accessibility needs</Label>
                                                            <div className="grid gap-3 sm:grid-cols-2">
                                                                {ACCESSIBILITY_NEEDS_OPTIONS.map((option) => (
                                                                    <label
                                                                        key={option.value}
                                                                        className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-200"
                                                                    >
                                                                        <Checkbox
                                                                            checked={form.data.accessibility_needs.includes(option.value)}
                                                                            onCheckedChange={() => toggleAccessibilityNeed(option.value)}
                                                                        />
                                                                        <span>{option.label}</span>
                                                                    </label>
                                                                ))}
                                                            </div>
                                                        </div>

                                                        {form.data.accessibility_needs.includes('other') ? (
                                                            <div className="grid gap-2">
                                                                <Label htmlFor="accessibility_other">Accessibility notes (optional)</Label>
                                                                <Input
                                                                    id="accessibility_other"
                                                                    value={form.data.accessibility_other}
                                                                    onChange={(event) =>
                                                                        form.setData('accessibility_other', event.target.value)
                                                                    }
                                                                    placeholder="Other accommodations"
                                                                />
                                                            </div>
                                                        ) : null}
                                                    </div>
                                                </div>

                                                <div className="flex justify-end">
                                                    <Button
                                                        type="submit"
                                                        disabled={form.processing}
                                                        className="bg-[#00359c] text-white hover:bg-[#00359c]/90"
                                                    >
                                                        Save preferences
                                                    </Button>
                                                </div>
                                            </div>
                                        </form>

                                        {/* Warning ONLY */}
                                        {!participant.qr_payload ? (
                                            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
                                                QR payload is missing. Please generate it on the server for secure scanning.
                                            </div>
                                        ) : null}
                                    </div>

                                    {/* RIGHT */}
                                    <div className="w-full space-y-3 lg:w-[460px] lg:shrink-0 lg:self-start lg:sticky lg:top-6">
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <div className="text-base font-semibold text-slate-900 dark:text-slate-100">
                                                    Virtual ID
                                                </div>
                                                <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                                                    Use this virtual ID card for attendance verification.
                                                </div>
                                            </div>
                                        </div>

                                        <div className="rounded-2xl border border-slate-200/70 bg-white/60 p-3 backdrop-blur dark:border-white/10 dark:bg-slate-950/30">
                                            <div className="flex items-center justify-between gap-2">
                                                <Tabs
                                                    value={orientation}
                                                    onValueChange={(v) => setOrientation(v as 'portrait' | 'landscape')}
                                                >
                                                    <TabsList className="rounded-2xl bg-white/70 p-1 dark:bg-slate-950/40">
                                                        <TabsTrigger
                                                            value="portrait"
                                                            className={cn(
                                                                'rounded-xl px-3 text-xs',
                                                                'data-[state=active]:bg-sky-600 data-[state=active]:text-white',
                                                                'dark:data-[state=active]:bg-sky-500',
                                                            )}
                                                        >
                                                            <Smartphone className="mr-2 h-4 w-4" />
                                                            Portrait
                                                        </TabsTrigger>

                                                        <TabsTrigger
                                                            value="landscape"
                                                            className={cn(
                                                                'rounded-xl px-3 text-xs',
                                                                'data-[state=active]:bg-emerald-600 data-[state=active]:text-white',
                                                                'dark:data-[state=active]:bg-emerald-500',
                                                            )}
                                                        >
                                                            <IdCard className="mr-2 h-4 w-4" />
                                                            Landscape
                                                        </TabsTrigger>
                                                    </TabsList>
                                                </Tabs>
                                            </div>

                                            <Separator className="my-3 bg-slate-200/70 dark:bg-white/10" />

                                            <div
                                                className={cn(
                                                    'rounded-2xl border border-slate-200/70 bg-white/70 p-2 shadow-sm dark:border-white/10 dark:bg-slate-950/30',
                                                    'overflow-visible sm:overflow-auto sm:[-webkit-overflow-scrolling:touch]',
                                                    orientation === 'portrait' ? 'sm:max-h-[520px]' : 'sm:max-h-[340px]',
                                                )}
                                            >
                                                <IdCardPreview
                                                    participant={participant}
                                                    flagSrc={flagSrc}
                                                    qrDataUrl={qrDataUrl}
                                                    loading={qrLoading}
                                                    orientation={orientation}
                                                />
                                            </div>
                                        </div>

                                        <div className="rounded-2xl border border-slate-200/70 bg-white/60 p-4 backdrop-blur dark:border-white/10 dark:bg-slate-950/30">
                                            <div className="flex items-start justify-between gap-3">
                                                <div>
                                                    <div className="text-base font-semibold text-slate-900 dark:text-slate-100">
                                                        Profile photo
                                                    </div>
                                                    <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                                                        Upload an image for your badge.
                                                    </div>
                                                </div>
                                            </div>

                                                <div className="mt-4 flex flex-col gap-4">
                                                    <div className="flex items-center gap-4">
                                                        <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-sm dark:border-white/10 dark:bg-slate-950">
                                                        {profileImagePreview ? (
                                                            <img
                                                                src={profileImagePreview}
                                                                alt="Profile preview"
                                                                className="h-full w-full object-cover"
                                                            />
                                                        ) : (
                                                            <User2 className="h-8 w-8 text-slate-400" />
                                                        )}
                                                    </div>
                                                    <div className="text-sm text-slate-600 dark:text-slate-300">
                                                        {selectedProfileImage
                                                            ? 'Ready to save your new profile photo.'
                                                            : profileImagePreview
                                                                ? 'Current profile photo on file.'
                                                                : 'No photo uploaded yet.'}
                                                    </div>
                                                </div>

                                                <div className="grid gap-3">
                                                    <Button
                                                        type="button"
                                                        className="bg-[#00359c] text-white hover:bg-[#00359c]/90"
                                                        onClick={() => uploadInputRef.current?.click()}
                                                    >
                                                        <Upload className="mr-2 h-4 w-4" />
                                                        Upload image
                                                    </Button>
                                                </div>

                                                <div className="flex flex-wrap gap-2">
                                                    <Button
                                                        type="button"
                                                        className="bg-emerald-600 text-white hover:bg-emerald-600/90"
                                                        onClick={saveProfileImage}
                                                        disabled={!selectedProfileImage || photoForm.processing}
                                                    >
                                                        Save photo
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        className="border-slate-200/70 bg-white/70"
                                                        onClick={() => uploadInputRef.current?.click()}
                                                        disabled={!profileImagePreview}
                                                    >
                                                        <Pencil className="mr-2 h-4 w-4" />
                                                        Edit
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        className="border-rose-200/70 text-rose-600 hover:text-rose-700"
                                                        onClick={removeProfileImage}
                                                        disabled={!profileImagePreview || photoForm.processing}
                                                    >
                                                        <Trash2 className="mr-2 h-4 w-4" />
                                                        Remove
                                                    </Button>
                                                </div>
                                            </div>

                                            <input
                                                ref={uploadInputRef}
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={handleImageChange}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>


                    </Card>
                </div>

                <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
                    <DialogContent className="max-w-[900px]">
                        <DialogHeader>
                            <DialogTitle>Virtual ID (Large Preview)</DialogTitle>
                            <DialogDescription />
                        </DialogHeader>

                        <div className="rounded-2xl border border-slate-200/70 bg-white/70 p-4 dark:border-white/10 dark:bg-slate-950/40">
                            <IdCardPreview
                                participant={participant}
                                flagSrc={flagSrc}
                                qrDataUrl={qrDataUrl}
                                loading={qrLoading}
                                orientation={orientation}
                            />
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
        </AppLayout>
    );
}
