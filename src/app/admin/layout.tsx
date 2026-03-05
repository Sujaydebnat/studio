
"use client"

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  ClipboardList, 
  Users, 
  Settings, 
  LogOut, 
  PlusCircle,
  Printer,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const navItems = [
    { name: 'Dashboard', icon: LayoutDashboard, href: '/admin/dashboard' },
    { name: 'Orders', icon: ClipboardList, href: '/admin/orders' },
    { name: 'Staff Management', icon: Users, href: '/admin/staff' },
    { name: 'Settings', icon: Settings, href: '/admin/settings' },
  ];

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-card hidden md:flex flex-col shadow-sm">
        <div className="p-6 flex items-center gap-3">
          <div className="bg-primary p-2 rounded-lg">
            <Printer className="w-6 h-6 text-white" />
          </div>
          <span className="font-bold text-xl text-primary font-headline">PrintFlow</span>
        </div>
        
        <div className="px-4 mb-4">
          <Link href="/admin/orders/new">
            <Button className="w-full bg-accent text-accent-foreground hover:bg-accent/90 justify-start gap-2 font-semibold">
              <PlusCircle className="w-4 h-4" /> New Order
            </Button>
          </Link>
        </div>

        <ScrollArea className="flex-1 px-4">
          <nav className="space-y-1">
            {navItems.map((item) => (
              <Link 
                key={item.href} 
                href={item.href}
                className={cn(
                  "flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  pathname === item.href 
                    ? "bg-primary/10 text-primary" 
                    : "text-muted-foreground hover:bg-muted"
                )}
              >
                <div className="flex items-center gap-3">
                  <item.icon className="w-4 h-4" />
                  {item.name}
                </div>
                {pathname === item.href && <ChevronRight className="w-4 h-4" />}
              </Link>
            ))}
          </nav>
        </ScrollArea>

        <div className="p-4 border-t">
          <Link href="/">
            <Button variant="ghost" className="w-full justify-start gap-2 text-destructive hover:text-destructive hover:bg-destructive/10">
              <LogOut className="w-4 h-4" /> Sign Out
            </Button>
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto relative bg-background/50 backdrop-blur-sm">
        <header className="h-16 border-b bg-card/50 backdrop-blur-md flex items-center justify-between px-8 sticky top-0 z-10">
          <h1 className="font-bold text-lg font-headline">Admin Portal</h1>
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-end">
              <span className="text-sm font-semibold">Admin User</span>
              <span className="text-xs text-muted-foreground">Master Account</span>
            </div>
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary">
              AU
            </div>
          </div>
        </header>
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
