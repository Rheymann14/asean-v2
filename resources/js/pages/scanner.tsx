import AppLayout from '@/layouts/app-layout';
import { cn, toDateOnlyTimestamp } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
import jsQR from 'jsqr';
import * as React from 'react';

import { Button } from '@/components/ui/button';
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
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';

import {
    CalendarDays,
    Camera,
    Check,
    ChevronsUpDown,
    CircleCheckBig,
    CircleX,
    Clock,
    ExternalLink,
    FlipHorizontal,
    Keyboard,
    Mail,
    MapPin,
    Maximize,
    Minimize,
    QrCode as QrCodeIcon,
    RefreshCcw,
    ScanLine,
    ShieldCheck,
    UserRound,
} from 'lucide-react';

type EventRow = {
    id: number;
    title: string;
    image_url?: string | null;
    starts_at?: string | null;
    ends_at?: string | null;
    is_active?: boolean;
    phase?: 'ongoing' | 'upcoming' | 'closed';
};

type ParticipantInfo = {
    id: number;
    full_name: string;

    display_id?: string | null;

    // ✅ from DB columns
    qr_token?: string | null;
    profile_image_url?: string | null;
    country_code?: string | null;
    email?: string | null;
    country?: string | null;
    country_flag_url?: string | null;
    user_type?: string | null;
    is_verified?: boolean;
};

type ScanResponse = {
    ok: boolean;
    message: string;

    participant?: ParticipantInfo | null;

    // ✅ backend may or may not return this
    qr_data_url?: string | null;

    registered_events?: Array<{
        id: number;
        title: string;
        starts_at?: string | null;
    }>;
    checked_in_event?: { id: number; title: string } | null;
    already_checked_in?: boolean;
    scanned_at?: string | null;
};

type PageProps = {
    events?: EventRow[];
    default_event_id?: number | null;
};

type RecentScanStatus = 'verified' | 'already' | 'rejected';

type RecentScan = {
    key: string;
    name: string;
    display_id: string | null;
    status: RecentScanStatus;
    at: number;
    country_code?: string | null;
    country_flag_url?: string | null;
};

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Scanner', href: '/scanner' }];

const PRIMARY_BTN =
    'bg-[#00359c] text-white hover:bg-[#00359c]/90 focus-visible:ring-[#00359c]/30 dark:bg-[#00359c] dark:hover:bg-[#00359c]/90';

const ENDPOINTS = {
    scan: '/scanner/scan',
};

// ✅ localStorage key for the mirror preference (persists across reloads)
const MIRROR_STORAGE_KEY = 'scanner:mirrored';

// ✅ ignore an identical QR code re-detected within this window (ms)
const SCAN_COOLDOWN_MS = 3000;

// ✅ how many recent scans to keep in the side list
const RECENT_SCANS_LIMIT = 8;

// ✅ after this idle time (no new scan) the result panel reverts to the
// event image, so a participant's face isn't left on-screen indefinitely
const IDLE_REVERT_MS = 15000;

// app-wide default event thumbnail (same one the event pages fall back to)
const DEFAULT_EVENT_IMAGE = '/tumbnail.png';

// resolve a programme image_url the same way the event pages do,
// falling back to the default ASEAN thumbnail when the event has no image
function resolveEventImageUrl(imageUrl?: string | null) {
    if (!imageUrl) return DEFAULT_EVENT_IMAGE;
    if (imageUrl.startsWith('http') || imageUrl.startsWith('/'))
        return imageUrl;
    return `/event-images/${imageUrl}`;
}

function getCsrfToken() {
    const el = document.querySelector(
        'meta[name="csrf-token"]',
    ) as HTMLMetaElement | null;
    if (el?.content) return el.content;
    const match = document.cookie.match(/(?:^|; )XSRF-TOKEN=([^;]+)/);
    if (!match) return '';
    return decodeURIComponent(match[1]);
}

function fmtDate(dateStr?: string | null) {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return null;
    return new Intl.DateTimeFormat('en-PH', {
        month: 'short',
        day: '2-digit',
        year: 'numeric',
    }).format(d);
}

function fmtDateTime(dateStr?: string | null) {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return null;
    return new Intl.DateTimeFormat('en-PH', {
        month: 'short',
        day: '2-digit',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    }).format(d);
}

function getFlagSrc(
    countryCode?: string | null,
    countryFlagUrl?: string | null,
) {
    if (countryFlagUrl) return countryFlagUrl;
    const code = (countryCode || '').toLowerCase().trim();
    if (!code) return null;
    return `/asean/${code}.png`;
}

function resolveEventPhase(event: EventRow, now: number): EventRow['phase'] {
    const start = event.starts_at;
    if (!start) return 'upcoming';

    const startDate = new Date(start);
    if (Number.isNaN(startDate.getTime())) return 'upcoming';

    const endDate = event.ends_at ? new Date(event.ends_at) : null;

    const nowDate = new Date(now);
    const nowDateTs = toDateOnlyTimestamp(nowDate);
    const startDateTs = toDateOnlyTimestamp(startDate);
    const endDateTs =
        endDate && !Number.isNaN(endDate.getTime())
            ? toDateOnlyTimestamp(endDate)
            : null;

    if (endDateTs !== null && nowDateTs > endDateTs) return 'closed';

    if (nowDateTs < startDateTs) return 'upcoming';
    return 'ongoing';
}

function phaseLabel(phase?: EventRow['phase']) {
    switch (phase) {
        case 'ongoing':
            return 'Ongoing';
        case 'upcoming':
            return 'Upcoming';
        default:
            return 'Closed';
    }
}

function phaseBadgeClass(phase?: EventRow['phase']) {
    switch (phase) {
        case 'ongoing':
            return 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200';
        case 'upcoming':
            return 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-200';
        default:
            return 'border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-600/30 dark:bg-slate-800/30 dark:text-slate-300';
    }
}

function Pill({
    children,
    tone = 'default',
}: {
    children: React.ReactNode;
    tone?: 'default' | 'success' | 'danger';
}) {
    return (
        <span
            className={cn(
                'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold',
                tone === 'success' &&
                    'bg-emerald-600/10 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
                tone === 'danger' &&
                    'bg-red-600/10 text-red-700 dark:bg-red-500/15 dark:text-red-300',
                tone === 'default' &&
                    'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
            )}
        >
            {children}
        </span>
    );
}

/**
 * ✅ IDENTICAL Landscape ID Card Preview (copied/adapted from your IdCardPreview)
 * - Keeps the exact layout, styles, and content positions
 * - Uses ScanResponse participant fields
 */
