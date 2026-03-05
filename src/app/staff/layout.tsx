"use client"

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  CheckSquare,
  LogOut, 
  Printer
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-card hidden md:flex flex-col shadow-sm">
        <div className="p-6 flex items-center gap-3">
          <div className="bg-accent p-2 rounded-lg">
            <Printer className="w-6 h-6 text-accent-foreground" />
          </div>
          <span className="font-bold text-xl text-primary font-headline">PrintFlow</span>
        </div>
        
        <div className="flex-1 px-4 py-4">
          <nav className="space-y-1">
            <Link 
              href="/staff/dashboard"
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                pathname === '/staff/dashboard' 
                  ? "bg-accent/10 text-accent-foreground" 
                  : "text-muted-foreground hover:bg-muted"
              )}
            >
              <LayoutDashboard className="w-4 h-4" /> My Dashboard
            </Link>
            <Link 
              href="/staff/tasks"
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                pathname === '/staff/tasks' 
                  ? "bg-accent/10 text-accent-foreground" 
                  : "text-muted-foreground hover:bg-muted"
              )}
            >
              <CheckSquare className="w-4 h-4" /> Completed Tasks
            </Link>
          </nav>
        </div>

        <div className="p-4 border-t">
          <Link href="/">
            <Button variant="ghost" className="w-full justify-start gap-2 text-destructive hover:text-destructive hover:bg-destructive/10">
              <LogOut className="w-4 h-4" /> Sign Out
            </Button>
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto bg-background/50">
        <header className="h-16 border-b bg-card flex items-center justify-between px-8 sticky top-0 z-10">
          <h1 className="font-bold text-lg font-headline text-accent-foreground">Staff Workbench</h1>
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-end">
              <span className="text-sm font-semibold">John Designer</span>
              <span className="text-xs text-muted-foreground">Graphic Designer</span>
            </div>
            <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center font-bold text-accent-foreground">
              JD
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