import React, { PropsWithChildren, useState } from 'react';
import { Link, usePage } from '@inertiajs/react';
import { Icon } from '@/components/ui/icon';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { icons } from 'lucide-react';
import { Toaster } from '@/components/ui/toaster';
import { ThemeToggle } from '@/components/theme-toggle';

interface DashboardLayoutProps extends PropsWithChildren {
    user: {
        id: number;
        name: string;
        email: string;
        role: string;
    };
    header?: React.ReactNode;
}

type IconName = keyof typeof icons;

interface NavigationItem {
    name: string;
    href: string;
    icon: IconName;
    current: boolean;
}

export default function DashboardLayout({ user, header, children }: DashboardLayoutProps) {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [businessFeaturesOpen, setBusinessFeaturesOpen] = useState(false);
    const { socialLinks } = usePage().props as any;

    const navigation: NavigationItem[] = [
        { name: 'Dashboard', href: route('dashboard'), icon: 'LayoutDashboard', current: route().current('dashboard') },
        { name: 'Wallet', href: route('dashboard.wallet'), icon: 'Wallet', current: route().current('dashboard.wallet') },
        { name: 'Join Us', href: route('dashboard.joinUs'), icon: 'Contact', current: route().current('dashboard.joinUs') },
        { name: 'Orders', href: route('dashboard.orders'), icon: 'Package', current: route().current('dashboard.orders') },
        { name: 'Afa', href: route('dashboard.afa'), icon: 'Receipt', current: route().current('dashboard.afa') },
        { name: 'Transactions', href: route('dashboard.transactions'), icon: 'Receipt', current: route().current('dashboard.transactions') },
        ...(user.role === 'agent' || user.role === 'admin' || user.role === 'dealer' ? [{ name: 'API Docs', href: route('dashboard.api-docs'), icon: 'Code' as IconName, current: route().current('dashboard.api-docs') }] : []),
        { name: 'Terms & Conditions', href: route('dashboard.terms'), icon: 'FileText' as IconName, current: route().current('dashboard.terms') },
        { name: 'Settings', href: route('profile.edit'), icon: 'Settings', current: route().current('profile.edit') || route().current('password.edit') || route().current('appearance') },
    ];

    const storeManagement: NavigationItem[] = [
        { name: 'Store Dashboard', href: route('agent.dashboard'), icon: 'Store', current: route().current('agent.dashboard') },
        { name: 'Commissions', href: route('agent.commissions'), icon: 'DollarSign', current: route().current('agent.commissions') },
        { name: 'Referrals', href: route('agent.referrals'), icon: 'Share2', current: route().current('agent.referrals') },
        { name: 'Withdrawals', href: route('agent.withdrawals'), icon: 'CreditCard', current: route().current('agent.withdrawals') },
        { name: 'My Shop', href: route('agent.shop'), icon: 'ShoppingBag', current: route().current('agent.shop') },
    ];

    const upgradeToAgent = false;

    const bottomNavigation: NavigationItem[] = [

    ];

    const renderNavigationItems = (items: NavigationItem[], closeSidebar = false) => {
        return items.map((item) => (
            <Link
                key={item.name}
                href={item.href}
                method={item.name === 'Log Out' ? 'post' : 'get'}
                as={item.name === 'Log Out' ? 'button' : 'a'}
                className={`
                    ${item.current
                        ? 'bg-green-500 text-white shadow-md'
                        : 'text-gray-700 hover:bg-green-50'
                    }
                    group flex items-center px-3 py-3 text-sm font-sans font-medium rounded-lg w-full transition-all duration-200
                `}
                onClick={closeSidebar ? () => setSidebarOpen(false) : undefined}
            >
                <Icon name={item.icon} className="mr-3 flex-shrink-0 h-5 w-5" />
                {item.name}
            </Link>
        ));
    };

    const SidebarContent = ({ isMobile = false }: { isMobile?: boolean }) => (
        <div className={`flex flex-col bg-gradient-to-b from-green-50 to-white pt-6 pb-4 font-sans ${isMobile ? 'h-full' : 'h-screen overflow-y-auto'}`}>
            <div className="flex items-center flex-shrink-0 px-4 mb-2">
                <Link href="/">
                    <img src="/balancedata.jpg" alt="BalancedData" className="h-12 w-auto object-contain" />
                </Link>
            </div>
            <nav className="mt-4 flex-1 flex flex-col">
                <div className="px-3 space-y-1">
                    {renderNavigationItems(navigation, isMobile)}
                </div>
                
                {/* Store Management Section */}
                <div className="mt-8 px-3">
                    <button
                        onClick={() => setBusinessFeaturesOpen(!businessFeaturesOpen)}
                        className="w-full flex items-center justify-between px-3 py-3 text-sm font-display font-bold text-green-700 uppercase tracking-wider hover:bg-green-50 rounded-lg transition-all duration-200"
                    >
                        Store
                        <Icon name={businessFeaturesOpen ? 'ChevronUp' : 'ChevronDown'} className="h-4 w-4" />
                    </button>
                    {businessFeaturesOpen && (
                        <div className="px-3 space-y-1 mt-2">
                            {renderNavigationItems(storeManagement, isMobile)}
                        </div>
                    )}
                </div>
                
                {/* Upgrade to Agent */}
                {upgradeToAgent && (
                    <div className="mt-8">
                        <div className="px-3 mb-3">
                            <h3 className="text-xs font-display font-bold text-green-700 uppercase tracking-wider">
                                Become an Agent
                            </h3>
                        </div>
                        <div className="px-3">
                            <Link
                                href={route('become_an_agent')}
                                className="group flex items-center px-3 py-3 text-sm font-medium rounded-lg w-full text-gray-700 hover:bg-green-50 transition-all duration-200"
                            >
                                <Icon name="Store" className="mr-3 flex-shrink-0 h-5 w-5" />
                                Upgrade to Agent
                            </Link>
                        </div>
                    </div>
                )}
                
                {socialLinks?.whatsapp_contact && (
                    <a href={socialLinks.whatsapp_contact} className="mx-3 text-center mt-8 px-4 py-3 text-sm font-display font-semibold rounded-lg bg-green-500 text-white hover:bg-green-600 shadow-md transition-all duration-200">
                        Customer Support
                    </a>
                )}

                {/* Bottom Navigation (e.g., Logout) */}
                <div className="mt-auto">
                    <div className="px-3 space-y-1">
                        {renderNavigationItems(bottomNavigation, isMobile)}
                    </div>
                </div>
            </nav>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Sidebar for desktop */}
            <div className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0">
                <div className="shadow-lg h-full border-r border-green-100">
                    <SidebarContent />
                </div>
            </div>

            {/* Main content area */}
            <div className="lg:pl-64 flex flex-col flex-1">
                {/* Navbar */}
                <div className="sticky top-0 z-10 flex-shrink-0 flex h-16 bg-white shadow-sm border-b border-green-100 lg:shadow-none font-sans">
                    <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
                        <SheetTrigger asChild>
                            <div className="flex items-center px-4 lg:hidden">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="text-gray-600 hover:text-green-600 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-green-500"
                                >
                                    <span className="sr-only">Open sidebar</span>
                                    <Icon name="Menu" className="h-6 w-6" />
                                </Button>
                            </div>
                        </SheetTrigger>
                        <SheetContent side="left" className="p-0 w-64 bg-gradient-to-b from-green-50 to-white">
                            <SidebarContent isMobile={true} />
                        </SheetContent>
                    </Sheet>

                    <div className="flex-1 flex justify-between px-4">
                        <div className="flex-1 flex items-center">
                            {header && (
                                <h2 className="font-display font-bold text-xl text-gray-800 leading-tight">
                                    {header}
                                </h2>
                            )}
                        </div>
                        <div className="ml-4 flex items-center md:ml-6 space-x-2">
                            <ThemeToggle />
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" className="relative h-8 w-8 rounded-full hover:bg-green-50">
                                        <Icon name="User" className="h-6 w-6 text-gray-600" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="w-56" align="end" forceMount>
                                    <DropdownMenuLabel className="font-sans font-semibold">
                                        <div className="flex flex-col space-y-1">
                                            <p className="text-sm font-medium leading-none">{user.name}</p>
                                            <p className="text-xs leading-none text-muted-foreground">
                                                {user.email}
                                            </p>
                                        </div>
                                    </DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem asChild>
                                        <Link href={route('profile.edit')} className="w-full text-left">
                                            Settings
                                        </Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem asChild>
                                        <Link href={route('logout')} method="post" as="button" className="w-full text-left">
                                            Log out
                                        </Link>
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>
                </div>

                <main className="flex-1 p-4 font-sans">
                    <Toaster />
                    {children}
                </main>
            </div>
        </div>
    );
}