function ScannerIdCardPreview({
    participant,
    flagSrc,
    orientation,
}: {
    participant: {
        name: string;
        display_id: string;
        profile_image_url?: string | null;
        is_verified?: boolean;
        country?: { name?: string | null; code?: string | null } | null;
    };
    flagSrc: string | null;
    orientation: 'portrait' | 'landscape';
}) {
    const isLandscape = orientation === 'landscape';

    // ✅ keep accurate print size, but DON'T force fixed aspect height on screen
    const printSize = isLandscape
        ? 'print:w-[3.37in] print:h-[2.125in]'
        : 'print:w-[3.46in] print:h-[5.51in]';

    const maxW = isLandscape
        ? 'max-w-[520px]'
        : 'max-w-[320px] sm:max-w-[360px]';

    const qrPanelWidth = isLandscape ? 'w-[178px]' : '';
    const qrSize = isLandscape ? 132 : 172;

    // ✅ slightly reduce bottom padding so it feels tighter
    const pad = isLandscape ? 'px-3 pt-3 pb-2' : 'p-4 pb-3';
    const headerLogo = isLandscape ? 'h-8 w-8' : 'h-9 w-9';

    return (
        <div
            className={cn(
                'relative mx-auto w-full overflow-hidden rounded-3xl border border-slate-200/70 bg-white shadow-sm dark:border-white/10 dark:bg-slate-950',
                maxW,
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
                        'brightness-80 contrast-150 saturate-200 filter',
                        'dark:brightness-80 dark:contrast-110',
                        isLandscape
                            ? 'opacity-100 dark:opacity-35'
                            : 'opacity-100 dark:opacity-30',
                    )}
                    draggable={false}
                    loading="lazy"
                    decoding="async"
                />

                <div className="absolute inset-0 bg-black/10 dark:bg-black/15" />
                <div className="absolute inset-0 bg-gradient-to-b from-white/45 via-white/20 to-white/55 dark:from-slate-950/55 dark:via-slate-950/28 dark:to-slate-950/55" />
                <div className="pointer-events-none absolute -top-10 -right-10 h-36 w-36 rounded-full bg-slate-200/60 blur-3xl dark:bg-slate-800/60" />
            </div>

            <div className={cn('relative flex flex-col', pad)}>
                {/* Header */}
                <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2.5">
                        <img
                            src="/img/asean_logo.png"
                            alt="ASEAN"
                            className={cn(
                                'object-contain drop-shadow-sm',
                                headerLogo,
                            )}
                            draggable={false}
                            loading="lazy"
                        />
                        <img
                            src="/img/bagong_pilipinas.png"
                            alt="Bagong Pilipinas"
                            className={cn(
                                'object-contain drop-shadow-sm',
                                headerLogo,
                            )}
                            draggable={false}
                            loading="lazy"
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
                        isLandscape ? 'my-2' : 'my-2.5',
                    )}
                />

                {/* Body (✅ removed flex-1 so container height follows content) */}
                <div
                    className={cn(
                        'min-h-0',
                        isLandscape
                            ? 'grid grid-cols-[1fr_178px] items-start gap-3'
                            : 'flex flex-col gap-3',
                    )}
                >
                    {/* LEFT INFO */}
                    <div className="min-w-0">
                        <div className="text-[10px] font-medium tracking-wide text-slate-500 uppercase dark:text-slate-400">
                            Participant
                        </div>

                        <div
                            className={cn(
                                'mt-0.5 font-semibold tracking-tight break-words text-slate-900 dark:text-slate-100',
                                isLandscape
                                    ? 'text-sm leading-4'
                                    : 'text-lg leading-6',
                                'line-clamp-2',
                            )}
                            title={participant.name}
                        >
                            {participant.name}
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
                                    'h-9 w-9',
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
                                        loading="lazy"
                                        onError={(e) => {
                                            (
                                                e.currentTarget as HTMLImageElement
                                            ).style.display = 'none';
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

                        <div className={cn(isLandscape ? 'mt-2' : 'mt-3')}>
                            <div className="text-[10px] font-medium tracking-wide text-slate-500 uppercase dark:text-slate-400">
                                Participant ID
                            </div>

                            <div
                                className={cn(
                                    'mt-1 inline-flex max-w-full rounded-2xl border border-slate-200/70 bg-white/80 px-2.5 py-1.5 font-mono break-words whitespace-normal text-slate-900 shadow-sm backdrop-blur dark:border-white/10 dark:bg-slate-950/45 dark:text-slate-100',
                                    isLandscape
                                        ? 'text-[10px] leading-4'
                                        : 'text-[11px] leading-4',
                                )}
                            >
                                {participant.display_id}
                            </div>
                        </div>

                        <div
                            className={cn(
                                'text-[10px] text-slate-500 dark:text-slate-400',
                                isLandscape ? 'mt-1.5' : 'mt-2',
                            )}
                        >
                            Scan QR for attendance verification.
                        </div>
                    </div>

                    {/* RIGHT PHOTO / VERIFIED */}
                    <div
                        className={cn(
                            'flex flex-col items-center justify-center rounded-3xl border border-slate-200/70 bg-white/80 shadow-sm backdrop-blur dark:border-white/10 dark:bg-slate-950/45',
                            qrPanelWidth,
                            isLandscape ? 'p-2.5' : 'p-3',
                            !isLandscape && 'mt-auto',
                        )}
                    >
                        <img
                            src={
                                participant.profile_image_url ??
                                '/img/asean_logo.png'
                            }
                            alt={participant.name}
                            className="rounded-2xl object-cover"
                            style={{ width: qrSize, height: qrSize }}
                            draggable={false}
                            loading="lazy"
                        />

                        {participant.is_verified !== false ? (
                            <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2 py-1 text-[10px] font-semibold text-white shadow-sm">
                                <ShieldCheck className="h-3 w-3" />
                                Verified
                            </span>
                        ) : null}

                        <div className="mt-2 w-full text-center">
                            <div
                                className={cn(
                                    'font-semibold text-slate-900 dark:text-slate-100',
                                    isLandscape ? 'text-[10px]' : 'text-[11px]',
                                )}
                            >
                                <span
                                    className="line-clamp-2"
                                    title={`${participant.country?.code?.toUpperCase() ?? ''} • ${participant.name}`}
                                >
                                    {participant.country?.code?.toUpperCase() ??
                                        ''}
                                    {participant.country?.code ? ' • ' : ''}
                                    {participant.name}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

/** ✅ Scan sounds (no files needed) */
function useScanSounds() {
    const ctxRef = React.useRef<AudioContext | null>(null);
    const unlockedRef = React.useRef(false);

    const masterRef = React.useRef<GainNode | null>(null);
    const compRef = React.useRef<DynamicsCompressorNode | null>(null);

    const getCtx = React.useCallback(() => {
        if (typeof window === 'undefined') return null;

        const AC = (window.AudioContext ||
            (window as any).webkitAudioContext) as
            | typeof AudioContext
            | undefined;
        if (!AC) return null;

        if (!ctxRef.current) ctxRef.current = new AC();
        const ctx = ctxRef.current;

        // Master chain (smooth + consistent volume)
        if (!masterRef.current || !compRef.current) {
            const comp = ctx.createDynamicsCompressor();
            comp.threshold.setValueAtTime(-26, ctx.currentTime);
            comp.knee.setValueAtTime(16, ctx.currentTime);
            comp.ratio.setValueAtTime(10, ctx.currentTime);
            comp.attack.setValueAtTime(0.003, ctx.currentTime);
            comp.release.setValueAtTime(0.12, ctx.currentTime);

            const master = ctx.createGain();
            master.gain.setValueAtTime(0.9, ctx.currentTime);

            master.connect(comp);
            comp.connect(ctx.destination);

            masterRef.current = master;
            compRef.current = comp;
        }

        return ctx;
    }, []);

    const out = React.useCallback(() => {
        const ctx = getCtx();
        const master = masterRef.current;
        if (!ctx || !master) return null;
        return { ctx, master };
    }, [getCtx]);

    const unlock = React.useCallback(async () => {
        const ctx = getCtx();
        if (!ctx) return;

        try {
            if (ctx.state === 'suspended') await ctx.resume();
        } catch {
            // ignore
        }

        // iOS/Safari unlock with silent buffer once
        if (!unlockedRef.current) {
            try {
                const buffer = ctx.createBuffer(1, 1, ctx.sampleRate);
                const src = ctx.createBufferSource();
                src.buffer = buffer;
                src.connect(ctx.destination);
                src.start(0);
                unlockedRef.current = true;
            } catch {
                // ignore
            }
        }
    }, [getCtx]);

    // Smooth envelope (Apple-ish: soft attack + fast decay)
    const env = React.useCallback(
        (gain: GainNode, t0: number, dur: number, peak: number) => {
            gain.gain.setValueAtTime(0.0001, t0);
            gain.gain.exponentialRampToValueAtTime(
                Math.max(0.0002, peak),
                t0 + 0.01,
            );
            gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
        },
        [],
    );

    // Tiny “tap” (subtle, makes it feel like a real scanner trigger)
    const click = React.useCallback(
        (when = 0, strength = 0.06) => {
            const o = out();
            if (!o) return;
            const { ctx, master } = o;
            const t0 = ctx.currentTime + when;

            const dur = 0.012;
            const length = Math.max(1, Math.floor(ctx.sampleRate * dur));
            const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < length; i++)
                data[i] = (Math.random() * 2 - 1) * 0.6;

            const src = ctx.createBufferSource();
            src.buffer = buffer;

            const hp = ctx.createBiquadFilter();
            hp.type = 'highpass';
            hp.frequency.setValueAtTime(1400, t0);

            const g = ctx.createGain();
            env(g, t0, dur, strength);

            src.connect(hp);
            hp.connect(g);
            g.connect(master);

            src.start(t0);
            src.stop(t0 + dur + 0.02);
        },
        [out, env],
    );

    const tone = React.useCallback(
        (
            freq: number,
            ms: number,
            when = 0,
            peak = 0.12,
            type: OscillatorType = 'sine',
        ) => {
            const o = out();
            if (!o) return;
            const { ctx, master } = o;

            const t0 = ctx.currentTime + when;
            const dur = Math.max(0.04, ms / 1000);

            const osc = ctx.createOscillator();
            const g = ctx.createGain();

            osc.type = type;
            osc.frequency.setValueAtTime(freq, t0);

            // slight “glassy” shimmer via very tiny detune LFO
            const lfo = ctx.createOscillator();
            const lfoGain = ctx.createGain();
            lfo.frequency.setValueAtTime(10, t0);
            lfoGain.gain.setValueAtTime(3, t0); // subtle
            lfo.connect(lfoGain);
            lfoGain.connect(osc.detune);

            env(g, t0, dur, peak);

            osc.connect(g);
            g.connect(master);

            lfo.start(t0);
            osc.start(t0);
            osc.stop(t0 + dur + 0.03);
            lfo.stop(t0 + dur + 0.03);
        },
        [out, env],
    );

    const success = React.useCallback(async () => {
        await unlock();

        // ✅ Apple-like “success”: clean ascending tri-tone (clear but pleasant)
        // Notes: C6, E6, G6 (major chord)
        click(0.0, 0.05);
        tone(1046.5, 75, 0.02, 0.12, 'sine');
        tone(1318.5, 90, 0.1, 0.11, 'sine');
        tone(1568.0, 85, 0.19, 0.1, 'sine');

        // tiny sparkle
        tone(2093.0, 40, 0.28, 0.06, 'triangle');
    }, [unlock, click, tone]);

    const error = React.useCallback(async () => {
        await unlock();

        // ✅ Apple-like “error”: soft “nope” downward interval + low thud
        click(0.0, 0.04);

        // low thud (subtle)
        tone(110, 120, 0.02, 0.08, 'sine');

        // descending tones (clear rejection, not harsh)
        tone(659.3, 110, 0.06, 0.13, 'triangle'); // E5
        tone(523.3, 140, 0.16, 0.12, 'triangle'); // C5
    }, [unlock, click, tone]);

    React.useEffect(() => {
        return () => {
            try {
                ctxRef.current?.close?.();
            } catch {
                // ignore
            }
            ctxRef.current = null;
            masterRef.current = null;
            compRef.current = null;
        };
    }, []);

    return { unlock, success, error };
}

/* =========================
   ✅ QR "alignment highlight"
   - Uses BarcodeDetector if available
   - Draws detected QR outline on canvas overlay
   - Turns frame green when centered/aligned
========================= */

type DetectedBarcode = {
    rawValue?: string;
    boundingBox?: DOMRectReadOnly;
    cornerPoints?: Array<{ x: number; y: number }>;
};

type BarcodeDetectorConstructor = new (options?: { formats?: string[] }) => {
    detect: (source: HTMLVideoElement) => Promise<DetectedBarcode[]>;
};

declare global {
    interface Window {
        BarcodeDetector?: BarcodeDetectorConstructor;
    }
}

function getCoverTransform(
    containerW: number,
    containerH: number,
    mediaW: number,
    mediaH: number,
) {
    // object-fit: cover mapping
    const scale = Math.max(containerW / mediaW, containerH / mediaH);
    const renderW = mediaW * scale;
    const renderH = mediaH * scale;
    const offsetX = (containerW - renderW) / 2;
    const offsetY = (containerH - renderH) / 2;
    return { scale, offsetX, offsetY };
}

function clamp(n: number, min: number, max: number) {
    return Math.min(max, Math.max(min, n));
}

function getCameraErrorMessage(error: unknown) {
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
        return 'Camera scanning requires HTTPS or localhost. Open this page from a secure URL, or use manual entry.';
    }

    if (error instanceof DOMException) {
        if (
            error.name === 'NotAllowedError' ||
            error.name === 'SecurityError'
        ) {
            return 'Camera permission denied. Please allow camera access for this site.';
        }

        if (
            error.name === 'NotFoundError' ||
            error.name === 'OverconstrainedError'
        ) {
            return 'No usable camera was found on this device.';
        }

        if (error.name === 'NotReadableError' || error.name === 'AbortError') {
            return 'The camera is already in use or could not be started. Close other apps using the camera, then try again.';
        }
    }

    return 'Unable to start camera. Try again.';
}

