
"use client"

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  LayoutDashboard, 
  ClipboardList, 
  Users, 
  Settings, 
  LogOut, 
  PlusCircle,
  Printer,
  ChevronRight,
  Loader2,
  BookOpen,
  QrCode,
  Clock,
  ShieldCheck,
  TrendingUp,
  Store
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useUser, useDoc, useFirestore, useMemoFirebase, useAuth } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const db = useFirestore();
  const auth = useAuth();
  const { user } = useUser();

  const userRef = useMemoFirebase(() => 
    user && db ? doc(db, 'users', user.uid) : null
  , [db, user]);

  const { data: userData, isLoading: isDataLoading } = useDoc(userRef);

  const isSuperAdmin = userData?.role === 'super_admin';
  const isShopOwner = userData?.role === 'shop_owner';

  const navItems = [
    { name: 'Dashboard', icon: LayoutDashboard, href: '/admin/dashboard', show: true },
    { name: 'Global Analytics', icon: TrendingUp, href: '/admin/analytics', show: isSuperAdmin },
    { name: 'Shops Directory', icon: Store, href: '/admin/shops', show: isSuperAdmin },
    { name: 'Orders', icon: ClipboardList, href: '/admin/orders', show: !isSuperAdmin },
    { name: 'Staff Directory', icon: Users, href: '/admin/staff', show: isShopOwner },
    { name: 'Attendance Log', icon: Clock, href: '/admin/attendance', show: !isSuperAdmin },
    { name: 'Catalog Editor', icon: BookOpen, href: '/admin/catalog', show: isShopOwner },
    { name: 'QR Catalog', icon: QrCode, href: '/admin/qr', show: isShopOwner },
    { name: 'Settings', icon: Settings, href: '/admin/settings', show: isShopOwner },
  ];

  const handleSignOut = async () => {
    await auth.signOut();
    router.push('/login');
  };

  const filteredNavItems = navItems.filter(item => item.show);

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-card hidden md:flex flex-col shadow-sm">
        <div className="p-6 flex items-center gap-3">
          <div className="bg-primary p-2 rounded-lg shadow-lg">
            {isSuperAdmin ? <ShieldCheck className="w-6 h-6 text-white" /> : <Printer className="w-6 h-6 text-white" />}
          </div>
          <span className="font-bold text-xl text-primary font-headline tracking-tighter italic">
            {isSuperAdmin ? 'MasterFlow' : 'PrintFlow'}
          </span>
        </div>
        
        {isShopOwner && (
          <div className="px-4 mb-4">
            <Link href="/admin/orders/new" className="block w-full">
              <Button className="w-full bg-accent text-accent-foreground hover:bg-accent/90 justify-start gap-2 font-black shadow-lg">
                <PlusCircle className="w-4 h-4" /> New Order
              </Button>
            </Link>
          </div>
        )}

        <ScrollArea className="flex-1 px-4">
          <nav className="space-y-1">
            {filteredNavItems.map((item) => (
              <Link 
                key={item.href} 
                href={item.href}
                className={cn(
                  "flex items-center justify-between px-3 py-3 rounded-xl text-sm font-bold transition-all",
                  pathname.startsWith(item.href) 
                    ? "bg-primary text-white shadow-md" 
                    : "text-muted-foreground hover:bg-primary/5 hover:text-primary"
                )}
              >
                <div className="flex items-center gap-3">
                  <item.icon className="w-4 h-4" />
                  {item.name}
                </div>
                {pathname.startsWith(item.href) && <ChevronRight className="w-4 h-4" />}
              </Link>
            ))}
          </nav>
        </ScrollArea>

        <div className="p-4 border-t bg-muted/10">
          <Button variant="ghost" className="w-full justify-start gap-2 text-destructive hover:text-white hover:bg-destructive font-bold transition-colors" onClick={handleSignOut}>
            <LogOut className="w-4 h-4" /> Sign Out
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto relative bg-background/50">
        <header className="h-16 border-b bg-card/80 backdrop-blur-md flex items-center justify-between px-8 sticky top-0 z-10">
          <div className="flex flex-col">
            <h1 className="font-black text-lg font-headline text-primary uppercase tracking-widest">
              {isSuperAdmin ? 'Master Controller' : isShopOwner ? 'Shop Owner' : 'Staff Portal'}
            </h1>
            {isSuperAdmin && <span className="text-[10px] font-bold text-accent uppercase -mt-1">System Overlord Access</span>}
          </div>
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-end">
              <span className="text-sm font-black">
                {isDataLoading ? '---' : (userData?.name || 'Admin')}
              </span>
              <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-bold uppercase tracking-tighter">
                {isSuperAdmin ? 'Global Admin' : `Shop: ${userData?.shopId?.slice(0, 8)}`}
              </span>
            </div>
            <Avatar className="w-10 h-10 border-2 border-primary/20 shadow-sm">
              <AvatarImage src={userData?.photoUrl} alt={userData?.name} />
              <AvatarFallback className="bg-primary text-white font-bold">
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
