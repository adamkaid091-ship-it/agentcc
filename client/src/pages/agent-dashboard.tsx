import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { insertSubmissionSchema, type InsertSubmission } from "@shared/schema";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

type DemoSubmission = {
  id: string;
  clientName: string;
  government: string;
  atmCode: string;
  serviceType: "feeding" | "maintenance";
  agentId: string;
  createdAt: Date;
};

export default function AgentDashboard() {
  const { toast } = useToast();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [submissions, setSubmissions] = useState<DemoSubmission[]>([]);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    setUserRole(localStorage.getItem('userRole'));
  }, []);

  // Update timestamp every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const form = useForm<InsertSubmission>({
    resolver: zodResolver(insertSubmissionSchema),
    defaultValues: {
      clientName: "",
      government: "",
      atmCode: "",
      serviceType: "feeding",
    },
  });

  // This will be connected to Supabase later
  const handleSubmit = (data: InsertSubmission) => {
    const newSubmission = {
      id: Date.now().toString(),
      ...data,
      agentId: 'demo-agent',
      createdAt: new Date(),
    };
    setSubmissions(prev => [newSubmission, ...prev]);
    toast({
      title: "Success",
      description: "Visit record submitted successfully (demo mode)",
    });
    form.reset();
  };

  const onSubmit = (data: InsertSubmission) => {
    handleSubmit(data);
  };

  const handleLogout = () => {
    localStorage.removeItem('userRole');
    window.location.href = '/';
  };


  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-gradient-to-r from-primary to-blue-600 shadow-lg sticky top-0 z-40">
        <div className="px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-white/20 backdrop-blur rounded-full flex items-center justify-center shadow-md">
              <i className="fas fa-user text-white text-lg"></i>
            </div>
            <div>
              <h1 className="font-bold text-white text-lg" data-testid="text-agent-name">
                Field Agent Dashboard
              </h1>
              <p className="text-xs text-blue-100">Submit service reports</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {userRole === 'manager' && (
              <Link href="/manager">
                <Button variant="secondary" size="sm" className="bg-white/20 backdrop-blur hover:bg-white/30 text-white border-white/30" data-testid="button-manager-panel">
                  <i className="fas fa-cogs mr-1"></i>
                  Manager
                </Button>
              </Link>
            )}
            <Button variant="ghost" size="sm" onClick={handleLogout} className="text-white hover:bg-white/20" data-testid="button-logout">
              <i className="fas fa-sign-out-alt"></i>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pb-20 md:pb-8">
        {/* Stats Overview */}
        <div className="p-4">
          <div className="grid grid-cols-2 gap-4 mb-6">
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 shadow-lg">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-blue-600 font-semibold">Today's Visits</p>
                    <p className="text-3xl font-bold text-blue-800" data-testid="text-today-visits">
                      {submissions.filter(s => {
                        const today = new Date();
                        const submissionDate = new Date(s.createdAt);
                        return submissionDate.toDateString() === today.toDateString();
                      }).length}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center shadow-md">
                    <i className="fas fa-clipboard-check text-white text-lg"></i>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 shadow-lg">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-green-600 font-semibold">Total Visits</p>
                    <p className="text-3xl font-bold text-green-800" data-testid="text-total-visits">
                      {submissions.length}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center shadow-md">
                    <i className="fas fa-calendar-week text-white text-lg"></i>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Data Submission Form */}
        <div className="px-4">
          <Card className="shadow-lg border-0 bg-gradient-to-br from-white to-gray-50">
            <CardHeader className="pb-4 bg-gradient-to-r from-primary/10 to-primary/5 rounded-t-lg">
              <CardTitle className="flex items-center text-xl text-primary">
                <i className="fas fa-plus-circle mr-3 text-2xl"></i>
                New Visit Record
              </CardTitle>
              <p className="text-sm text-primary/70 font-medium">Submit client visit information</p>
            </CardHeader>
            
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="clientName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Client Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter client name" {...field} data-testid="input-client-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="government"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Governorate</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-government">
                              <SelectValue placeholder="Select Governorate" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="cairo">Cairo</SelectItem>
                            <SelectItem value="giza">Giza</SelectItem>
                            <SelectItem value="alexandria">Alexandria</SelectItem>
                            <SelectItem value="qalyubia">Qalyubia</SelectItem>
                            <SelectItem value="port-said">Port Said</SelectItem>
                            <SelectItem value="suez">Suez</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="atmCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>ATM Code</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter ATM code" {...field} data-testid="input-atm-code" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="serviceType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Service Type</FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            className="grid grid-cols-2 gap-4"
                          >
                            <label className="relative block cursor-pointer" data-testid="radio-feeding">
                              <RadioGroupItem value="feeding" id="feeding" className="sr-only peer" />
                              <div className="peer-checked:border-primary peer-checked:bg-primary/10 peer-checked:shadow-md border-2 border-input rounded-lg p-4 transition-all duration-200 hover:bg-accent/50 hover:border-accent flex flex-col items-center justify-center min-h-[100px] bg-card">
                                <i className="fas fa-plug text-primary text-2xl mb-2"></i>
                                <div className="text-sm font-semibold" dir="rtl">تغذية</div>
                                <div className="text-xs text-muted-foreground mt-1">Feeding</div>
                              </div>
                            </label>
                            <label className="relative block cursor-pointer" data-testid="radio-maintenance">
                              <RadioGroupItem value="maintenance" id="maintenance" className="sr-only peer" />
                              <div className="peer-checked:border-amber-500 peer-checked:bg-amber-50 peer-checked:shadow-md border-2 border-input rounded-lg p-4 transition-all duration-200 hover:bg-accent/50 hover:border-accent flex flex-col items-center justify-center min-h-[100px] bg-card">
                                <i className="fas fa-wrench text-amber-600 text-2xl mb-2"></i>
                                <div className="text-sm font-semibold" dir="rtl">صيانة</div>
                                <div className="text-xs text-muted-foreground mt-1">Maintenance</div>
                              </div>
                            </label>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-200 rounded-lg p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-gray-700 flex items-center">
                        <i className="fas fa-clock mr-2 text-blue-500"></i>
                        Timestamp
                      </span>
                      <span className="text-sm font-mono text-gray-800 bg-white px-2 py-1 rounded border" data-testid="text-timestamp">
                        {currentTime.toLocaleString()}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">Automatically captured on submission</p>
                  </div>
                  
                  <div className="flex gap-4">
                    <Button 
                      type="button" 
                      variant="outline" 
                      className="flex-1 py-3 border-2 hover:bg-gray-50"
                      onClick={() => form.reset()}
                      data-testid="button-cancel"
                    >
                      <i className="fas fa-times mr-2"></i>
                      Clear Form
                    </Button>
                    <Button 
                      type="submit" 
                      className="flex-1 py-3 bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 shadow-lg"
                      data-testid="button-submit-visit"
                    >
                      <i className="fas fa-paper-plane mr-2"></i>
                      Submit Visit
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
          
          {/* Recent Submissions */}
          <Card className="mt-6 shadow-lg border-0">
            <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-t-lg">
              <CardTitle className="text-lg font-bold text-gray-800 flex items-center">
                <i className="fas fa-history mr-2 text-blue-500"></i>
                Recent Submissions
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {submissions.length > 0 ? (
                  submissions.slice(0, 5).map((submission: DemoSubmission) => (
                    <div key={submission.id} className="p-4 hover:bg-accent/50 transition-colors" data-testid={`card-submission-${submission.id}`}>
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h4 className="font-medium text-card-foreground" data-testid={`text-client-${submission.id}`}>
                            {submission.clientName}
                          </h4>
                          <p className="text-sm text-muted-foreground" data-testid={`text-government-${submission.id}`}>
                            {submission.government}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            ATM: <span data-testid={`text-atm-${submission.id}`}>{submission.atmCode}</span>
                          </p>
                        </div>
                        <div className="text-right">
                          <div 
                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              submission.serviceType === 'feeding' 
                                ? 'bg-primary/10 text-primary' 
                                : 'bg-accent/10 text-accent'
                            }`}
                            dir="rtl"
                            data-testid={`badge-type-${submission.id}`}
                          >
                            {submission.serviceType === 'feeding' ? 'تغذية' : 'صيانة'}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1" data-testid={`text-time-${submission.id}`}>
                            {submission.createdAt ? new Date(submission.createdAt).toLocaleTimeString() : 'N/A'}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center text-muted-foreground" data-testid="text-no-submissions">
                    No submissions yet
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      
      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 md:hidden bg-card border-t border-border z-50">
        <div className="grid grid-cols-3 py-2">
          <button className="flex flex-col items-center py-2 text-primary" data-testid="nav-home">
            <i className="fas fa-home text-lg mb-1"></i>
            <span className="text-xs">Home</span>
          </button>
          <button className="flex flex-col items-center py-2 text-muted-foreground" data-testid="nav-history">
            <i className="fas fa-history text-lg mb-1"></i>
            <span className="text-xs">History</span>
          </button>
          <button className="flex flex-col items-center py-2 text-muted-foreground" data-testid="nav-profile">
            <i className="fas fa-user text-lg mb-1"></i>
            <span className="text-xs">Profile</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
