import * as React from 'react';
import ProfileController from '@/actions/App/Http/Controllers/Settings/ProfileController';
import { send } from '@/routes/verification';
import { type BreadcrumbItem, type SharedData } from '@/types';
import { Transition } from '@headlessui/react';
import { Form, Head, Link, usePage } from '@inertiajs/react';

import DeleteUser from '@/components/delete-user';
import HeadingSmall from '@/components/heading-small';
import InputError from '@/components/input-error';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';
import { edit } from '@/routes/profile';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Profile settings',
        href: edit().url,
    },
];

const FOOD_RESTRICTION_OPTIONS = [
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

export default function Profile({
    mustVerifyEmail,
    status,
}: {
    mustVerifyEmail: boolean;
    status?: string;
}) {
    const { auth } = usePage<SharedData>().props;
    const user = auth.user;
    const [selectedFoodRestrictions, setSelectedFoodRestrictions] = React.useState<string[]>(() => user.food_restrictions ?? []);
    const [selectedAccessibilityNeeds, setSelectedAccessibilityNeeds] = React.useState<string[]>(() => user.accessibility_needs ?? []);

    const honorificLabels: Record<string, string> = {
        mr: 'Mr.',
        mrs: 'Mrs.',
        ms: 'Ms.',
        miss: 'Miss',
        dr: 'Dr.',
        prof: 'Prof.',
        other: 'Other',
    };

    const sexAssignedLabels: Record<string, string> = {
        male: 'Male',
        female: 'Female',
    };

    const foodRestrictionLabelMap: Record<string, string> = {
        vegetarian: 'Vegetarian',
        halal: 'Halal',
        allergies: 'Allergies',
        other: 'Other',
    };

    const accessibilityLabels: Record<string, string> = {
        wheelchair_access: 'Wheelchair access',
        sign_language_interpreter: 'Sign language interpreter',
        assistive_technology_support: 'Assistive technology support',
        other: 'Other accommodations',
    };

    const formatValue = (value?: string | number | null) => (value ? String(value) : '—');
    const fullContactNumber = [user.contact_country_code, user.contact_number].filter(Boolean).join(' ');
    const honorificTitle =
        user.honorific_title === 'other'
            ? user.honorific_other || 'Other'
            : (user.honorific_title ? honorificLabels[user.honorific_title] : undefined);
    const foodRestrictionLabels = (user.food_restrictions ?? [])
        .map((item) => foodRestrictionLabelMap[item] ?? item)
        .filter(Boolean);
    const accessibilityNeedLabels = (user.accessibility_needs ?? [])
        .map((item) => accessibilityLabels[item] ?? item)
        .filter(Boolean);

    const toggleFoodRestriction = (value: string) => {
        setSelectedFoodRestrictions((prev) =>
            prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value],
        );
    };

    const toggleAccessibilityNeed = (value: string) => {
        setSelectedAccessibilityNeeds((prev) =>
            prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value],
        );
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Profile settings" />

            <SettingsLayout>
                <div className="space-y-6">
                    <HeadingSmall
                        title="Profile information"
                        description="Update your name and email address"
                    />

                    <Form
                        {...ProfileController.update.form()}
                        options={{
                            preserveScroll: true,
                        }}
                        className="space-y-6"
                    >
                        {({ processing, recentlySuccessful, errors }) => (
                            <>
                                <div className="grid gap-2">
                                    <Label htmlFor="name">Name</Label>

                                    <Input
                                        id="name"
                                        className="mt-1 block w-full"
                                        defaultValue={auth.user.name}
                                        name="name"
                                        required
                                        autoComplete="name"
                                        placeholder="Full name"
                                    />

                                    <InputError
                                        className="mt-2"
                                        message={errors.name}
                                    />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="email">Email address</Label>

                                    <Input
                                        id="email"
                                        type="email"
                                        className="mt-1 block w-full"
                                        defaultValue={auth.user.email}
                                        name="email"
                                        required
                                        autoComplete="username"
                                        placeholder="Email address"
                                    />

                                    <InputError
                                        className="mt-2"
                                        message={errors.email}
                                    />
                                </div>

                         

                                {mustVerifyEmail &&
                                    auth.user.email_verified_at === null && (
                                        <div>
                                            <p className="-mt-4 text-sm text-muted-foreground">
                                                Your email address is
                                                unverified.{' '}
                                                <Link
                                                    href={send()}
                                                    as="button"
                                                    className="text-foreground underline decoration-neutral-300 underline-offset-4 transition-colors duration-300 ease-out hover:decoration-current! dark:decoration-neutral-500"
                                                >
                                                    Click here to resend the
                                                    verification email.
                                                </Link>
                                            </p>

                                            {status ===
                                                'verification-link-sent' && (
                                                <div className="mt-2 text-sm font-medium text-green-600">
                                                    A new verification link has
                                                    been sent to your email
                                                    address.
                                                </div>
                                            )}
                                        </div>
                                    )}

                                <div className="flex items-center gap-4">
                                    <Button
                                        disabled={processing}
                                        data-test="update-profile-button"
                                    >
                                        Save
                                    </Button>

                                    <Transition
                                        show={recentlySuccessful}
                                        enter="transition ease-in-out"
                                        enterFrom="opacity-0"
                                        leave="transition ease-in-out"
                                        leaveTo="opacity-0"
                                    >
                                        <p className="text-sm text-neutral-600">
                                            Saved
                                        </p>
                                    </Transition>
                                </div>
                            </>
                        )}
                    </Form>

               
                </div>

                {/* <DeleteUser /> */}
            </SettingsLayout>
        </AppLayout>
    );
}
