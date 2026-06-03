import InputError from '@/components/input-error';
import TextLink from '@/components/text-link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import RegisterLayout from '@/layouts/register-layout';
import { splitCountriesByAsean } from '@/lib/countries';
import { cn } from '@/lib/utils';
import { login } from '@/routes';
import { store } from '@/routes/register';
import { Form, Head, Link, router, useRemember } from '@inertiajs/react';
import QRCode from 'qrcode';
import * as React from 'react';
import type { Crop, PixelCrop } from 'react-image-crop';
import ReactCrop, { centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { toast } from 'sonner';

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
import {
    CalendarRange,
    Check,
    CheckCircle2,
    ChevronsUpDown,
    Download,
    Eye,
    EyeOff,
    ImagePlus,
    Loader2,
    QrCode,
    Sparkles,
} from 'lucide-react';

type CountryOption = {
    id: number;
    code: string;
    name: string;
    flag_url: string | null;
};

type RegistrantTypeOption = {
    id: number;
    name: string;
    slug: string;
};

type ProgrammeOption = {
    id: number;
    title: string;
    description: string | null;
    starts_at?: string | null;
    ends_at?: string | null;
    is_registration_active?: boolean;
    registration_fields?: RegistrationFieldOption[];
};

type RegistrationFieldOption = {
    id: number;
    field_key: string;
    label: string;
    field_type:
        | 'section'
        | 'text'
        | 'textarea'
        | 'email'
        | 'tel'
        | 'date'
        | 'radio'
        | 'checkbox'
        | 'select';
    options: string[];
    placeholder?: string | null;
    help_text?: string | null;
    is_required: boolean;
    sort_order: number;
};

type RegisterProps = {
    countries: CountryOption[];
    registrantTypes: RegistrantTypeOption[];
    programmes: ProgrammeOption[];
    activeProgramme: ProgrammeOption | null;
    registeredParticipant?: RegisteredParticipant | null;
    asemme10Submission?: Asemme10Submission | null;
    status?: string | null;
};

type RegisteredParticipant = {
    name: string;
    email: string;
    display_id: string;
    qr_payload: string;
    event_title?: string | null;
    country_code?: string | null;
    country_name?: string | null;
    country_flag_url?: string | null;
};

type Asemme10Submission = {
    id: number;
    event_title?: string | null;
    focal_email?: string | null;
    participants: {
        name: string;
        email?: string | null;
        display_id: string;
        qr_payload: string;
        role?: string | null;
        country_code?: string | null;
        country_name?: string | null;
        country_flag_url?: string | null;
        virtual_id_email_sent?: boolean;
    }[];
};

type VirtualIdParticipant = {
    name: string;
    email?: string | null;
    display_id: string;
    qr_payload: string;
    event_title?: string | null;
    country_code?: string | null;
    country_name?: string | null;
    country_flag_url?: string | null;
};

const FOOD_RESTRICTION_OPTIONS = [
    { value: 'vegetarian', label: 'Vegetarian' },
    { value: 'halal', label: 'Halal' },
    { value: 'allergies', label: 'Allergies (please specify)' },
    { value: 'other', label: 'Other (please specify)' },
] as const;

const ACCESSIBILITY_NEEDS_OPTIONS = [
    { value: 'wheelchair_access', label: 'Wheelchair access' },
    { value: 'sign_language_interpreter', label: 'Sign language interpreter' },
    {
        value: 'assistive_technology_support',
        label: 'Assistive technology support',
    },
    { value: 'other', label: 'Other accommodations' },
] as const;

const HONORIFIC_OPTIONS = [
    { value: 'Mr.', label: 'Mr.' },
    { value: 'Mrs.', label: 'Mrs.' },
    { value: 'Ms.', label: 'Ms.' },
    { value: 'Miss', label: 'Miss' },
    { value: 'Dr.', label: 'Dr.' },
    { value: 'Prof.', label: 'Prof.' },
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

const COUNTRY_PHONE_CODE_MAP: Record<string, string> = {
    BRN: '+673',
    KHM: '+855',
    CHN: '+86',
    CZE: '+420',
    FIN: '+358',
    FRA: '+33',
    DEU: '+49',
    HUN: '+36',
    IDN: '+62',
    IRL: '+353',
    ITA: '+39',
    LAO: '+856',
    MYS: '+60',
    MMR: '+95',
    NLD: '+31',
    PHL: '+63',
    POL: '+48',
    SGP: '+65',
    SVN: '+386',
    ESP: '+34',
    THA: '+66',
    GBR: '+44',
    VNM: '+84',
    TLS: '+670',
};

const ASEMME_BRANCH_PREFIXES = [
    'country_delegation',
    'stakeholder_delegation',
    'asean_secretariat',
    'european_union',
    'single_participant',
] as const;

const ASEMME_CONSENT_FIELD_KEYS = new Set([
    'data_collection_confirmation',
    'data_storage_consent',
    'photo_video_consent',
]);

function registrationTypeToPrefix(value: string) {
    const normalized = value.trim().toLowerCase();

    if (normalized === 'country delegation') return 'country_delegation';
    if (normalized === 'stakeholder delegation')
        return 'stakeholder_delegation';
    if (normalized === 'asean secretariat') return 'asean_secretariat';
    if (normalized === 'european union') return 'european_union';
    if (normalized === 'other' || normalized === 'single participant') {
        return 'single_participant';
    }

    return '';
}

function isAsemme10Programme(programme: ProgrammeOption | null) {
    const value = `${programme?.title ?? ''}`.trim().toLowerCase();

    return (
        value.includes('asemme10') ||
        value.includes('asemme 10') ||
        value.includes('asia-europe meeting of ministers for education') ||
        value.includes('10th asia-europe meeting')
    );
}

function fieldBranchPrefix(fieldKey: string) {
    return (
        ASEMME_BRANCH_PREFIXES.find(
            (prefix) =>
                fieldKey === prefix || fieldKey.startsWith(`${prefix}_`),
        ) ?? ''
    );
}

function programmeHasRegistrationType(programme: ProgrammeOption) {
    return (programme.registration_fields ?? []).some(
        (field) => field.field_key === 'registration_type',
    );
}

function isRegistrationFieldVisible(
    programme: ProgrammeOption,
    field: RegistrationFieldOption,
    responses: Record<string, Record<string, string | string[]>>,
) {
    if (!programmeHasRegistrationType(programme)) {
        return true;
    }

    const prefix = fieldBranchPrefix(field.field_key);
    if (!prefix) {
        return true;
    }

    const registrationTypeField = (programme.registration_fields ?? []).find(
        (candidate) => candidate.field_key === 'registration_type',
    );

    const selectedRegistrationType = registrationTypeField
        ? responses[String(programme.id)]?.[String(registrationTypeField.id)]
        : '';

    if (Array.isArray(selectedRegistrationType)) {
        return false;
    }

    return (
        registrationTypeToPrefix(String(selectedRegistrationType ?? '')) ===
        prefix
    );
}

function wrapCanvasText(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    lineHeight: number,
) {
    const words = text.split(' ');
    let line = '';
    let currentY = y;

    for (const word of words) {
        const testLine = line ? `${line} ${word}` : word;
        if (ctx.measureText(testLine).width > maxWidth && line) {
            ctx.fillText(line, x, currentY);
            line = word;
            currentY += lineHeight;
        } else {
            line = testLine;
        }
    }

    if (line) {
        ctx.fillText(line, x, currentY);
    }
}

function drawRoundedRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number,
) {
    const safeRadius = Math.min(radius, width / 2, height / 2);

    ctx.beginPath();
    ctx.moveTo(x + safeRadius, y);
    ctx.lineTo(x + width - safeRadius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
    ctx.lineTo(x + width, y + height - safeRadius);
    ctx.quadraticCurveTo(
        x + width,
        y + height,
        x + width - safeRadius,
        y + height,
    );
    ctx.lineTo(x + safeRadius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - safeRadius);
    ctx.lineTo(x, y + safeRadius);
    ctx.quadraticCurveTo(x, y, x + safeRadius, y);
    ctx.closePath();
}

function loadCanvasImage(
    src?: string | null,
): Promise<HTMLImageElement | null> {
    if (!src) {
        return Promise.resolve(null);
    }

    return new Promise((resolve) => {
        const image = new Image();
        image.crossOrigin = 'anonymous';
        image.onload = () => resolve(image);
        image.onerror = () => resolve(null);
        image.src = src;
    });
}

function drawContainedCanvasImage(
    ctx: CanvasRenderingContext2D,
    image: HTMLImageElement,
    x: number,
    y: number,
    width: number,
    height: number,
) {
    const imageWidth = image.naturalWidth || image.width;
    const imageHeight = image.naturalHeight || image.height;

    if (!imageWidth || !imageHeight) {
        return;
    }

    const scale = Math.min(width / imageWidth, height / imageHeight);
    const drawWidth = imageWidth * scale;
    const drawHeight = imageHeight * scale;

    ctx.drawImage(
        image,
        x + (width - drawWidth) / 2,
        y + (height - drawHeight) / 2,
        drawWidth,
        drawHeight,
    );
}

function fallbackCountryFlagUrl(
    participant?: VirtualIdParticipant | null,
): string | null {
    if (!participant) {
        return null;
    }

    if (participant.country_flag_url) {
        return participant.country_flag_url;
    }

    const code = participant.country_code?.toLowerCase();

    return code ? `/asean/${code}.jpg` : null;
}

function getCenteredCircleCrop(width: number, height: number): Crop {
    return centerCrop(
        makeAspectCrop(
            {
                unit: '%',
                width: 80,
            },
            1,
            width,
            height,
        ),
        width,
        height,
    );
}

function dataUrlToFile(dataUrl: string, filename: string): File {
    const [header, payload] = dataUrl.split(',');
    const mime = header.match(/data:(.*?);base64/)?.[1] || 'image/jpeg';
    const binary = atob(payload);
    const bytes = new Uint8Array(binary.length);

    for (let index = 0; index < binary.length; index += 1) {
        bytes[index] = binary.charCodeAt(index);
    }

    return new File([bytes], filename, { type: mime });
}

function getCroppedImageDataUrl(
    image: HTMLImageElement,
    crop: PixelCrop,
    mimeType: 'image/png' | 'image/jpeg',
) {
    const canvas = document.createElement('canvas');
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    const outputSize = 512;

    canvas.width = outputSize;
    canvas.height = outputSize;

    const context = canvas.getContext('2d');

    if (!context) {
        return '';
    }

    context.imageSmoothingQuality = 'high';
    context.drawImage(
        image,
        crop.x * scaleX,
        crop.y * scaleY,
        crop.width * scaleX,
        crop.height * scaleY,
        0,
        0,
        outputSize,
        outputSize,
    );

    return canvas.toDataURL(mimeType, 0.92);
}

export default function Register({
    countries,
    registrantTypes,
    programmes,
    activeProgramme,
    registeredParticipant,
    asemme10Submission,
    status,
}: RegisterProps) {
    const [formKey, setFormKey] = React.useState(0);

    const [currentStep, setCurrentStep] = React.useState(0);
    const submittedRef = React.useRef(false);
    const [asemme10Processing, setAsemme10Processing] = React.useState(false);

    const [dirtyFields, setDirtyFields] = React.useState<
        Record<string, boolean>
    >({});
    const [clientErrors, setClientErrors] = React.useState<
        Record<string, string>
    >({});
    const [editedAfterSubmit, setEditedAfterSubmit] = React.useState<
        Record<string, boolean>
    >({});

    const markDirty = React.useCallback((name?: string) => {
        if (!name) return;
        setDirtyFields((prev) =>
            prev[name] ? prev : { ...prev, [name]: true },
        );
    }, []);

    const clearClientError = React.useCallback((name?: string) => {
        if (!name) return;
        setClientErrors((prev) => {
            if (!prev[name]) return prev;

            const next = { ...prev };
            delete next[name];

            return next;
        });
    }, []);

    const shouldShowError = React.useCallback(
        (name: string) =>
            !editedAfterSubmit[name] &&
            (submittedRef.current || !dirtyFields[name]),
        [dirtyFields, editedAfterSubmit],
    );

    const [honorificOpen, setHonorificOpen] = React.useState(false);
    const [sexOpen, setSexOpen] = React.useState(false);
    const [phoneCodeOpen, setPhoneCodeOpen] = React.useState(false);

    const [countryOpen, setCountryOpen] = React.useState(false);
    const [typeOpen, setTypeOpen] = React.useState(false);
    const [showPassword, setShowPassword] = React.useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);
    const [successOpen, setSuccessOpen] = React.useState(false);
    const [successQrDataUrl, setSuccessQrDataUrl] = React.useState<
        string | null
    >(null);
    const virtualIdParticipant = React.useMemo<VirtualIdParticipant | null>(
        () =>
            registeredParticipant ??
            asemme10Submission?.participants[0] ??
            null,
        [asemme10Submission?.participants, registeredParticipant],
    );
    const virtualIdEventTitle =
        virtualIdParticipant?.event_title ??
        registeredParticipant?.event_title ??
        asemme10Submission?.event_title ??
        activeProgramme?.title ??
        'ASEAN Philippines 2026';
    const virtualIdCountryCode =
        virtualIdParticipant?.country_code?.toUpperCase() ?? 'PHL';
    const virtualIdCountryName =
        virtualIdParticipant?.country_name ?? 'Philippines';
    const virtualIdFlagUrl = fallbackCountryFlagUrl(virtualIdParticipant);
    const [preferredImagePreviewUrl, setPreferredImagePreviewUrl] =
        React.useState<string | null>(null);
    const [preferredImageError, setPreferredImageError] =
        React.useState<string>('');
    const [cropImageSrc, setCropImageSrc] = React.useState('');
    const [cropDialogOpen, setCropDialogOpen] = React.useState(false);
    const [cropMimeType, setCropMimeType] = React.useState<
        'image/png' | 'image/jpeg'
    >('image/jpeg');
    const [crop, setCrop] = React.useState<Crop>({
        unit: '%',
        x: 10,
        y: 10,
        width: 80,
        height: 80,
    });
    const [completedCrop, setCompletedCrop] = React.useState<PixelCrop>();
    const cropImageRef = React.useRef<HTMLImageElement | null>(null);
    const preferredImageInputRef = React.useRef<HTMLInputElement | null>(null);

    const [consentContact, setConsentContact] = React.useState(false);
    const [consentMedia, setConsentMedia] = React.useState(false);
    const [foodRestrictions, setFoodRestrictions] = useRemember<string[]>(
        [],
        'register.food_restrictions',
    );
    const [accessibilityNeeds, setAccessibilityNeeds] = useRemember<string[]>(
        [],
        'register.accessibility_needs',
    );
    const [dietaryAllergies, setDietaryAllergies] = useRemember<string>(
        '',
        'register.dietary_allergies',
    );
    const [dietaryOther, setDietaryOther] = useRemember<string>(
        '',
        'register.dietary_other',
    );
    const [accessibilityOther, setAccessibilityOther] = useRemember<string>(
        '',
        'register.accessibility_other',
    );
    const [ipAffiliation, setIpAffiliation] = useRemember<string>(
        '',
        'register.ip_affiliation',
    );
    const [ipGroupName, setIpGroupName] = useRemember<string>(
        '',
        'register.ip_group_name',
    );
    const [emergencyContactName, setEmergencyContactName] = useRemember<string>(
        '',
        'register.emergency_contact_name',
    );
    const [emergencyContactRelationship, setEmergencyContactRelationship] =
        useRemember<string>('', 'register.emergency_contact_relationship');
    const [emergencyContactPhone, setEmergencyContactPhone] =
        useRemember<string>('', 'register.emergency_contact_phone');
    const [emergencyContactEmail, setEmergencyContactEmail] =
        useRemember<string>('', 'register.emergency_contact_email');
    const [attendWelcomeDinner, setAttendWelcomeDinner] = useRemember<string>(
        '',
        'register.attend_welcome_dinner',
    );
    const [
        availTransportFromMakatiToPeninsula,
        setAvailTransportFromMakatiToPeninsula,
    ] = useRemember<string>(
        '',
        'register.avail_transport_from_makati_to_peninsula',
    );

    const canContinue = true;

    const [country, setCountry] = useRemember<string>('', 'register.country');
    const [countryOther, setCountryOther] = useRemember<string>(
        '',
        'register.country_other',
    );
    const [honorificTitle, setHonorificTitle] = useRemember<string>(
        '',
        'register.honorific_title',
    );
    const [sexAssignedAtBirth, setSexAssignedAtBirth] = useRemember<string>(
        '',
        'register.sex_assigned_at_birth',
    );
    const [contactCountryCode, setContactCountryCode] = useRemember<string>(
        '',
        'register.contact_country_code',
    );
    const [registrantType, setRegistrantType] = useRemember<string>(
        '',
        'register.registrant_type',
    );
    const [programmeIds, setProgrammeIds] = useRemember<string[]>(
        activeProgramme ? [String(activeProgramme.id)] : [],
        'register.programme_ids',
    );
    const [registrationResponses, setRegistrationResponses] = useRemember<
        Record<string, Record<string, string | string[]>>
    >({}, 'register.registration_responses');
    const [dynamicOtherResponses, setDynamicOtherResponses] = useRemember<
        Record<string, string>
    >({}, 'register.registration_response_others');
    const [dynamicSelectOpen, setDynamicSelectOpen] = React.useState<
        Record<string, boolean>
    >({});
    const [otherRegistrantType, setOtherRegistrantType] = useRemember<string>(
        '',
        'register.other_user_type',
    );

    const [honorificOther, setHonorificOther] = useRemember<string>(
        '',
        'register.honorific_other',
    );

    React.useEffect(() => {
        return () => {
            if (preferredImagePreviewUrl?.startsWith('blob:')) {
                URL.revokeObjectURL(preferredImagePreviewUrl);
            }
        };
    }, [preferredImagePreviewUrl]);

    const handlePreferredImageChange = (
        event: React.ChangeEvent<HTMLInputElement>,
    ) => {
        const file = event.target.files?.[0] ?? null;
        event.target.value = '';

        if (!file) {
            return;
        }

        if (!['image/png', 'image/jpeg'].includes(file.type)) {
            setPreferredImageError('Upload a PNG, JPG, or JPEG image.');
            return;
        }

        setPreferredImageError('');
        setCropMimeType(file.type === 'image/png' ? 'image/png' : 'image/jpeg');
        setCrop({
            unit: '%',
            x: 10,
            y: 10,
            width: 80,
            height: 80,
        });
        setCompletedCrop(undefined);

        const reader = new FileReader();
        reader.onload = () => {
            setCropImageSrc(String(reader.result));
            setCropDialogOpen(true);
        };
        reader.onerror = () => {
            setPreferredImageError('Could not read the selected image.');
        };
        reader.readAsDataURL(file);
    };

    const handleUseCroppedPreferredImage = () => {
        const image = cropImageRef.current;

        if (!image) {
            return;
        }

        const fallbackSize = Math.round(
            Math.min(image.width, image.height) * 0.8,
        );
        const fallbackCrop: PixelCrop = {
            unit: 'px',
            x: Math.round((image.width - fallbackSize) / 2),
            y: Math.round((image.height - fallbackSize) / 2),
            width: fallbackSize,
            height: fallbackSize,
        };
        const croppedDataUrl = getCroppedImageDataUrl(
            image,
            completedCrop ?? fallbackCrop,
            cropMimeType,
        );

        if (!croppedDataUrl) {
            setPreferredImageError('Could not crop the selected image.');
            return;
        }

        const extension = cropMimeType === 'image/png' ? 'png' : 'jpg';
        const file = dataUrlToFile(
            croppedDataUrl,
            `profile-photo.${extension}`,
        );
        const transfer = new DataTransfer();
        transfer.items.add(file);

        if (preferredImageInputRef.current) {
            preferredImageInputRef.current.files = transfer.files;
        }

        setPreferredImagePreviewUrl((current) => {
            if (current?.startsWith('blob:')) {
                URL.revokeObjectURL(current);
            }

            return croppedDataUrl;
        });
        setPreferredImageError('');
        setCropDialogOpen(false);
    };

    const handleRemovePreferredImage = () => {
        setPreferredImagePreviewUrl((current) => {
            if (current?.startsWith('blob:')) {
                URL.revokeObjectURL(current);
            }

            return null;
        });
        setPreferredImageError('');
        setCropImageSrc('');
        setCompletedCrop(undefined);

        if (preferredImageInputRef.current) {
            preferredImageInputRef.current.value = '';
        }
    };

    const selectedCountry = React.useMemo(
        () => countries.find((c) => String(c.id) === country) ?? null,
        [countries, country],
    );
    const groupedCountries = React.useMemo(
        () => splitCountriesByAsean(countries),
        [countries],
    );

    React.useEffect(() => {
        if (!selectedCountry?.code) return;

        const nextCode =
            COUNTRY_PHONE_CODE_MAP[selectedCountry.code.toUpperCase()] ?? '';

        // ✅ only auto-fill if user hasn't chosen yet
        if (!contactCountryCode && nextCode) {
            setContactCountryCode(nextCode);
        }
    }, [selectedCountry?.code]); // ✅ remove contactCountryCode deps to avoid loops

    const filteredRegistrantTypes = React.useMemo(() => {
        return registrantTypes.filter((type) => {
            const name = type.name.trim().toLowerCase();
            const slug = (type.slug ?? '').trim().toLowerCase();

            return !name.startsWith('ched') && !slug.startsWith('ched');
        });
    }, [registrantTypes]);

    const selectedType = React.useMemo(
        () =>
            filteredRegistrantTypes.find(
                (t) => String(t.id) === registrantType,
            ) ?? null,
        [registrantType, filteredRegistrantTypes],
    );
    const isOtherRegistrantType =
        (selectedType?.slug ?? '').toLowerCase() === 'other' ||
        (selectedType?.name ?? '').toLowerCase() === 'other';

    // ✅ auto-focus "please specify" inputs when they appear
    const honorificOtherRef = React.useRef<HTMLInputElement | null>(null);
    const otherUserTypeRef = React.useRef<HTMLInputElement | null>(null);
    const ipGroupNameRef = React.useRef<HTMLInputElement | null>(null);

    React.useEffect(() => {
        if (honorificTitle === 'other') {
            requestAnimationFrame(() => honorificOtherRef.current?.focus());
        }
    }, [honorificTitle]);

    React.useEffect(() => {
        if (isOtherRegistrantType) {
            requestAnimationFrame(() => otherUserTypeRef.current?.focus());
        }
    }, [isOtherRegistrantType]);

    React.useEffect(() => {
        if (ipAffiliation === 'yes') {
            requestAnimationFrame(() => ipGroupNameRef.current?.focus());
        }
    }, [ipAffiliation]);

    React.useEffect(() => {
        if (country) clearClientError('country_id');
    }, [clearClientError, country]);

    React.useEffect(() => {
        if (honorificTitle) clearClientError('honorific_title');
    }, [clearClientError, honorificTitle]);

    React.useEffect(() => {
        if (honorificOther.trim()) clearClientError('honorific_other');
    }, [clearClientError, honorificOther]);

    React.useEffect(() => {
        if (sexAssignedAtBirth) clearClientError('sex_assigned_at_birth');
    }, [clearClientError, sexAssignedAtBirth]);

    React.useEffect(() => {
        if (contactCountryCode) clearClientError('contact_country_code');
    }, [clearClientError, contactCountryCode]);

    React.useEffect(() => {
        if (registrantType) clearClientError('user_type_id');
    }, [clearClientError, registrantType]);

    React.useEffect(() => {
        if (otherRegistrantType.trim()) clearClientError('other_user_type');
    }, [clearClientError, otherRegistrantType]);

    React.useEffect(() => {
        if (programmeIds.length) clearClientError('programme_ids');
    }, [clearClientError, programmeIds.length]);

    React.useEffect(() => {
        if (!activeProgramme) {
            setProgrammeIds([]);
            return;
        }

        setProgrammeIds([String(activeProgramme.id)]);
    }, [activeProgramme?.id, setProgrammeIds]);

    const selectedProgrammes = React.useMemo(
        () => (activeProgramme ? [activeProgramme] : []),
        [activeProgramme],
    );
    const isAsemme10Registration = React.useMemo(
        () => isAsemme10Programme(activeProgramme),
        [activeProgramme],
    );
    const eventDetailsStepIndex = isAsemme10Registration ? 0 : 3;

    const formattedProgrammeLabel = React.useMemo(() => {
        if (!activeProgramme) {
            return 'No active registration event';
        }

        return activeProgramme.title;
    }, [activeProgramme]);

    const selectedProgrammesWithFields = React.useMemo(
        () =>
            selectedProgrammes.filter(
                (programme) => (programme.registration_fields ?? []).length > 0,
            ),
        [selectedProgrammes],
    );

    const getDynamicValue = React.useCallback(
        (programmeId: number, fieldId: number) =>
            registrationResponses[String(programmeId)]?.[String(fieldId)] ?? '',
        [registrationResponses],
    );

    const setDynamicValue = React.useCallback(
        (programmeId: number, fieldId: number, value: string | string[]) => {
            clearClientError(
                `registration_responses.${programmeId}.${fieldId}`,
            );
            setRegistrationResponses((prev) => ({
                ...prev,
                [String(programmeId)]: {
                    ...(prev[String(programmeId)] ?? {}),
                    [String(fieldId)]: value,
                },
            }));
        },
        [clearClientError, setRegistrationResponses],
    );

    const dynamicOtherKey = React.useCallback(
        (programmeId: number, fieldId: number) => `${programmeId}-${fieldId}`,
        [],
    );

    const dynamicOtherErrorKey = React.useCallback(
        (programmeId: number, fieldId: number) =>
            `registration_responses.${programmeId}.${fieldId}.other`,
        [],
    );

    const getDynamicOtherValue = React.useCallback(
        (programmeId: number, fieldId: number) =>
            dynamicOtherResponses[dynamicOtherKey(programmeId, fieldId)] ?? '',
        [dynamicOtherKey, dynamicOtherResponses],
    );

    const setDynamicOtherValue = React.useCallback(
        (programmeId: number, fieldId: number, value: string) => {
            clearClientError(dynamicOtherErrorKey(programmeId, fieldId));
            setDynamicOtherResponses((prev) => ({
                ...prev,
                [dynamicOtherKey(programmeId, fieldId)]: value,
            }));
        },
        [
            clearClientError,
            dynamicOtherErrorKey,
            dynamicOtherKey,
            setDynamicOtherResponses,
        ],
    );

    const toggleDynamicCheckbox = React.useCallback(
        (
            programmeId: number,
            fieldId: number,
            option: string,
            checked: boolean,
        ) => {
            const current = getDynamicValue(programmeId, fieldId);
            const currentValues = Array.isArray(current) ? current : [];
            const next = checked
                ? Array.from(new Set([...currentValues, option]))
                : currentValues.filter((value) => value !== option);

            setDynamicValue(programmeId, fieldId, next);
        },
        [getDynamicValue, setDynamicValue],
    );

    const dynamicErrorKey = React.useCallback(
        (programmeId: number, fieldId: number) =>
            `registration_responses.${programmeId}.${fieldId}`,
        [],
    );

    const stepErrorKeys = React.useCallback(
        (step: number) => {
            if (isAsemme10Registration) {
                if (step !== eventDetailsStepIndex) {
                    return [];
                }

                return selectedProgrammes.flatMap((programme) =>
                    (programme.registration_fields ?? [])
                        .filter((field) => field.field_type !== 'section')
                        .filter((field) =>
                            isRegistrationFieldVisible(
                                programme,
                                field,
                                registrationResponses,
                            ),
                        )
                        .flatMap((field) => [
                            dynamicErrorKey(programme.id, field.id),
                            dynamicOtherErrorKey(programme.id, field.id),
                        ]),
                );
            }

            if (step === 0) {
                return [
                    'country_id',
                    'honorific_title',
                    'honorific_other',
                    'given_name',
                    'family_name',
                    'sex_assigned_at_birth',
                ];
            }

            if (step === 1) {
                return [
                    'organization_name',
                    'position_title',
                    'email',
                    'contact_country_code',
                    'contact_number',
                    'user_type_id',
                    'other_user_type',
                    'programme_ids',
                    'programme_ids.0',
                ];
            }

            if (step === 2) {
                return ['password', 'password_confirmation'];
            }

            return selectedProgrammes.flatMap((programme) =>
                (programme.registration_fields ?? [])
                    .filter((field) => field.field_type !== 'section')
                    .filter((field) =>
                        isRegistrationFieldVisible(
                            programme,
                            field,
                            registrationResponses,
                        ),
                    )
                    .map((field) => dynamicErrorKey(programme.id, field.id)),
            );
        },
        [
            dynamicErrorKey,
            dynamicOtherErrorKey,
            eventDetailsStepIndex,
            isAsemme10Registration,
            registrationResponses,
            selectedProgrammes,
        ],
    );

    const validateStep = React.useCallback(
        (step: number) => {
            const form = document.getElementById(
                'register-form',
            ) as HTMLFormElement | null;
            const formData = form ? new FormData(form) : new FormData();
            const nextErrors: Record<string, string> = {};
            const valueOf = (name: string) =>
                String(formData.get(name) ?? '').trim();
            const formValueOf = (name: string) => {
                const values = formData
                    .getAll(name)
                    .map((value) => String(value ?? '').trim());

                return values.findLast((value) => value !== '') ?? '';
            };
            const requireValue = (name: string, label: string) => {
                if (!valueOf(name)) {
                    nextErrors[name] = `${label} is required.`;
                }
            };
            const optionIsOther = (option: string) =>
                option.trim().toLowerCase() === 'other';
            const selectedOther = (
                field: RegistrationFieldOption,
                value: string | string[],
            ) =>
                (field.options ?? []).some(optionIsOther) &&
                (Array.isArray(value)
                    ? value.some((item) => optionIsOther(String(item)))
                    : optionIsOther(String(value)));

            if (isAsemme10Registration && step === eventDetailsStepIndex) {
                selectedProgrammes.forEach((programme) => {
                    const fieldByKey = new Map(
                        (programme.registration_fields ?? []).map((field) => [
                            field.field_key,
                            field,
                        ]),
                    );
                    const dynamicStringFor = (key: string) => {
                        const field = fieldByKey.get(key);
                        const formValue = field
                            ? formValueOf(
                                  `registration_responses[${programme.id}][${field.id}]`,
                              )
                            : '';

                        if (formValue) {
                            return formValue;
                        }

                        const value = field
                            ? getDynamicValue(programme.id, field.id)
                            : '';

                        return Array.isArray(value)
                            ? ''
                            : String(value ?? '').trim();
                    };
                    const requireDynamicField = (
                        key: string,
                        label: string,
                    ) => {
                        const field = fieldByKey.get(key);

                        if (!field || dynamicStringFor(key)) {
                            return;
                        }

                        nextErrors[dynamicErrorKey(programme.id, field.id)] =
                            `${label} is required.`;
                    };

                    (programme.registration_fields ?? []).forEach((field) => {
                        if (
                            field.field_type === 'section' ||
                            !isRegistrationFieldVisible(
                                programme,
                                field,
                                registrationResponses,
                            )
                        ) {
                            return;
                        }

                        const key = dynamicErrorKey(programme.id, field.id);
                        const value = getDynamicValue(programme.id, field.id);
                        const isBlank = Array.isArray(value)
                            ? value.every((item) => !String(item).trim())
                            : !String(value).trim();

                        if (field.is_required && isBlank) {
                            nextErrors[key] = `${field.label} is required.`;
                            return;
                        }

                        if (
                            field.field_type === 'email' &&
                            !isBlank &&
                            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value))
                        ) {
                            nextErrors[key] =
                                `${field.label} must be a valid email address.`;
                        }

                        if (
                            selectedOther(field, value) &&
                            !getDynamicOtherValue(programme.id, field.id).trim()
                        ) {
                            nextErrors[
                                dynamicOtherErrorKey(programme.id, field.id)
                            ] = `Please specify ${field.label.toLowerCase()}.`;
                        }
                    });

                    const registrationType =
                        dynamicStringFor('registration_type');
                    const prefix = registrationTypeToPrefix(registrationType);

                    if (prefix === 'single_participant') {
                        requireDynamicField(
                            'single_participant_given_name',
                            'Given name',
                        );
                        requireDynamicField(
                            'single_participant_family_name',
                            'Family name',
                        );
                        requireDynamicField(
                            'single_participant_email',
                            'Email',
                        );
                    } else if (prefix) {
                        requireDynamicField(
                            `${prefix}_head_given_name`,
                            'Head given name',
                        );
                        requireDynamicField(
                            `${prefix}_head_family_name`,
                            'Head family name',
                        );
                        requireDynamicField(
                            prefix === 'country_delegation'
                                ? `${prefix}_head_email`
                                : `${prefix}_email`,
                            'Head email',
                        );

                        for (let index = 1; index <= 3; index += 1) {
                            const delegatePrefix = `${prefix}_delegate_${index}`;
                            const givenName = dynamicStringFor(
                                `${delegatePrefix}_given_name`,
                            );
                            const familyName = dynamicStringFor(
                                `${delegatePrefix}_family_name`,
                            );
                            const email = dynamicStringFor(
                                `${delegatePrefix}_email`,
                            );

                            if (!givenName && !familyName && !email) {
                                continue;
                            }

                            requireDynamicField(
                                `${delegatePrefix}_given_name`,
                                `Delegate ${index} given name`,
                            );
                            requireDynamicField(
                                `${delegatePrefix}_family_name`,
                                `Delegate ${index} family name`,
                            );
                        }
                    }
                });

                return nextErrors;
            }

            if (step === 0) {
                requireValue('country_id', 'Country of Origin');
                requireValue('honorific_title', 'Honorific / Title');

                if (honorificTitle === 'other') {
                    requireValue('honorific_other', 'Other honorific');
                }

                requireValue('given_name', 'Given Name / First Name');
                requireValue('family_name', 'Family Name / Surname');
                requireValue('sex_assigned_at_birth', 'Sex assigned at birth');
            }

            if (step === 1) {
                requireValue('organization_name', 'Organization');
                requireValue('position_title', 'Designation / Position');
                requireValue('email', 'Email address');
                requireValue('contact_country_code', 'Country code');
                requireValue('contact_number', 'Contact number');
                requireValue('user_type_id', 'Registrant type');

                const emailValue = valueOf('email');
                if (
                    emailValue &&
                    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue)
                ) {
                    nextErrors.email = 'Email address must be valid.';
                }

                if (isOtherRegistrantType) {
                    requireValue('other_user_type', 'Other registrant type');
                }

                if (!programmeIds.length) {
                    nextErrors.programme_ids =
                        'No active registration event is available.';
                }
            }

            if (step === 2) {
                const password = valueOf('password');
                const passwordConfirmation = valueOf('password_confirmation');

                if (!password) {
                    nextErrors.password = 'Password is required.';
                } else if (password.length < 8) {
                    nextErrors.password =
                        'Password must be at least 8 characters.';
                }

                if (!passwordConfirmation) {
                    nextErrors.password_confirmation =
                        'Password confirmation is required.';
                } else if (password !== passwordConfirmation) {
                    nextErrors.password_confirmation =
                        'Password confirmation does not match.';
                }
            }

            if (step === 3) {
                selectedProgrammes.forEach((programme) => {
                    (programme.registration_fields ?? []).forEach((field) => {
                        if (
                            field.field_type === 'section' ||
                            !isRegistrationFieldVisible(
                                programme,
                                field,
                                registrationResponses,
                            )
                        ) {
                            return;
                        }

                        const key = dynamicErrorKey(programme.id, field.id);
                        const value = getDynamicValue(programme.id, field.id);
                        const isBlank = Array.isArray(value)
                            ? value.every((item) => !String(item).trim())
                            : !String(value).trim();

                        if (field.is_required && isBlank) {
                            nextErrors[key] = `${field.label} is required.`;
                            return;
                        }

                        if (
                            field.field_type === 'email' &&
                            !isBlank &&
                            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value))
                        ) {
                            nextErrors[key] =
                                `${field.label} must be a valid email address.`;
                        }
                    });
                });
            }

            return nextErrors;
        },
        [
            dynamicErrorKey,
            dynamicOtherErrorKey,
            eventDetailsStepIndex,
            getDynamicValue,
            getDynamicOtherValue,
            honorificTitle,
            isAsemme10Registration,
            isOtherRegistrantType,
            programmeIds.length,
            registrationResponses,
            selectedProgrammes,
        ],
    );

    const applyClientValidation = React.useCallback(
        (stepsToValidate: number[]) => {
            const nextErrors = stepsToValidate.reduce<Record<string, string>>(
                (errors, step) => ({ ...errors, ...validateStep(step) }),
                {},
            );
            const keysToClear = stepsToValidate.flatMap(stepErrorKeys);

            setClientErrors((prev) => {
                const next = { ...prev };

                keysToClear.forEach((key) => {
                    delete next[key];
                });

                return { ...next, ...nextErrors };
            });

            return nextErrors;
        },
        [stepErrorKeys, validateStep],
    );

    const steps = isAsemme10Registration
        ? [
              {
                  title: 'Event details',
                  description: 'ASEMME10 registration details.',
              },
          ]
        : [
              {
                  title: 'Personal details',
                  description: 'Personal Details.',
              },
              {
                  title: 'Contact & role',
                  description: 'Organization, contact, and registrant type.',
              },
              {
                  title: 'Account',
                  description: 'Set your password.',
              },
              {
                  title: 'Event details',
                  description:
                      'Questions configured for your selected event(s).',
              },
          ];

    const fieldErrorKeyForAsemmeServerError = React.useCallback(
        (serverKey: string) => {
            if (!isAsemme10Registration || !activeProgramme) {
                return serverKey;
            }

            const fields = activeProgramme.registration_fields ?? [];
            const fieldByKey = new Map(
                fields.map((field) => [field.field_key, field]),
            );
            const dynamicKeyFor = (fieldKey: string) => {
                const field = fieldByKey.get(fieldKey);

                return field
                    ? dynamicErrorKey(activeProgramme.id, field.id)
                    : null;
            };
            const dynamicOtherKeyFor = (fieldKey: string) => {
                const field = fieldByKey.get(fieldKey);

                return field
                    ? dynamicOtherErrorKey(activeProgramme.id, field.id)
                    : null;
            };
            const stringFor = (fieldKey: string) => {
                const field = fieldByKey.get(fieldKey);
                const value = field
                    ? getDynamicValue(activeProgramme.id, field.id)
                    : '';

                return Array.isArray(value) ? '' : String(value ?? '').trim();
            };
            const prefix = registrationTypeToPrefix(
                stringFor('registration_type'),
            );
            const headEmailKey =
                prefix === 'country_delegation'
                    ? `${prefix}_head_email`
                    : `${prefix}_email`;

            const directMap: Record<string, string> = {
                email:
                    prefix === 'single_participant'
                        ? 'single_participant_email'
                        : headEmailKey,
                registration_type: 'registration_type',
                'consents.data_collection': 'data_collection_confirmation',
                'consents.data_storage': 'data_storage_consent',
                'consents.photo_video': 'photo_video_consent',
                'focal.email':
                    prefix === 'single_participant'
                        ? 'single_participant_email'
                        : headEmailKey,
                'focal.name':
                    prefix === 'single_participant'
                        ? 'single_participant_given_name'
                        : `${prefix}_head_given_name`,
                'focal.organization':
                    prefix === 'single_participant'
                        ? 'single_participant_organisation_name'
                        : prefix === 'country_delegation'
                          ? `${prefix}_head_ministry_name`
                          : `${prefix}_organisation_name`,
                'focal.position':
                    prefix === 'single_participant'
                        ? 'single_participant_position'
                        : `${prefix}_position`,
            };

            if (serverKey === 'delegation.registration_type_other') {
                return dynamicOtherKeyFor('registration_type') ?? serverKey;
            }

            if (serverKey === 'delegation.social_activity_other') {
                return (
                    dynamicOtherKeyFor(
                        prefix === 'single_participant'
                            ? 'single_participant_social_activities'
                            : `${prefix}_social_activities`,
                    ) ?? serverKey
                );
            }

            if (directMap[serverKey]) {
                return dynamicKeyFor(directMap[serverKey]) ?? serverKey;
            }

            const attendeeMatch = serverKey.match(
                /^attendees\.(\d+)\.(title_other|title|given_name|family_name|email)$/,
            );

            if (attendeeMatch && prefix) {
                const attendeeIndex = Number(attendeeMatch[1]);
                const attribute = attendeeMatch[2];
                const fieldSuffix =
                    attribute === 'title_other'
                        ? 'title'
                        : attribute === 'given_name'
                          ? 'given_name'
                          : attribute === 'family_name'
                            ? 'family_name'
                            : attribute;

                if (prefix === 'single_participant') {
                    const fieldKey = `single_participant_${fieldSuffix}`;

                    return attribute === 'title_other'
                        ? (dynamicOtherKeyFor(fieldKey) ?? serverKey)
                        : (dynamicKeyFor(fieldKey) ?? serverKey);
                }

                const fieldKey =
                    attendeeIndex === 0
                        ? fieldSuffix === 'email'
                            ? headEmailKey
                            : `${prefix}_head_${fieldSuffix}`
                        : `${prefix}_delegate_${attendeeIndex}_${fieldSuffix}`;

                return attribute === 'title_other'
                    ? (dynamicOtherKeyFor(fieldKey) ?? serverKey)
                    : (dynamicKeyFor(fieldKey) ?? serverKey);
            }

            if (serverKey === 'attendees') {
                if (prefix === 'single_participant') {
                    return (
                        dynamicKeyFor(
                            !stringFor('single_participant_given_name')
                                ? 'single_participant_given_name'
                                : 'single_participant_family_name',
                        ) ?? serverKey
                    );
                }

                const headGivenKey = `${prefix}_head_given_name`;
                const headFamilyKey = `${prefix}_head_family_name`;

                if (!stringFor(headGivenKey)) {
                    return dynamicKeyFor(headGivenKey) ?? serverKey;
                }

                if (!stringFor(headFamilyKey)) {
                    return dynamicKeyFor(headFamilyKey) ?? serverKey;
                }

                for (let index = 1; index <= 3; index += 1) {
                    const delegatePrefix = `${prefix}_delegate_${index}`;
                    const givenKey = `${delegatePrefix}_given_name`;
                    const familyKey = `${delegatePrefix}_family_name`;
                    const emailKey = `${delegatePrefix}_email`;
                    const hasPartialAttendee =
                        stringFor(givenKey) ||
                        stringFor(familyKey) ||
                        stringFor(emailKey);

                    if (!hasPartialAttendee) {
                        continue;
                    }

                    if (!stringFor(givenKey)) {
                        return dynamicKeyFor(givenKey) ?? serverKey;
                    }

                    if (!stringFor(familyKey)) {
                        return dynamicKeyFor(familyKey) ?? serverKey;
                    }
                }

                return (
                    dynamicKeyFor(
                        prefix
                            ? `${prefix}_head_given_name`
                            : 'registration_type',
                    ) ?? serverKey
                );
            }

            return serverKey;
        },
        [
            activeProgramme,
            dynamicErrorKey,
            dynamicOtherErrorKey,
            getDynamicValue,
            isAsemme10Registration,
        ],
    );

    const firstValidationMessage = React.useCallback(
        (errors: Record<string, string | string[] | undefined>) => {
            for (const value of Object.values(errors)) {
                const message = Array.isArray(value) ? value[0] : value;

                if (message) {
                    return message;
                }
            }

            return 'Please correct the highlighted field.';
        },
        [],
    );

    const scrollToErrorKey = React.useCallback((errorKey: string) => {
        window.setTimeout(() => {
            const escaped = window.CSS?.escape
                ? window.CSS.escape(errorKey)
                : errorKey.replace(/["\\]/g, '\\$&');
            const target = document.querySelector<HTMLElement>(
                [
                    `[data-error-key="${escaped}"]`,
                    `[name="${escaped}"]`,
                    `[name="${escaped}[]"]`,
                    `#${escaped}`,
                ].join(','),
            );

            if (!target) {
                return;
            }

            target.scrollIntoView({ behavior: 'smooth', block: 'center' });

            const focusTarget = target.matches(
                'input:not([type="hidden"]), textarea, button, [tabindex]:not([tabindex="-1"])',
            )
                ? target
                : target.querySelector<HTMLElement>(
                      'input:not([type="hidden"]), textarea, button, [tabindex]:not([tabindex="-1"])',
                  );

            focusTarget?.focus({ preventScroll: true });
        }, 80);
    }, []);

    const showValidationFeedback = React.useCallback(
        (
            errors: Record<string, string | string[] | undefined>,
            mapServerErrors = false,
        ) => {
            const mappedErrors = Object.entries(errors).reduce<
                Record<string, string>
            >((next, [key, value]) => {
                const message = Array.isArray(value) ? value[0] : value;

                if (!message) {
                    return next;
                }

                next[
                    mapServerErrors
                        ? fieldErrorKeyForAsemmeServerError(key)
                        : key
                ] = message;

                return next;
            }, {});
            const firstKey = Object.keys(mappedErrors)[0];

            if (!firstKey) {
                return mappedErrors;
            }

            setClientErrors((prev) => ({ ...prev, ...mappedErrors }));

            const firstInvalidStep = steps.findIndex((_, index) =>
                stepErrorKeys(index).some((key) => mappedErrors[key]),
            );

            if (firstInvalidStep >= 0) {
                setCurrentStep(firstInvalidStep);
            }

            toast.error('Please check the registration form.', {
                description: firstValidationMessage(mappedErrors),
            });
            scrollToErrorKey(firstKey);

            return mappedErrors;
        },
        [
            fieldErrorKeyForAsemmeServerError,
            firstValidationMessage,
            scrollToErrorKey,
            stepErrorKeys,
            steps,
        ],
    );

    const goNext = () => {
        submittedRef.current = true;

        const nextErrors = applyClientValidation([currentStep]);
        if (Object.keys(nextErrors).length > 0) {
            showValidationFeedback(nextErrors);
            return;
        }

        setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1));
    };

    const goPrev = () => {
        setCurrentStep((prev) => Math.max(prev - 1, 0));
    };

    const resetFormState = React.useCallback(() => {
        // Force remount to clear uncontrolled inputs
        setFormKey((k) => k + 1);

        setDirtyFields({});
        setClientErrors({});
        setEditedAfterSubmit({});
        setPreferredImagePreviewUrl(null);
        setPreferredImageError('');
        setCropImageSrc('');
        setCropDialogOpen(false);
        setCompletedCrop(undefined);

        setCountry('');
        setCountryOther('');
        setRegistrantType('');
        setProgrammeIds([]);
        setRegistrationResponses({});
        setDynamicOtherResponses({});
        setShowPassword(false);
        setShowConfirmPassword(false);
        setConsentContact(false);
        setConsentMedia(false);
        setFoodRestrictions([]);
        setAccessibilityNeeds([]);
        setDietaryAllergies('');
        setDietaryOther('');
        setAccessibilityOther('');
        setIpAffiliation('');
        setIpGroupName('');
        setEmergencyContactName('');
        setEmergencyContactRelationship('');
        setEmergencyContactPhone('');
        setEmergencyContactEmail('');
        setAttendWelcomeDinner('');
        setAvailTransportFromMakatiToPeninsula('');
        setOtherRegistrantType('');
        setHonorificTitle('');
        setSexAssignedAtBirth('');
        setContactCountryCode('');
        setCurrentStep(0);
    }, [
        setCountry,
        setCountryOther,
        setProgrammeIds,
        setRegistrationResponses,
        setDynamicOtherResponses,
        setRegistrantType,
        setOtherRegistrantType,
        setAccessibilityNeeds,
        setDietaryAllergies,
        setDietaryOther,
        setAccessibilityOther,
        setFoodRestrictions,
        setIpAffiliation,
        setIpGroupName,
        setEmergencyContactName,
        setEmergencyContactRelationship,
        setEmergencyContactPhone,
        setEmergencyContactEmail,
        setAttendWelcomeDinner,
        setAvailTransportFromMakatiToPeninsula,
        setHonorificTitle,
        setSexAssignedAtBirth,
        setContactCountryCode,
        setCurrentStep,
    ]);

    React.useEffect(() => {
        if (status === 'registered' || status === 'asemme10-registered') {
            setSuccessOpen(true);
            resetFormState();
        }
    }, [resetFormState, status]);

    React.useEffect(() => {
        let active = true;
        const value = virtualIdParticipant?.qr_payload?.trim();

        if (!value) {
            setSuccessQrDataUrl(null);
            return;
        }

        QRCode.toDataURL(value, {
            width: 320,
            margin: 1,
            errorCorrectionLevel: 'M',
            color: {
                dark: '#000000',
                light: '#ffffff',
            },
        })
            .then((url) => {
                if (active) setSuccessQrDataUrl(url);
            })
            .catch(() => {
                if (active) setSuccessQrDataUrl(null);
            });

        return () => {
            active = false;
        };
    }, [virtualIdParticipant?.qr_payload]);

    const inputClass =
        'h-11 rounded-xl border-slate-200 bg-white shadow-[inset_0_1px_2px_rgba(2,6,23,0.06)] ' +
        'focus-visible:ring-2 focus-visible:ring-[#0033A0]/20';

    const comboboxTriggerClass =
        'h-11 w-full justify-between rounded-xl border border-slate-200 bg-white px-3 ' +
        'shadow-[inset_0_1px_2px_rgba(2,6,23,0.06)] hover:bg-white ' +
        'focus-visible:ring-2 focus-visible:ring-[#0033A0]/20';

    const formatProgrammeDate = (value?: string | null) => {
        if (!value) {
            return 'TBA';
        }

        return new Date(value).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });
    };

    const downloadVirtualId = React.useCallback(async () => {
        if (!virtualIdParticipant || !successQrDataUrl) return;

        const canvas = document.createElement('canvas');
        canvas.width = 1200;
        canvas.height = 740;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const [qrImage, aseanLogo, bagongLogo, flagImage, backgroundImage] =
            await Promise.all([
                loadCanvasImage(successQrDataUrl),
                loadCanvasImage('/img/asean_logo.png'),
                loadCanvasImage('/img/bagong_pilipinas.png'),
                loadCanvasImage(virtualIdFlagUrl),
                loadCanvasImage('/img/bg2.png'),
            ]);

        if (!qrImage) return;

        ctx.fillStyle = '#eaf6ff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        if (backgroundImage) {
            ctx.save();
            ctx.globalAlpha = 0.24;
            ctx.drawImage(backgroundImage, 0, 0, canvas.width, canvas.height);
            ctx.restore();
        }

        const fade = ctx.createLinearGradient(
            0,
            0,
            canvas.width,
            canvas.height,
        );
        fade.addColorStop(0, 'rgba(255,255,255,0.86)');
        fade.addColorStop(0.52, 'rgba(220,241,255,0.72)');
        fade.addColorStop(1, 'rgba(255,255,255,0.9)');
        ctx.fillStyle = fade;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.save();
        drawRoundedRect(ctx, 22, 20, canvas.width - 44, canvas.height - 40, 46);
        ctx.clip();

        if (aseanLogo) {
            drawContainedCanvasImage(ctx, aseanLogo, 56, 52, 62, 62);
        }

        if (bagongLogo) {
            drawContainedCanvasImage(ctx, bagongLogo, 134, 54, 78, 54);
        }

        ctx.fillStyle = '#334155';
        ctx.font = '700 25px Arial, sans-serif';
        ctx.fillText('ASEAN Philippines 2026', 240, 70);
        ctx.fillStyle = '#64748b';
        ctx.font = '400 20px Arial, sans-serif';
        ctx.fillText(virtualIdEventTitle, 240, 101);

        ctx.fillStyle = '#64748b';
        ctx.font = '700 24px Arial, sans-serif';
        ctx.fillText('PARTICIPANT', 56, 176);

        ctx.fillStyle = '#0f172a';
        ctx.font = '700 44px Arial, sans-serif';
        wrapCanvasText(ctx, virtualIdParticipant.name, 56, 222, 560, 48);

        ctx.save();
        drawRoundedRect(ctx, 56, 292, 134, 134, 28);
        ctx.clip();
        ctx.fillStyle = '#dbeafe';
        ctx.fillRect(56, 292, 134, 134);
        if (flagImage) {
            ctx.drawImage(flagImage, 56, 292, 134, 134);
        }
        ctx.restore();

        ctx.fillStyle = '#0f172a';
        ctx.font = '700 34px Arial, sans-serif';
        ctx.fillText(virtualIdCountryName, 214, 342, 420);
        ctx.fillStyle = '#64748b';
        ctx.font = '500 24px Arial, sans-serif';
        ctx.fillText(virtualIdCountryCode, 214, 382);

        ctx.fillStyle = '#475569';
        ctx.font = '700 24px Arial, sans-serif';
        ctx.fillText('PARTICIPANT ID', 56, 490);

        drawRoundedRect(ctx, 56, 512, 360, 60, 30);
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(148,163,184,0.55)';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = '#0f172a';
        ctx.font = '700 25px Arial, sans-serif';
        ctx.fillText(virtualIdParticipant.display_id, 86, 552);

        drawRoundedRect(ctx, 724, 148, 420, 520, 42);
        ctx.fillStyle = 'rgba(255,255,255,0.92)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(148,163,184,0.35)';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = '#334155';
        ctx.font = '700 18px Arial, sans-serif';
        ctx.fillText('QR Code', 858, 211);
        ctx.drawImage(qrImage, 778, 244, 314, 314);

        ctx.fillStyle = '#334155';
        ctx.font = '700 18px Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(
            `${virtualIdCountryCode} - ${virtualIdParticipant.name}`,
            934,
            608,
            340,
        );
        ctx.fillStyle = '#64748b';
        ctx.font = '500 15px Arial, sans-serif';
        ctx.fillText(virtualIdParticipant.display_id, 934, 645);
        ctx.textAlign = 'left';

        ctx.fillStyle = '#64748b';
        ctx.font = '500 18px Arial, sans-serif';
        ctx.fillText('Scan QR for attendance verification.', 56, 660);

        ctx.restore();

        const link = document.createElement('a');
        link.download = `${virtualIdParticipant.display_id || 'virtual-id'}.jpg`;
        link.href = canvas.toDataURL('image/jpeg', 0.94);
        link.click();
    }, [
        successQrDataUrl,
        virtualIdCountryCode,
        virtualIdCountryName,
        virtualIdEventTitle,
        virtualIdFlagUrl,
        virtualIdParticipant,
    ]);

    const submitAsemme10Registration = React.useCallback(() => {
        if (!activeProgramme) return;

        const form = document.getElementById(
            'register-form',
        ) as HTMLFormElement | null;
        const formData = form ? new FormData(form) : new FormData();
        const fields = activeProgramme.registration_fields ?? [];
        const fieldByKey = new Map(
            fields.map((field) => [field.field_key, field]),
        );
        const valueFor = (key: string): string | string[] => {
            const field = fieldByKey.get(key);

            if (field) {
                const formValues = formData.getAll(
                    `registration_responses[${activeProgramme.id}][${field.id}]`,
                );
                const latestFormValue = formValues
                    .map((value) => String(value ?? '').trim())
                    .findLast((value) => value !== '');

                if (latestFormValue) {
                    return latestFormValue;
                }
            }

            return field ? getDynamicValue(activeProgramme.id, field.id) : '';
        };
        const stringFor = (key: string) => {
            const value = valueFor(key);

            return Array.isArray(value) ? '' : String(value ?? '').trim();
        };
        const arrayFor = (key: string) => {
            const value = valueFor(key);

            return Array.isArray(value)
                ? value.map((item) => String(item).trim()).filter(Boolean)
                : [];
        };
        const otherFor = (key: string) => {
            const field = fieldByKey.get(key);

            return field
                ? getDynamicOtherValue(activeProgramme.id, field.id).trim()
                : '';
        };
        const withOther = (key: string) => {
            const value = stringFor(key);
            const other = otherFor(key);

            return value.toLowerCase() === 'other' && other
                ? `Other: ${other}`
                : value;
        };

        const registrationType = stringFor('registration_type');
        const prefix = registrationTypeToPrefix(registrationType);
        const countryName =
            countryOther.trim() ||
            selectedCountry?.name ||
            stringFor('country_delegation_country');
        const countryId = country && !countryOther.trim() ? country : null;
        const headOrganisationKey =
            prefix === 'country_delegation'
                ? 'head_ministry_name'
                : 'organisation_name';
        const headEmailKey =
            prefix === 'country_delegation' ? 'head_email' : 'email';

        const attendee = (role: string, keyPrefix: string) => {
            const isHead = role === 'head';

            return {
                role,
                title: stringFor(`${keyPrefix}_title`) || null,
                title_other: otherFor(`${keyPrefix}_title`) || null,
                given_name: stringFor(`${keyPrefix}_given_name`),
                family_name: stringFor(`${keyPrefix}_family_name`),
                badge_name: stringFor(`${keyPrefix}_badge_name`),
                organization_name:
                    stringFor(`${keyPrefix}_ministry_or_organisation`) ||
                    stringFor(`${keyPrefix}_organisation`) ||
                    stringFor(`${keyPrefix}_organization_name`) ||
                    stringFor(`${keyPrefix}_head_ministry_name`) ||
                    (isHead
                        ? stringFor(`${prefix}_${headOrganisationKey}`)
                        : ''),
                position_title:
                    stringFor(`${keyPrefix}_job_title`) ||
                    stringFor(`${keyPrefix}_position`) ||
                    (isHead ? stringFor(`${prefix}_position`) : ''),
                email:
                    stringFor(`${keyPrefix}_email`) ||
                    (isHead ? stringFor(`${prefix}_${headEmailKey}`) : ''),
                dietary_requirements: stringFor(
                    `${prefix}_dietary_requirements`,
                ),
                mobility_or_special_needs: stringFor(
                    `${prefix}_mobility_or_special_needs`,
                ),
            };
        };

        const attendees = [];

        if (prefix === 'single_participant') {
            attendees.push({
                role: 'single_participant',
                title: stringFor('single_participant_title') || null,
                title_other: otherFor('single_participant_title') || null,
                given_name: stringFor('single_participant_given_name'),
                family_name: stringFor('single_participant_family_name'),
                badge_name: '',
                organization_name: stringFor(
                    'single_participant_organisation_name',
                ),
                position_title: stringFor('single_participant_position'),
                email: stringFor('single_participant_email'),
                dietary_requirements: stringFor(
                    'single_participant_dietary_requirements',
                ),
                mobility_or_special_needs: stringFor(
                    'single_participant_mobility_or_special_needs',
                ),
            });
        } else if (prefix) {
            attendees.push(attendee('head', `${prefix}_head`));

            for (let index = 1; index <= 3; index += 1) {
                const delegatePrefix = `${prefix}_delegate_${index}`;
                const delegate = attendee(`delegate_${index}`, delegatePrefix);

                if (
                    delegate.given_name ||
                    delegate.family_name ||
                    delegate.email
                ) {
                    attendees.push(delegate);
                }
            }
        }

        const attendeeErrorKey = (
            role: string,
            fieldSuffix: 'given_name' | 'family_name',
        ) => {
            const fieldKey =
                prefix === 'single_participant'
                    ? `single_participant_${fieldSuffix}`
                    : role === 'head'
                      ? `${prefix}_head_${fieldSuffix}`
                      : `${prefix}_${role}_${fieldSuffix}`;
            const field = fieldByKey.get(fieldKey);

            return field
                ? dynamicErrorKey(activeProgramme.id, field.id)
                : 'attendees';
        };
        const attendeeErrors = attendees.reduce<Record<string, string>>(
            (errors, participant) => {
                const roleLabel =
                    participant.role === 'head'
                        ? 'Head'
                        : participant.role.startsWith('delegate_')
                          ? `Delegate ${participant.role.replace('delegate_', '')}`
                          : 'Participant';

                if (!participant.given_name) {
                    errors[attendeeErrorKey(participant.role, 'given_name')] =
                        `${roleLabel} given name is required.`;
                }

                if (!participant.family_name) {
                    errors[attendeeErrorKey(participant.role, 'family_name')] =
                        `${roleLabel} family name is required.`;
                }

                return errors;
            },
            {},
        );

        if (Object.keys(attendeeErrors).length > 0) {
            showValidationFeedback(attendeeErrors);
            return;
        }

        const focalAttendee = attendees[0] ?? {
            given_name: '',
            family_name: '',
            email: '',
            organization_name: '',
            position_title: '',
        };
        const socialActivities =
            prefix === 'single_participant'
                ? arrayFor('single_participant_social_activities')
                : arrayFor(`${prefix}_social_activities`);

        setAsemme10Processing(true);
        router.post(
            '/asemme10-registration',
            {
                programme_id: activeProgramme.id,
                country_id: countryId,
                registration_type: registrationType,
                focal: {
                    name: [focalAttendee.given_name, focalAttendee.family_name]
                        .filter(Boolean)
                        .join(' '),
                    email: focalAttendee.email,
                    phone:
                        stringFor(`${prefix}_contact_mobile_number`) ||
                        stringFor('single_participant_contact_mobile_number'),
                    organization: focalAttendee.organization_name,
                    position: focalAttendee.position_title,
                },
                consents: {
                    data_collection: stringFor('data_collection_confirmation')
                        ? 'yes'
                        : '',
                    data_storage: stringFor('data_storage_consent')
                        ? 'yes'
                        : '',
                    photo_video: stringFor('photo_video_consent') ? 'yes' : '',
                },
                delegation: {
                    country: countryName,
                    country_other: countryOther.trim() || null,
                    minister_responsibility_type: withOther(
                        `${prefix}_minister_responsibility_type`,
                    ),
                    speech_topic: withOther(`${prefix}_speech_topic`),
                    registration_type_other:
                        otherFor('registration_type') || null,
                    social_activities: socialActivities,
                    social_activity_other:
                        otherFor(`${prefix}_social_activities`) ||
                        otherFor('single_participant_social_activities') ||
                        null,
                    social_activity_details:
                        stringFor(`${prefix}_social_activity_details`) ||
                        stringFor('single_participant_social_activity_details'),
                    bilateral_meeting_interest: withOther(
                        `${prefix}_bilateral_meeting_interest`,
                    ),
                    bilateral_contact_emails: stringFor(
                        `${prefix}_bilateral_contact_emails`,
                    ),
                    bilateral_comments: stringFor(
                        `${prefix}_bilateral_comments`,
                    ),
                    additional_comments:
                        stringFor(
                            `${prefix}_additional_comments_on_delegation`,
                        ) ||
                        stringFor('single_participant_additional_comments') ||
                        stringFor('single_participant_other_comments'),
                },
                attendees,
            },
            {
                preserveScroll: true,
                onError: (errors) => {
                    showValidationFeedback(errors, true);
                },
                onFinish: () => setAsemme10Processing(false),
            },
        );
    }, [
        activeProgramme,
        country,
        countryOther,
        dynamicErrorKey,
        getDynamicOtherValue,
        getDynamicValue,
        selectedCountry?.name,
        showValidationFeedback,
    ]);

    const submitCurrentRegistration = React.useCallback(() => {
        submittedRef.current = true;
        setEditedAfterSubmit({});

        const nextErrors = applyClientValidation(
            steps.map((_, index) => index),
        );

        if (Object.keys(nextErrors).length > 0) {
            showValidationFeedback(nextErrors);
            return false;
        }

        if (isAsemme10Registration) {
            submitAsemme10Registration();
        }

        return true;
    }, [
        applyClientValidation,
        isAsemme10Registration,
        steps,
        showValidationFeedback,
        submitAsemme10Registration,
    ]);

    return (
        <RegisterLayout>
            <Head title="Register" />

            {/* Header */}
            <div className="mb-6 flex flex-col items-center gap-2 text-center">
                <Link
                    href="/"
                    className="inline-flex items-center rounded-md focus:ring-2 focus:ring-[#0033A0]/30 focus:ring-offset-2 focus:outline-none"
                    aria-label="Go to home"
                >
                    <img
                        src="/img/asean_banner_logo.png"
                        alt="ASEAN Philippines 2026"
                        className="h-10 w-auto object-contain transition-opacity hover:opacity-90 sm:h-12 md:h-14"
                        draggable={false}
                        loading="lazy"
                    />
                </Link>

                <h1 className="text-2xl font-semibold tracking-tight text-balance text-slate-700/90 sm:text-3xl">
                    <span className="relative inline-block">
                        <span className="relative z-10">
                            {activeProgramme
                                ? `${activeProgramme.title} Registration`
                                : 'Participant Registration'}
                        </span>
                    </span>
                </h1>
            </div>

            <Form
                id="register-form"
                key={formKey}
                {...store.form()}
                encType="multipart/form-data"
                resetOnSuccess={['password', 'password_confirmation']}
                className="flex flex-col gap-6"
                noValidate
                data-test="register-form"
                onInputCapture={(e) => {
                    const target = e.target as
                        | HTMLInputElement
                        | HTMLSelectElement
                        | HTMLTextAreaElement;

                    if (target?.name?.startsWith('registration_responses[')) {
                        return;
                    }

                    markDirty(target?.name);
                    clearClientError(target?.name);
                    if (target?.name) {
                        setEditedAfterSubmit((prev) =>
                            prev[target.name]
                                ? prev
                                : { ...prev, [target.name]: true },
                        );
                    }
                }}
                onSubmitCapture={(event) => {
                    if (isAsemme10Registration) {
                        event.preventDefault();
                        event.stopPropagation();
                        event.nativeEvent.stopImmediatePropagation?.();
                        submitCurrentRegistration();

                        return;
                    }

                    submittedRef.current = true;
                    setEditedAfterSubmit({});
                    const nextErrors = applyClientValidation(
                        steps.map((_, index) => index),
                    );

                    if (Object.keys(nextErrors).length > 0) {
                        event.preventDefault();
                        showValidationFeedback(nextErrors);

                        return;
                    }
                }}
                onError={(errors) => {
                    showValidationFeedback(errors, isAsemme10Registration);
                }}
                onSuccess={() => {
                    resetFormState();
                    setSuccessOpen(true);
                }}
            >
                {({ processing, errors }) => {
                    const effectiveProcessing =
                        processing || asemme10Processing;
                    const serverErrors = errors as Record<
                        string,
                        string | undefined
                    >;
                    const err = {
                        ...clientErrors,
                    };
                    Object.entries(serverErrors).forEach(([key, value]) => {
                        if (value && !editedAfterSubmit[key]) {
                            err[key] = value;
                        }
                    });
                    const errorSteps = new Set<number>(
                        steps
                            .map((_, index) =>
                                stepErrorKeys(index).some((key) => err[key])
                                    ? index
                                    : null,
                            )
                            .filter((index): index is number => index !== null),
                    );
                    const showIfEmpty = (msg?: string, value?: string) =>
                        msg && !value?.trim() ? msg : undefined;

                    return (
                        <>
                            {/* Card */}
                            <div
                                className={cn(
                                    'relative rounded-2xl border border-slate-200/70 bg-white/70 p-6',
                                    'shadow-[0_18px_50px_-40px_rgba(2,6,23,0.35)] backdrop-blur-xl',
                                    'ring-1 ring-white/40',
                                )}
                            >
                                <div className="grid gap-5">
                                    <div className="mt-3 rounded-lg border border-amber-200/70 bg-amber-50/60 px-3 py-2">
                                        <p className="text-[11px] leading-snug text-amber-800">
                                            Please accomplish this form in its
                                            entirety to register. Ensure that
                                            all required field(s) are duly
                                            completed before clicking{' '}
                                            <span className="font-semibold">
                                                Next
                                            </span>{' '}
                                            to proceed.
                                        </p>

                                        <p className="mt-1 text-[11px] leading-snug text-amber-800">
                                            <span className="font-semibold tracking-wide uppercase">
                                                Note:
                                            </span>{' '}
                                            Please enter your full government
                                            name as shown on your passport or
                                            government-issued ID.
                                        </p>
                                    </div>

                                    <div className="rounded-2xl border border-slate-200/70 bg-white/80 p-4">
                                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                            <div>
                                                <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
                                                    Step {currentStep + 1} of{' '}
                                                    {steps.length}
                                                </p>
                                                <h2 className="text-lg font-semibold text-slate-800">
                                                    {steps[currentStep].title}
                                                </h2>
                                                <p className="text-sm text-slate-500">
                                                    {
                                                        steps[currentStep]
                                                            .description
                                                    }
                                                </p>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                {steps.map((step, index) => {
                                                    const isActive =
                                                        index === currentStep;
                                                    const isError =
                                                        errorSteps.has(index);
                                                    const isComplete =
                                                        index < currentStep &&
                                                        !isError;

                                                    return (
                                                        <button
                                                            key={step.title}
                                                            type="button"
                                                            onClick={() =>
                                                                setCurrentStep(
                                                                    index,
                                                                )
                                                            }
                                                            className={cn(
                                                                'rounded-full px-3 py-1 text-xs font-medium transition',
                                                                isActive
                                                                    ? 'bg-[#0033A0] text-white'
                                                                    : isError
                                                                      ? 'border border-red-200 bg-red-50 text-red-600 hover:border-red-300'
                                                                      : isComplete
                                                                        ? 'border border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-300'
                                                                        : 'border border-slate-200 text-slate-500 hover:border-[#0033A0] hover:text-[#0033A0]',
                                                            )}
                                                        >
                                                            {index + 1}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>

                                    <input
                                        type="hidden"
                                        name="consent_contact_sharing"
                                        value={consentContact ? '1' : '0'}
                                    />
                                    <input
                                        type="hidden"
                                        name="consent_photo_video"
                                        value={consentMedia ? '1' : '0'}
                                    />
                                    <input
                                        type="hidden"
                                        name="has_food_restrictions"
                                        value={
                                            foodRestrictions.length > 0
                                                ? '1'
                                                : '0'
                                        }
                                    />
                                    <input
                                        type="hidden"
                                        name="ip_affiliation"
                                        value={
                                            ipAffiliation === 'yes' ? '1' : '0'
                                        }
                                    />
                                    <input
                                        type="hidden"
                                        name="attend_welcome_dinner"
                                        value={
                                            attendWelcomeDinner === 'yes'
                                                ? '1'
                                                : '0'
                                        }
                                    />
                                    <input
                                        type="hidden"
                                        name="avail_transport_from_makati_to_peninsula"
                                        value={
                                            availTransportFromMakatiToPeninsula ===
                                            'yes'
                                                ? '1'
                                                : '0'
                                        }
                                    />
                                    {foodRestrictions.map((restriction) => (
                                        <input
                                            key={restriction}
                                            type="hidden"
                                            name="food_restrictions[]"
                                            value={restriction}
                                        />
                                    ))}
                                    {accessibilityNeeds.map((need) => (
                                        <input
                                            key={need}
                                            type="hidden"
                                            name="accessibility_needs[]"
                                            value={need}
                                        />
                                    ))}
                                    {selectedProgrammes.flatMap((programme) =>
                                        (programme.registration_fields ?? [])
                                            .filter(
                                                (field) =>
                                                    field.field_type !==
                                                        'section' &&
                                                    isRegistrationFieldVisible(
                                                        programme,
                                                        field,
                                                        registrationResponses,
                                                    ),
                                            )
                                            .flatMap((field) => {
                                                const value = getDynamicValue(
                                                    programme.id,
                                                    field.id,
                                                );

                                                if (Array.isArray(value)) {
                                                    return value.map((item) => (
                                                        <input
                                                            key={`${programme.id}-${field.id}-${item}`}
                                                            type="hidden"
                                                            name={`registration_responses[${programme.id}][${field.id}][]`}
                                                            value={item}
                                                        />
                                                    ));
                                                }

                                                return (
                                                    <input
                                                        key={`${programme.id}-${field.id}`}
                                                        type="hidden"
                                                        name={`registration_responses[${programme.id}][${field.id}]`}
                                                        value={value}
                                                    />
                                                );
                                            }),
                                    )}

                                    {!isAsemme10Registration ? (
                                        <fieldset
                                            data-active={currentStep === 0}
                                            aria-hidden={currentStep !== 0}
                                            className={cn(
                                                'grid gap-5',
                                                currentStep === 0
                                                    ? ''
                                                    : 'hidden',
                                            )}
                                        >
                                            <div className="grid gap-2">
                                                <Label htmlFor="country_id">
                                                    Country of Origin{' '}
                                                    <span className="text-[11px] font-semibold text-red-600">
                                                        {' '}
                                                        *
                                                    </span>
                                                </Label>
                                                <input
                                                    type="hidden"
                                                    name="country_id"
                                                    value={country}
                                                />

                                                <Popover
                                                    open={countryOpen}
                                                    onOpenChange={
                                                        setCountryOpen
                                                    }
                                                >
                                                    <PopoverTrigger asChild>
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            role="combobox"
                                                            aria-expanded={
                                                                countryOpen
                                                            }
                                                            className={
                                                                comboboxTriggerClass
                                                            }
                                                            tabIndex={1}
                                                        >
                                                            <span className="flex min-w-0 items-center gap-2">
                                                                {selectedCountry ? (
                                                                    <>
                                                                        {selectedCountry.flag_url ? (
                                                                            <img
                                                                                src={
                                                                                    selectedCountry.flag_url
                                                                                }
                                                                                alt=""
                                                                                className="h-6 w-6 shrink-0 rounded-md border border-slate-200 object-cover"
                                                                                loading="lazy"
                                                                                draggable={
                                                                                    false
                                                                                }
                                                                            />
                                                                        ) : (
                                                                            <span className="grid h-6 w-6 place-items-center rounded-md border border-slate-200 bg-slate-50 text-[10px] text-slate-400">
                                                                                {
                                                                                    selectedCountry.code
                                                                                }
                                                                            </span>
                                                                        )}
                                                                        <span className="truncate">
                                                                            {
                                                                                selectedCountry.name
                                                                            }
                                                                        </span>
                                                                    </>
                                                                ) : (
                                                                    <span className="text-muted-foreground">
                                                                        Select
                                                                        country…
                                                                    </span>
                                                                )}
                                                            </span>
                                                            <ChevronsUpDown className="h-4 w-4 opacity-50" />
                                                        </Button>
                                                    </PopoverTrigger>

                                                    <PopoverContent
                                                        className="z-50 w-[--radix-popover-trigger-width] p-0"
                                                        align="start"
                                                    >
                                                        <Command>
                                                            <CommandInput placeholder="Search country…" />
                                                            <CommandEmpty>
                                                                No country
                                                                found.
                                                            </CommandEmpty>

                                                            {/* ✅ scrollable list */}
                                                            <CommandList className="max-h-[320px] overflow-auto overscroll-contain sm:max-h-[380px]">
                                                                <CommandGroup heading="ASEAN Countries">
                                                                    {groupedCountries.asean.map(
                                                                        (
                                                                            item,
                                                                        ) => (
                                                                            <CommandItem
                                                                                key={
                                                                                    item.id
                                                                                }
                                                                                value={
                                                                                    item.name
                                                                                }
                                                                                onSelect={() => {
                                                                                    setCountry(
                                                                                        String(
                                                                                            item.id,
                                                                                        ),
                                                                                    );
                                                                                    setCountryOpen(
                                                                                        false,
                                                                                    );
                                                                                }}
                                                                                className="gap-2"
                                                                            >
                                                                                {item.flag_url ? (
                                                                                    <img
                                                                                        src={
                                                                                            item.flag_url
                                                                                        }
                                                                                        alt=""
                                                                                        className="h-6 w-6 shrink-0 rounded-md border border-slate-200 object-cover"
                                                                                        loading="lazy"
                                                                                        draggable={
                                                                                            false
                                                                                        }
                                                                                    />
                                                                                ) : (
                                                                                    <span className="grid h-6 w-6 place-items-center rounded-md border border-slate-200 bg-slate-50 text-[10px] text-slate-400">
                                                                                        {
                                                                                            item.code
                                                                                        }
                                                                                    </span>
                                                                                )}
                                                                                <span className="truncate">
                                                                                    {
                                                                                        item.name
                                                                                    }
                                                                                </span>
                                                                                <Check
                                                                                    className={cn(
                                                                                        'ml-auto h-4 w-4',
                                                                                        country ===
                                                                                            String(
                                                                                                item.id,
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
                                                                    .nonAsean
                                                                    .length >
                                                                0 ? (
                                                                    <CommandGroup heading="Non-ASEAN Countries">
                                                                        {groupedCountries.nonAsean.map(
                                                                            (
                                                                                item,
                                                                            ) => (
                                                                                <CommandItem
                                                                                    key={
                                                                                        item.id
                                                                                    }
                                                                                    value={`${item.name} ${item.code}`}
                                                                                    onSelect={() => {
                                                                                        setCountry(
                                                                                            String(
                                                                                                item.id,
                                                                                            ),
                                                                                        );
                                                                                        setCountryOpen(
                                                                                            false,
                                                                                        );
                                                                                    }}
                                                                                    className="gap-2"
                                                                                >
                                                                                    {item.flag_url ? (
                                                                                        <img
                                                                                            src={
                                                                                                item.flag_url
                                                                                            }
                                                                                            alt=""
                                                                                            className="h-6 w-6 shrink-0 rounded-md border border-slate-200 object-cover"
                                                                                            loading="lazy"
                                                                                            draggable={
                                                                                                false
                                                                                            }
                                                                                        />
                                                                                    ) : (
                                                                                        <span className="grid h-6 w-6 place-items-center rounded-md border border-slate-200 bg-slate-50 text-[10px] text-slate-400">
                                                                                            {
                                                                                                item.code
                                                                                            }
                                                                                        </span>
                                                                                    )}
                                                                                    <span className="truncate">
                                                                                        {
                                                                                            item.name
                                                                                        }
                                                                                    </span>
                                                                                    <Check
                                                                                        className={cn(
                                                                                            'ml-auto h-4 w-4',
                                                                                            country ===
                                                                                                String(
                                                                                                    item.id,
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

                                                <InputError
                                                    message={
                                                        err.country_id &&
                                                        !country
                                                            ? err.country_id
                                                            : undefined
                                                    }
                                                />
                                            </div>

                                            <div className="grid gap-2">
                                                <Label htmlFor="honorific_title">
                                                    Honorific / Title{' '}
                                                    <span className="text-[11px] font-semibold text-red-600">
                                                        {' '}
                                                        *
                                                    </span>
                                                </Label>

                                                <input
                                                    type="hidden"
                                                    name="honorific_title"
                                                    value={honorificTitle}
                                                />

                                                <Popover
                                                    open={honorificOpen}
                                                    onOpenChange={
                                                        setHonorificOpen
                                                    }
                                                >
                                                    <PopoverTrigger asChild>
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            role="combobox"
                                                            aria-expanded={
                                                                honorificOpen
                                                            }
                                                            className={
                                                                comboboxTriggerClass
                                                            }
                                                            tabIndex={2}
                                                        >
                                                            <span className="truncate">
                                                                {honorificTitle ? (
                                                                    (HONORIFIC_OPTIONS.find(
                                                                        (o) =>
                                                                            o.value ===
                                                                            honorificTitle,
                                                                    )?.label ??
                                                                    honorificTitle)
                                                                ) : (
                                                                    <span className="text-muted-foreground">
                                                                        Select
                                                                        honorific…
                                                                    </span>
                                                                )}
                                                            </span>
                                                            <ChevronsUpDown className="h-4 w-4 opacity-50" />
                                                        </Button>
                                                    </PopoverTrigger>

                                                    <PopoverContent
                                                        className="w-[--radix-popover-trigger-width] p-0"
                                                        align="start"
                                                        onCloseAutoFocus={(e) =>
                                                            e.preventDefault()
                                                        }
                                                    >
                                                        <Command>
                                                            <CommandInput placeholder="Search honorific…" />
                                                            <CommandEmpty>
                                                                No honorific
                                                                found.
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
                                                                                setHonorificOpen(
                                                                                    false,
                                                                                );
                                                                                setHonorificTitle(
                                                                                    item.value,
                                                                                );

                                                                                if (
                                                                                    item.value !==
                                                                                    'other'
                                                                                ) {
                                                                                    setHonorificOther(
                                                                                        '',
                                                                                    ); // ✅ clear immediately when not other
                                                                                }
                                                                            }}
                                                                        >
                                                                            {
                                                                                item.label
                                                                            }
                                                                            <Check
                                                                                className={cn(
                                                                                    'ml-auto h-4 w-4',
                                                                                    honorificTitle ===
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

                                                <InputError
                                                    message={
                                                        err.honorific_title &&
                                                        !honorificTitle
                                                            ? err.honorific_title
                                                            : undefined
                                                    }
                                                />
                                            </div>

                                            {honorificTitle === 'other' ? (
                                                <div className="grid gap-2">
                                                    <Label htmlFor="honorific_other">
                                                        Other honorific
                                                    </Label>
                                                    <Input
                                                        ref={honorificOtherRef}
                                                        id="honorific_other"
                                                        name="honorific_other"
                                                        value={honorificOther}
                                                        onChange={(e) =>
                                                            setHonorificOther(
                                                                e.target.value,
                                                            )
                                                        }
                                                        maxLength={50}
                                                        placeholder="Please specify"
                                                        className={inputClass}
                                                    />
                                                    <InputError
                                                        message={showIfEmpty(
                                                            err.honorific_other,
                                                            honorificOther,
                                                        )}
                                                    />
                                                </div>
                                            ) : null}

                                            <div className="grid gap-4 sm:grid-cols-3">
                                                <div className="grid gap-2">
                                                    <Label htmlFor="given_name">
                                                        Given Name / First Name{' '}
                                                        <span className="text-[11px] font-semibold text-red-600">
                                                            {' '}
                                                            *
                                                        </span>
                                                    </Label>
                                                    <Input
                                                        id="given_name"
                                                        type="text"
                                                        tabIndex={
                                                            honorificTitle ===
                                                            'other'
                                                                ? 4
                                                                : 3
                                                        }
                                                        autoComplete="given-name"
                                                        name="given_name"
                                                        placeholder="e.g. JUAN"
                                                        className={inputClass}
                                                    />

                                                    <InputError
                                                        message={
                                                            err.given_name &&
                                                            shouldShowError(
                                                                'given_name',
                                                            )
                                                                ? err.given_name
                                                                : undefined
                                                        }
                                                    />
                                                </div>

                                                <div className="grid gap-2">
                                                    <Label htmlFor="middle_name">
                                                        Middle Name
                                                    </Label>
                                                    <Input
                                                        id="middle_name"
                                                        type="text"
                                                        tabIndex={
                                                            honorificTitle ===
                                                            'other'
                                                                ? 5
                                                                : 4
                                                        }
                                                        autoComplete="additional-name"
                                                        name="middle_name"
                                                        placeholder="e.g. SANTOS"
                                                        className={inputClass}
                                                    />

                                                    <InputError
                                                        message={
                                                            err.middle_name &&
                                                            shouldShowError(
                                                                'middle_name',
                                                            )
                                                                ? err.middle_name
                                                                : undefined
                                                        }
                                                    />
                                                </div>

                                                <div className="grid gap-2">
                                                    <Label htmlFor="family_name">
                                                        Family Name / Surname{' '}
                                                        <span className="text-[11px] font-semibold text-red-600">
                                                            {' '}
                                                            *
                                                        </span>
                                                    </Label>
                                                    <Input
                                                        id="family_name"
                                                        type="text"
                                                        tabIndex={
                                                            honorificTitle ===
                                                            'other'
                                                                ? 6
                                                                : 5
                                                        }
                                                        autoComplete="family-name"
                                                        name="family_name"
                                                        placeholder="e.g. DELA CRUZ"
                                                        className={inputClass}
                                                    />
                                                    <InputError
                                                        message={
                                                            err.family_name &&
                                                            shouldShowError(
                                                                'family_name',
                                                            )
                                                                ? err.family_name
                                                                : undefined
                                                        }
                                                    />
                                                </div>
                                            </div>

                                            <div className="grid gap-2">
                                                <Label htmlFor="suffix">
                                                    Suffix
                                                </Label>
                                                <Input
                                                    id="suffix"
                                                    type="text"
                                                    tabIndex={
                                                        honorificTitle ===
                                                        'other'
                                                            ? 7
                                                            : 6
                                                    }
                                                    name="suffix"
                                                    placeholder="e.g. Jr., III"
                                                    className={inputClass}
                                                />

                                                <InputError
                                                    message={
                                                        err.suffix &&
                                                        shouldShowError(
                                                            'suffix',
                                                        )
                                                            ? err.suffix
                                                            : undefined
                                                    }
                                                />
                                            </div>

                                            <div className="grid gap-2">
                                                <Label htmlFor="sex_assigned_at_birth">
                                                    Sex assigned at birth{' '}
                                                    <span className="text-[11px] font-semibold text-red-600">
                                                        {' '}
                                                        *
                                                    </span>
                                                </Label>

                                                <input
                                                    type="hidden"
                                                    name="sex_assigned_at_birth"
                                                    value={sexAssignedAtBirth}
                                                />

                                                <Popover
                                                    open={sexOpen}
                                                    onOpenChange={setSexOpen}
                                                >
                                                    <PopoverTrigger asChild>
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            role="combobox"
                                                            aria-expanded={
                                                                sexOpen
                                                            }
                                                            className={
                                                                comboboxTriggerClass
                                                            }
                                                            tabIndex={
                                                                honorificTitle ===
                                                                'other'
                                                                    ? 8
                                                                    : 7
                                                            }
                                                        >
                                                            <span className="truncate">
                                                                {sexAssignedAtBirth ? (
                                                                    (SEX_ASSIGNED_OPTIONS.find(
                                                                        (o) =>
                                                                            o.value ===
                                                                            sexAssignedAtBirth,
                                                                    )?.label ??
                                                                    sexAssignedAtBirth)
                                                                ) : (
                                                                    <span className="text-muted-foreground">
                                                                        Select…
                                                                    </span>
                                                                )}
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
                                                                                setSexAssignedAtBirth(
                                                                                    item.value,
                                                                                );
                                                                                setSexOpen(
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
                                                                                    sexAssignedAtBirth ===
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

                                                <InputError
                                                    message={
                                                        err.sex_assigned_at_birth &&
                                                        !sexAssignedAtBirth
                                                            ? err.sex_assigned_at_birth
                                                            : undefined
                                                    }
                                                />
                                            </div>

                                            <div className="grid gap-2">
                                                <Label htmlFor="profile_photo">
                                                    Preferred image for ID
                                                </Label>
                                                <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center">
                                                    <div className="grid justify-items-center gap-2">
                                                        <div className="grid size-32 place-items-center overflow-hidden rounded-full border border-slate-200 bg-slate-50 shadow-sm ring-4 ring-white">
                                                            {preferredImagePreviewUrl ? (
                                                                <img
                                                                    src={
                                                                        preferredImagePreviewUrl
                                                                    }
                                                                    alt="Preferred image preview"
                                                                    className="size-full object-cover"
                                                                />
                                                            ) : (
                                                                <ImagePlus className="size-9 text-slate-400" />
                                                            )}
                                                        </div>
                                                        <p className="text-xs text-slate-500">
                                                            Circle crop preview
                                                        </p>
                                                    </div>

                                                    <div className="grid flex-1 gap-2">
                                                        <p className="text-sm text-slate-600">
                                                            Upload a clear front
                                                            facing photo. You
                                                            can resize and
                                                            position the
                                                            circular crop before
                                                            it is attached to
                                                            your registration.
                                                        </p>
                                                        <div className="flex flex-wrap gap-2">
                                                            <Label
                                                                htmlFor="profile_photo"
                                                                className="inline-flex h-9 cursor-pointer items-center justify-center rounded-lg bg-[#0033A0] px-4 text-sm font-medium text-white shadow-sm transition hover:bg-[#002b86]"
                                                            >
                                                                Upload image
                                                            </Label>
                                                            {preferredImagePreviewUrl ? (
                                                                <Button
                                                                    type="button"
                                                                    variant="outline"
                                                                    size="sm"
                                                                    className="h-9 rounded-lg"
                                                                    onClick={
                                                                        handleRemovePreferredImage
                                                                    }
                                                                >
                                                                    Remove image
                                                                </Button>
                                                            ) : null}
                                                        </div>
                                                        <Input
                                                            ref={
                                                                preferredImageInputRef
                                                            }
                                                            id="profile_photo"
                                                            type="file"
                                                            name="profile_photo"
                                                            accept="image/png,image/jpeg"
                                                            onChange={
                                                                handlePreferredImageChange
                                                            }
                                                            className="sr-only"
                                                        />
                                                    </div>
                                                </div>

                                                <InputError
                                                    message={
                                                        preferredImageError ||
                                                        err.profile_photo
                                                    }
                                                />
                                            </div>
                                        </fieldset>
                                    ) : null}

                                    <fieldset
                                        data-active={currentStep === 1}
                                        aria-hidden={currentStep !== 1}
                                        className={cn(
                                            'grid gap-5',
                                            currentStep === 1 ? '' : 'hidden',
                                        )}
                                    >
                                        <div className="grid gap-2">
                                            <Label htmlFor="email">
                                                Email address{' '}
                                                <span className="text-[11px] font-semibold text-red-600">
                                                    {' '}
                                                    *
                                                </span>
                                            </Label>
                                            <Input
                                                id="email"
                                                type="email"
                                                tabIndex={
                                                    honorificTitle === 'other'
                                                        ? 9
                                                        : 8
                                                }
                                                autoComplete="email"
                                                name="email"
                                                placeholder="email@example.com"
                                                className={inputClass}
                                            />

                                            <InputError
                                                message={
                                                    err.email &&
                                                    shouldShowError('email')
                                                        ? err.email
                                                        : undefined
                                                }
                                            />
                                        </div>

                                        <div className="grid gap-2">
                                            <Label htmlFor="contact_number">
                                                Contact number{' '}
                                                <span className="text-[11px] font-semibold text-red-600">
                                                    {' '}
                                                    *
                                                </span>
                                            </Label>

                                            <div className="grid gap-2 sm:grid-cols-[180px_1fr]">
                                                {/* ✅ Country code combobox */}
                                                <div className="grid gap-2">
                                                    <input
                                                        type="hidden"
                                                        name="contact_country_code"
                                                        value={
                                                            contactCountryCode
                                                        }
                                                    />

                                                    <Popover
                                                        open={phoneCodeOpen}
                                                        onOpenChange={
                                                            setPhoneCodeOpen
                                                        }
                                                    >
                                                        <PopoverTrigger asChild>
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                role="combobox"
                                                                aria-expanded={
                                                                    phoneCodeOpen
                                                                }
                                                                className={
                                                                    comboboxTriggerClass
                                                                }
                                                                tabIndex={
                                                                    honorificTitle ===
                                                                    'other'
                                                                        ? 10
                                                                        : 9
                                                                }
                                                            >
                                                                <span className="truncate">
                                                                    {contactCountryCode ? (
                                                                        (PHONE_CODE_OPTIONS.find(
                                                                            (
                                                                                o,
                                                                            ) =>
                                                                                o.value ===
                                                                                contactCountryCode,
                                                                        )
                                                                            ?.label ??
                                                                        contactCountryCode)
                                                                    ) : (
                                                                        <span className="text-muted-foreground">
                                                                            Country
                                                                            code…
                                                                        </span>
                                                                    )}
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
                                                                    No country
                                                                    code found.
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
                                                                                    value={`${item.label} ${item.value}`} // ✅ searchable by country and code
                                                                                    onSelect={() => {
                                                                                        setContactCountryCode(
                                                                                            item.value,
                                                                                        ); // ✅ store +63 etc
                                                                                        setPhoneCodeOpen(
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
                                                                                            contactCountryCode ===
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
                                                </div>

                                                {/* ✅ Contact number input (THIS is what was missing) */}
                                                <Input
                                                    id="contact_number"
                                                    type="tel"
                                                    tabIndex={
                                                        honorificTitle ===
                                                        'other'
                                                            ? 11
                                                            : 10
                                                    }
                                                    autoComplete="tel"
                                                    name="contact_number"
                                                    inputMode="numeric"
                                                    placeholder="e.g. 9123456789"
                                                    className={inputClass}
                                                    onInput={(event) => {
                                                        event.currentTarget.value =
                                                            event.currentTarget.value.replace(
                                                                /[^0-9]/g,
                                                                '',
                                                            );
                                                    }}
                                                />
                                            </div>

                                            <InputError
                                                message={
                                                    err.contact_country_code &&
                                                    !contactCountryCode
                                                        ? err.contact_country_code
                                                        : err.contact_number &&
                                                            shouldShowError(
                                                                'contact_number',
                                                            )
                                                          ? err.contact_number
                                                          : undefined
                                                }
                                            />
                                        </div>

                                        <div className="grid gap-2">
                                            <Label htmlFor="organization_name">
                                                Agency / Organization /
                                                Institution{' '}
                                                <span className="text-[11px] font-semibold text-red-600">
                                                    {' '}
                                                    *
                                                </span>
                                            </Label>
                                            <Input
                                                id="organization_name"
                                                type="text"
                                                tabIndex={
                                                    honorificTitle === 'other'
                                                        ? 12
                                                        : 11
                                                }
                                                name="organization_name"
                                                placeholder="Name of organization"
                                                className={inputClass}
                                            />
                                            <InputError
                                                message={
                                                    err.organization_name &&
                                                    shouldShowError(
                                                        'organization_name',
                                                    )
                                                        ? err.organization_name
                                                        : undefined
                                                }
                                            />
                                        </div>

                                        <div className="grid gap-2">
                                            <Label htmlFor="position_title">
                                                Position / Designation{' '}
                                                <span className="text-[11px] font-semibold text-red-600">
                                                    {' '}
                                                    *
                                                </span>
                                            </Label>
                                            <Input
                                                id="position_title"
                                                type="text"
                                                tabIndex={
                                                    honorificTitle === 'other'
                                                        ? 13
                                                        : 12
                                                }
                                                name="position_title"
                                                placeholder="Job title / role"
                                                className={inputClass}
                                            />
                                            <InputError
                                                message={err.position_title}
                                            />
                                        </div>

                                        <div className="grid gap-2">
                                            <Label htmlFor="user_type_id">
                                                Registrant Type{' '}
                                                <span className="text-[11px] font-semibold text-red-600">
                                                    {' '}
                                                    *
                                                </span>
                                            </Label>
                                            <input
                                                type="hidden"
                                                name="user_type_id"
                                                value={registrantType}
                                            />

                                            <Popover
                                                open={typeOpen}
                                                onOpenChange={setTypeOpen}
                                            >
                                                <PopoverTrigger asChild>
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        role="combobox"
                                                        aria-expanded={typeOpen}
                                                        className={
                                                            comboboxTriggerClass
                                                        }
                                                        tabIndex={
                                                            honorificTitle ===
                                                            'other'
                                                                ? 14
                                                                : 13
                                                        }
                                                    >
                                                        <span className="truncate">
                                                            {selectedType ? (
                                                                selectedType.name
                                                            ) : (
                                                                <span className="text-muted-foreground">
                                                                    Select
                                                                    registrant
                                                                    type…
                                                                </span>
                                                            )}
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
                                                            No type found.
                                                        </CommandEmpty>
                                                        <CommandGroup>
                                                            {filteredRegistrantTypes.map(
                                                                (item) => (
                                                                    <CommandItem
                                                                        key={
                                                                            item.id
                                                                        }
                                                                        value={
                                                                            item.name
                                                                        }
                                                                        onSelect={() => {
                                                                            setTypeOpen(
                                                                                false,
                                                                            );
                                                                            setRegistrantType(
                                                                                String(
                                                                                    item.id,
                                                                                ),
                                                                            );

                                                                            const isOther =
                                                                                (
                                                                                    item.slug ??
                                                                                    ''
                                                                                )
                                                                                    .trim()
                                                                                    .toLowerCase() ===
                                                                                    'other' ||
                                                                                (
                                                                                    item.name ??
                                                                                    ''
                                                                                )
                                                                                    .trim()
                                                                                    .toLowerCase() ===
                                                                                    'other';

                                                                            if (
                                                                                !isOther
                                                                            ) {
                                                                                setOtherRegistrantType(
                                                                                    '',
                                                                                ); // ✅ clear immediately if not other
                                                                            }
                                                                        }}
                                                                    >
                                                                        {
                                                                            item.name
                                                                        }
                                                                        <Check
                                                                            className={cn(
                                                                                'ml-auto h-4 w-4',
                                                                                registrantType ===
                                                                                    String(
                                                                                        item.id,
                                                                                    )
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

                                            <InputError
                                                message={
                                                    (err.user_type_id ||
                                                        err.registrant_type) &&
                                                    registrantType === ''
                                                        ? (err.user_type_id ??
                                                          err.registrant_type)
                                                        : undefined
                                                }
                                            />
                                        </div>

                                        {isOtherRegistrantType ? (
                                            <div className="grid gap-2">
                                                <Label htmlFor="other_user_type">
                                                    Please specify
                                                </Label>
                                                <Input
                                                    ref={otherUserTypeRef}
                                                    id="other_user_type"
                                                    name="other_user_type"
                                                    value={otherRegistrantType}
                                                    onChange={(e) =>
                                                        setOtherRegistrantType(
                                                            e.target.value,
                                                        )
                                                    }
                                                    maxLength={120}
                                                    placeholder="Enter your role"
                                                    className={inputClass}
                                                />
                                                <InputError
                                                    message={showIfEmpty(
                                                        err.other_user_type,
                                                        otherRegistrantType,
                                                    )}
                                                />
                                            </div>
                                        ) : null}

                                        <div className="grid gap-2">
                                            <Label htmlFor="programme_ids">
                                                Registration event
                                            </Label>
                                            {programmeIds.map((id) => (
                                                <input
                                                    key={id}
                                                    type="hidden"
                                                    name="programme_ids[]"
                                                    value={id}
                                                />
                                            ))}

                                            <div className="rounded-xl border border-slate-200 bg-white px-3 py-3 shadow-[inset_0_1px_2px_rgba(2,6,23,0.06)]">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <Sparkles className="h-4 w-4 text-[#0033A0]" />
                                                    <span className="font-medium text-slate-800">
                                                        {
                                                            formattedProgrammeLabel
                                                        }
                                                    </span>
                                                    {activeProgramme ? (
                                                        <Badge
                                                            variant="secondary"
                                                            className="bg-slate-100 text-slate-600"
                                                        >
                                                            <CalendarRange className="h-3 w-3" />
                                                            {formatProgrammeDate(
                                                                activeProgramme.starts_at,
                                                            )}
                                                        </Badge>
                                                    ) : null}
                                                    {activeProgramme?.is_registration_active ? (
                                                        <Badge
                                                            variant="secondary"
                                                            className="bg-[#0033A0]/10 text-[#0033A0]"
                                                        >
                                                            Active registration
                                                        </Badge>
                                                    ) : null}
                                                </div>

                                                {activeProgramme?.description ? (
                                                    <p className="mt-2 text-sm leading-6 text-slate-500">
                                                        {
                                                            activeProgramme.description
                                                        }
                                                    </p>
                                                ) : null}
                                            </div>

                                            {false ? (
                                                <Popover
                                                    open={false}
                                                    onOpenChange={() => {}}
                                                >
                                                    <PopoverTrigger asChild>
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            role="combobox"
                                                            aria-expanded={
                                                                false
                                                            }
                                                            className={
                                                                comboboxTriggerClass
                                                            }
                                                            tabIndex={6}
                                                        >
                                                            <span className="flex min-w-0 items-center gap-2">
                                                                <Sparkles className="h-4 w-4 text-[#0033A0]" />
                                                                <span className="truncate text-left">
                                                                    {
                                                                        formattedProgrammeLabel
                                                                    }
                                                                </span>
                                                            </span>
                                                            <ChevronsUpDown className="h-4 w-4 opacity-50" />
                                                        </Button>
                                                    </PopoverTrigger>

                                                    <PopoverContent
                                                        align="start"
                                                        sideOffset={8}
                                                        className={cn(
                                                            'z-50 p-0',
                                                            'w-[min(calc(100vw-1.5rem),var(--radix-popover-trigger-width))]',
                                                            'sm:w-[520px]',
                                                        )}
                                                    >
                                                        <Command className="overflow-hidden rounded-xl">
                                                            <CommandInput placeholder="Search events…" />

                                                            <CommandEmpty>
                                                                No events found.
                                                            </CommandEmpty>

                                                            {/* ✅ scrollable list (mobile friendly) */}
                                                            <CommandList className="max-h-[320px] overflow-auto sm:max-h-[380px]">
                                                                <CommandGroup>
                                                                    {programmes.map(
                                                                        (
                                                                            item,
                                                                        ) => {
                                                                            const isSelected =
                                                                                programmeIds.includes(
                                                                                    String(
                                                                                        item.id,
                                                                                    ),
                                                                                );

                                                                            return (
                                                                                <CommandItem
                                                                                    key={
                                                                                        item.id
                                                                                    }
                                                                                    value={`${item.title} ${item.description ?? ''}`}
                                                                                    onSelect={() => {
                                                                                        setProgrammeIds(
                                                                                            (
                                                                                                prev,
                                                                                            ) => {
                                                                                                const next =
                                                                                                    new Set(
                                                                                                        prev,
                                                                                                    );
                                                                                                const id =
                                                                                                    String(
                                                                                                        item.id,
                                                                                                    );

                                                                                                if (
                                                                                                    next.has(
                                                                                                        id,
                                                                                                    )
                                                                                                )
                                                                                                    next.delete(
                                                                                                        id,
                                                                                                    );
                                                                                                else
                                                                                                    next.add(
                                                                                                        id,
                                                                                                    );

                                                                                                return Array.from(
                                                                                                    next,
                                                                                                );
                                                                                            },
                                                                                        );
                                                                                    }}
                                                                                    className="items-start gap-3"
                                                                                >
                                                                                    {/* ✅ show check ONLY when selected */}
                                                                                    <span
                                                                                        className={cn(
                                                                                            'mt-1 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md border',
                                                                                            isSelected
                                                                                                ? 'border-emerald-500 bg-emerald-500 text-white shadow-sm'
                                                                                                : 'border-slate-200 bg-white',
                                                                                        )}
                                                                                    >
                                                                                        {isSelected ? (
                                                                                            <Check className="h-3.5 w-3.5" />
                                                                                        ) : null}
                                                                                    </span>

                                                                                    <div className="min-w-0 flex-1 space-y-2">
                                                                                        <div className="flex flex-wrap items-center gap-2">
                                                                                            <span className="min-w-0 truncate font-medium text-slate-700">
                                                                                                {
                                                                                                    item.title
                                                                                                }
                                                                                            </span>

                                                                                            <Badge
                                                                                                variant="secondary"
                                                                                                className="bg-slate-100 text-slate-600"
                                                                                            >
                                                                                                <CalendarRange className="h-3 w-3" />
                                                                                                {formatProgrammeDate(
                                                                                                    item.starts_at,
                                                                                                )}
                                                                                            </Badge>

                                                                                            <Badge
                                                                                                variant="outline"
                                                                                                className="border-slate-200 text-slate-500"
                                                                                            >
                                                                                                Ends{' '}
                                                                                                {formatProgrammeDate(
                                                                                                    item.ends_at,
                                                                                                )}
                                                                                            </Badge>
                                                                                        </div>

                                                                                        {item.description && (
                                                                                            <p className="text-sm break-words text-slate-500">
                                                                                                {
                                                                                                    item.description
                                                                                                }
                                                                                            </p>
                                                                                        )}
                                                                                    </div>
                                                                                </CommandItem>
                                                                            );
                                                                        },
                                                                    )}
                                                                </CommandGroup>
                                                            </CommandList>

                                                            {/* ✅ tiny footer so users can close on mobile easily */}
                                                            <div className="flex items-center justify-between border-t bg-white/70 px-3 py-2">
                                                                <p className="text-xs text-slate-500">
                                                                    {programmeIds.length
                                                                        ? `${programmeIds.length} selected`
                                                                        : 'Select one or more events'}
                                                                </p>

                                                                <Button
                                                                    type="button"
                                                                    variant="ghost"
                                                                    className="h-8 rounded-lg px-2 text-xs"
                                                                    onClick={() => {}}
                                                                >
                                                                    Done
                                                                </Button>
                                                            </div>
                                                        </Command>
                                                    </PopoverContent>
                                                </Popover>
                                            ) : null}

                                            <InputError
                                                message={
                                                    (err.programme_ids ??
                                                        err[
                                                            'programme_ids.0'
                                                        ]) &&
                                                    programmeIds.length === 0
                                                        ? (err.programme_ids ??
                                                          err[
                                                              'programme_ids.0'
                                                          ])
                                                        : undefined
                                                }
                                            />

                                            {false &&
                                                selectedProgrammes.length >
                                                    0 && (
                                                    <div className="flex flex-wrap gap-2">
                                                        {selectedProgrammes.map(
                                                            (programme) => (
                                                                <Badge
                                                                    key={
                                                                        programme.id
                                                                    }
                                                                    variant="secondary"
                                                                    className="bg-[#0033A0]/10 text-[#0033A0]"
                                                                >
                                                                    {
                                                                        programme.title
                                                                    }
                                                                </Badge>
                                                            ),
                                                        )}
                                                    </div>
                                                )}
                                        </div>
                                    </fieldset>

                                    <fieldset
                                        data-active={currentStep === 2}
                                        aria-hidden={currentStep !== 2}
                                        className={cn(
                                            'grid gap-5 sm:grid-cols-2',
                                            currentStep === 2 ? '' : 'hidden',
                                        )}
                                    >
                                        <div className="grid gap-2">
                                            <Label htmlFor="password">
                                                Password{' '}
                                                <span className="text-[11px] font-semibold text-red-600">
                                                    {' '}
                                                    *
                                                </span>
                                            </Label>
                                            <div className="relative">
                                                <Input
                                                    id="password"
                                                    type={
                                                        showPassword
                                                            ? 'text'
                                                            : 'password'
                                                    }
                                                    tabIndex={7}
                                                    autoComplete="new-password"
                                                    name="password"
                                                    placeholder="Password"
                                                    className={cn(
                                                        inputClass,
                                                        'pr-10',
                                                    )}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setShowPassword(
                                                            (prev) => !prev,
                                                        )
                                                    }
                                                    className="absolute top-1/2 right-3 -translate-y-1/2 text-slate-500 transition hover:text-slate-700"
                                                    aria-label={
                                                        showPassword
                                                            ? 'Hide password'
                                                            : 'Show password'
                                                    }
                                                >
                                                    {showPassword ? (
                                                        <EyeOff className="h-4 w-4" />
                                                    ) : (
                                                        <Eye className="h-4 w-4" />
                                                    )}
                                                </button>
                                            </div>

                                            <InputError
                                                message={
                                                    err.password &&
                                                    shouldShowError('password')
                                                        ? err.password
                                                        : undefined
                                                }
                                            />
                                        </div>

                                        <div className="grid gap-2">
                                            <Label htmlFor="password_confirmation">
                                                Confirm password{' '}
                                                <span className="text-[11px] font-semibold text-red-600">
                                                    {' '}
                                                    *
                                                </span>
                                            </Label>
                                            <div className="relative">
                                                <Input
                                                    id="password_confirmation"
                                                    type={
                                                        showConfirmPassword
                                                            ? 'text'
                                                            : 'password'
                                                    }
                                                    tabIndex={8}
                                                    autoComplete="new-password"
                                                    name="password_confirmation"
                                                    placeholder="Confirm password"
                                                    className={cn(
                                                        inputClass,
                                                        'pr-10',
                                                    )}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setShowConfirmPassword(
                                                            (prev) => !prev,
                                                        )
                                                    }
                                                    className="absolute top-1/2 right-3 -translate-y-1/2 text-slate-500 transition hover:text-slate-700"
                                                    aria-label={
                                                        showConfirmPassword
                                                            ? 'Hide password confirmation'
                                                            : 'Show password confirmation'
                                                    }
                                                >
                                                    {showConfirmPassword ? (
                                                        <EyeOff className="h-4 w-4" />
                                                    ) : (
                                                        <Eye className="h-4 w-4" />
                                                    )}
                                                </button>
                                            </div>

                                            <InputError
                                                message={
                                                    err.password_confirmation
                                                }
                                            />
                                        </div>
                                    </fieldset>

                                    <fieldset
                                        data-active={
                                            currentStep ===
                                            eventDetailsStepIndex
                                        }
                                        aria-hidden={
                                            currentStep !==
                                            eventDetailsStepIndex
                                        }
                                        className={cn(
                                            'grid gap-3 text-left',
                                            currentStep ===
                                                eventDetailsStepIndex
                                                ? ''
                                                : 'hidden',
                                        )}
                                    >
                                        {selectedProgrammesWithFields.length ? (
                                            selectedProgrammesWithFields.map(
                                                (programme) => (
                                                    <div
                                                        key={programme.id}
                                                        className="rounded-xl border border-slate-200/70 bg-white/70 p-3 backdrop-blur"
                                                    >
                                                        <div>
                                                            <p className="text-[11px] font-semibold tracking-wide text-slate-700 uppercase">
                                                                {
                                                                    programme.title
                                                                }
                                                            </p>
                                                            <p className="mt-1 text-sm leading-snug text-slate-600">
                                                                Event-specific
                                                                registration
                                                                details.
                                                            </p>
                                                        </div>

                                                        <div className="mt-4 grid gap-4">
                                                            {(
                                                                programme.registration_fields ??
                                                                []
                                                            )
                                                                .filter(
                                                                    (field) =>
                                                                        isRegistrationFieldVisible(
                                                                            programme,
                                                                            field,
                                                                            registrationResponses,
                                                                        ),
                                                                )
                                                                .map(
                                                                    (field) => {
                                                                        const value =
                                                                            getDynamicValue(
                                                                                programme.id,
                                                                                field.id,
                                                                            );
                                                                        const stringValue =
                                                                            Array.isArray(
                                                                                value,
                                                                            )
                                                                                ? ''
                                                                                : value;
                                                                        const fieldErrorKey =
                                                                            dynamicErrorKey(
                                                                                programme.id,
                                                                                field.id,
                                                                            );
                                                                        const fieldError =
                                                                            err[
                                                                                fieldErrorKey
                                                                            ];
                                                                        const otherError =
                                                                            err[
                                                                                dynamicOtherErrorKey(
                                                                                    programme.id,
                                                                                    field.id,
                                                                                )
                                                                            ];
                                                                        const otherValue =
                                                                            getDynamicOtherValue(
                                                                                programme.id,
                                                                                field.id,
                                                                            );
                                                                        const fieldHasOther =
                                                                            (
                                                                                field.options ??
                                                                                []
                                                                            ).some(
                                                                                (
                                                                                    option,
                                                                                ) =>
                                                                                    option
                                                                                        .trim()
                                                                                        .toLowerCase() ===
                                                                                    'other',
                                                                            );
                                                                        const fieldOtherSelected =
                                                                            fieldHasOther &&
                                                                            (Array.isArray(
                                                                                value,
                                                                            )
                                                                                ? value.some(
                                                                                      (
                                                                                          item,
                                                                                      ) =>
                                                                                          String(
                                                                                              item,
                                                                                          )
                                                                                              .trim()
                                                                                              .toLowerCase() ===
                                                                                          'other',
                                                                                  )
                                                                                : String(
                                                                                      value,
                                                                                  )
                                                                                      .trim()
                                                                                      .toLowerCase() ===
                                                                                  'other');
                                                                        const isCountryDelegationCountry =
                                                                            field.field_key ===
                                                                            'country_delegation_country';
                                                                        const isAsemme10ConsentField =
                                                                            isAsemme10Registration &&
                                                                            ASEMME_CONSENT_FIELD_KEYS.has(
                                                                                field.field_key,
                                                                            );

                                                                        if (
                                                                            field.field_type ===
                                                                            'section'
                                                                        ) {
                                                                            return (
                                                                                <div
                                                                                    key={
                                                                                        field.id
                                                                                    }
                                                                                    className="border-t border-slate-200 pt-4 first:border-t-0 first:pt-0"
                                                                                >
                                                                                    <p className="text-sm font-semibold tracking-wide text-slate-800 uppercase">
                                                                                        {
                                                                                            field.label
                                                                                        }
                                                                                    </p>
                                                                                    {field.help_text ? (
                                                                                        <p className="mt-1 text-sm text-slate-500">
                                                                                            {
                                                                                                field.help_text
                                                                                            }
                                                                                        </p>
                                                                                    ) : null}
                                                                                </div>
                                                                            );
                                                                        }

                                                                        if (
                                                                            isAsemme10Registration &&
                                                                            isCountryDelegationCountry
                                                                        ) {
                                                                            return (
                                                                                <div
                                                                                    key={
                                                                                        field.id
                                                                                    }
                                                                                    data-error-key={
                                                                                        fieldErrorKey
                                                                                    }
                                                                                    className="grid gap-2"
                                                                                >
                                                                                    <Label>
                                                                                        {
                                                                                            field.label
                                                                                        }
                                                                                    </Label>
                                                                                    <Popover
                                                                                        open={
                                                                                            countryOpen
                                                                                        }
                                                                                        onOpenChange={
                                                                                            setCountryOpen
                                                                                        }
                                                                                    >
                                                                                        <PopoverTrigger
                                                                                            asChild
                                                                                        >
                                                                                            <Button
                                                                                                type="button"
                                                                                                variant="outline"
                                                                                                role="combobox"
                                                                                                aria-expanded={
                                                                                                    countryOpen
                                                                                                }
                                                                                                className={
                                                                                                    comboboxTriggerClass
                                                                                                }
                                                                                            >
                                                                                                <span className="flex min-w-0 items-center gap-2">
                                                                                                    {countryOther ? (
                                                                                                        <span className="truncate">
                                                                                                            Other:{' '}
                                                                                                            {
                                                                                                                countryOther
                                                                                                            }
                                                                                                        </span>
                                                                                                    ) : selectedCountry ? (
                                                                                                        <>
                                                                                                            {selectedCountry.flag_url ? (
                                                                                                                <img
                                                                                                                    src={
                                                                                                                        selectedCountry.flag_url
                                                                                                                    }
                                                                                                                    alt=""
                                                                                                                    className="h-6 w-6 shrink-0 rounded-md border border-slate-200 object-cover"
                                                                                                                    loading="lazy"
                                                                                                                    draggable={
                                                                                                                        false
                                                                                                                    }
                                                                                                                />
                                                                                                            ) : (
                                                                                                                <span className="grid h-6 w-6 place-items-center rounded-md border border-slate-200 bg-slate-50 text-[10px] text-slate-400">
                                                                                                                    {
                                                                                                                        selectedCountry.code
                                                                                                                    }
                                                                                                                </span>
                                                                                                            )}
                                                                                                            <span className="truncate">
                                                                                                                {
                                                                                                                    selectedCountry.name
                                                                                                                }
                                                                                                            </span>
                                                                                                        </>
                                                                                                    ) : (
                                                                                                        <span className="text-muted-foreground">
                                                                                                            Select
                                                                                                            country...
                                                                                                        </span>
                                                                                                    )}
                                                                                                </span>
                                                                                                <ChevronsUpDown className="h-4 w-4 opacity-50" />
                                                                                            </Button>
                                                                                        </PopoverTrigger>
                                                                                        <PopoverContent
                                                                                            className="z-50 w-[--radix-popover-trigger-width] p-0"
                                                                                            align="start"
                                                                                        >
                                                                                            <Command>
                                                                                                <CommandInput placeholder="Search country..." />
                                                                                                <CommandEmpty>
                                                                                                    No
                                                                                                    country
                                                                                                    found.
                                                                                                </CommandEmpty>
                                                                                                <CommandList className="max-h-[320px] overflow-auto overscroll-contain sm:max-h-[380px]">
                                                                                                    <CommandGroup heading="ASEAN Countries">
                                                                                                        {groupedCountries.asean.map(
                                                                                                            (
                                                                                                                item,
                                                                                                            ) => (
                                                                                                                <CommandItem
                                                                                                                    key={
                                                                                                                        item.id
                                                                                                                    }
                                                                                                                    value={
                                                                                                                        item.name
                                                                                                                    }
                                                                                                                    onSelect={() => {
                                                                                                                        setCountry(
                                                                                                                            String(
                                                                                                                                item.id,
                                                                                                                            ),
                                                                                                                        );
                                                                                                                        setCountryOther(
                                                                                                                            '',
                                                                                                                        );
                                                                                                                        setDynamicValue(
                                                                                                                            programme.id,
                                                                                                                            field.id,
                                                                                                                            item.name,
                                                                                                                        );
                                                                                                                        setCountryOpen(
                                                                                                                            false,
                                                                                                                        );
                                                                                                                    }}
                                                                                                                    className="gap-2"
                                                                                                                >
                                                                                                                    {item.flag_url ? (
                                                                                                                        <img
                                                                                                                            src={
                                                                                                                                item.flag_url
                                                                                                                            }
                                                                                                                            alt=""
                                                                                                                            className="h-6 w-6 shrink-0 rounded-md border border-slate-200 object-cover"
                                                                                                                            loading="lazy"
                                                                                                                            draggable={
                                                                                                                                false
                                                                                                                            }
                                                                                                                        />
                                                                                                                    ) : (
                                                                                                                        <span className="grid h-6 w-6 place-items-center rounded-md border border-slate-200 bg-slate-50 text-[10px] text-slate-400">
                                                                                                                            {
                                                                                                                                item.code
                                                                                                                            }
                                                                                                                        </span>
                                                                                                                    )}
                                                                                                                    <span className="truncate">
                                                                                                                        {
                                                                                                                            item.name
                                                                                                                        }
                                                                                                                    </span>
                                                                                                                    <Check
                                                                                                                        className={cn(
                                                                                                                            'ml-auto h-4 w-4',
                                                                                                                            country ===
                                                                                                                                String(
                                                                                                                                    item.id,
                                                                                                                                ) &&
                                                                                                                                !countryOther
                                                                                                                                ? 'opacity-100'
                                                                                                                                : 'opacity-0',
                                                                                                                        )}
                                                                                                                    />
                                                                                                                </CommandItem>
                                                                                                            ),
                                                                                                        )}
                                                                                                    </CommandGroup>
                                                                                                    {groupedCountries
                                                                                                        .nonAsean
                                                                                                        .length >
                                                                                                    0 ? (
                                                                                                        <CommandGroup heading="Non-ASEAN Countries">
                                                                                                            {groupedCountries.nonAsean.map(
                                                                                                                (
                                                                                                                    item,
                                                                                                                ) => (
                                                                                                                    <CommandItem
                                                                                                                        key={
                                                                                                                            item.id
                                                                                                                        }
                                                                                                                        value={`${item.name} ${item.code}`}
                                                                                                                        onSelect={() => {
                                                                                                                            setCountry(
                                                                                                                                String(
                                                                                                                                    item.id,
                                                                                                                                ),
                                                                                                                            );
                                                                                                                            setCountryOther(
                                                                                                                                '',
                                                                                                                            );
                                                                                                                            setDynamicValue(
                                                                                                                                programme.id,
                                                                                                                                field.id,
                                                                                                                                item.name,
                                                                                                                            );
                                                                                                                            setCountryOpen(
                                                                                                                                false,
                                                                                                                            );
                                                                                                                        }}
                                                                                                                        className="gap-2"
                                                                                                                    >
                                                                                                                        {item.flag_url ? (
                                                                                                                            <img
                                                                                                                                src={
                                                                                                                                    item.flag_url
                                                                                                                                }
                                                                                                                                alt=""
                                                                                                                                className="h-6 w-6 shrink-0 rounded-md border border-slate-200 object-cover"
                                                                                                                                loading="lazy"
                                                                                                                                draggable={
                                                                                                                                    false
                                                                                                                                }
                                                                                                                            />
                                                                                                                        ) : (
                                                                                                                            <span className="grid h-6 w-6 place-items-center rounded-md border border-slate-200 bg-slate-50 text-[10px] text-slate-400">
                                                                                                                                {
                                                                                                                                    item.code
                                                                                                                                }
                                                                                                                            </span>
                                                                                                                        )}
                                                                                                                        <span className="truncate">
                                                                                                                            {
                                                                                                                                item.name
                                                                                                                            }
                                                                                                                        </span>
                                                                                                                        <Check
                                                                                                                            className={cn(
                                                                                                                                'ml-auto h-4 w-4',
                                                                                                                                country ===
                                                                                                                                    String(
                                                                                                                                        item.id,
                                                                                                                                    ) &&
                                                                                                                                    !countryOther
                                                                                                                                    ? 'opacity-100'
                                                                                                                                    : 'opacity-0',
                                                                                                                            )}
                                                                                                                        />
                                                                                                                    </CommandItem>
                                                                                                                ),
                                                                                                            )}
                                                                                                        </CommandGroup>
                                                                                                    ) : null}
                                                                                                    <CommandGroup heading="Other">
                                                                                                        <CommandItem
                                                                                                            value="Other country"
                                                                                                            onSelect={() => {
                                                                                                                setCountry(
                                                                                                                    '',
                                                                                                                );
                                                                                                                setCountryOther(
                                                                                                                    'Other',
                                                                                                                );
                                                                                                                setDynamicValue(
                                                                                                                    programme.id,
                                                                                                                    field.id,
                                                                                                                    'Other',
                                                                                                                );
                                                                                                                setCountryOpen(
                                                                                                                    false,
                                                                                                                );
                                                                                                            }}
                                                                                                        >
                                                                                                            Other
                                                                                                            <Check
                                                                                                                className={cn(
                                                                                                                    'ml-auto h-4 w-4',
                                                                                                                    countryOther
                                                                                                                        ? 'opacity-100'
                                                                                                                        : 'opacity-0',
                                                                                                                )}
                                                                                                            />
                                                                                                        </CommandItem>
                                                                                                    </CommandGroup>
                                                                                                </CommandList>
                                                                                            </Command>
                                                                                        </PopoverContent>
                                                                                    </Popover>
                                                                                    {countryOther ? (
                                                                                        <Input
                                                                                            value={
                                                                                                countryOther ===
                                                                                                'Other'
                                                                                                    ? ''
                                                                                                    : countryOther
                                                                                            }
                                                                                            onChange={(
                                                                                                event,
                                                                                            ) => {
                                                                                                setCountryOther(
                                                                                                    event
                                                                                                        .target
                                                                                                        .value,
                                                                                                );
                                                                                                setDynamicValue(
                                                                                                    programme.id,
                                                                                                    field.id,
                                                                                                    event
                                                                                                        .target
                                                                                                        .value
                                                                                                        ? `Other: ${event.target.value}`
                                                                                                        : 'Other',
                                                                                                );
                                                                                            }}
                                                                                            placeholder="Please specify country"
                                                                                            className={
                                                                                                inputClass
                                                                                            }
                                                                                        />
                                                                                    ) : null}
                                                                                    <InputError
                                                                                        message={
                                                                                            fieldError
                                                                                        }
                                                                                    />
                                                                                </div>
                                                                            );
                                                                        }

                                                                        return (
                                                                            <div
                                                                                key={
                                                                                    field.id
                                                                                }
                                                                                data-error-key={
                                                                                    fieldErrorKey
                                                                                }
                                                                                className="grid gap-2"
                                                                            >
                                                                                <Label>
                                                                                    {
                                                                                        field.label
                                                                                    }
                                                                                    {field.is_required ? (
                                                                                        <span className="text-[11px] font-semibold text-red-600">
                                                                                            {' '}
                                                                                            *
                                                                                        </span>
                                                                                    ) : null}
                                                                                </Label>

                                                                                {field.field_type ===
                                                                                'textarea' ? (
                                                                                    <textarea
                                                                                        name={`registration_responses[${programme.id}][${field.id}]`}
                                                                                        value={
                                                                                            stringValue
                                                                                        }
                                                                                        onChange={(
                                                                                            event,
                                                                                        ) =>
                                                                                            setDynamicValue(
                                                                                                programme.id,
                                                                                                field.id,
                                                                                                event
                                                                                                    .target
                                                                                                    .value,
                                                                                            )
                                                                                        }
                                                                                        placeholder={
                                                                                            field.placeholder ??
                                                                                            undefined
                                                                                        }
                                                                                        className={cn(
                                                                                            inputClass,
                                                                                            'min-h-[96px] py-2',
                                                                                        )}
                                                                                    />
                                                                                ) : null}

                                                                                {[
                                                                                    'text',
                                                                                    'email',
                                                                                    'tel',
                                                                                    'date',
                                                                                ].includes(
                                                                                    field.field_type,
                                                                                ) ? (
                                                                                    <Input
                                                                                        name={`registration_responses[${programme.id}][${field.id}]`}
                                                                                        type={
                                                                                            field.field_type ===
                                                                                            'tel'
                                                                                                ? 'tel'
                                                                                                : field.field_type
                                                                                        }
                                                                                        value={
                                                                                            stringValue
                                                                                        }
                                                                                        onChange={(
                                                                                            event,
                                                                                        ) =>
                                                                                            setDynamicValue(
                                                                                                programme.id,
                                                                                                field.id,
                                                                                                event
                                                                                                    .target
                                                                                                    .value,
                                                                                            )
                                                                                        }
                                                                                        placeholder={
                                                                                            field.placeholder ??
                                                                                            undefined
                                                                                        }
                                                                                        className={
                                                                                            inputClass
                                                                                        }
                                                                                    />
                                                                                ) : null}

                                                                                {isAsemme10ConsentField ? (
                                                                                    <label className="flex items-start gap-2 rounded-md border border-slate-200 px-2.5 py-2 text-sm">
                                                                                        <Checkbox
                                                                                            checked={
                                                                                                !!stringValue
                                                                                            }
                                                                                            onCheckedChange={(
                                                                                                checked,
                                                                                            ) =>
                                                                                                setDynamicValue(
                                                                                                    programme.id,
                                                                                                    field.id,
                                                                                                    checked
                                                                                                        ? (field
                                                                                                              .options?.[0] ??
                                                                                                              'Yes')
                                                                                                        : '',
                                                                                                )
                                                                                            }
                                                                                        />
                                                                                        <span>
                                                                                            {field
                                                                                                .options?.[0] ??
                                                                                                'Yes'}
                                                                                        </span>
                                                                                    </label>
                                                                                ) : null}

                                                                                {field.field_type ===
                                                                                    'radio' &&
                                                                                !isAsemme10ConsentField ? (
                                                                                    <div className="grid gap-2 sm:grid-cols-2">
                                                                                        {(
                                                                                            field.options ??
                                                                                            []
                                                                                        ).map(
                                                                                            (
                                                                                                option,
                                                                                            ) => (
                                                                                                <label
                                                                                                    key={
                                                                                                        option
                                                                                                    }
                                                                                                    className="flex items-center gap-2 rounded-md border border-slate-200 px-2.5 py-2 text-sm"
                                                                                                >
                                                                                                    <input
                                                                                                        type="radio"
                                                                                                        name={`dynamic-${programme.id}-${field.id}`}
                                                                                                        checked={
                                                                                                            stringValue ===
                                                                                                            option
                                                                                                        }
                                                                                                        onChange={() =>
                                                                                                            setDynamicValue(
                                                                                                                programme.id,
                                                                                                                field.id,
                                                                                                                option,
                                                                                                            )
                                                                                                        }
                                                                                                    />
                                                                                                    <span>
                                                                                                        {
                                                                                                            option
                                                                                                        }
                                                                                                    </span>
                                                                                                </label>
                                                                                            ),
                                                                                        )}
                                                                                    </div>
                                                                                ) : null}

                                                                                {field.field_type ===
                                                                                'checkbox' ? (
                                                                                    <div className="grid gap-2 sm:grid-cols-2">
                                                                                        {(
                                                                                            field.options ??
                                                                                            []
                                                                                        ).map(
                                                                                            (
                                                                                                option,
                                                                                            ) => {
                                                                                                const checkedValues =
                                                                                                    Array.isArray(
                                                                                                        value,
                                                                                                    )
                                                                                                        ? value
                                                                                                        : [];

                                                                                                return (
                                                                                                    <label
                                                                                                        key={
                                                                                                            option
                                                                                                        }
                                                                                                        className="flex items-center gap-2 rounded-md border border-slate-200 px-2.5 py-2 text-sm"
                                                                                                    >
                                                                                                        <Checkbox
                                                                                                            checked={checkedValues.includes(
                                                                                                                option,
                                                                                                            )}
                                                                                                            onCheckedChange={(
                                                                                                                checked,
                                                                                                            ) =>
                                                                                                                toggleDynamicCheckbox(
                                                                                                                    programme.id,
                                                                                                                    field.id,
                                                                                                                    option,
                                                                                                                    Boolean(
                                                                                                                        checked,
                                                                                                                    ),
                                                                                                                )
                                                                                                            }
                                                                                                        />
                                                                                                        <span>
                                                                                                            {
                                                                                                                option
                                                                                                            }
                                                                                                        </span>
                                                                                                    </label>
                                                                                                );
                                                                                            },
                                                                                        )}
                                                                                    </div>
                                                                                ) : null}

                                                                                {field.field_type ===
                                                                                'select' ? (
                                                                                    <Popover
                                                                                        open={
                                                                                            dynamicSelectOpen[
                                                                                                `${programme.id}-${field.id}`
                                                                                            ] ??
                                                                                            false
                                                                                        }
                                                                                        onOpenChange={(
                                                                                            open,
                                                                                        ) =>
                                                                                            setDynamicSelectOpen(
                                                                                                (
                                                                                                    current,
                                                                                                ) => ({
                                                                                                    ...current,
                                                                                                    [`${programme.id}-${field.id}`]:
                                                                                                        open,
                                                                                                }),
                                                                                            )
                                                                                        }
                                                                                    >
                                                                                        <PopoverTrigger
                                                                                            asChild
                                                                                        >
                                                                                            <Button
                                                                                                type="button"
                                                                                                variant="outline"
                                                                                                role="combobox"
                                                                                                className={
                                                                                                    comboboxTriggerClass
                                                                                                }
                                                                                            >
                                                                                                <span className="truncate">
                                                                                                    {stringValue ||
                                                                                                        field.placeholder ||
                                                                                                        'Select an option...'}
                                                                                                </span>
                                                                                                <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
                                                                                            </Button>
                                                                                        </PopoverTrigger>
                                                                                        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                                                                                            <Command>
                                                                                                <CommandInput placeholder="Search options..." />
                                                                                                <CommandList>
                                                                                                    <CommandEmpty>
                                                                                                        No
                                                                                                        option
                                                                                                        found.
                                                                                                    </CommandEmpty>
                                                                                                    <CommandGroup>
                                                                                                        {(
                                                                                                            field.options ??
                                                                                                            []
                                                                                                        ).map(
                                                                                                            (
                                                                                                                option,
                                                                                                            ) => (
                                                                                                                <CommandItem
                                                                                                                    key={
                                                                                                                        option
                                                                                                                    }
                                                                                                                    value={
                                                                                                                        option
                                                                                                                    }
                                                                                                                    onSelect={() => {
                                                                                                                        setDynamicValue(
                                                                                                                            programme.id,
                                                                                                                            field.id,
                                                                                                                            option,
                                                                                                                        );
                                                                                                                        setDynamicSelectOpen(
                                                                                                                            (
                                                                                                                                current,
                                                                                                                            ) => ({
                                                                                                                                ...current,
                                                                                                                                [`${programme.id}-${field.id}`]: false,
                                                                                                                            }),
                                                                                                                        );
                                                                                                                    }}
                                                                                                                >
                                                                                                                    <Check
                                                                                                                        className={cn(
                                                                                                                            'mr-2 h-4 w-4',
                                                                                                                            stringValue ===
                                                                                                                                option
                                                                                                                                ? 'opacity-100'
                                                                                                                                : 'opacity-0',
                                                                                                                        )}
                                                                                                                    />
                                                                                                                    {
                                                                                                                        option
                                                                                                                    }
                                                                                                                </CommandItem>
                                                                                                            ),
                                                                                                        )}
                                                                                                    </CommandGroup>
                                                                                                </CommandList>
                                                                                            </Command>
                                                                                        </PopoverContent>
                                                                                    </Popover>
                                                                                ) : null}

                                                                                {isAsemme10Registration &&
                                                                                fieldOtherSelected ? (
                                                                                    <div
                                                                                        className="grid gap-2"
                                                                                        data-error-key={dynamicOtherErrorKey(
                                                                                            programme.id,
                                                                                            field.id,
                                                                                        )}
                                                                                    >
                                                                                        <Label>
                                                                                            Please
                                                                                            specify
                                                                                        </Label>
                                                                                        <Input
                                                                                            value={
                                                                                                otherValue
                                                                                            }
                                                                                            onChange={(
                                                                                                event,
                                                                                            ) =>
                                                                                                setDynamicOtherValue(
                                                                                                    programme.id,
                                                                                                    field.id,
                                                                                                    event
                                                                                                        .target
                                                                                                        .value,
                                                                                                )
                                                                                            }
                                                                                            placeholder="Please specify"
                                                                                            className={
                                                                                                inputClass
                                                                                            }
                                                                                        />
                                                                                        <InputError
                                                                                            message={
                                                                                                otherError
                                                                                            }
                                                                                        />
                                                                                    </div>
                                                                                ) : null}

                                                                                {field.help_text ? (
                                                                                    <p className="text-xs text-slate-500">
                                                                                        {
                                                                                            field.help_text
                                                                                        }
                                                                                    </p>
                                                                                ) : null}
                                                                                <InputError
                                                                                    message={
                                                                                        fieldError
                                                                                    }
                                                                                />
                                                                            </div>
                                                                        );
                                                                    },
                                                                )}
                                                        </div>
                                                    </div>
                                                ),
                                            )
                                        ) : (
                                            <div className="rounded-xl border border-slate-200/70 bg-white/70 p-3 text-sm text-slate-600 backdrop-blur">
                                                No event-specific fields are
                                                configured for your selected
                                                event(s).
                                            </div>
                                        )}
                                    </fieldset>

                                    <fieldset
                                        data-active={currentStep === 4}
                                        aria-hidden={currentStep !== 4}
                                        className={cn(
                                            'grid gap-3 text-left',
                                            currentStep === 4 ? '' : 'hidden',
                                        )}
                                    >
                                        <div className="rounded-xl border border-slate-200/70 bg-white/70 p-3 backdrop-blur">
                                            <div>
                                                <p className="text-[11px] font-semibold tracking-wide text-slate-700 uppercase">
                                                    Welcome Dinner
                                                </p>
                                            </div>

                                            <div className="mt-3 grid gap-2">
                                                <Label>
                                                    Will you attend the welcome
                                                    dinner?
                                                </Label>
                                                <div className="mt-1 grid gap-2 sm:grid-cols-2">
                                                    <label className="flex items-center gap-2 rounded-md border border-slate-200 px-2.5 py-2 text-sm">
                                                        <input
                                                            type="radio"
                                                            value="yes"
                                                            checked={
                                                                attendWelcomeDinner ===
                                                                'yes'
                                                            }
                                                            onChange={() =>
                                                                setAttendWelcomeDinner(
                                                                    'yes',
                                                                )
                                                            }
                                                        />
                                                        Yes
                                                    </label>
                                                    <label className="flex items-center gap-2 rounded-md border border-slate-200 px-2.5 py-2 text-sm">
                                                        <input
                                                            type="radio"
                                                            value="no"
                                                            checked={
                                                                attendWelcomeDinner ===
                                                                'no'
                                                            }
                                                            onChange={() =>
                                                                setAttendWelcomeDinner(
                                                                    'no',
                                                                )
                                                            }
                                                        />
                                                        No
                                                    </label>
                                                </div>
                                                <InputError
                                                    message={
                                                        err.attend_welcome_dinner
                                                    }
                                                />
                                            </div>

                                            <div className="mt-3 grid gap-2">
                                                <Label>
                                                    Will you avail of the
                                                    transportation to The
                                                    Peninsula Manila?
                                                </Label>
                                                <div className="mt-1 grid gap-2 sm:grid-cols-2">
                                                    <label className="flex items-center gap-2 rounded-md border border-slate-200 px-2.5 py-2 text-sm">
                                                        <input
                                                            type="radio"
                                                            value="yes"
                                                            checked={
                                                                availTransportFromMakatiToPeninsula ===
                                                                'yes'
                                                            }
                                                            onChange={() =>
                                                                setAvailTransportFromMakatiToPeninsula(
                                                                    'yes',
                                                                )
                                                            }
                                                        />
                                                        Yes
                                                    </label>
                                                    <label className="flex items-center gap-2 rounded-md border border-slate-200 px-2.5 py-2 text-sm">
                                                        <input
                                                            type="radio"
                                                            value="no"
                                                            checked={
                                                                availTransportFromMakatiToPeninsula ===
                                                                'no'
                                                            }
                                                            onChange={() =>
                                                                setAvailTransportFromMakatiToPeninsula(
                                                                    'no',
                                                                )
                                                            }
                                                        />
                                                        No
                                                    </label>
                                                </div>
                                                <InputError
                                                    message={
                                                        err.avail_transport_from_makati_to_peninsula
                                                    }
                                                />
                                            </div>
                                        </div>

                                        <div className="rounded-xl border border-slate-200/70 bg-white/70 p-3 backdrop-blur">
                                            <div className="flex items-center justify-between gap-3">
                                                <div>
                                                    <p className="text-[11px] font-semibold tracking-wide text-slate-700 uppercase">
                                                        Dietary Preferences
                                                    </p>
                                                    <p className="mt-1 text-sm leading-snug text-slate-600">
                                                        Select all that apply.
                                                        (Leave blank if none)
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="mt-3 grid gap-2 sm:grid-cols-2">
                                                {FOOD_RESTRICTION_OPTIONS.map(
                                                    (option) => {
                                                        const checked =
                                                            foodRestrictions.includes(
                                                                option.value,
                                                            );

                                                        return (
                                                            <label
                                                                key={
                                                                    option.value
                                                                }
                                                                className="flex items-center gap-2 rounded-md border border-slate-200 px-2.5 py-2 text-sm"
                                                            >
                                                                <Checkbox
                                                                    checked={
                                                                        checked
                                                                    }
                                                                    onCheckedChange={(
                                                                        value,
                                                                    ) => {
                                                                        setFoodRestrictions(
                                                                            (
                                                                                prev,
                                                                            ) => {
                                                                                if (
                                                                                    value
                                                                                ) {
                                                                                    return prev.includes(
                                                                                        option.value,
                                                                                    )
                                                                                        ? prev
                                                                                        : [
                                                                                              ...prev,
                                                                                              option.value,
                                                                                          ];
                                                                                }

                                                                                return prev.filter(
                                                                                    (
                                                                                        item,
                                                                                    ) =>
                                                                                        item !==
                                                                                        option.value,
                                                                                );
                                                                            },
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

                                            {foodRestrictions.includes(
                                                'allergies',
                                            ) ? (
                                                <div className="mt-3 grid gap-2">
                                                    <Label htmlFor="dietary_allergies">
                                                        Allergies (please
                                                        specify)
                                                    </Label>
                                                    <Input
                                                        id="dietary_allergies"
                                                        name="dietary_allergies"
                                                        value={dietaryAllergies}
                                                        onChange={(event) =>
                                                            setDietaryAllergies(
                                                                event.target
                                                                    .value,
                                                            )
                                                        }
                                                        placeholder="Please specify"
                                                        className={inputClass}
                                                    />
                                                    <InputError
                                                        message={
                                                            err.dietary_allergies &&
                                                            shouldShowError(
                                                                'dietary_allergies',
                                                            )
                                                                ? err.dietary_allergies
                                                                : undefined
                                                        }
                                                    />
                                                </div>
                                            ) : null}

                                            {foodRestrictions.includes(
                                                'other',
                                            ) ? (
                                                <div className="mt-3 grid gap-2">
                                                    <Label htmlFor="dietary_other">
                                                        Other (please specify)
                                                    </Label>
                                                    <Input
                                                        id="dietary_other"
                                                        name="dietary_other"
                                                        value={dietaryOther}
                                                        onChange={(event) =>
                                                            setDietaryOther(
                                                                event.target
                                                                    .value,
                                                            )
                                                        }
                                                        placeholder="Please specify"
                                                        className={inputClass}
                                                    />
                                                    <InputError
                                                        message={
                                                            err.dietary_other
                                                        }
                                                    />
                                                </div>
                                            ) : null}

                                            <span className="mt-3 block text-[11px] leading-snug text-amber-600/90">
                                                Disclaimer: The organizing
                                                committee will make its best
                                                efforts to accommodate dietary
                                                preferences. However,
                                                availability may be subject to
                                                venue and catering limitations.
                                            </span>
                                        </div>

                                        <div className="rounded-xl border border-slate-200/70 bg-white/70 p-3 backdrop-blur">
                                            <div className="flex items-center justify-between gap-3">
                                                <div>
                                                    <p className="text-[11px] font-semibold tracking-wide text-slate-700 uppercase">
                                                        Indigenous Peoples (IP)
                                                        Affiliation
                                                    </p>
                                                    <p className="mt-1 text-sm leading-snug text-slate-600">
                                                        Are you part of an
                                                        Indigenous Peoples
                                                        group?
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="mt-3 flex flex-wrap gap-4 text-sm text-slate-700">
                                                <label className="flex items-center gap-2">
                                                    <input
                                                        type="radio"
                                                        name="ip_affiliation_choice"
                                                        value="yes"
                                                        checked={
                                                            ipAffiliation ===
                                                            'yes'
                                                        }
                                                        onChange={() =>
                                                            setIpAffiliation(
                                                                'yes',
                                                            )
                                                        }
                                                    />
                                                    Yes
                                                </label>
                                                <label className="flex items-center gap-2">
                                                    <input
                                                        type="radio"
                                                        name="ip_affiliation_choice"
                                                        value="no"
                                                        checked={
                                                            ipAffiliation ===
                                                            'no'
                                                        }
                                                        onChange={() =>
                                                            setIpAffiliation(
                                                                'no',
                                                            )
                                                        }
                                                    />
                                                    No
                                                </label>
                                            </div>
                                            {ipAffiliation === 'yes' ? (
                                                <div
                                                    className={cn(
                                                        'mt-3 grid gap-2',
                                                        ipAffiliation === 'yes'
                                                            ? ''
                                                            : 'hidden',
                                                    )}
                                                    aria-hidden={
                                                        ipAffiliation !== 'yes'
                                                    }
                                                >
                                                    <Label htmlFor="ip_group_name">
                                                        If yes, please specify
                                                    </Label>
                                                    <Input
                                                        ref={ipGroupNameRef}
                                                        id="ip_group_name"
                                                        type="text"
                                                        name="ip_group_name"
                                                        value={ipGroupName}
                                                        onChange={(e) =>
                                                            setIpGroupName(
                                                                e.target.value,
                                                            )
                                                        }
                                                        disabled={
                                                            ipAffiliation !==
                                                            'yes'
                                                        }
                                                        maxLength={150}
                                                        placeholder="Name of IP group"
                                                        className={inputClass}
                                                    />
                                                    <InputError
                                                        message={
                                                            err.ip_group_name &&
                                                            shouldShowError(
                                                                'ip_group_name',
                                                            )
                                                                ? err.ip_group_name
                                                                : undefined
                                                        }
                                                    />
                                                </div>
                                            ) : null}
                                        </div>

                                        <div className="rounded-xl border border-slate-200/70 bg-white/70 p-3 backdrop-blur">
                                            <div className="flex items-center justify-between gap-3">
                                                <div>
                                                    <p className="text-[11px] font-semibold tracking-wide text-slate-700 uppercase">
                                                        Accessibility Needs
                                                    </p>
                                                    <p className="mt-1 text-sm leading-snug text-slate-600">
                                                        Select all applicable
                                                        needs. (Leave blank if
                                                        none)
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="mt-3 grid gap-2 sm:grid-cols-2">
                                                {ACCESSIBILITY_NEEDS_OPTIONS.map(
                                                    (option) => {
                                                        const checked =
                                                            accessibilityNeeds.includes(
                                                                option.value,
                                                            );

                                                        return (
                                                            <label
                                                                key={
                                                                    option.value
                                                                }
                                                                className="flex items-center gap-2 rounded-md border border-slate-200 px-2.5 py-2 text-sm"
                                                            >
                                                                <Checkbox
                                                                    checked={
                                                                        checked
                                                                    }
                                                                    onCheckedChange={(
                                                                        value,
                                                                    ) => {
                                                                        setAccessibilityNeeds(
                                                                            (
                                                                                prev,
                                                                            ) => {
                                                                                const next =
                                                                                    new Set(
                                                                                        prev,
                                                                                    );

                                                                                if (
                                                                                    value
                                                                                )
                                                                                    next.add(
                                                                                        option.value,
                                                                                    );
                                                                                else
                                                                                    next.delete(
                                                                                        option.value,
                                                                                    );

                                                                                const arr =
                                                                                    Array.from(
                                                                                        next,
                                                                                    );

                                                                                // ✅ clear immediately when "other" is removed
                                                                                if (
                                                                                    option.value ===
                                                                                        'other' &&
                                                                                    !arr.includes(
                                                                                        'other',
                                                                                    )
                                                                                ) {
                                                                                    setAccessibilityOther(
                                                                                        '',
                                                                                    );
                                                                                }

                                                                                return arr;
                                                                            },
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

                                            {accessibilityNeeds.includes(
                                                'other',
                                            ) ? (
                                                <div className="mt-3 grid gap-2">
                                                    <Label htmlFor="accessibility_other">
                                                        Other accommodations
                                                    </Label>
                                                    <Input
                                                        id="accessibility_other"
                                                        name="accessibility_other"
                                                        value={
                                                            accessibilityOther
                                                        }
                                                        onChange={(e) =>
                                                            setAccessibilityOther(
                                                                e.target.value,
                                                            )
                                                        }
                                                        placeholder="Please specify"
                                                        className={inputClass}
                                                    />
                                                    <InputError
                                                        message={showIfEmpty(
                                                            err.accessibility_other,
                                                            accessibilityOther,
                                                        )}
                                                    />
                                                </div>
                                            ) : null}

                                            <span className="mt-3 block text-[11px] leading-snug text-amber-600/90">
                                                Disclaimer: Accessibility
                                                requests will be addressed on a
                                                best efforts basis. While the
                                                committee strives to provide
                                                inclusive support, some
                                                accommodations may depend on
                                                venue facilities and resource
                                                availability.
                                            </span>
                                        </div>

                                        <div className="rounded-xl border border-slate-200/70 bg-white/70 p-3 backdrop-blur">
                                            <div className="flex items-center justify-between">
                                                <p className="text-[11px] font-semibold tracking-wide text-slate-700 uppercase">
                                                    Emergency Contact
                                                    Information
                                                </p>
                                            </div>
                                            <div className="mt-3 grid gap-3 sm:grid-cols-2">
                                                <div className="grid gap-2">
                                                    <Label htmlFor="emergency_contact_name">
                                                        Name
                                                    </Label>
                                                    <Input
                                                        id="emergency_contact_name"
                                                        name="emergency_contact_name"
                                                        value={
                                                            emergencyContactName
                                                        }
                                                        onChange={(event) =>
                                                            setEmergencyContactName(
                                                                event.target
                                                                    .value,
                                                            )
                                                        }
                                                        placeholder="Full name"
                                                        className={inputClass}
                                                    />
                                                </div>
                                                <div className="grid gap-2">
                                                    <Label htmlFor="emergency_contact_relationship">
                                                        Relationship
                                                    </Label>
                                                    <Input
                                                        id="emergency_contact_relationship"
                                                        name="emergency_contact_relationship"
                                                        value={
                                                            emergencyContactRelationship
                                                        }
                                                        onChange={(event) =>
                                                            setEmergencyContactRelationship(
                                                                event.target
                                                                    .value,
                                                            )
                                                        }
                                                        placeholder="Relationship"
                                                        className={inputClass}
                                                    />
                                                </div>
                                                <div className="grid gap-2">
                                                    <Label htmlFor="emergency_contact_phone">
                                                        Phone Number
                                                    </Label>
                                                    <Input
                                                        id="emergency_contact_phone"
                                                        name="emergency_contact_phone"
                                                        value={
                                                            emergencyContactPhone
                                                        }
                                                        onChange={(event) =>
                                                            setEmergencyContactPhone(
                                                                event.target
                                                                    .value,
                                                            )
                                                        }
                                                        placeholder="Contact number"
                                                        className={inputClass}
                                                    />
                                                </div>
                                                <div className="grid gap-2">
                                                    <Label htmlFor="emergency_contact_email">
                                                        Email Address
                                                    </Label>
                                                    <Input
                                                        id="emergency_contact_email"
                                                        type="email"
                                                        name="emergency_contact_email"
                                                        value={
                                                            emergencyContactEmail
                                                        }
                                                        onChange={(event) =>
                                                            setEmergencyContactEmail(
                                                                event.target
                                                                    .value,
                                                            )
                                                        }
                                                        placeholder="Email"
                                                        className={inputClass}
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="rounded-xl border border-slate-200/70 bg-white/70 p-3 backdrop-blur">
                                            <div className="flex items-center justify-between">
                                                <p className="text-[11px] font-semibold tracking-wide text-slate-700 uppercase">
                                                    Contact Information Sharing
                                                    <span className="text-[11px] font-semibold text-red-600">
                                                        {' '}
                                                        *
                                                    </span>
                                                </p>
                                            </div>

                                            <p className="mt-1 text-sm leading-snug text-slate-600">
                                                To promote networking between
                                                institutions with common
                                                interests, I give my consent to
                                                CHED to share my full name,
                                                designation, institution, and
                                                email address to other attendees
                                                of the event.
                                            </p>

                                            <div className="mt-2 flex items-start gap-3">
                                                <Checkbox
                                                    id="consent-contact"
                                                    checked={consentContact}
                                                    onCheckedChange={(v) =>
                                                        setConsentContact(
                                                            Boolean(v),
                                                        )
                                                    }
                                                    className="border-emerald-500 focus-visible:ring-emerald-600/30 data-[state=checked]:border-emerald-600 data-[state=checked]:bg-emerald-600 data-[state=checked]:text-white"
                                                />
                                                <Label
                                                    htmlFor="consent-contact"
                                                    className="text-sm font-medium text-slate-700"
                                                >
                                                    I consent.
                                                </Label>
                                            </div>
                                        </div>

                                        <div className="rounded-xl border border-slate-200/70 bg-white/70 p-3 backdrop-blur">
                                            <div className="flex items-center justify-between">
                                                <p className="text-[11px] font-semibold tracking-wide text-slate-700 uppercase">
                                                    Photo and Videos Consent
                                                    <span className="text-[11px] font-semibold text-red-600">
                                                        {' '}
                                                        *
                                                    </span>
                                                </p>
                                            </div>

                                            <p className="mt-1 text-sm leading-snug text-slate-600">
                                                I hereby grant permission to the
                                                conference organizers to
                                                photograph and record me during
                                                the event. I understand that
                                                these images and recordings may
                                                be used for social media, event
                                                documentation, promotional
                                                materials for future events, and
                                                other purposes deemed
                                                appropriate by the organizers.
                                            </p>

                                            <div className="mt-2 flex items-start gap-3">
                                                <Checkbox
                                                    id="consent-media"
                                                    checked={consentMedia}
                                                    onCheckedChange={(v) =>
                                                        setConsentMedia(
                                                            Boolean(v),
                                                        )
                                                    }
                                                    className="border-emerald-500 focus-visible:ring-emerald-600/30 data-[state=checked]:border-emerald-600 data-[state=checked]:bg-emerald-600 data-[state=checked]:text-white"
                                                />
                                                <Label
                                                    htmlFor="consent-media"
                                                    className="text-sm font-medium text-slate-700"
                                                >
                                                    I consent.
                                                </Label>
                                            </div>
                                        </div>

                                        {!canContinue && (
                                            <p className="px-1 text-xs text-slate-600">
                                                Please tick both required
                                                consent boxes to continue.
                                            </p>
                                        )}
                                    </fieldset>
                                    <div className="mt-4 flex flex-wrap gap-3">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            className="h-11 rounded-xl px-5"
                                            onClick={goPrev}
                                            disabled={currentStep === 0}
                                        >
                                            Back
                                        </Button>
                                        {currentStep < steps.length - 1 ? (
                                            <Button
                                                type="button"
                                                className="h-11 w-full rounded-xl bg-[#0033A0] text-white shadow-sm hover:bg-[#002b86] sm:w-auto"
                                                onClick={goNext}
                                            >
                                                Next
                                            </Button>
                                        ) : (
                                            <Button
                                                type={
                                                    isAsemme10Registration
                                                        ? 'button'
                                                        : 'submit'
                                                }
                                                className="h-11 w-full rounded-xl bg-[#0033A0] text-white shadow-sm hover:bg-[#002b86] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                                                tabIndex={9}
                                                disabled={effectiveProcessing}
                                                data-test="register-user-button"
                                                onClick={
                                                    isAsemme10Registration
                                                        ? submitCurrentRegistration
                                                        : undefined
                                                }
                                            >
                                                {effectiveProcessing ? (
                                                    <>
                                                        <Loader2
                                                            className="h-4 w-4 animate-spin"
                                                            aria-hidden="true"
                                                        />
                                                        Registering…
                                                    </>
                                                ) : (
                                                    'Register'
                                                )}
                                            </Button>
                                        )}
                                    </div>
                                    {effectiveProcessing && (
                                        <p
                                            className="text-center text-sm text-slate-500"
                                            role="status"
                                            aria-live="polite"
                                        >
                                            Creating your account, generating
                                            your QR badge, and sending your
                                            confirmation email. Please wait…
                                        </p>
                                    )}
                                    <div className="mt-8 text-center text-sm text-muted-foreground">
                                        Already have an account?{' '}
                                        <TextLink href={login()} tabIndex={10}>
                                            Log in
                                        </TextLink>
                                    </div>
                                </div>
                            </div>

                            <Dialog
                                open={cropDialogOpen}
                                onOpenChange={setCropDialogOpen}
                            >
                                <DialogContent className="w-[calc(100%-2rem)] max-w-xl rounded-2xl bg-white text-slate-900 sm:w-full">
                                    <DialogHeader>
                                        <DialogTitle>
                                            Crop preferred image
                                        </DialogTitle>
                                        <DialogDescription>
                                            Resize and position the circle crop
                                            for your virtual ID photo.
                                        </DialogDescription>
                                    </DialogHeader>

                                    {cropImageSrc ? (
                                        <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50 p-3">
                                            <ReactCrop
                                                crop={crop}
                                                aspect={1}
                                                circularCrop
                                                minWidth={120}
                                                onChange={(_, percentCrop) =>
                                                    setCrop(percentCrop)
                                                }
                                                onComplete={(pixelCrop) =>
                                                    setCompletedCrop(pixelCrop)
                                                }
                                                className="max-h-[60vh]"
                                            >
                                                <img
                                                    ref={cropImageRef}
                                                    src={cropImageSrc}
                                                    alt="Selected preferred ID"
                                                    className="max-h-[56vh] w-full object-contain"
                                                    onLoad={(event) => {
                                                        const {
                                                            width,
                                                            height,
                                                        } = event.currentTarget;

                                                        setCrop(
                                                            getCenteredCircleCrop(
                                                                width,
                                                                height,
                                                            ),
                                                        );
                                                        setCompletedCrop(
                                                            undefined,
                                                        );
                                                    }}
                                                />
                                            </ReactCrop>
                                        </div>
                                    ) : null}

                                    <DialogFooter>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() =>
                                                setCropDialogOpen(false)
                                            }
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            type="button"
                                            className="bg-[#0033A0] text-white hover:bg-[#002b86]"
                                            onClick={
                                                handleUseCroppedPreferredImage
                                            }
                                        >
                                            Use image
                                        </Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>

                            <Dialog
                                open={successOpen}
                                onOpenChange={setSuccessOpen}
                            >
                                <DialogContent
                                    className="max-h-[calc(100vh-1.5rem)] w-[calc(100%-2rem)] !max-w-2xl overflow-y-auto rounded-2xl border-none bg-white p-5 text-slate-900 sm:w-full sm:p-6"
                                    style={{ colorScheme: 'light' }}
                                >
                                    <DialogHeader className="items-center text-center">
                                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0033A0] text-white shadow-lg shadow-[#0033A0]/20">
                                            <CheckCircle2 className="h-7 w-7" />
                                        </div>

                                        <DialogTitle className="text-xl text-slate-800">
                                            Registration successful
                                        </DialogTitle>

                                        <DialogDescription className="text-sm text-slate-600">
                                            {asemme10Submission
                                                ? 'Your ASEMME10 registration was submitted.'
                                                : 'Your virtual participant ID is ready. A copy was also sent to your email.'}
                                            <span className="mt-2 block rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-900">
                                                <span className="font-semibold">
                                                    Please check your EMAIL.
                                                </span>{' '}
                                                Also check your{' '}
                                                <span className="font-semibold">
                                                    Spam/Junk
                                                </span>{' '}
                                                folder if you do not see it.
                                            </span>
                                        </DialogDescription>
                                    </DialogHeader>

                                    {asemme10Submission ? (
                                        <div className="mx-auto w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
                                            <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
                                                Registered participants
                                            </p>
                                            <div className="mt-3 grid gap-2">
                                                {asemme10Submission.participants.map(
                                                    (participant) => (
                                                        <div
                                                            key={
                                                                participant.display_id
                                                            }
                                                            className="rounded-lg border border-slate-200 px-3 py-2"
                                                        >
                                                            <p className="font-semibold text-slate-800">
                                                                {
                                                                    participant.name
                                                                }
                                                            </p>
                                                            <p className="text-sm text-slate-500">
                                                                {
                                                                    participant.display_id
                                                                }
                                                            </p>
                                                        </div>
                                                    ),
                                                )}
                                            </div>
                                        </div>
                                    ) : null}

                                    {virtualIdParticipant ? (
                                        <div
                                            className="mx-auto aspect-[1.62/1] w-full !max-w-[390px] overflow-hidden rounded-[16px] border border-sky-100 bg-sky-50 p-3 shadow-lg shadow-slate-200/70 sm:!max-w-[440px] sm:rounded-[18px] sm:p-3"
                                            style={{
                                                colorScheme: 'light',
                                                backgroundImage:
                                                    "linear-gradient(120deg, rgba(255,255,255,0.9), rgba(225,244,255,0.78), rgba(255,255,255,0.92)), url('/img/bg2.png')",
                                                backgroundPosition: 'center',
                                                backgroundSize: 'cover',
                                            }}
                                        >
                                            <div className="grid h-full grid-cols-[minmax(0,1fr)_33%] gap-3">
                                                <div className="flex min-w-0 flex-col">
                                                    <div className="flex items-start gap-2">
                                                        <img
                                                            src="/img/asean_logo.png"
                                                            alt="ASEAN"
                                                            className="h-6 w-6 object-contain sm:h-7 sm:w-7"
                                                        />
                                                        <img
                                                            src="/img/bagong_pilipinas.png"
                                                            alt="Bagong Pilipinas"
                                                            className="h-6 w-auto object-contain sm:h-7"
                                                        />
                                                        <div className="min-w-0">
                                                            <p className="truncate text-[11px] font-bold text-slate-700 sm:text-sm">
                                                                ASEAN
                                                                Philippines 2026
                                                            </p>
                                                            <p className="truncate text-[10px] text-slate-500 sm:text-[11px]">
                                                                {
                                                                    virtualIdEventTitle
                                                                }
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <div className="mt-3 min-w-0 sm:mt-4">
                                                        <p className="text-[10px] font-semibold tracking-wide text-slate-500 uppercase sm:text-[11px]">
                                                            Participant
                                                        </p>
                                                        <p className="mt-0.5 line-clamp-2 text-lg leading-tight font-bold text-slate-950 sm:text-2xl">
                                                            {
                                                                virtualIdParticipant.name
                                                            }
                                                        </p>
                                                    </div>

                                                    <div className="mt-2.5 flex min-w-0 items-center gap-2.5 sm:mt-3">
                                                        <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-xl bg-white shadow-sm sm:h-12 sm:w-12">
                                                            {virtualIdFlagUrl ? (
                                                                <img
                                                                    src={
                                                                        virtualIdFlagUrl
                                                                    }
                                                                    alt={
                                                                        virtualIdCountryName
                                                                    }
                                                                    className="h-full w-full object-cover"
                                                                />
                                                            ) : (
                                                                <span className="text-sm font-bold text-slate-500">
                                                                    {
                                                                        virtualIdCountryCode
                                                                    }
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="truncate text-base font-bold text-slate-900 sm:text-lg">
                                                                {
                                                                    virtualIdCountryName
                                                                }
                                                            </p>
                                                            <p className="text-[11px] font-medium text-slate-500 sm:text-xs">
                                                                {
                                                                    virtualIdCountryCode
                                                                }
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <div className="mt-auto pt-2">
                                                        <p className="text-[10px] font-semibold tracking-wide text-slate-500 uppercase sm:text-[11px]">
                                                            Participant ID
                                                        </p>
                                                        <div className="mt-1 inline-flex max-w-full rounded-full border border-slate-200 bg-white/90 px-2.5 py-1 shadow-sm">
                                                            <p className="truncate text-[11px] font-bold text-slate-900 sm:text-xs">
                                                                {
                                                                    virtualIdParticipant.display_id
                                                                }
                                                            </p>
                                                        </div>
                                                        <p className="mt-2 hidden text-[10px] font-medium text-slate-500 sm:block">
                                                            Scan QR for
                                                            attendance
                                                            verification.
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="flex min-w-0 items-center justify-center">
                                                    <div className="flex h-full max-h-[94%] w-full flex-col items-center justify-center rounded-[16px] border border-slate-200/80 bg-white/90 p-2 shadow-md shadow-slate-200/80 sm:rounded-[18px]">
                                                        <div className="mb-1 flex items-center gap-1.5 text-[10px] font-bold text-slate-600 sm:text-[11px]">
                                                            <QrCode className="h-3 w-3" />
                                                            QR Code
                                                        </div>
                                                        {successQrDataUrl ? (
                                                            <img
                                                                src={
                                                                    successQrDataUrl
                                                                }
                                                                alt="Participant QR code"
                                                                className="aspect-square w-full max-w-[104px] bg-white sm:max-w-[124px]"
                                                            />
                                                        ) : (
                                                            <div className="grid aspect-square w-full max-w-[104px] place-items-center bg-white text-center text-[10px] text-slate-500 sm:max-w-[124px]">
                                                                Generating QR...
                                                            </div>
                                                        )}
                                                        <p className="mt-1.5 line-clamp-2 max-w-full text-center text-[8px] font-bold text-slate-700 sm:text-[9px]">
                                                            {
                                                                virtualIdCountryCode
                                                            }{' '}
                                                            -{' '}
                                                            {
                                                                virtualIdParticipant.name
                                                            }
                                                        </p>
                                                        <p className="mt-0.5 max-w-full truncate text-center text-[8px] font-medium text-slate-500 sm:text-[9px]">
                                                            {
                                                                virtualIdParticipant.display_id
                                                            }
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ) : null}

                                    <DialogFooter className="relative z-10 mt-1 gap-2 bg-white pt-1 sm:mt-2 sm:justify-center">
                                        {virtualIdParticipant ? (
                                            <Button
                                                type="button"
                                                variant="outline"
                                                className="rounded-full px-6"
                                                onClick={downloadVirtualId}
                                                disabled={!successQrDataUrl}
                                            >
                                                <Download className="h-4 w-4" />
                                                Download JPG
                                            </Button>
                                        ) : null}
                                        <Button
                                            type="button"
                                            className="rounded-full bg-[#0033A0] px-6 text-white hover:bg-[#002b86] disabled:cursor-not-allowed disabled:opacity-60"
                                            onClick={() => {
                                                setSuccessOpen(false);
                                                if (!asemme10Submission) {
                                                    router.visit(login());
                                                }
                                            }}
                                        >
                                            Got it
                                        </Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>

                            <Dialog open={false} onOpenChange={setSuccessOpen}>
                                <DialogContent className="w-[calc(100%-2rem)] max-w-3xl rounded-2xl border-none bg-gradient-to-br from-[#E8F0FF] via-white to-[#F5FBFF] sm:w-full">
                                    <DialogHeader className="items-center text-center">
                                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0033A0] text-white shadow-lg shadow-[#0033A0]/20">
                                            <CheckCircle2 className="h-7 w-7" />
                                        </div>

                                        <DialogTitle className="text-xl text-slate-800">
                                            You’re all set! 🎉
                                        </DialogTitle>

                                        <DialogDescription className="text-sm text-slate-600">
                                            Thanks for signing up! ✨ You can
                                            now try logging in using the email
                                            you provided.
                                            <span className="mt-2 block rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-900">
                                                <span className="font-semibold">
                                                    Please check your EMAIL.
                                                </span>{' '}
                                                Please find your QR code and
                                                participant details attached.
                                                Also check your{' '}
                                                <span className="font-semibold">
                                                    Spam/Junk
                                                </span>{' '}
                                                folder if you don’t see it.
                                            </span>
                                        </DialogDescription>
                                    </DialogHeader>

                                    <DialogFooter className="sm:justify-center">
                                        <Button
                                            type="button"
                                            className="rounded-full bg-[#0033A0] px-6 text-white hover:bg-[#002b86] disabled:cursor-not-allowed disabled:opacity-60"
                                            onClick={() => {
                                                setSuccessOpen(false);
                                                router.visit(login());
                                            }}
                                        >
                                            Got it
                                        </Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        </>
                    );
                }}
            </Form>
        </RegisterLayout>
    );
}
