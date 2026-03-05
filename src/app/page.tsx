import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, ShieldCheck, UserCog, Printer } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background">
      <div className="max-w-4xl w-full text-center space-y-8">
        <div className="space-y-4">
          <div className="flex justify-center mb-4">
            <div className="bg-primary p-4 rounded-2xl shadow-lg">
              <Printer className="w-12 h-12 text-white" />
            </div>
          </div>
          <h1 className="text-5xl font-extrabold tracking-tight text-primary font-headline sm:text-6xl">
            PrintFlow <span className="text-accent">Manage</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            The ultimate management system for modern printing and design shops. Streamline your workflow from order to delivery.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mt-12">
          <Card className="border-2 hover:border-accent transition-all group overflow-hidden">
            <CardHeader>
              <Search className="w-10 h-10 text-accent mb-2" />
              <CardTitle className="text-2xl">Customer Portal</CardTitle>
              <CardDescription>Track your order status and view design previews in real-time.</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/track">
                <Button className="w-full bg-accent text-accent-foreground hover:bg-accent/90 py-6 text-lg">
                  Track My Order
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="border-2 hover:border-primary transition-all group overflow-hidden">
            <CardHeader>
              <ShieldCheck className="w-10 h-10 text-primary mb-2" />
              <CardTitle className="text-2xl">Internal Portal</CardTitle>
              <CardDescription>Secure access for Admin and Design Staff to manage operations.</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/login">
                <Button className="w-full bg-primary py-6 text-lg">
                  Staff Login
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        <div className="pt-12 text-sm text-muted-foreground flex items-center justify-center gap-4">
          <div className="flex items-center gap-1"><UserCog className="w-4 h-4" /> Role-based Access</div>
          <div className="w-1 h-1 bg-muted-foreground rounded-full" />
          <div className="flex items-center gap-1"><ShieldCheck className="w-4 h-4" /> Secure Auth</div>
        </div>
      </div>
    </div>
  );
}