export default function Scanner(props: PageProps) {
    const events = props.events ?? [];
    const defaultEventId = props.default_event_id
        ? String(props.default_event_id)
        : '';
    const [selectedEventId, setSelectedEventId] =
        React.useState<string>(defaultEventId);
    const [eventOpen, setEventOpen] = React.useState(false);
    const [isScanning, setIsScanning] = React.useState(false);
    const [status, setStatus] = React.useState<
        'idle' | 'scanning' | 'verifying' | 'success' | 'error'
    >('idle');

    const [devices, setDevices] = React.useState<
        Array<{ deviceId: string; label: string }>
    >([]);
    const [deviceId, setDeviceId] = React.useState<string>('');
    const [cameraError, setCameraError] = React.useState<string | null>(null);

    const [manualCode, setManualCode] = React.useState('');
    const [showManual, setShowManual] = React.useState(false);

    const [result, setResult] = React.useState<ScanResponse | null>(null);

    // ✅ continuous side-by-side: latest result stays inline (no modal)
    // recent scans list (session-only, newest first, capped)
    const [recentScans, setRecentScans] = React.useState<RecentScan[]>([]);

    // ✅ mirror camera preview (default ON — feels natural like a selfie)
    const [mirrored, setMirrored] = React.useState<boolean>(() => {
        if (typeof window === 'undefined') return true;
        const saved = window.localStorage.getItem(MIRROR_STORAGE_KEY);
        return saved === null ? true : saved === '1';
    });

    // ✅ presentation / kiosk mode (fullscreen + hidden app chrome)
    const [presentation, setPresentation] = React.useState(false);

    // ✅ user explicitly stopped the camera (prevents auto-restart)
    const [manualStopped, setManualStopped] = React.useState(false);

    const nowTs = Date.now();

    const videoRef = React.useRef<HTMLVideoElement | null>(null);
    const scanCanvasRef = React.useRef<HTMLCanvasElement | null>(null);
    const streamRef = React.useRef<MediaStream | null>(null);
    const scanFrameRef = React.useRef<number | null>(null);
    const lastDetectedRef = React.useRef('');
    const lockRef = React.useRef(false);
    const isScanningRef = React.useRef(false);

    // ✅ prevents overlapping startScan() calls from requesting the camera
    // twice at once (which triggers a spurious "camera already in use" error
    // on first load, e.g. when device enumeration updates mid-start)
    const startingRef = React.useRef(false);

    // ✅ de-dupe guard for continuous scanning: ignore the same code within cooldown
    const lastResultRef = React.useRef<{ code: string; at: number }>({
        code: '',
        at: 0,
    });

    // ✅ idle timer that clears the on-screen result back to the event image
    const idleTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(
        null,
    );

    // ✅ sounds
    const sounds = useScanSounds();

    // ✅ alignment / detection UI
    const [qrAim, setQrAim] = React.useState<
        'idle' | 'searching' | 'detected' | 'aligned'
    >('idle');
    const qrAimRef = React.useRef(qrAim);

    const scanBoxRef = React.useRef<HTMLDivElement | null>(null);
    const overlayCanvasRef = React.useRef<HTMLCanvasElement | null>(null);

    React.useEffect(() => {
        qrAimRef.current = qrAim;
    }, [qrAim]);

    // ✅ persist mirror preference
    React.useEffect(() => {
        try {
            window.localStorage.setItem(
                MIRROR_STORAGE_KEY,
                mirrored ? '1' : '0',
            );
        } catch {
            // ignore storage errors (private mode, etc.)
        }
    }, [mirrored]);

    // ✅ keep presentation state in sync with the browser's fullscreen
    // (so pressing Esc also exits presentation mode)
    React.useEffect(() => {
        const onFsChange = () => {
            if (!document.fullscreenElement) setPresentation(false);
        };
        document.addEventListener('fullscreenchange', onFsChange);
        return () =>
            document.removeEventListener('fullscreenchange', onFsChange);
    }, []);

    const enterPresentation = React.useCallback(async () => {
        setPresentation(true);
        try {
            if (!document.fullscreenElement) {
                await document.documentElement.requestFullscreen();
            }
        } catch {
            // fullscreen may be blocked; presentation layout still applies
        }
    }, []);

    const exitPresentation = React.useCallback(async () => {
        setPresentation(false);
        try {
            if (document.fullscreenElement) {
                await document.exitFullscreen();
            }
        } catch {
            // ignore
        }
    }, []);

    React.useEffect(() => {
        let mounted = true;

        (async () => {
            try {
                if (!navigator.mediaDevices?.enumerateDevices) return;

                const list = await navigator.mediaDevices.enumerateDevices();
                if (!mounted) return;

                const mapped = list
                    .filter((device) => device.kind === 'videoinput')
                    .map((d, idx) => ({
                        deviceId: d.deviceId,
                        label: d.label || `Camera ${idx + 1}`,
                    }));
                setDevices(mapped);

                const preferred =
                    mapped.find((d) => /back|rear|environment/i.test(d.label))
                        ?.deviceId ??
                    mapped[0]?.deviceId ??
                    '';
                setDeviceId(preferred);
            } catch {
                // user may grant permission later
            }
        })();

        return () => {
            mounted = false;
        };
    }, []);

    React.useEffect(() => {
        return () => {
            stopScan();
            if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ✅ keep overlay canvas crisp
    React.useEffect(() => {
        const host = scanBoxRef.current;
        const canvas = overlayCanvasRef.current;
        if (!host || !canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const resize = () => {
            const dpr = window.devicePixelRatio || 1;
            const rect = host.getBoundingClientRect();
            canvas.width = Math.max(1, Math.floor(rect.width * dpr));
            canvas.height = Math.max(1, Math.floor(rect.height * dpr));
            canvas.style.width = `${rect.width}px`;
            canvas.style.height = `${rect.height}px`;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // draw in CSS pixels
            ctx.clearRect(0, 0, rect.width, rect.height);
        };

        resize();

        const ro = new ResizeObserver(() => resize());
        ro.observe(host);

        return () => ro.disconnect();
    }, []);

    // ✅ live QR detect highlight (BarcodeDetector)
    React.useEffect(() => {
        const host = scanBoxRef.current;
        const video = videoRef.current;
        const canvas = overlayCanvasRef.current;

        if (!isScanning || !host || !video || !canvas) {
            // clear overlay when not scanning
            const ctx = canvas?.getContext('2d');
            if (ctx && host) {
                const r = host.getBoundingClientRect();
                ctx.clearRect(0, 0, r.width, r.height);
            }
            setQrAim((s) => (s === 'idle' ? s : 'idle'));
            return;
        }

        const AnyWindow = window as any;
        const Detector = AnyWindow.BarcodeDetector as
            | (new (opts: { formats: string[] }) => {
                  detect: (src: any) => Promise<DetectedBarcode[]>;
              })
            | undefined;

        // Fallback: not supported (e.g. some Safari)
        if (!Detector) {
            setQrAim('searching');
            return;
        }

        const detector = new Detector({ formats: ['qr_code'] });

        let stopped = false;
        let lastAim: typeof qrAimRef.current = 'idle';

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const draw = (barcodes: DetectedBarcode[]) => {
            const rect = host.getBoundingClientRect();
            const w = rect.width;
            const h = rect.height;

            ctx.clearRect(0, 0, w, h);

            // frame area (matches your inset-6)
            const frameX = 24;
            const frameY = 24;
            const frameW = w - 48;
            const frameH = h - 48;

            // subtle dim outside frame
            ctx.save();
            ctx.fillStyle = 'rgba(0,0,0,0.16)';
            ctx.fillRect(0, 0, w, h);
            ctx.clearRect(frameX, frameY, frameW, frameH);
            ctx.restore();

            // if video not ready, just show searching
            const vw = video.videoWidth || 0;
            const vh = video.videoHeight || 0;
            if (!vw || !vh) {
                return { aim: 'searching' as const };
            }

            const { scale, offsetX, offsetY } = getCoverTransform(w, h, vw, vh);
            const mapPoint = (p: { x: number; y: number }) => ({
                x: p.x * scale + offsetX,
                y: p.y * scale + offsetY,
            });

            // choose best barcode (largest area)
            let best: {
                points: { x: number; y: number }[];
                cx: number;
                cy: number;
                area: number;
            } | null = null;

            for (const b of barcodes) {
                const pts = b.cornerPoints?.length ? b.cornerPoints : null;

                if (pts && pts.length >= 4) {
                    const mp = pts.map(mapPoint);
                    const xs = mp.map((p) => p.x);
                    const ys = mp.map((p) => p.y);
                    const minX = Math.min(...xs);
                    const maxX = Math.max(...xs);
                    const minY = Math.min(...ys);
                    const maxY = Math.max(...ys);

                    const area = (maxX - minX) * (maxY - minY);
                    const cx = (minX + maxX) / 2;
                    const cy = (minY + maxY) / 2;

                    if (!best || area > best.area)
                        best = { points: mp, cx, cy, area };
                    continue;
                }

                const bb = b.boundingBox;
                if (bb) {
                    const x1 = bb.x * scale + offsetX;
                    const y1 = bb.y * scale + offsetY;
                    const x2 = (bb.x + bb.width) * scale + offsetX;
                    const y2 = (bb.y + bb.height) * scale + offsetY;

                    const points = [
                        { x: x1, y: y1 },
                        { x: x2, y: y1 },
                        { x: x2, y: y2 },
                        { x: x1, y: y2 },
                    ];
                    const area = (x2 - x1) * (y2 - y1);
                    const cx = (x1 + x2) / 2;
                    const cy = (y1 + y2) / 2;

                    if (!best || area > best.area)
                        best = { points, cx, cy, area };
                }
            }

            if (!best) return { aim: 'searching' as const };

            const margin = 14;
            const inFrame =
                best.cx > frameX + margin &&
                best.cx < frameX + frameW - margin &&
                best.cy > frameY + margin &&
                best.cy < frameY + frameH - margin;

            const aim = inFrame ? ('aligned' as const) : ('detected' as const);

            // draw polygon/box
            ctx.save();
            ctx.lineWidth = 3;
            ctx.strokeStyle =
                aim === 'aligned'
                    ? 'rgba(16,185,129,0.95)'
                    : 'rgba(56,189,248,0.95)';
            ctx.shadowColor =
                aim === 'aligned'
                    ? 'rgba(16,185,129,0.55)'
                    : 'rgba(56,189,248,0.45)';
            ctx.shadowBlur = 18;

            ctx.beginPath();
            best.points.forEach((p, idx) => {
                const x = clamp(p.x, 0, w);
                const y = clamp(p.y, 0, h);
                if (idx === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            });
            ctx.closePath();
            ctx.stroke();
            ctx.restore();

            return { aim };
        };

        const tick = async () => {
            if (stopped) return;

            try {
                if (video.readyState < 2) {
                    setTimeout(tick, 140);
                    return;
                }

                const barcodes = await detector.detect(video);
                if (stopped) return;

                const { aim } = draw(barcodes);

                if (aim !== lastAim) {
                    lastAim = aim;
                    setQrAim(aim);
                }
            } catch {
                // ignore and continue
            } finally {
                if (!stopped) setTimeout(tick, 140);
            }
        };

        setQrAim('searching');
        tick();

        return () => {
            stopped = true;
            const r = host.getBoundingClientRect();
            ctx.clearRect(0, 0, r.width, r.height);
        };
    }, [isScanning]);

    function vibrateSuccess() {
        if (navigator.vibrate) navigator.vibrate([40, 40, 90]);
    }

    function vibrateError() {
        if (navigator.vibrate) navigator.vibrate([120, 60, 120]);
    }

    function hardStopVideoStream() {
        const video = videoRef.current;
        if (!video) return;

        const stream = video.srcObject as MediaStream | null;
        stream?.getTracks().forEach((t) => t.stop());
        video.srcObject = null;
    }

    /**
     * ✅ Continuous handler: show the result inline (beside the scanner),
     * play sound + vibrate, and push into the recent list.
     * The camera keeps running — scanning resumes automatically.
     */
    // ✅ revert the result panel to the event image after an idle period,
    // so a participant's face isn't left on the shared screen indefinitely
    function scheduleIdleRevert() {
        if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
        idleTimerRef.current = setTimeout(() => {
            setResult(null);
        }, IDLE_REVERT_MS);
    }

    async function handleScanResult(data: ScanResponse) {
        setResult(data);
        setStatus(data.ok ? 'success' : 'error');

        // a new scan is showing → (re)start the idle countdown
        scheduleIdleRevert();

        if (data.ok) {
            vibrateSuccess();
            sounds.success();
        } else {
            vibrateError();
            sounds.error();
        }

        // Only log real participant scans to the recent list
        // (config errors like "select an event" are shown inline only).
        const p = data.participant;
        if (p) {
            const status: RecentScanStatus = data.ok
                ? data.already_checked_in
                    ? 'already'
                    : 'verified'
                : 'rejected';

            setRecentScans((prev) =>
                [
                    {
                        key: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                        name: p.full_name,
                        display_id: p.display_id ?? null,
                        status,
                        at: Date.now(),
                        country_code: p.country_code ?? null,
                        country_flag_url: p.country_flag_url ?? null,
                    },
                    ...prev,
                ].slice(0, RECENT_SCANS_LIMIT),
            );
        }
    }

    const selectedEvent = selectedEventId
        ? events.find((e) => String(e.id) === selectedEventId)
        : null;
    const selectedEventPhase = selectedEvent
        ? resolveEventPhase(selectedEvent, nowTs)
        : undefined;
    const isEventBlocked =
        !!selectedEventPhase && selectedEventPhase !== 'ongoing';
    function ensureEventSelected() {
        if (!selectedEventId) {
            void handleScanResult({
                ok: false,
                message: 'Please select an event before scanning.',
            } as ScanResponse);
            return false;
        }
        if (selectedEventPhase && selectedEventPhase !== 'ongoing') {
            void handleScanResult({
                ok: false,
                message:
                    selectedEventPhase === 'upcoming'
                        ? 'This event has not started yet. Scanning will open once it is ongoing.'
                        : 'This event is no longer open for scanning.',
            } as ScanResponse);
            return false;
        }
        return true;
    }

    function teardownScanSession() {
        if (scanFrameRef.current !== null) {
            window.cancelAnimationFrame(scanFrameRef.current);
            scanFrameRef.current = null;
        }

        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        hardStopVideoStream();
    }

    async function readQrValue(
        video: HTMLVideoElement,
        detector: InstanceType<BarcodeDetectorConstructor> | null,
    ) {
        if (detector) {
            const codes = await detector.detect(video);
            const rawValue = codes[0]?.rawValue?.trim();

            if (rawValue) {
                return rawValue;
            }
        }

        const width = video.videoWidth;
        const height = video.videoHeight;

        if (!width || !height) {
            return '';
        }

        const canvas =
            scanCanvasRef.current ?? document.createElement('canvas');
        const context = canvas.getContext('2d', {
            willReadFrequently: true,
        });

        scanCanvasRef.current = canvas;

        if (!context) {
            return '';
        }

        canvas.width = width;
        canvas.height = height;
        context.drawImage(video, 0, 0, width, height);

        const imageData = context.getImageData(0, 0, width, height);
        // our QRs are always dark-on-light (screen/print), so skip the
        // inverted pass — roughly halves decode time per frame
        const code = jsQR(imageData.data, width, height, {
            inversionAttempts: 'dontInvert',
        });

        return code?.data?.trim() ?? '';
    }

    async function startScan() {
        if (!ensureEventSelected()) return;
        if (!videoRef.current) return;

        // ✅ never let two starts request the camera at the same time
        if (startingRef.current) return;
        startingRef.current = true;

        setCameraError(null);
        setResult(null);
        setStatus('scanning');
        setIsScanning(true);
        isScanningRef.current = true;
        lockRef.current = false;
        lastDetectedRef.current = '';
        setQrAim('searching');

        try {
            teardownScanSession();

            const videoConstraints: MediaTrackConstraints = {
                deviceId: deviceId ? { exact: deviceId } : undefined,
                facingMode: deviceId ? undefined : { ideal: 'environment' },
                width: { ideal: 1920 },
                height: { ideal: 1080 },
                ...({
                    focusMode: 'continuous',
                    advanced: [{ focusMode: 'continuous' }, { zoom: 1 }],
                } as unknown as MediaTrackConstraints),
            };

            const stream = await navigator.mediaDevices.getUserMedia({
                video: videoConstraints,
                audio: false,
            });

            streamRef.current = stream;

            const video = videoRef.current;
            if (!video || !isScanningRef.current) {
                stream.getTracks().forEach((track) => track.stop());
                return;
            }

            video.srcObject = stream;
            await video.play();

            if (navigator.mediaDevices?.enumerateDevices) {
                const list = await navigator.mediaDevices.enumerateDevices();
                const mapped = list
                    .filter((device) => device.kind === 'videoinput')
                    .map((d, idx) => ({
                        deviceId: d.deviceId,
                        label: d.label || `Camera ${idx + 1}`,
                    }));

                setDevices(mapped);
            }

            const detector = window.BarcodeDetector
                ? new window.BarcodeDetector({ formats: ['qr_code'] })
                : null;

            const scan = async () => {
                if (!isScanningRef.current) {
                    return;
                }

                const currentVideo = videoRef.current;

                if (
                    currentVideo &&
                    currentVideo.readyState >= 2 &&
                    !lockRef.current
                ) {
                    try {
                        const rawValue = await readQrValue(
                            currentVideo,
                            detector,
                        );

                        if (!rawValue) {
                            lastDetectedRef.current = '';
                        }

                        // ✅ de-dupe: skip the same code within the cooldown so a
                        // lingering participant isn't recorded twice. The camera
                        // keeps running — scanning is continuous.
                        const last = lastResultRef.current;
                        const isCooling =
                            rawValue === last.code &&
                            Date.now() - last.at < SCAN_COOLDOWN_MS;

                        if (
                            rawValue &&
                            rawValue !== lastDetectedRef.current &&
                            !isCooling
                        ) {
                            lastDetectedRef.current = rawValue;
                            lockRef.current = true;

                            setStatus('verifying');
                            await verifyCode(rawValue);

                            // resume scanning for the next participant
                            lockRef.current = false;
                            if (isScanningRef.current) {
                                setStatus('scanning');
                                setQrAim('searching');
                            }
                        }
                    } catch {
                        teardownScanSession();
                        setCameraError(
                            'The camera image could not be scanned. Keep the QR code inside the frame or use manual entry.',
                        );
                        setStatus('idle');
                        setIsScanning(false);
                        isScanningRef.current = false;
                        setQrAim('idle');
                        return;
                    }
                }

                scanFrameRef.current = window.requestAnimationFrame(scan);
            };

            scanFrameRef.current = window.requestAnimationFrame(scan);
        } catch (e: unknown) {
            const msg = getCameraErrorMessage(e);
            teardownScanSession();
            setCameraError(msg);
            // a camera problem is not a "rejected" scan — keep the status
            // neutral so the pill doesn't read "Rejected" (the error overlay
            // and Retry Camera button convey the camera state instead)
            setStatus('idle');
            setIsScanning(false);
            isScanningRef.current = false;
            setQrAim('idle');
        } finally {
            startingRef.current = false;
        }
    }

    function pauseScanForVerification() {
        teardownScanSession();
        setIsScanning(false);
        isScanningRef.current = false;
        setQrAim('idle');
    }

    function stopScan() {
        setManualStopped(true);
        pauseScanForVerification();
        setStatus('idle');
    }

    async function verifyCode(code: string) {
        if (!ensureEventSelected()) return;

        // ✅ record the code + time for the continuous de-dupe guard
        lastResultRef.current = { code, at: Date.now() };

        setStatus('verifying');

        try {
            const csrf = getCsrfToken();
            const payload: any = { code, event_id: Number(selectedEventId) };

            const res = await fetch(ENDPOINTS.scan, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-CSRF-TOKEN': csrf,
                    'X-Requested-With': 'XMLHttpRequest',
                },
                credentials: 'include',
                body: JSON.stringify(payload),
            });

            const data = (await res.json()) as ScanResponse;

            const participantJoinedSelectedEvent =
                !!data.registered_events?.some(
                    (event) => String(event.id) === selectedEventId,
                );

            if (
                !data.ok &&
                !!data.participant &&
                Array.isArray(data.registered_events) &&
                !participantJoinedSelectedEvent
            ) {
                data.message = 'Participant not joined to this event.';
            }

            await handleScanResult(data); // ✅ inline panel + sound + vibrate
        } catch {
            const data = {
                ok: false,
                message: 'Network/server error. Please try again.',
            } as ScanResponse;
            await handleScanResult(data); // ✅ error sound + vibrate
        }
    }

    // ✅ clear the inline result panel (does not stop the camera)
    function clearResult() {
        if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
        setResult(null);
        lastResultRef.current = { code: '', at: 0 };
        lastDetectedRef.current = '';
        if (isScanningRef.current) setStatus('scanning');
        else setStatus('idle');
    }

    React.useEffect(() => {
        if (
            isScanning ||
            manualStopped ||
            (status !== 'idle' && status !== 'success' && status !== 'error') ||
            isEventBlocked ||
            !selectedEventId ||
            cameraError
        ) {
            return;
        }

        void startScan();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        selectedEventId,
        deviceId,
        isEventBlocked,
        isScanning,
        manualStopped,
        status,
        cameraError,
    ]);

    React.useEffect(() => {
        if (!isScanning) return;
        if (!selectedEventId || isEventBlocked) {
            // internal stop (not a manual stop) so it can auto-resume
            // once a valid ongoing event is selected again
            pauseScanForVerification();
            setStatus('idle');
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedEventId, isEventBlocked, isScanning]);

    const filteredEvents = React.useMemo(() => {
        return events.map((event) => ({
            ...event,
            phase: resolveEventPhase(event, nowTs),
        }));
    }, [events, nowTs]);

    // ✅ build ID-card participant shape (match virtual ID content)
    const participantDisplayId = React.useMemo(() => {
        const displayId = (result?.participant?.display_id ?? '')
            .toString()
            .trim();
        return displayId || null;
    }, [result?.participant?.display_id]);

    const cardParticipant = React.useMemo(() => {
        const p = result?.participant;
        if (!p) return null;

        return {
            name: p.full_name,
            display_id: participantDisplayId ?? '—',
            country: {
                name: p.country ?? null,
                code: p.country_code ?? null,
            },
            profile_image_url: p.profile_image_url ?? null,
            is_verified: p.is_verified ?? true,
        };
    }, [participantDisplayId, result?.participant]);

    const flagSrc = getFlagSrc(
        result?.participant?.country_code,
        result?.participant?.country_flag_url,
    );

    const resultTitle = result?.ok
        ? 'Verified'
        : result?.message?.toLowerCase().includes('not joined')
          ? 'Not Joined'
          : 'Not Allowed';

    // ✅ event image shown on the idle/branding screen (privacy backdrop)
    const eventImageSrc = resolveEventImageUrl(selectedEvent?.image_url);

    // ✅ Inline result panel (shown beside the scanner — replaces the modal)
    const resultContent = (
        <div className="@container rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-base font-semibold text-slate-900 dark:text-slate-100">
                    {result ? (
                        result.ok ? (
                            <CircleCheckBig className="h-5 w-5 text-emerald-600" />
                        ) : (
                            <CircleX className="h-5 w-5 text-red-600" />
                        )
                    ) : (
                        <ScanLine className="h-5 w-5 text-slate-400" />
                    )}
                    {result ? resultTitle : 'Latest Scan'}
                </div>

                {result ? (
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 rounded-lg text-xs"
                        onClick={clearResult}
                    >
                        <RefreshCcw className="mr-1 h-3.5 w-3.5" />
                        Clear
                    </Button>
                ) : null}
            </div>

            {!result ? (
                // ✅ idle branding screen: show the event image (or the default
                // ASEAN thumbnail) instead of a lingering participant face —
                // privacy on the shared screen when there's no active queue
                <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
                    <div className="relative aspect-video w-full bg-slate-100 dark:bg-slate-900">
                        <img
                            src={eventImageSrc}
                            alt={selectedEvent?.title ?? 'Event'}
                            className="absolute inset-0 h-full w-full object-cover"
                            draggable={false}
                            onError={(e) => {
                                const img = e.currentTarget;
                                if (img.src.endsWith(DEFAULT_EVENT_IMAGE))
                                    return;
                                img.src = DEFAULT_EVENT_IMAGE;
                            }}
                        />
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-4">
                            <div className="truncate text-sm font-semibold text-white">
                                {selectedEvent?.title ??
                                    'ASEAN Philippines 2026'}
                            </div>
                            <div className="text-[11px] text-white/80">
                                Waiting for a scan — scan a participant QR to
                                check in.
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                // ✅ adaptive: ID card + status side-by-side when the panel is
                // wide (container query), stacked when narrow — avoids the big
                // empty gutters around the centered card on TV/presentation.
                // zoom scales the whole block (card, fonts, QR, photo) up on
                // wide panels so it stays legible from a distance.
                <div className="mt-4 grid gap-4 @4xl:grid-cols-[minmax(0,520px)_minmax(0,1fr)] @4xl:items-start @5xl:[zoom:1.15] @7xl:[zoom:1.3]">
                    {/* ✅ ID card FIRST */}
                    {cardParticipant ? (
                        <ScannerIdCardPreview
                            participant={cardParticipant}
                            flagSrc={flagSrc}
                            orientation="landscape"
                        />
                    ) : null}

                    {/* ✅ Verified/Error card + details beside/below */}
                    {result ? (
                        <div
                            className={cn(
                                'rounded-3xl border p-4',
                                !cardParticipant && '@4xl:col-span-2',
                                result.ok
                                    ? 'border-emerald-200 bg-emerald-50/60 dark:border-emerald-900/40 dark:bg-emerald-950/20'
                                    : 'border-red-200 bg-red-50/60 dark:border-red-900/40 dark:bg-red-950/20',
                            )}
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex items-start gap-3">
                                    <div
                                        className={cn(
                                            'grid size-11 place-items-center rounded-2xl',
                                            result.ok
                                                ? 'bg-emerald-600/10 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
                                                : 'bg-red-600/10 text-red-700 dark:bg-red-500/15 dark:text-red-300',
                                        )}
                                    >
                                        {result.ok ? (
                                            <CircleCheckBig className="h-6 w-6" />
                                        ) : (
                                            <CircleX className="h-6 w-6" />
                                        )}
                                    </div>

                                    <div className="min-w-0">
                                        <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                            {resultTitle}
                                        </div>
                                        <div className="mt-0.5 text-xs text-slate-700 dark:text-slate-300">
                                            {result.message}
                                        </div>
                                        {result.scanned_at ? (
                                            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                                Scanned at:{' '}
                                                {fmtDateTime(result.scanned_at)}
                                            </div>
                                        ) : null}
                                    </div>
                                </div>

                                {result.already_checked_in ? (
                                    <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                                        Already checked in
                                    </span>
                                ) : null}
                            </div>

                            {result.participant ? (
                                <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2">
                                                <UserRound className="h-4 w-4 text-slate-500" />
                                                <div className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                                                    {
                                                        result.participant
                                                            .full_name
                                                    }
                                                </div>
                                            </div>

                                            <div className="mt-2 grid gap-1 text-xs text-slate-600 dark:text-slate-400">
                                                {participantDisplayId ? (
                                                    <div className="flex items-center gap-2">
                                                        <QrCodeIcon className="h-4 w-4" />
                                                        <span className="truncate">
                                                            ID:{' '}
                                                            {
                                                                participantDisplayId
                                                            }
                                                        </span>
                                                    </div>
                                                ) : null}
                                                {result.participant.email ? (
                                                    <div className="flex items-center gap-2">
                                                        <Mail className="h-4 w-4" />
                                                        <span className="truncate">
                                                            {
                                                                result
                                                                    .participant
                                                                    .email
                                                            }
                                                        </span>
                                                    </div>
                                                ) : null}

                                                {result.participant.country ||
                                                result.participant.user_type ? (
                                                    <div className="flex items-center gap-2">
                                                        <MapPin className="h-4 w-4" />
                                                        {result.participant
                                                            .country_flag_url ? (
                                                            <img
                                                                src={
                                                                    result
                                                                        .participant
                                                                        .country_flag_url
                                                                }
                                                                alt=""
                                                                className="h-4 w-4 rounded-sm object-cover"
                                                                loading="lazy"
                                                                draggable={
                                                                    false
                                                                }
                                                            />
                                                        ) : null}
                                                        <span className="truncate">
                                                            {result.participant
                                                                .country ?? '—'}
                                                            {result.participant
                                                                .user_type
                                                                ? ` • ${result.participant.user_type}`
                                                                : ''}
                                                        </span>
                                                    </div>
                                                ) : null}

                                                {result.participant
                                                    .is_verified ? (
                                                    <div className="flex items-center gap-2">
                                                        <ShieldCheck className="h-4 w-4" />
                                                        <Pill tone="success">
                                                            Verified Participant
                                                        </Pill>
                                                    </div>
                                                ) : null}
                                            </div>
                                        </div>

                                        {result.checked_in_event ? (
                                            <div className="text-right">
                                                <div className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                                                    Checked-in:
                                                </div>
                                            </div>
                                        ) : null}
                                    </div>

                                    {selectedEvent ? (
                                        <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
                                            <ExternalLink className="h-4 w-4" />
                                            Checking in for:{' '}
                                            <span className="font-semibold text-slate-700 dark:text-slate-300">
                                                {selectedEvent.title}
                                            </span>
                                        </div>
                                    ) : null}
                                </div>
                            ) : null}
                        </div>
                    ) : null}
                </div>
            )}
        </div>
    );

    // ✅ recent scans list (session-only, newest first)
    // flex-1 lets it stretch to fill the leftover column height so the
    // panel bottom doesn't end in floating white space
    const recentList = (
        <div className="flex flex-1 flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                    <Clock className="h-4 w-4 text-slate-400" />
                    Recent Scans
                </div>
                {recentScans.length ? (
                    <button
                        type="button"
                        onClick={() => setRecentScans([])}
                        className="text-xs text-slate-400 transition-colors hover:text-slate-600 dark:hover:text-slate-300"
                    >
                        Clear
                    </button>
                ) : null}
            </div>

            {recentScans.length === 0 ? (
                <div className="grid flex-1 place-items-center py-8 text-xs text-slate-400">
                    No scans yet.
                </div>
            ) : (
                <ul className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
                    {recentScans.map((s) => (
                        <li
                            key={s.key}
                            className="flex items-center justify-between gap-3 py-2"
                        >
                            <div className="flex min-w-0 items-center gap-2">
                                {getFlagSrc(
                                    s.country_code,
                                    s.country_flag_url,
                                ) ? (
                                    <img
                                        src={
                                            getFlagSrc(
                                                s.country_code,
                                                s.country_flag_url,
                                            ) as string
                                        }
                                        alt=""
                                        className="h-4 w-4 shrink-0 rounded-sm object-cover"
                                        loading="lazy"
                                        draggable={false}
                                    />
                                ) : null}
                                <div className="min-w-0">
                                    <div className="truncate text-sm font-medium text-slate-800 dark:text-slate-200">
                                        {s.name}
                                    </div>
                                    <div className="truncate text-[11px] text-slate-400">
                                        {s.display_id ?? '—'}
                                    </div>
                                </div>
                            </div>

                            <div className="flex shrink-0 items-center gap-2">
                                <span
                                    className={cn(
                                        'rounded-full px-2 py-0.5 text-[10px] font-semibold',
                                        s.status === 'verified' &&
                                            'bg-emerald-600/10 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
                                        s.status === 'already' &&
                                            'bg-amber-600/10 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
                                        s.status === 'rejected' &&
                                            'bg-red-600/10 text-red-700 dark:bg-red-500/15 dark:text-red-300',
                                    )}
                                >
                                    {s.status === 'verified'
                                        ? 'Verified'
                                        : s.status === 'already'
                                          ? 'Already in'
                                          : 'Rejected'}
                                </span>
                                <span className="text-[11px] text-slate-400">
                                    {new Date(s.at).toLocaleTimeString(
                                        'en-PH',
                                        {
                                            hour: 'numeric',
                                            minute: '2-digit',
                                        },
                                    )}
                                </span>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Scanner" />

            <div
                className={cn(
                    presentation
                        ? 'fixed inset-0 z-50 overflow-auto bg-slate-100 p-3 sm:p-4 dark:bg-slate-950'
                        : 'mx-auto w-full max-w-6xl p-2 sm:p-4',
                )}
            >
                {presentation ? (
                    <div className="mb-3 flex items-center justify-end">
                        <Button
                            variant="outline"
                            className="h-9 rounded-xl"
                            onClick={() => void exitPresentation()}
                        >
                            <Minimize className="mr-2 h-4 w-4" />
                            Exit Presentation
                        </Button>
                    </div>
                ) : null}

                <div className="grid gap-4 lg:grid-cols-[minmax(0,460px)_1fr]">
                    {/* LEFT column: scanner card */}
                    <div className="flex w-full flex-col overflow-hidden rounded-xl bg-white dark:bg-slate-950">
                        <div className="relative px-4 pt-4 pb-3">
                            <div
                                aria-hidden
                                className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-[#00359c]/10 via-transparent to-transparent dark:from-[#00359c]/15"
                            />

                            <div className="itemss flex items-start justify-between gap-3">
                                <div>
                                    <div className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100">
                                        QR Scanner
                                    </div>
                                    <div className="text-sm text-slate-600 dark:text-slate-400">
                                        Scan participant QR to verify
                                        attendance.
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <Pill
                                        tone={
                                            status === 'success'
                                                ? 'success'
                                                : status === 'error'
                                                  ? 'danger'
                                                  : 'default'
                                        }
                                    >
                                        {status === 'verifying'
                                            ? 'Verifying...'
                                            : status === 'scanning'
                                              ? 'Scanning'
                                              : status === 'success'
                                                ? 'Verified'
                                                : status === 'error'
                                                  ? 'Rejected'
                                                  : 'Ready'}
                                    </Pill>

                                    {!presentation ? (
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            className="h-9 w-9 rounded-xl"
                                            title="Presentation mode (fullscreen)"
                                            onClick={() =>
                                                void enterPresentation()
                                            }
                                        >
                                            <Maximize className="h-4 w-4" />
                                        </Button>
                                    ) : null}
                                </div>
                            </div>

                            <div className="mt-3 grid gap-2">
                                <div className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                                    Event (required)
                                </div>
                                <Popover
                                    open={eventOpen}
                                    onOpenChange={setEventOpen}
                                >
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            role="combobox"
                                            aria-expanded={eventOpen}
                                            className="h-11 w-100 justify-between rounded-2xl"
                                        >
                                            <span className="flex min-w-0 items-center gap-2">
                                                {selectedEvent ? (
                                                    <>
                                                        <span className="truncate">
                                                            {
                                                                selectedEvent.title
                                                            }
                                                        </span>
                                                        {selectedEventPhase ? (
                                                            <span
                                                                className={cn(
                                                                    'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase',
                                                                    phaseBadgeClass(
                                                                        selectedEventPhase,
                                                                    ),
                                                                )}
                                                            >
                                                                {phaseLabel(
                                                                    selectedEventPhase,
                                                                )}
                                                            </span>
                                                        ) : null}
                                                    </>
                                                ) : (
                                                    <span className="text-muted-foreground">
                                                        Select event…
                                                    </span>
                                                )}
                                            </span>
                                            <ChevronsUpDown className="h-4 w-4 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>

                                    <PopoverContent
                                        align="start"
                                        sideOffset={8}
                                        collisionPadding={12}
                                        className="w-[min(var(--radix-popper-anchor-width),calc(100vw-2rem))] p-0"
                                    >
                                        <Command>
                                            <CommandInput placeholder="Search event…" />
                                            <CommandEmpty>
                                                No event found.
                                            </CommandEmpty>

                                            <CommandList className="max-h-[320px] overflow-y-auto">
                                                <CommandGroup>
                                                    {filteredEvents.map(
                                                        (event) => (
                                                            <CommandItem
                                                                key={event.id}
                                                                value={
                                                                    event.title
                                                                }
                                                                onSelect={() => {
                                                                    setSelectedEventId(
                                                                        String(
                                                                            event.id,
                                                                        ),
                                                                    );
                                                                    setEventOpen(
                                                                        false,
                                                                    );
                                                                    setResult(
                                                                        null,
                                                                    );
                                                                    setStatus(
                                                                        'idle',
                                                                    );
                                                                    setManualStopped(
                                                                        false,
                                                                    );
                                                                    lastResultRef.current =
                                                                        {
                                                                            code: '',
                                                                            at: 0,
                                                                        };
                                                                }}
                                                                className="flex items-center gap-2"
                                                            >
                                                                {/* ✅ this is important: allows truncate to actually shrink */}
                                                                <span className="min-w-0 flex-1 truncate">
                                                                    {
                                                                        event.title
                                                                    }
                                                                </span>

                                                                {event.phase ? (
                                                                    <span
                                                                        className={cn(
                                                                            'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase',
                                                                            phaseBadgeClass(
                                                                                event.phase,
                                                                            ),
                                                                        )}
                                                                    >
                                                                        {phaseLabel(
                                                                            event.phase,
                                                                        )}
                                                                    </span>
                                                                ) : null}

                                                                <Check
                                                                    className={cn(
                                                                        'ml-2 h-4 w-4 shrink-0',
                                                                        selectedEventId ===
                                                                            String(
                                                                                event.id,
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

                                {selectedEvent ? (
                                    <div className="flex flex-col gap-1 text-xs text-slate-500">
                                        <div className="flex items-center gap-2">
                                            <CalendarDays className="h-4 w-4" />
                                            <span>
                                                {fmtDate(
                                                    selectedEvent.starts_at,
                                                ) ?? '—'}
                                            </span>
                                        </div>
                                        {isEventBlocked ? (
                                            <div className="text-xs font-medium text-red-600 dark:text-red-400">
                                                Scanning is disabled until the
                                                event starts.
                                            </div>
                                        ) : null}
                                    </div>
                                ) : null}
                            </div>
                        </div>

                        <Separator />

                        <div className="relative flex-1 px-4 py-4">
                            <div
                                ref={scanBoxRef}
                                className={cn(
                                    'relative overflow-hidden rounded-3xl border border-slate-200 bg-slate-50 shadow-sm dark:border-slate-800 dark:bg-slate-900/30',
                                    'aspect-[3/4] w-full',
                                )}
                            >
                                <video
                                    ref={videoRef}
                                    className="h-full w-full object-cover"
                                    style={{
                                        transform: mirrored
                                            ? 'scaleX(-1)'
                                            : undefined,
                                    }}
                                    playsInline
                                    muted
                                />

                                <div className="pointer-events-none absolute inset-0">
                                    {/* ✅ crisp overlay canvas for QR highlight
                                 (mirrored together with the video so the
                                 detected-QR box stays aligned) */}
                                    <canvas
                                        ref={overlayCanvasRef}
                                        className="absolute inset-0 h-full w-full"
                                        style={{
                                            transform: mirrored
                                                ? 'scaleX(-1)'
                                                : undefined,
                                        }}
                                    />

                                    {/* ✅ frame border that changes when QR is detected/aligned */}
                                    <div
                                        className={cn(
                                            'absolute inset-3 rounded-[28px] border-2 transition-all duration-200',
                                            qrAim === 'aligned'
                                                ? 'border-emerald-300/90 shadow-[0_0_0_1px_rgba(16,185,129,0.25),0_0_30px_rgba(16,185,129,0.35)]'
                                                : qrAim === 'detected'
                                                  ? 'border-sky-200/70 shadow-[0_0_26px_rgba(56,189,248,0.25)]'
                                                  : 'border-white/30',
                                        )}
                                    />

                                    <div className="absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_30%,rgba(255,255,255,0.10),transparent_55%)]" />
                                    <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/20 to-transparent" />
                                    <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/25 to-transparent" />

                                    {/* ✅ corner guides (color reacts too) */}
                                    <div
                                        className={cn(
                                            'absolute top-3 left-3 h-10 w-10 rounded-tl-2xl border-t-4 border-l-4 transition-colors',
                                            qrAim === 'aligned'
                                                ? 'border-emerald-200'
                                                : qrAim === 'detected'
                                                  ? 'border-sky-200'
                                                  : 'border-white/80',
                                        )}
                                    />
                                    <div
                                        className={cn(
                                            'absolute top-3 right-3 h-10 w-10 rounded-tr-2xl border-t-4 border-r-4 transition-colors',
                                            qrAim === 'aligned'
                                                ? 'border-emerald-200'
                                                : qrAim === 'detected'
                                                  ? 'border-sky-200'
                                                  : 'border-white/80',
                                        )}
                                    />
                                    <div
                                        className={cn(
                                            'absolute bottom-3 left-3 h-10 w-10 rounded-bl-2xl border-b-4 border-l-4 transition-colors',
                                            qrAim === 'aligned'
                                                ? 'border-emerald-200'
                                                : qrAim === 'detected'
                                                  ? 'border-sky-200'
                                                  : 'border-white/80',
                                        )}
                                    />
                                    <div
                                        className={cn(
                                            'absolute right-3 bottom-3 h-10 w-10 rounded-br-2xl border-r-4 border-b-4 transition-colors',
                                            qrAim === 'aligned'
                                                ? 'border-emerald-200'
                                                : qrAim === 'detected'
                                                  ? 'border-sky-200'
                                                  : 'border-white/80',
                                        )}
                                    />

                                    {/* ✅ hint pill */}
                                    {isScanning ? (
                                        <div className="absolute top-4 left-1/2 -translate-x-1/2">
                                            <div
                                                className={cn(
                                                    'rounded-full px-3 py-1 text-xs font-semibold text-white backdrop-blur',
                                                    qrAim === 'aligned'
                                                        ? 'bg-emerald-600/55'
                                                        : qrAim === 'detected'
                                                          ? 'bg-sky-600/50'
                                                          : 'bg-black/35',
                                                )}
                                            >
                                                {qrAim === 'aligned'
                                                    ? 'QR detected • Hold steady'
                                                    : qrAim === 'detected'
                                                      ? 'QR detected • Center it'
                                                      : 'Searching for QR…'}
                                            </div>
                                        </div>
                                    ) : null}

                                    {isScanning ? (
                                        <div className="absolute inset-x-3 top-10">
                                            <div className="h-px w-full animate-[scanline_1.8s_ease-in-out_infinite] bg-white/80 shadow-[0_0_18px_rgba(255,255,255,0.45)]" />
                                        </div>
                                    ) : null}
                                </div>

                                {!isScanning && status !== 'verifying' ? (
                                    <div className="absolute inset-0 grid place-items-center p-6 text-center">
                                        <div className="rounded-3xl bg-black/35 px-5 py-4 text-white backdrop-blur">
                                            <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-white/15">
                                                <ScanLine className="h-6 w-6" />
                                            </div>
                                            <div className="mt-2 text-sm font-semibold">
                                                Align QR inside the frame
                                            </div>
                                            <div className="mt-1 text-xs text-white/80">
                                                Scanner starts automatically
                                                when event is ready.
                                            </div>
                                        </div>
                                    </div>
                                ) : null}

                                {cameraError ? (
                                    <div className="absolute inset-0 grid place-items-center p-6 text-center">
                                        <div className="rounded-3xl bg-black/45 px-5 py-4 text-white backdrop-blur">
                                            <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-white/15">
                                                <CircleX className="h-6 w-6" />
                                            </div>
                                            <div className="mt-2 text-sm font-semibold">
                                                Camera Error
                                            </div>
                                            <div className="mt-1 text-xs text-white/80">
                                                {cameraError}
                                            </div>
                                        </div>
                                    </div>
                                ) : null}

                                {status === 'verifying' ? (
                                    <div className="absolute inset-x-0 bottom-4 flex justify-center">
                                        <div className="flex items-center gap-2 rounded-full bg-black/55 px-4 py-2 text-xs font-semibold text-white backdrop-blur">
                                            <RefreshCcw className="h-3.5 w-3.5 animate-spin" />
                                            Verifying…
                                        </div>
                                    </div>
                                ) : null}
                            </div>

                            <div className="mt-4 grid gap-2">
                                {devices.length > 1 ? (
                                    <Select
                                        value={deviceId}
                                        onValueChange={setDeviceId}
                                    >
                                        <SelectTrigger className="h-11 rounded-2xl">
                                            <SelectValue placeholder="Select camera" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {devices.map((d) => (
                                                <SelectItem
                                                    key={d.deviceId}
                                                    value={d.deviceId}
                                                >
                                                    {d.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                ) : null}

                                <div className="grid grid-cols-2 gap-2">
                                    {isScanning ? (
                                        <Button
                                            onClick={stopScan}
                                            variant="secondary"
                                            className="h-11 rounded-2xl"
                                        >
                                            Stop
                                        </Button>
                                    ) : (
                                        <Button
                                            onClick={() => {
                                                setCameraError(null);
                                                setManualStopped(false);
                                                void startScan();
                                            }}
                                            className={cn(
                                                'h-11 rounded-2xl',
                                                PRIMARY_BTN,
                                            )}
                                            disabled={isEventBlocked}
                                        >
                                            <Camera className="mr-2 h-4 w-4" />
                                            Retry Camera
                                        </Button>
                                    )}

                                    <Button
                                        onClick={() => setShowManual((v) => !v)}
                                        variant="outline"
                                        className="h-11 rounded-2xl"
                                    >
                                        <Keyboard className="mr-2 h-4 w-4" />
                                        Manual
                                    </Button>
                                </div>

                                {/* ✅ mirror toggle (default ON — feels natural) */}
                                <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-950">
                                    <label
                                        htmlFor="mirror-toggle"
                                        className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400"
                                    >
                                        <FlipHorizontal className="h-4 w-4" />
                                        Mirror camera
                                    </label>
                                    <Switch
                                        id="mirror-toggle"
                                        checked={mirrored}
                                        onCheckedChange={setMirrored}
                                    />
                                </div>

                                {showManual ? (
                                    <div className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950">
                                        <div className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                                            Enter Participant ID
                                        </div>
                                        <div className="mt-2 flex gap-2">
                                            <Input
                                                value={manualCode}
                                                onChange={(e) =>
                                                    setManualCode(
                                                        e.target.value,
                                                    )
                                                }
                                                placeholder="Paste code here..."
                                                className="h-11 rounded-2xl"
                                            />
                                            <Button
                                                onClick={async () => {
                                                    const code =
                                                        manualCode.trim();
                                                    if (!code) return;
                                                    await sounds.unlock();
                                                    verifyCode(code);
                                                }}
                                                className={cn(
                                                    'h-11 rounded-2xl',
                                                    PRIMARY_BTN,
                                                )}
                                                disabled={isEventBlocked}
                                            >
                                                Check In
                                            </Button>
                                        </div>
                                    </div>
                                ) : null}
                            </div>
                        </div>
                    </div>
                    {/* end scanner card (left column) */}

                    {/* RIGHT column: latest result + recent scans */}
                    <div className="flex min-w-0 flex-col gap-4">
                        {resultContent}
                        {recentList}
                    </div>
                </div>
                {/* end two-column grid */}

                <div className="mt-4 rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-950">
                    <div className="text-center text-xs text-slate-500">
                        Tip: Select an event, then scan participant QRs
                        continuously — results appear on the right.
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes scanline {
                    0% { transform: translateY(0px); opacity: .7; }
                    50% { transform: translateY(280px); opacity: 1; }
                    100% { transform: translateY(0px); opacity: .7; }
                }
            `}</style>
        </AppLayout>
    );
}
