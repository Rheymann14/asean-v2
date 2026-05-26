import { InertiaLinkProps } from '@inertiajs/react';
import { LucideIcon } from 'lucide-react';

export interface Auth {
    user: User;
}

export interface BreadcrumbItem {
    title: string;
    href: string;
}

export interface NavGroup {
    title: string;
    items: NavItem[];
}

export interface NavItem {
    title: string;
    href?: NonNullable<InertiaLinkProps['href']>;
    icon?: LucideIcon | null;
    isActive?: boolean;
    items?: NavItem[];
}

export interface SharedData {
    name: string;
    quote: { message: string; author: string };
    auth: Auth;
    sidebarOpen: boolean;
    [key: string]: unknown;
}

export interface User {
    id: number;
    name: string;
    email: string;
    contact_number?: string | null;
    contact_country_code?: string | null;
    organization_name?: string | null;
    position_title?: string | null;
    honorific_title?: string | null;
    honorific_other?: string | null;
    given_name?: string | null;
    middle_name?: string | null;
    family_name?: string | null;
    suffix?: string | null;
    sex_assigned_at_birth?: string | null;
    other_user_type?: string | null;
    ip_group_name?: string | null;
    dietary_allergies?: string | null;
    dietary_other?: string | null;
    has_food_restrictions?: boolean;
    food_restrictions?: string[];
    accessibility_needs?: string[];
    accessibility_other?: string | null;
    emergency_contact_name?: string | null;
    emergency_contact_relationship?: string | null;
    emergency_contact_phone?: string | null;
    emergency_contact_email?: string | null;
    consent_contact_sharing?: boolean;
    consent_photo_video?: boolean;
    country?: {
        id: number;
        code: string;
        name: string;
        flag_url?: string | null;
    } | null;
    avatar?: string;
    email_verified_at: string | null;
    two_factor_enabled?: boolean;
    user_type?: {
        id: number;
        name: string;
        slug: string;
    } | null;
    userType?: {
        id: number;
        name: string;
        slug: string;
    } | null;
    created_at: string;
    updated_at: string;
    [key: string]: unknown; // This allows for additional properties...
}
