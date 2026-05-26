import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
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
import { Textarea } from '@/components/ui/textarea';
import PublicLayout from '@/layouts/public-layout';
import { cn } from '@/lib/utils';
import { Head, useForm, usePage } from '@inertiajs/react';
import {
    ChevronDown,
    CircleCheck,
    CircleX,
    Sparkles,
    Star,
} from 'lucide-react';
import * as React from 'react';
import { toast } from 'sonner';

type ProgrammeRow = {
    id: number;
    title: string;
    description: string;
    starts_at: string | null;
    ends_at: string | null;
    location: string | null;
};

type AttendanceEntry = {
    programme_id: number;
    scanned_at: string | null;
};

type Participant = {
    id: number;
    name: string;
    email: string;
    display_id: string;
};

type PageProps = {
    participant: Participant;
    programmes: ProgrammeRow[];
    attendance_entries: AttendanceEntry[];
    joined_programme_ids: number[];
    selected_programme_id?: number | null;
    errors?: Record<string, string>;
};

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

export default function EventKitSurvey() {
    const {
        participant,
        programmes,
        attendance_entries,
        joined_programme_ids,
        selected_programme_id,
        errors,
    } = usePage<PageProps>().props;
    const [open, setOpen] = React.useState(false);
    const form = useForm({
        programme_id: selected_programme_id ?? '',
        user_experience_rating: 0,
        event_ratings: {} as Record<string, number>,
        recommendations: '',
    });

    const [feedbackRating, setFeedbackRating] = React.useState(0);
    const [includeUserExperience, setIncludeUserExperience] =
        React.useState(true);
    const [includeEventFeedback, setIncludeEventFeedback] =
        React.useState(false);
    const [eventRatings, setEventRatings] = React.useState<
        Record<string, number>
    >({});
    const [recommendations, setRecommendations] = React.useState('');

    const eventCategories = React.useMemo(
        () => ['Venue', 'Food', 'Speaker', 'Program flow', 'Sound system'],
        [],
    );
    const hasEventRatings = React.useMemo(
        () =>
            includeEventFeedback &&
            Object.values(eventRatings).some((value) => value > 0),
        [eventRatings, includeEventFeedback],
    );
    const hasUserExperienceRating = includeUserExperience && feedbackRating > 0;
    const canSubmitFeedback = hasEventRatings || hasUserExperienceRating;

    const attendanceByProgramme = React.useMemo(
        () =>
            new Map(
                attendance_entries.map((entry) => [
                    entry.programme_id,
                    entry.scanned_at,
                ]),
            ),
        [attendance_entries],
    );

    const checkedInProgrammes = React.useMemo(() => {
        return programmes.filter((p) => Boolean(attendanceByProgramme.get(p.id)));
    }, [programmes, attendanceByProgramme]);


    const joinedProgrammeIds = React.useMemo(
        () => new Set(joined_programme_ids),
        [joined_programme_ids],
    );
    const selectedProgrammeId = form.data.programme_id
        ? Number(form.data.programme_id)
        : null;

    const selectedProgramme =
        checkedInProgrammes.find((programme) => programme.id === selectedProgrammeId) ??
        null;

    const submit = (event: React.FormEvent) => {
        event.preventDefault();
        form.transform(() => ({
            programme_id: form.data.programme_id,
            user_experience_rating: includeUserExperience
                ? feedbackRating
                : null,
            event_ratings: includeEventFeedback ? eventRatings : {},
            recommendations: recommendations.trim(),
        }));
        form.post('/event-kit/survey', {
            onSuccess: () => toast.success('Survey submitted.'),
            onError: () =>
                toast.error('Please complete the survey before continuing.'),
        });
    };

    return (
        <>
            <Head title="Event Questionnaire" />
            <PublicLayout navActive="/event">
                <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <Badge variant="outline">Event Kit</Badge>
                            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-balance text-slate-900 sm:text-3xl dark:text-slate-100">
                                Event questionnaire
                            </h1>
                            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                                Please complete the questionnaire before
                                accessing the event kit materials.
                            </p>
                        </div>
                        <Card className="border-slate-200/70 bg-white/70 px-4 py-3 text-xs text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-300">
                            <div className="font-semibold text-slate-900 dark:text-slate-100">
                                {participant.name}
                            </div>
                            <div>{participant.display_id}</div>
                            <div className="text-slate-500 dark:text-slate-400">
                                {participant.email}
                            </div>
                        </Card>
                    </div>

                    <form
                        onSubmit={submit}
                        className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]"
                    >
                        <Card className="min-w-0 border-slate-200/70 bg-white/70 p-6 dark:border-slate-800 dark:bg-slate-950/40">
                            <div className="space-y-5">
                                <div>
                                    <label className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                        Select event attended
                                    </label>
                                    <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                                        Search or pick the event you attended
                                        for attendance verification.
                                    </p>
                                    <Popover open={open} onOpenChange={setOpen}>
                                        <PopoverTrigger asChild>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                className={cn(
                                                    'mt-3 h-11 w-full justify-between rounded-xl border-slate-200 bg-white/80 text-left',
                                                    'dark:border-slate-700 dark:bg-slate-900/60',
                                                    errors?.programme_id &&
                                                    'border-rose-500',
                                                )}
                                            >
                                                <span className="truncate">
                                                    {selectedProgramme
                                                        ? selectedProgramme.title
                                                        : 'Choose an event'}
                                                </span>
                                                <ChevronDown className="h-4 w-4 text-slate-400" />
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent
                                            align="start"
                                            sideOffset={8}
                                            className={cn(
                                                'p-0',
                                                // responsive width: never exceed viewport, and match trigger width on desktop
                                                'w-[min(100vw-2rem,var(--radix-popover-trigger-width))]',
                                                'max-w-[min(100vw-2rem,var(--radix-popover-trigger-width))]',
                                            )}
                                        >
                                            <Command className="w-full">
                                                <CommandInput placeholder="Search events..." />
                                                <CommandList className="max-h-[min(60vh,420px)] overflow-y-auto">
                                                    <CommandEmpty>No checked-in events found.</CommandEmpty>

                                                    <CommandGroup>
                                                        {checkedInProgrammes.map((programme) => {
                                                            const scannedAt =
                                                                attendanceByProgramme.get(programme.id) ?? null;

                                                            const isSelected = programme.id === selectedProgrammeId;

                                                            return (
                                                                <CommandItem
                                                                    key={programme.id}
                                                                    value={programme.title}
                                                                    onSelect={() => {
                                                                        form.setData('programme_id', programme.id);
                                                                        setOpen(false);
                                                                    }}
                                                                    className="px-3 py-3"
                                                                >
                                                                    <div className="flex w-full items-start gap-3">
                                                                        <div className="min-w-0 flex-1">
                                                                            <div className="flex items-start justify-between gap-2">
                                                                                <span
                                                                                    className={cn(
                                                                                        'min-w-0 flex-1 text-sm font-medium text-slate-900 dark:text-slate-100',
                                                                                        // prevents forcing width; wraps nicely
                                                                                        'line-clamp-2 break-words whitespace-normal',
                                                                                    )}
                                                                                    title={
                                                                                        programme.title
                                                                                    }
                                                                                >
                                                                                    {
                                                                                        programme.title
                                                                                    }
                                                                                </span>

                                                                                {isSelected ? (
                                                                                    <CircleCheck className="h-4 w-4 flex-none text-emerald-500" />
                                                                                ) : null}
                                                                            </div>

                                                                            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                                                                                <span>
                                                                                    {formatEventWindow(
                                                                                        programme.starts_at,
                                                                                        programme.ends_at,
                                                                                    )}
                                                                                </span>
                                                                                {programme.location ? (
                                                                                    <span>
                                                                                        •{' '}
                                                                                        {
                                                                                            programme.location
                                                                                        }
                                                                                    </span>
                                                                                ) : null}
                                                                            </div>

                                                                            <div className="mt-1 flex items-center gap-2 text-[11px]">
                                                                                {scannedAt ? (
                                                                                    <span className="inline-flex items-center gap-1 text-emerald-600">
                                                                                        <CircleCheck className="h-3 w-3" />
                                                                                        Checked-in
                                                                                    </span>
                                                                                ) : joinedProgrammeIds.has(
                                                                                    programme.id,
                                                                                ) ? (
                                                                                    <span className="inline-flex items-center gap-1 text-sky-600">
                                                                                        <CircleCheck className="h-3 w-3" />
                                                                                        Joined
                                                                                    </span>
                                                                                ) : (
                                                                                    <span className="inline-flex items-center gap-1 text-rose-500">
                                                                                        <CircleX className="h-3 w-3" />
                                                                                        No
                                                                                        attendance
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </CommandItem>
                                                            );
                                                        },
                                                        )}
                                                    </CommandGroup>
                                                </CommandList>
                                            </Command>
                                        </PopoverContent>
                                    </Popover>
                                    {errors?.programme_id ? (
                                        <p className="mt-2 text-xs text-rose-500">
                                            {errors.programme_id}
                                        </p>
                                    ) : null}
                                </div>

                                <div className="space-y-2">
                                    <p className="text-xs font-semibold text-slate-700">
                                        Include feedback for
                                    </p>
                                    <div className="space-y-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 shadow-sm">
                                        <label className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                className="h-4 w-4 rounded border-slate-300 text-[#1e3c73]"
                                                checked={includeUserExperience}
                                                onChange={(event) =>
                                                    setIncludeUserExperience(
                                                        event.target.checked,
                                                    )
                                                }
                                            />
                                            User experience
                                        </label>
                                        <label className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                className="h-4 w-4 rounded border-slate-300 text-[#1e3c73]"
                                                checked={includeEventFeedback}
                                                onChange={(event) =>
                                                    setIncludeEventFeedback(
                                                        event.target.checked,
                                                    )
                                                }
                                            />
                                            Event
                                        </label>
                                    </div>
                                </div>

                                {includeEventFeedback && (
                                    <div>
                                        <p className="text-xs font-semibold text-slate-700">
                                            Event highlights
                                        </p>
                                        <div className="mt-2 space-y-2">
                                            {eventCategories.map((category) => {
                                                const rating =
                                                    eventRatings[category] ?? 0;
                                                return (
                                                    <div
                                                        key={category}
                                                        className="rounded-2xl border border-slate-200/80 bg-white px-3 py-2"
                                                    >
                                                        <p className="text-xs font-semibold tracking-[0.22em] text-slate-500 uppercase">
                                                            {category}
                                                        </p>
                                                        <div className="mt-2 flex items-center gap-1.5">
                                                            {[
                                                                1, 2, 3, 4, 5,
                                                            ].map((star) => {
                                                                const isActive =
                                                                    star <=
                                                                    rating;
                                                                return (
                                                                    <button
                                                                        key={
                                                                            star
                                                                        }
                                                                        type="button"
                                                                        onClick={() =>
                                                                            setEventRatings(
                                                                                (
                                                                                    current,
                                                                                ) => ({
                                                                                    ...current,
                                                                                    [category]:
                                                                                        star,
                                                                                }),
                                                                            )
                                                                        }
                                                                        className={cn(
                                                                            'inline-flex h-8 w-8 items-center justify-center rounded-full border transition',
                                                                            isActive
                                                                                ? 'border-amber-300/60 bg-amber-100/60 text-amber-500'
                                                                                : 'border-slate-200 text-slate-400 hover:border-[#1e3c73]/40 hover:text-[#1e3c73]',
                                                                        )}
                                                                        aria-label={`Rate ${category} ${star} star${star === 1 ? '' : 's'}`}
                                                                    >
                                                                        <Star
                                                                            className={cn(
                                                                                'h-4 w-4',
                                                                                isActive
                                                                                    ? 'fill-amber-400 text-amber-400'
                                                                                    : '',
                                                                            )}
                                                                        />
                                                                    </button>
                                                                );
                                                            })}
                                                            <span className="text-[10px] font-medium text-slate-500">
                                                                {rating
                                                                    ? `${rating}/5`
                                                                    : 'Tap a star'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {includeUserExperience && (
                                    <div>
                                        <p className="text-xs font-semibold text-slate-700">
                                            Ease of navigation
                                        </p>
                                        <div className="mt-2 flex items-center gap-2">
                                            {[1, 2, 3, 4, 5].map((star) => {
                                                const isActive =
                                                    star <= feedbackRating;
                                                return (
                                                    <button
                                                        key={star}
                                                        type="button"
                                                        onClick={() =>
                                                            setFeedbackRating(
                                                                star,
                                                            )
                                                        }
                                                        className={cn(
                                                            'inline-flex h-8 w-8 items-center justify-center rounded-full border transition',
                                                            isActive
                                                                ? 'border-amber-300/60 bg-amber-100/60 text-amber-500'
                                                                : 'border-slate-200 text-slate-400 hover:border-[#1e3c73]/40 hover:text-[#1e3c73]',
                                                        )}
                                                        aria-label={`Rate ${star} star${star === 1 ? '' : 's'}`}
                                                    >
                                                        <Star
                                                            className={cn(
                                                                'h-4 w-4',
                                                                isActive
                                                                    ? 'fill-amber-400 text-amber-400'
                                                                    : '',
                                                            )}
                                                        />
                                                    </button>
                                                );
                                            })}
                                            <span className="text-[10px] font-medium text-slate-500">
                                                {feedbackRating
                                                    ? `${feedbackRating}/5`
                                                    : 'Tap a star'}
                                            </span>
                                        </div>
                                    </div>
                                )}

                                <label className="block text-xs font-semibold text-slate-700">
                                    Recommendations
                                    <Textarea
                                        rows={3}
                                        placeholder="Tell us what would make the experience even better..."
                                        value={recommendations}
                                        onChange={(event) =>
                                            setRecommendations(
                                                event.target.value,
                                            )
                                        }
                                        className="mt-2 min-h-[96px]"
                                    />
                                </label>
                                {errors?.survey ? (
                                    <p className="text-xs text-rose-500">
                                        {errors.survey}
                                    </p>
                                ) : null}
                            </div>
                        </Card>

                        <div className="space-y-4">
                            <Card className="border-slate-200/70 bg-white/70 p-5 dark:border-slate-800 dark:bg-slate-950/40">
                                <div className="flex items-start gap-3">
                                    <div className="mt-1 rounded-xl bg-[#0033A0]/10 p-2 text-[#0033A0]">
                                        <Sparkles className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                            Why we ask
                                        </h2>
                                        <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">
                                            Your responses help us confirm
                                            attendance and improve future
                                            programmes. Once submitted, you can
                                            access the event kit and
                                            certificates.
                                        </p>
                                    </div>
                                </div>
                            </Card>

                            <Button
                                type="submit"
                                className="h-11 w-full bg-[#0033A0] text-white hover:bg-[#0033A0]/90"
                                disabled={!canSubmitFeedback || form.processing}
                            >
                                Submit questionnaire
                            </Button>
                        </div>
                    </form>
                </section>
            </PublicLayout>
        </>
    );
}
