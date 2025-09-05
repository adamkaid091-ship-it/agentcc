import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { insertSubmissionSchema, type InsertSubmission, type Submission } from "@shared/schema";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

// Remove DemoSubmission type since we're using the real Submission type now

export default function AgentDashboard() {
  const { toast } = useToast();
  const { user, signOut, getAccessToken } = useAuth();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [submissionsSearch, setSubmissionsSearch] = useState("");
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

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

  const queryClient = useQueryClient();

  // Fetch current user's submissions
  const { data: submissions = [], isLoading } = useQuery<Submission[]>({
    queryKey: ['/api/submissions/my'],
    queryFn: async () => {
      const token = await getAccessToken();
      const response = await fetch('/api/submissions/my', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch submissions');
      return response.json();
    },
    staleTime: 0, // Always fetch fresh data
    refetchOnWindowFocus: true,
  });

  // Create submission mutation
  const createSubmissionMutation = useMutation({
    mutationFn: async (data: InsertSubmission) => {
      console.log('Submitting data:', data);
      
      // First sync user with backend to ensure they exist in database
      try {
        const token = await getAccessToken();
        console.log('Got token:', token ? 'Token available' : 'No token');
        
        if (!token) {
          throw new Error('No access token available. Please try logging out and back in.');
        }
        
        // Sync user with backend database first
        console.log('Syncing user with backend...');
        const userSyncResponse = await fetch('/api/user/profile', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        
        if (!userSyncResponse.ok) {
          console.error('User sync failed:', userSyncResponse.status, await userSyncResponse.text());
          throw new Error('Failed to sync user with backend. Please try refreshing the page.');
        }
        
        const userProfile = await userSyncResponse.json();
        console.log('User synced successfully:', userProfile);
        
        // Now submit the data
        const response = await apiRequest('POST', '/api/submissions', data, token);
        console.log('Submission response:', response.status);
        return response.json();
      } catch (error) {
        console.error('Full submission error:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/submissions/my'] });
      queryClient.invalidateQueries({ queryKey: ['/api/submissions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats'] });
      toast({
        title: "Success",
        description: "Service report submitted successfully!",
      });
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to submit service report. Please try again.",
        variant: "destructive",
      });
      console.error('Error submitting:', error);
    }
  });

  const onSubmit = (data: InsertSubmission) => {
    createSubmissionMutation.mutate(data);
  };

  const handleSignOut = async () => {
    await signOut();
    toast({
      title: "Logged Out",
      description: "You have been logged out successfully!",
    });
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
                {user?.firstName || 'Field Agent'} - {user?.role === 'manager' ? 'Manager' : 'Agent'}
              </h1>
              <p className="text-xs text-blue-100">{user?.email}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {user?.role === 'manager' && (
              <Link href="/manager">
                <Button variant="secondary" size="sm" className="bg-white/20 backdrop-blur hover:bg-white/30 text-white border-white/30" data-testid="button-manager-panel">
                  <i className="fas fa-cogs mr-1"></i>
                  Manager
                </Button>
              </Link>
            )}
            <Button variant="ghost" size="sm" onClick={handleSignOut} className="text-white hover:bg-white/20" data-testid="button-logout">
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
                            value={field.value}
                            className="grid grid-cols-2 gap-4"
                          >
                            <div className="relative">
                              <RadioGroupItem value="feeding" id="feeding" className="sr-only" />
                              <Label 
                                htmlFor="feeding" 
                                className="relative block cursor-pointer border-2 border-input rounded-lg p-4 transition-all duration-200 hover:bg-accent/50 hover:border-accent flex flex-col items-center justify-center min-h-[100px] bg-card data-[state=checked]:border-primary data-[state=checked]:bg-primary/10 data-[state=checked]:shadow-md"
                                data-testid="radio-feeding"
                                data-state={field.value === 'feeding' ? 'checked' : 'unchecked'}
                              >
                                <i className="fas fa-plug text-primary text-2xl mb-2"></i>
                                <div className="text-sm font-semibold" dir="rtl">تغذية</div>
                                <div className="text-xs text-muted-foreground mt-1">Feeding</div>
                              </Label>
                            </div>
                            <div className="relative">
                              <RadioGroupItem value="maintenance" id="maintenance" className="sr-only" />
                              <Label 
                                htmlFor="maintenance" 
                                className="relative block cursor-pointer border-2 border-input rounded-lg p-4 transition-all duration-200 hover:bg-accent/50 hover:border-accent flex flex-col items-center justify-center min-h-[100px] bg-card data-[state=checked]:border-amber-500 data-[state=checked]:bg-amber-50 data-[state=checked]:shadow-md"
                                data-testid="radio-maintenance"
                                data-state={field.value === 'maintenance' ? 'checked' : 'unchecked'}
                              >
                                <i className="fas fa-wrench text-amber-600 text-2xl mb-2"></i>
                                <div className="text-sm font-semibold" dir="rtl">صيانة</div>
                                <div className="text-xs text-muted-foreground mt-1">Maintenance</div>
                              </Label>
                            </div>
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
          <Card className="mt-6 shadow-lg border-0" data-testid="card-recent-submissions">
            <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-t-lg">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-bold text-gray-800 flex items-center">
                  <i className="fas fa-history mr-2 text-blue-500"></i>
                  Recent Submissions ({submissions.length})
                </CardTitle>
              </div>
              <div className="mt-4">
                <div className="relative">
                  <i className="fas fa-search absolute left-3 top-3 text-muted-foreground"></i>
                  <Input
                    placeholder="Search submissions..."
                    value={submissionsSearch}
                    onChange={(e) => setSubmissionsSearch(e.target.value)}
                    className="pl-10"
                    data-testid="input-submissions-search"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[400px]">
                <div className="divide-y divide-border">
                  {(() => {
                    const filtered = submissions.filter(sub => 
                      sub.clientName.toLowerCase().includes(submissionsSearch.toLowerCase()) ||
                      sub.atmCode.toLowerCase().includes(submissionsSearch.toLowerCase()) ||
                      sub.government.toLowerCase().includes(submissionsSearch.toLowerCase())
                    );
                    const startIndex = (currentPage - 1) * itemsPerPage;
                    const paginatedSubmissions = filtered.slice(startIndex, startIndex + itemsPerPage);
                    
                    return paginatedSubmissions.length > 0 ? (
                      paginatedSubmissions.map((submission: Submission) => (
                        <Dialog key={submission.id}>
                          <DialogTrigger asChild>
                            <div className="p-4 hover:bg-blue-50 transition-colors cursor-pointer border-l-4 border-transparent hover:border-blue-500" data-testid={`card-submission-${submission.id}`}>
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <h4 className="font-semibold text-gray-800" data-testid={`text-client-${submission.id}`}>
                                    {submission.clientName}
                                  </h4>
                                  <p className="text-sm text-gray-600" data-testid={`text-government-${submission.id}`}>
                                    <i className="fas fa-map-marker-alt mr-1"></i>
                                    {submission.government}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    ATM: <span className="font-mono bg-gray-100 px-1 rounded" data-testid={`text-atm-${submission.id}`}>{submission.atmCode}</span>
                                  </p>
                                </div>
                                <div className="text-right">
                                  <div 
                                    className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium shadow-sm ${
                                      submission.serviceType === 'feeding' 
                                        ? 'bg-blue-100 text-blue-800 border border-blue-200' 
                                        : 'bg-amber-100 text-amber-800 border border-amber-200'
                                    }`}
                                    dir="rtl"
                                    data-testid={`badge-type-${submission.id}`}
                                  >
                                    {submission.serviceType === 'feeding' ? 'تغذية' : 'صيانة'}
                                  </div>
                                  <p className="text-xs text-gray-500 mt-1 flex items-center" data-testid={`text-time-${submission.id}`}>
                                    <i className="fas fa-clock mr-1"></i>
                                    {submission.createdAt ? new Date(submission.createdAt).toLocaleTimeString() : 'N/A'}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </DialogTrigger>
                          <DialogContent className="max-w-md">
                            <DialogHeader>
                              <DialogTitle>Submission Details</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="text-sm font-medium text-gray-600">Client Name</label>
                                  <p className="font-semibold">{submission.clientName}</p>
                                </div>
                                <div>
                                  <label className="text-sm font-medium text-gray-600">Government</label>
                                  <p className="font-semibold">{submission.government}</p>
                                </div>
                                <div>
                                  <label className="text-sm font-medium text-gray-600">ATM Code</label>
                                  <p className="font-mono bg-gray-100 px-2 py-1 rounded">{submission.atmCode}</p>
                                </div>
                                <div>
                                  <label className="text-sm font-medium text-gray-600">Service Type</label>
                                  <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                    submission.serviceType === 'feeding' 
                                      ? 'bg-blue-100 text-blue-800' 
                                      : 'bg-amber-100 text-amber-800'
                                  }`} dir="rtl">
                                    {submission.serviceType === 'feeding' ? 'تغذية' : 'صيانة'}
                                  </div>
                                </div>
                              </div>
                              <div>
                                <label className="text-sm font-medium text-gray-600">Submitted At</label>
                                <p className="font-semibold text-lg">
                                  {submission.createdAt ? new Date(submission.createdAt).toLocaleString() : 'N/A'}
                                </p>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      ))
                    ) : (
                      <div className="p-8 text-center text-muted-foreground" data-testid="text-no-submissions">
                        <i className="fas fa-search text-4xl mb-4 opacity-50"></i>
                        <p>No submissions found</p>
                        <p className="text-sm">Try adjusting your search terms</p>
                      </div>
                    );
                  })()}
                </div>
              </ScrollArea>
              {submissions.length > itemsPerPage && (
                <div className="p-4 border-t bg-gray-50 flex items-center justify-between">
                  <p className="text-sm text-gray-600">
                    Showing {Math.min((currentPage - 1) * itemsPerPage + 1, submissions.length)} - {Math.min(currentPage * itemsPerPage, submissions.length)} of {submissions.length}
                  </p>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      data-testid="button-prev-page"
                    >
                      <i className="fas fa-chevron-left"></i>
                    </Button>
                    <span className="text-sm px-3 py-1 bg-white border rounded">{currentPage}</span>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setCurrentPage(prev => prev + 1)}
                      disabled={currentPage * itemsPerPage >= submissions.length}
                      data-testid="button-next-page"
                    >
                      <i className="fas fa-chevron-right"></i>
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
      
      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 md:hidden bg-white border-t border-border z-50 shadow-lg">
        <div className="grid grid-cols-3 py-2">
          <button 
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="flex flex-col items-center py-2 text-primary" 
            data-testid="nav-home"
          >
            <i className="fas fa-home text-lg mb-1"></i>
            <span className="text-xs">Home</span>
          </button>
          <button 
            onClick={() => document.querySelector('[data-testid="card-recent-submissions"]')?.scrollIntoView({ behavior: 'smooth' })}
            className="flex flex-col items-center py-2 text-muted-foreground" 
            data-testid="nav-history"
          >
            <i className="fas fa-history text-lg mb-1"></i>
            <span className="text-xs">History</span>
          </button>
          {user?.role === 'manager' ? (
            <Link href="/manager">
              <button className="flex flex-col items-center py-2 text-muted-foreground w-full" data-testid="nav-manager">
                <i className="fas fa-cogs text-lg mb-1"></i>
                <span className="text-xs">Manager</span>
              </button>
            </Link>
          ) : (
            <button 
              onClick={handleSignOut}
              className="flex flex-col items-center py-2 text-muted-foreground" 
              data-testid="nav-logout"
            >
              <i className="fas fa-sign-out-alt text-lg mb-1"></i>
              <span className="text-xs">Logout</span>
            </button>
          )}
        </div>
      </nav>
    </div>
  );
}
