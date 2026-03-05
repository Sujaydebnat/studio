import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  ClipboardList, 
  Clock, 
  Printer, 
  CheckCircle2, 
  TrendingUp,
  Users
} from 'lucide-react';

export default function AdminDashboard() {
  const stats = [
    { name: 'Total Orders', value: '1,284', icon: ClipboardList, color: 'text-primary' },
    { name: 'In Design', value: '12', icon: Clock, color: 'text-orange-500' },
    { name: 'Printing', value: '8', icon: Printer, color: 'text-accent' },
    { name: 'Completed', value: '1,264', icon: CheckCircle2, color: 'text-green-500' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold font-headline">Dashboard Overview</h2>
        <p className="text-muted-foreground">Welcome back! Here's what's happening today.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <Card key={stat.name} className="border-none shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.name}</CardTitle>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                <TrendingUp className="w-3 h-3 text-green-500" />
                <span className="text-green-500 font-semibold">+4.5%</span> from last week
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                  <div className="flex gap-4">
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                      <ClipboardList className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">New Order Created #{12340 + i}</p>
                      <p className="text-xs text-muted-foreground">Banner Print for Local Mall • 2h ago</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs">Assigned</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Staff Load</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { name: 'John Designer', tasks: 5, color: 'bg-primary' },
                { name: 'Sarah Artist', tasks: 3, color: 'bg-accent' },
                { name: 'Mike Printer', tasks: 8, color: 'bg-orange-500' },
              ].map((staff) => (
                <div key={staff.name} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{staff.name}</span>
                    <span className="text-muted-foreground">{staff.tasks} active</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div 
                      className={`${staff.color} h-2 rounded-full`} 
                      style={{ width: `${(staff.tasks / 10) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Badge({ children, variant, className }: any) {
  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${className} ${variant === 'outline' ? 'border' : ''}`}>
      {children}
    </span>
  );
}