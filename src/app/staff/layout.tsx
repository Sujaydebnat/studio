
"use client"

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  CheckSquare,
  LogOut, 
  Printer,
  Loader2,
  Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useUser, useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const db = useFirestore();
  const { user } = useUser();

  const userRef = useMemoFirebase(() => 
    user && db ? doc(db, 'users', user.uid) : null
  , [db, user]);

  const { data: userData, isLoading: isDataLoading } = useDoc(userRef);

  const navItems = [
    { name: 'My Dashboard', icon: LayoutDashboard, href: '/staff/dashboard' },
    { name: 'Attendance', icon: Clock, href: '/staff/attendance' },
    { name: 'Completed Tasks', icon: CheckSquare, href: '/staff/tasks' },
  ];

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-card hidden md:flex flex-col shadow-sm">
        <div className="p-6 flex items-center gap-3">
          <div className="bg-accent p-2 rounded-lg shadow-lg">
            <Printer className="w-6 h-6 text-accent-foreground" />
          </div>
          <span className="font-bold text-xl text-primary font-headline italic">PrintFlow</span>
        </div>
        
        <div className="flex-1 px-4 py-4">
          <nav className="space-y-1">
            {navItems.map((item) => (
              <Link 
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-bold transition-all",
                  pathname === item.href 
                    ? "bg-accent text-accent-foreground shadow-md" 
                    : "text-muted-foreground hover:bg-accent/5 hover:text-accent"
                )}
              >
                <item.icon className="w-4 h-4" /> {item.name}
              </Link>
            ))}
          </nav>
        </div>

        <div className="p-4 border-t">
          <Link href="/" className="block w-full">
            <Button variant="ghost" className="w-full justify-start gap-2 text-destructive hover:bg-destructive/5 font-bold transition-colors">
              <LogOut className="w-4 h-4" /> Sign Out
            </Button>
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto bg-background/50">
        <header className="h-16 border-b bg-card flex items-center justify-between px-8 sticky top-0 z-10">
          <h1 className="font-black text-lg font-headline text-accent-foreground uppercase tracking-widest">Production Team</h1>
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-end">
              <span className="text-sm font-black">
                {isDataLoading ? '---' : (userData?.name || 'Staff')}
              </span>
              <span className="text-[9px] bg-accent/10 text-accent-foreground px-1.5 py-0.5 rounded font-black uppercase tracking-tighter">
                {userData?.role || 'Staff'} Member
              </span>
            </div>
            <Avatar className="w-10 h-10 border-2 border-accent/20 shadow-sm">
              <AvatarImage src={userData?.photoUrl} alt={userData?.name} />
              <AvatarFallback className="bg-accent/20 text-accent-foreground font-bold">
                {userData?.name?.charAt(0) || '?'}
              </AvatarFallback>
            </Avatar>
          </div>
        </header>
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
