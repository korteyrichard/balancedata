import React, { useState, useEffect } from "react";
import { Link, router, usePage } from "@inertiajs/react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { PanelLeft, LogOut, Settings, Cog, ChevronDown } from "lucide-react";
import { Icon } from "@/components/ui/icon";
import { icons } from "lucide-react";
import { Toaster } from "@/components/ui/toaster";
import { ThemeToggle } from "@/components/theme-toggle";

type IconName = keyof typeof icons;

interface NavigationItem {
  name: string;
  href: string;
  icon: IconName;
  current: boolean;
}

interface AdminLayoutProps {
  children: React.ReactNode;
  user: {
    id: number;
    name: string;
    email: string;
    role: string;
  };
  header?: React.ReactNode;
}

const adminNavigation: NavigationItem[] = [
  { name: "Admin Dashboard", href: route("admin.dashboard"), icon: "Shield", current: false },
  { name: "Users", href: route("admin.users"), icon: "Users", current: false },
  { name: "Products", href: route("admin.products"), icon: "Box", current: false },
  { name: "Orders", href: route("admin.orders"), icon: "Package", current: false },
  { name: "Alerts", href: route("admin.alerts.index"), icon: "Bell", current: false },
  { name: "AFA Products", href: route("admin.afa-products"), icon: "Star", current: false },
  { name: "AFA Orders", href: route("admin.afa-orders"), icon: "FileText", current: false },
  { name: "Transactions", href: route("admin.transactions"), icon: "Receipt", current: false },
  { name: "Stores", href: route("admin.agents"), icon: "Store", current: false },
  { name: "Commissions", href: route("admin.commissions"), icon: "DollarSign", current: false },
  { name: "Withdrawals", href: route("admin.withdrawals"), icon: "CreditCard", current: false },
  { name: "Agent Settings", href: route("admin.settings"), icon: "Cog", current: false },
  { name: "Settings", href: route("profile.edit"), icon: "Settings", current: false },
];

export const AdminLayout: React.FC<AdminLayoutProps> = ({ children, user, header }) => {
  const currentRoute = route().current();
  const { auth } = usePage().props;
  
  // Check for session expiration
  useEffect(() => {
    if (!auth?.user) {
      router.visit(route('login'));
    }
  }, [auth?.user]);
  
  const navigationItems = adminNavigation.map(item => ({
    ...item,
    current: 
      (item.name === "Admin Dashboard" && currentRoute === "admin.dashboard") ||
      (item.name === "Users" && currentRoute === "admin.users") ||
      (item.name === "Products" && currentRoute === "admin.products") ||
      (item.name === "Orders" && currentRoute === "admin.orders") ||
      (item.name === "Alerts" && currentRoute?.startsWith("admin.alerts")) ||
      (item.name === "AFA Products" && currentRoute === "admin.afa-products") ||
      (item.name === "AFA Orders" && currentRoute === "admin.afa-orders") ||
      (item.name === "Transactions" && currentRoute === "admin.transactions") ||
      (item.name === "Stores" && currentRoute === "admin.agents") ||
      (item.name === "Commissions" && currentRoute === "admin.commissions") ||
      (item.name === "Withdrawals" && currentRoute === "admin.withdrawals") ||
      (item.name === "Agent Settings" && currentRoute === "admin.settings") ||
      (item.name === "Settings" && (currentRoute === "profile.edit" || currentRoute === "password.edit" || currentRoute === "appearance"))
  }));
  
  const handleLogout = () => {
    router.post(route('logout'));
  };

  const renderNavigationItems = () =>
    navigationItems.map((item) => (
      <Link
        key={item.name}
        href={item.href}
        className={`flex h-9 w-9 items-center justify-center rounded-lg ${
          item.current ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground"
        } transition-colors md:h-8 md:w-8`}
        title={item.name}
      >
        <Icon name={item.icon} className="h-5 w-5" />
        <span className="sr-only">{item.name}</span>
      </Link>
    ));

  const renderMobileNavItems = () =>
    navigationItems.map((item) => (
      <Link
        key={item.name}
        href={item.href}
        className={`flex items-center gap-4 px-2.5 ${
          item.current ? "text-foreground" : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <Icon name={item.icon} className="h-5 w-5" />
        {item.name}
      </Link>
    ));

  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-10 hidden w-14 flex-col border-r bg-background sm:flex">
        <nav className="flex flex-col items-center gap-4 px-2 sm:py-5">
          {renderNavigationItems()}
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex flex-col sm:gap-4 sm:py-4 sm:pl-14">
        {/* Toast notifications */}
        <Toaster />
        
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
          <Sheet>
            <SheetTrigger asChild>
              <Button size="icon" variant="outline" className="sm:hidden">
                <PanelLeft className="h-5 w-5" />
                <span className="sr-only">Toggle Menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="sm:max-w-xs">
              <nav className="grid gap-6 text-lg font-medium">
                {renderMobileNavItems()}
              </nav>
            </SheetContent>
          </Sheet>
          {/* Optional: Show header title */}
          {header && (
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
              {header}
            </h2>
          )}
          {/* User info, settings, and logout */}
          <div className="flex items-center gap-2">
            <div className="text-sm text-muted-foreground hidden sm:block">
              {user.name}
            </div>
            <ThemeToggle />
            <Link href={route('profile.edit')} className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground transition-colors">
              <Icon name="Settings" className="h-4 w-4" />
            </Link>
            <Button
              size="icon"
              variant="outline"
              onClick={handleLogout}
              className="h-8 w-8"
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </header>
        <main className="grid flex-1 items-start gap-4 p-4 sm:px-6 sm:py-0 md:gap-8">{children}</main>
      </div>
    </div>
  );
};
