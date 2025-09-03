import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import { insertSubmissionSchema, type InsertSubmission, type Submission } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export default function AgentDashboard() {
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentTime, setCurrentTime] = useState(new Date());

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

  // Fetch agent's submissions
  const { data: submissions = [], isLoading: submissionsLoading } = useQuery({
    queryKey: ["/api/submissions"],
    enabled: !isLoading && !!user,
  });

  // Fetch stats
  const { data: stats } = useQuery({
    queryKey: ["/api/submissions/stats"],
    enabled: !isLoading && !!user,
  });

  const submitMutation = useMutation({
    mutationFn: async (data: InsertSubmission) => {
      const res = await apiRequest("POST", "/api/submissions", data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Visit record submitted successfully",
      });
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/submissions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/submissions/stats"] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to submit visit record",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertSubmission) => {
    submitMutation.mutate(data);
  };

  const handleLogout = () => {
    window.location.href = '/api/logout';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <header className="bg-card border-b border-border sticky top-0 z-40">
        <div className="px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
              <i className="fas fa-user text-primary-foreground text-sm"></i>
            </div>
            <div>
              <h1 className="font-semibold text-card-foreground" data-testid="text-agent-name">
                {user?.firstName || 'Field Agent'}
              </h1>
              <p className="text-xs text-muted-foreground">Field Agent</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout} data-testid="button-logout">
            <i className="fas fa-sign-out-alt"></i>
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="pb-20 md:pb-8">
        {/* Stats Overview */}
        <div className="p-4">
          <div className="grid grid-cols-2 gap-4 mb-6">
            <Card className="bg-gradient-to-br from-card to-muted">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">Today's Visits</p>
                    <p className="text-2xl font-bold text-card-foreground" data-testid="text-today-visits">
                      {stats?.todayCount || 0}
                    </p>
                  </div>
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                    <i className="fas fa-clipboard-check text-primary"></i>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-card to-muted">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">Total Visits</p>
                    <p className="text-2xl font-bold text-card-foreground" data-testid="text-total-visits">
                      {Array.isArray(submissions) ? submissions.length : 0}
                    </p>
                  </div>
                  <div className="w-10 h-10 bg-accent/10 rounded-full flex items-center justify-center">
                    <i className="fas fa-calendar-week text-accent"></i>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Data Submission Form */}
        <div className="px-4">
          <Card className="shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center text-lg">
                <i className="fas fa-plus-circle text-primary mr-2"></i>
                New Visit Record
              </CardTitle>
              <p className="text-sm text-muted-foreground">Submit client visit information</p>
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
                            className="grid grid-cols-2 gap-3"
                          >
                            <div className="flex items-center justify-center p-3 border border-input rounded-md has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                              <RadioGroupItem value="feeding" id="feeding" className="sr-only" />
                              <Label htmlFor="feeding" className="text-center cursor-pointer" data-testid="radio-feeding">
                                <i className="fas fa-plug text-primary text-lg mb-1 block"></i>
                                <div className="text-sm font-medium" dir="rtl">تغذية</div>
                                <div className="text-xs text-muted-foreground">Feeding</div>
                              </Label>
                            </div>
                            <div className="flex items-center justify-center p-3 border border-input rounded-md has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                              <RadioGroupItem value="maintenance" id="maintenance" className="sr-only" />
                              <Label htmlFor="maintenance" className="text-center cursor-pointer" data-testid="radio-maintenance">
                                <i className="fas fa-wrench text-accent text-lg mb-1 block"></i>
                                <div className="text-sm font-medium" dir="rtl">صيانة</div>
                                <div className="text-xs text-muted-foreground">Maintenance</div>
                              </Label>
                            </div>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="bg-muted rounded-md p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-muted-foreground">Timestamp</span>
                      <span className="text-sm text-foreground" data-testid="text-timestamp">
                        {currentTime.toLocaleString()}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Automatically captured on submission</p>
                  </div>
                  
                  <div className="flex gap-3">
                    <Button 
                      type="button" 
                      variant="secondary" 
                      className="flex-1"
                      onClick={() => form.reset()}
                      data-testid="button-cancel"
                    >
                      <i className="fas fa-times mr-2"></i>
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      className="flex-1"
                      disabled={submitMutation.isPending}
                      data-testid="button-submit-visit"
                    >
                      <i className="fas fa-check mr-2"></i>
                      {submitMutation.isPending ? "Submitting..." : "Submit Visit"}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
          
          {/* Recent Submissions */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-base">Recent Submissions</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {submissionsLoading ? (
                  <div className="p-4 text-center text-muted-foreground">
                    Loading submissions...
                  </div>
                ) : Array.isArray(submissions) && submissions.length > 0 ? (
                  submissions.slice(0, 5).map((submission: Submission) => (
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
