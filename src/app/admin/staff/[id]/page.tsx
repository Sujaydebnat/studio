
"use client"

import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  Briefcase, 
  Building2, 
  Banknote, 
  ShieldCheck,
  LayoutGrid,
  Loader2,
  FileText
} from 'lucide-react';
import { useDoc, useFirestore, useMemoFirebase, useCollection } from '@/firebase';
import { doc, query, collection, where, orderBy } from 'firebase/firestore';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

export default function StaffProfilePage() {
  const { id } = useParams();
  const router = useRouter();
  const db = useFirestore();

  const userRef = useMemoFirebase(() => id && db ? doc(db, 'users', id as string) : null, [db, id]);
  const { data: user, isLoading } = useDoc(userRef);

  const fieldsQuery = useMemoFirebase(() => {
    if (!db || !user?.shopId) return null;
    return query(
      collection(db, 'staff_fields'), 
      where('shopId', '==', user.shopId),
      orderBy('createdAt', 'asc')
    );
  }, [db, user?.shopId]);

  const { data: shopFields } = useCollection(fieldsQuery);

  if (isLoading) return <div className="p-20 flex justify-center"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>;
  if (!user) return <div className="p-20 text-center">Staff member not found.</div>;

  const infoBlocks = [
    { label: 'Primary Role', value: user.role, icon: ShieldCheck, color: 'text-blue-500' },
    { label: 'Work Unit', value: user.department || 'General', icon: Building2, color: 'text-purple-500' },
    { label: 'Employee ID', value: user.username, icon: LayoutGrid, color: 'text-orange-500' },
    { label: 'Status', value: user.status || 'Active', icon: ShieldCheck, color: user.status === 'Active' ? 'text-green-500' : 'text-red-500' },
  ];

  const contactBlocks = [
    { label: 'Email Address', value: user.email, icon: Mail },
    { label: 'Phone Line', value: user.phone, icon: Phone },
    { label: 'Physical Address', value: user.address || 'Not Provided', icon: MapPin },
  ];

  const businessBlocks = [
    { label: 'Joined On', value: user.joiningDate || 'Unknown', icon: Calendar },
    { label: 'Monthly Wage', value: user.salary ? `BDT ${user.salary}` : 'Unset', icon: Banknote },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20 animate-in fade-in duration-500">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}><ArrowLeft className="w-5 h-5" /></Button>
        <h2 className="text-3xl font-bold font-headline">Member Insight</h2>
      </div>

      <Card className="overflow-hidden border-2 shadow-2xl">
        <div className="h-40 bg-gradient-to-r from-primary/10 to-accent/5 relative">
          <div className="absolute -bottom-16 left-10">
            <Avatar className="h-36 w-36 border-4 border-white shadow-2xl">
              <AvatarImage src={user.photoUrl} />
              <AvatarFallback className="text-5xl font-black bg-primary text-white uppercase">{user.name?.charAt(0)}</AvatarFallback>
            </Avatar>
          </div>
        </div>
        <CardContent className="pt-24 px-10 pb-12">
          <div className="space-y-10">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
              <div>
                <h3 className="text-4xl font-black text-primary tracking-tighter">{user.name}</h3>
                <p className="text-muted-foreground font-bold uppercase tracking-[0.2em] text-[10px] mt-2">
                  Staff Member Profile • Shop ID: {user.shopId?.slice(0, 8)}
                </p>
              </div>
              <Badge variant="outline" className="text-base py-1.5 px-6 border-primary/30 bg-primary/5 font-black uppercase tracking-widest text-primary">
                {user.role}
              </Badge>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {infoBlocks.map((block) => (
                <div key={block.label} className="p-5 rounded-2xl bg-muted/30 border-2 border-transparent hover:border-muted-foreground/10 transition-colors space-y-2">
                  <block.icon className={cn("w-5 h-5", block.color)} />
                  <div>
                    <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">{block.label}</p>
                    <p className="text-sm font-black mt-1">{block.value}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid lg:grid-cols-2 gap-12">
              <div className="space-y-8">
                <div className="space-y-6">
                  <h4 className="font-black text-xs uppercase tracking-widest flex items-center gap-2 text-primary/70">
                    <Mail className="w-4 h-4" /> Professional Connectivity
                  </h4>
                  <div className="space-y-5">
                    {contactBlocks.map((b) => (
                      <div key={b.label} className="flex gap-4 group">
                        <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                          <b.icon className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="text-[10px] uppercase font-black text-muted-foreground tracking-tighter">{b.label}</p>
                          <p className="text-sm font-bold">{b.value}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-8">
                <div className="space-y-6">
                  <h4 className="font-black text-xs uppercase tracking-widest flex items-center gap-2 text-primary/70">
                    <Briefcase className="w-4 h-4" /> Engagement Metrics
                  </h4>
                  <div className="space-y-5">
                    {businessBlocks.map((b) => (
                      <div key={b.label} className="flex gap-4 group">
                        <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center group-hover:bg-accent/10 transition-colors">
                          <b.icon className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="text-[10px] uppercase font-black text-muted-foreground tracking-tighter">{b.label}</p>
                          <p className="text-sm font-bold">{b.value}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Dynamic Custom Fields Section */}
            {shopFields && shopFields.length > 0 && (
              <div className="space-y-6">
                <Separator className="bg-primary/10" />
                <h4 className="font-black text-xs uppercase tracking-widest flex items-center gap-2 text-primary">
                  <LayoutGrid className="w-4 h-4" /> Shop Custom Columns
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {shopFields.map((field) => {
                    const value = user.customFields?.[field.fieldName];
                    return (
                      <div key={field.id} className="p-4 bg-muted/20 border-2 rounded-2xl shadow-sm hover:shadow-md transition-all">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline" className="text-[8px] h-4 font-black bg-white uppercase tracking-tighter text-muted-foreground border-muted">
                            {field.fieldType}
                          </Badge>
                        </div>
                        <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">{field.fieldName}</p>
                        <p className="text-sm font-black text-primary mt-1">
                          {value?.toString() || (
                            <span className="text-muted-foreground font-normal italic">No Data</span>
                          )}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter className="bg-muted/10 border-t p-6 flex justify-center">
           <p className="text-[10px] font-bold text-muted-foreground opacity-50 flex items-center gap-2 uppercase tracking-[0.3em]">
             <FileText className="w-3 h-3" /> Secure Tenant Record # {user.id}
           </p>
        </CardFooter>
      </Card>
    </div>
  );
}
