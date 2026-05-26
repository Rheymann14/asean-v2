import {
    SidebarGroup,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuSub,
    SidebarMenuSubButton,
    SidebarMenuSubItem,
} from '@/components/ui/sidebar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { resolveUrl } from '@/lib/utils';
import { type NavItem, type SharedData } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { ChevronRight } from 'lucide-react';
import * as React from 'react';

export function NavMain({ items = [] }: { items: NavItem[] }) {
    const page = usePage<SharedData>();
    const userType = page.props.auth.user?.user_type ?? page.props.auth.user?.userType;
    const roleName = (userType?.name ?? '').toUpperCase();
    const roleSlug = (userType?.slug ?? '').toUpperCase();
    const isChedLo = roleName === 'CHED LO' || roleSlug === 'CHED-LO';

    // ✅ Start "Page Settings" group from Venue (i.e., after Event List)
    const pageSettingsStartIndex = items.findIndex(
        (item) => item.title === 'Venue',
    );

    const registrationItems =
        pageSettingsStartIndex > -1 ? items.slice(0, pageSettingsStartIndex) : items;

    const pageSettingsItems =
        pageSettingsStartIndex > -1 ? items.slice(pageSettingsStartIndex) : [];

    const renderMenu = (menuItems: NavItem[]) => (
        <SidebarMenu>
            {menuItems.map((item) => {
                // Check if this item has subitems (collapsible group)
                if (item.items && item.items.length > 0) {
                    const isAnySubItemActive = item.items.some((subItem) =>
                        subItem.href ? page.url.startsWith(resolveUrl(subItem.href)) : false
                    );

                    return (
                        <Collapsible
                            key={item.title}
                            asChild
                            defaultOpen={isAnySubItemActive}
                            className="group/collapsible"
                        >
                            <SidebarMenuItem>
                                <CollapsibleTrigger asChild>
                                    <SidebarMenuButton tooltip={{ children: item.title }}>
                                        {item.icon && <item.icon />}
                                        <span>{item.title}</span>
                                        <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                                    </SidebarMenuButton>
                                </CollapsibleTrigger>
                                <CollapsibleContent>
                                    <SidebarMenuSub>
                                        {item.items.map((subItem) => (
                                            <SidebarMenuSubItem key={subItem.title}>
                                                <SidebarMenuSubButton
                                                    asChild
                                                    isActive={subItem.href ? page.url.startsWith(resolveUrl(subItem.href)) : false}
                                                >
                                                    <Link href={subItem.href || '#'} prefetch>
                                                        <span>{subItem.title}</span>
                                                    </Link>
                                                </SidebarMenuSubButton>
                                            </SidebarMenuSubItem>
                                        ))}
                                    </SidebarMenuSub>
                                </CollapsibleContent>
                            </SidebarMenuItem>
                        </Collapsible>
                    );
                }

                // Regular menu item without subitems
                return (
                    <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton
                            asChild
                            isActive={item.href ? page.url.startsWith(resolveUrl(item.href)) : false}
                            tooltip={{ children: item.title }}
                        >
                            <Link href={item.href || '#'} prefetch>
                                {item.icon && <item.icon />}
                                <span>{item.title}</span>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                );
            })}
        </SidebarMenu>
    );

    return (
        <>
            <SidebarGroup className="px-2 py-0">
                {!isChedLo ? <SidebarGroupLabel>Registration</SidebarGroupLabel> : null}
                {renderMenu(registrationItems)}
            </SidebarGroup>

            {pageSettingsItems.length > 0 && (
                <SidebarGroup className="px-2 py-0">
                    <SidebarGroupLabel>Page Settings</SidebarGroupLabel>
                    {renderMenu(pageSettingsItems)}
                </SidebarGroup>
            )}
        </>
    );
}
