
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
  Loader2
} from 'lucide-react';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';

export default function StaffProfilePage() {
  const { id } = useParams();
  const router = useRouter();
  const db = useFirestore();

  const userRef = useMemoFirebase(() => id && db ? doc(db, 'users', id as string) : null, [db, id]);
  const { data: user, isLoading } = useDoc(userRef);

  if (isLoading) return <div className="p-20 flex justify-center"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>;
  if (!user) return <div className="p-20 text-center">Staff member not found.</div>;

  const infoBlocks = [
    { label: 'Role', value: user.role, icon: ShieldCheck, color: 'text-blue-500' },
    { label: 'Department', value: user.department || 'N/A', icon: Building2, color: 'text-purple-500' },
    { label: 'Employee ID', value: user.username, icon: LayoutGrid, color: 'text-orange-500' },
    { label: 'Status', value: user.status || 'Active', icon: ShieldCheck, color: user.status === 'Active' ? 'text-green-500' : 'text-red-500' },
  ];

  const contactBlocks = [
    { label: 'Email', value: user.email, icon: Mail },
    { label: 'Phone', value: user.phone, icon: Phone },
    { label: 'Address', value: user.address || 'N/A', icon: MapPin },
  ];

  const businessBlocks = [
    { label: 'Joining Date', value: user.joiningDate || 'N/A', icon: Calendar },
    { label: 'Salary', value: user.salary ? `BDT ${user.salary}` : 'N/A', icon: Banknote },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}><ArrowLeft className="w-5 h-5" /></Button>
        <h2 className="text-3xl font-bold font-headline">Staff Profile</h2>
      </div>

      <Card className="overflow-hidden border-2 shadow-xl">
        <div className="h-32 bg-primary/10 relative">
          <div className="absolute -bottom-16 left-8">
            <Avatar className="h-32 w-32 border-4 border-white shadow-2xl">
              <AvatarImage src={user.photoUrl} />
              <AvatarFallback className="text-4xl font-bold bg-primary text-white">{user.name?.charAt(0)}</AvatarFallback>
            </Avatar>
          </div>
        </div>
        <CardContent className="pt-20 px-8 pb-10">
          <div className="space-y-8">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-3xl font-black text-primary">{user.name}</h3>
                <p className="text-muted-foreground font-medium uppercase tracking-widest text-xs mt-1">
                  Professional Profile & Team Access
                </p>
              </div>
              <Badge variant="outline" className="text-lg py-1 px-4 border-primary/20 bg-primary/5">
                {user.role}
              </Badge>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {infoBlocks.map((block) => (
                <div key={block.label} className="p-4 rounded-xl bg-muted/30 border space-y-1">
                  <block.icon className={cn("w-4 h-4 mb-1", block.color)} />
                  <p className="text-[10px] font-bold uppercase text-muted-foreground">{block.label}</p>
                  <p className="text-sm font-bold">{block.value}</p>
                </div>
              ))}
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div className="space-y-4">
                  <h4 className="font-bold flex items-center gap-2 text-primary">
                    <Mail className="w-4 h-4" /> Contact Information
                  </h4>
                  <div className="space-y-3">
                    {contactBlocks.map((b) => (
                      <div key={b.label} className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                          <b.icon className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="text-[10px] uppercase font-bold text-muted-foreground">{b.label}</p>
                          <p className="text-sm font-medium">{b.value}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="space-y-4">
                  <h4 className="font-bold flex items-center gap-2 text-primary">
                    <Briefcase className="w-4 h-4" /> Business Details
                  </h4>
                  <div className="space-y-3">
                    {businessBlocks.map((b) => (
                      <div key={b.label} className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                          <b.icon className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="text-[10px] uppercase font-bold text-muted-foreground">{b.label}</p>
                          <p className="text-sm font-medium">{b.value}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {user.customFields && Object.keys(user.customFields).length > 0 && (
              <div className="space-y-4">
                <Separator />
                <h4 className="font-bold flex items-center gap-2 text-primary">
                  <LayoutGrid className="w-4 h-4" /> Additional Columns
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {Object.entries(user.customFields).map(([key, val]: [string, any]) => (
                    <div key={key} className="p-3 bg-muted/20 border rounded-lg">
                      <p className="text-[10px] font-bold uppercase text-muted-foreground">{key}</p>
                      <p className="text-sm font-bold">{val?.toString() || 'N/A'}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
