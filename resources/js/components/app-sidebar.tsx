import { NavFooter } from '@/components/nav-footer';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import {
    contactDetails,
    dashboard,
    issuancesManagement,
    participant,
    scanner,
    venueManagement,
} from '@/routes';
import { type NavItem, type SharedData } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import {
    Building2,
    Bus,
    CalendarDays,
    House,
    Image,
    MapPin,
    ScanLine,
    ScrollText,
    Table,
    FileBarChart2,
    User,
    Users,
} from 'lucide-react';
import AppLogo from './app-logo';

export function AppSidebar() {
    const { auth } = usePage<SharedData>().props;
    const userType = auth.user?.user_type ?? auth.user?.userType;
    const roleName = (userType?.name ?? '').toUpperCase();
    const roleSlug = (userType?.slug ?? '').toUpperCase();
    const isAdmin = roleName === 'ADMIN' || roleSlug === 'ADMIN';
    const isChedLo = roleName === 'CHED LO' || roleSlug === 'CHED-LO';

    // Table & Assignments collapsible section
    const tableAssignmentsGroup: NavItem = {
        title: 'Table Monitoring',
        icon: Table,
        items: [
            {
                title: 'Table Management',
                href: '/table-assignment/create',
            },
            {
                title: 'Table Assignment',
                href: '/table-assignment/assignment',
            },
        ],
    };

    const vehicleMonitoringGroup: NavItem = {
        title: 'Vehicle Monitoring',
        icon: Bus,
        items: [
            {
                title: 'Vehicle Management',
                href: '/vehicle-management',
            },
            {
                title: 'Vehicle Assignment',
                href: '/vehicle-assignment',
            },
        ],
    };

    const managementNavItems: NavItem[] = [
        tableAssignmentsGroup,
        vehicleMonitoringGroup,
    ];

    const mainNavItems: NavItem[] = isAdmin
        ? [
              {
                  title: 'Dashboard',
                  href: dashboard(),
                  icon: House,
              },
              {
                  title: 'Participant',
                  href: participant(),
                  icon: Users,
              },
              ...managementNavItems,
              {
                  title: 'Venue',
                  href: venueManagement(),
                  icon: Building2,
              },
              {
                  title: 'Section Management',
                  href: '/section-management',
                  icon: Image,
              },
              {
                  title: 'Events & Certificates',
                  href: '/event-management',
                  icon: CalendarDays,
              },
              {
                  title: 'Issuances',
                  href: issuancesManagement(),
                  icon: ScrollText,
              },
              {
                  title: 'Contact Details',
                  href: contactDetails(),
                  icon: MapPin,
              },
              {
                  title: 'Reports',
                  href: '/reports',
                  icon: FileBarChart2,
              },
          ]
        : isChedLo
          ? [
                {
                    title: 'Participants Monitoring',
                    href: '/vehicle-assignment',
                    icon: Bus,
                },
            ]
          : [
                {
                    title: 'Profile',
                    href: '/participant-dashboard',
                    icon: User,
                },
                {
                    title: 'Event List',
                    href: '/event-list',
                    icon: CalendarDays,
                },
                {
                    title: 'Vehicle Assignment',
                    href: '/vehicle-assignment',
                    icon: Bus,
                },
                {
                    title: 'Table Assignment',
                    href: '/table-assignment',
                    icon: Table,
                },
            ];

    const footerNavItems: NavItem[] = isAdmin
        ? [
              {
                  title: 'QR Code Scanner',
                  href: scanner(),
                  icon: ScanLine,
              },
          ]
        : [];

    const homeHref = isAdmin
        ? dashboard()
        : isChedLo
          ? '/vehicle-assignment'
          : '/participant-dashboard';

    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href={homeHref} prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <NavMain items={mainNavItems} />
            </SidebarContent>

            <SidebarFooter>
                {footerNavItems.length ? (
                    <NavFooter items={footerNavItems} className="mt-auto" />
                ) : null}
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
