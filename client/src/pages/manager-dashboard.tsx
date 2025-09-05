import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Link, useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Submission } from "@shared/schema";

export default function ManagerDashboard() {
  const { toast } = useToast();
  const { user, signOut, getAccessToken } = useAuth();
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [governmentFilter, setGovernmentFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [activeView, setActiveView] = useState("dashboard");
  const [selectedSubmission, setSelectedSubmission] = useState<(Submission & { agentName: string }) | null>(null);

  const queryClient = useQueryClient();

  // Fetch real submissions data from API (manager only)
  const { data: submissions = [], isLoading: submissionsLoading, refetch: refetchSubmissions } = useQuery<(Submission & { agentName: string })[]>({
    queryKey: ['/api/submissions'],
    queryFn: async () => {
      console.log('Manager fetching ALL submissions...');
      const token = await getAccessToken();
      
      if (!token) {
        console.error('No token available for manager submissions');
        throw new Error('Authentication token not available');
      }

      const response = await fetch('/api/submissions', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Manager submissions fetch failed:', response.status, errorText);
        throw new Error(`Failed to fetch submissions: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Manager submissions loaded:', data.length, 'submissions');
      return data;
    },
    enabled: user?.role === 'manager',
    staleTime: 0, // Always fetch fresh data
    refetchOnWindowFocus: true,
    retry: 3, // Retry failed requests
  });

  // Fetch real statistics data from API (manager only)
  const { data: stats = { total: 0, feeding: 0, maintenance: 0, todayCount: 0, activeAgents: 0 }, refetch: refetchStats } = useQuery<{
    total: number;
    feeding: number;
    maintenance: number;
    todayCount: number;
    activeAgents: number;
  }>({
    queryKey: ['/api/stats'],
    queryFn: async () => {
      console.log('Manager fetching stats...');
      const token = await getAccessToken();
      
      if (!token) {
        console.error('No token available for manager stats');
        throw new Error('Authentication token not available');
      }

      const response = await fetch('/api/stats', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Manager stats fetch failed:', response.status, errorText);
        throw new Error(`Failed to fetch stats: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Manager stats loaded:', data);
      return data;
    },
    enabled: user?.role === 'manager',
    staleTime: 0, // Always fetch fresh data
    refetchOnWindowFocus: true,
    retry: 3, // Retry failed requests
  });

  // Refresh functions
  const handleRefreshData = async () => {
    toast({
      title: "Refreshing Data",
      description: "Fetching latest data from database...",
    });
    
    try {
      await Promise.all([refetchSubmissions(), refetchStats()]);
      toast({
        title: "Data Refreshed",
        description: "Successfully updated all data from database.",
      });
    } catch (error) {
      toast({
        title: "Refresh Failed", 
        description: "Failed to refresh data. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleRefreshSubmissions = async () => {
    toast({
      title: "Refreshing Submissions",
      description: "Fetching latest submissions...",
    });
    
    try {
      await refetchSubmissions();
      toast({
        title: "Submissions Refreshed",
        description: "Successfully updated submissions data.",
      });
    } catch (error) {
      toast({
        title: "Refresh Failed",
        description: "Failed to refresh submissions. Please try again.",
        variant: "destructive",
      });
    }
  };

  const exportData = (format: 'csv' | 'excel' | 'txt') => {
    const data = filteredSubmissions;
    let content = '';
    let filename = '';
    
    if (format === 'csv' || format === 'excel') {
      const headers = 'Client Name,Government,ATM Code,Service Type,Agent,Timestamp\n';
      const rows = data.map((sub: any) => 
        `"${sub.clientName}","${sub.government}","${sub.atmCode}","${sub.serviceType}","${sub.agentName || 'Unknown'}","${sub.createdAt ? new Date(sub.createdAt).toLocaleString() : 'N/A'}"`
      ).join('\n');
      content = headers + rows;
      filename = `submissions_${new Date().toISOString().split('T')[0]}.csv`;
    } else {
      content = data.map((sub: any, index: number) => 
        `${index + 1}. ${sub.clientName} - ${sub.government} - ${sub.atmCode} - ${sub.serviceType} - ${sub.agentName || 'Unknown'} - ${sub.createdAt ? new Date(sub.createdAt).toLocaleString() : 'N/A'}`
      ).join('\n\n');
      filename = `submissions_${new Date().toISOString().split('T')[0]}.txt`;
    }
    
    const blob = new Blob([content], { type: format === 'txt' ? 'text/plain' : 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
    
    toast({
      title: "Export Complete",
      description: `Downloaded ${filename}`,
    });
  };

  useEffect(() => {
    // Only managers should access this dashboard
    if (user && user.role !== 'manager') {
      toast({
        title: "Access Denied",
        description: "You need manager permissions to access this page",
        variant: "destructive",
      });
      setLocation('/agent');
    }
  }, [user, toast, setLocation]);

  // Connected to real Supabase database via API

  const handleLogout = async () => {
    await signOut();
    // Navigation will be handled by AuthContext
  };

  const filteredSubmissions = Array.isArray(submissions) ? submissions.filter((submission: any) => {
    const matchesSearch = submission.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         submission.atmCode.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesGovernment = governmentFilter === 'all' || submission.government === governmentFilter;
    const matchesType = typeFilter === 'all' || submission.serviceType === typeFilter;
    
    const submissionDate = submission.createdAt ? new Date(submission.createdAt) : null;
    const today = new Date();
    let matchesDate = true;
    
    if (dateFilter === 'today' && submissionDate) {
      matchesDate = submissionDate.toDateString() === today.toDateString();
    } else if (dateFilter === 'week' && submissionDate) {
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      matchesDate = submissionDate >= weekAgo;
    } else if (dateFilter === 'month' && submissionDate) {
      const monthAgo = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
      matchesDate = submissionDate >= monthAgo;
    }
    
    return matchesSearch && matchesGovernment && matchesType && matchesDate;
  }) : [];


  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0">
        <div className="flex flex-col flex-grow bg-card border-r border-border">
          <div className="flex items-center px-6 py-4 border-b border-border">
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
              <i className="fas fa-cogs text-primary-foreground text-sm"></i>
            </div>
            <div className="ml-3">
              <h1 className="font-semibold text-card-foreground">Manager Panel</h1>
              <p className="text-xs text-muted-foreground">Field Operations</p>
            </div>
          </div>
          
          <nav className="flex-1 px-4 py-4">
            <ul className="space-y-2">
              <li>
                <button 
                  onClick={() => setActiveView("dashboard")}
                  className={`w-full flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeView === 'dashboard' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  }`} 
                  data-testid="nav-dashboard"
                >
                  <i className="fas fa-chart-line mr-3"></i>
                  Dashboard
                </button>
              </li>
              <li>
                <button 
                  onClick={() => setActiveView("submissions")}
                  className={`w-full flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeView === 'submissions' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  }`} 
                  data-testid="nav-submissions"
                >
                  <i className="fas fa-database mr-3"></i>
                  All Submissions
                </button>
              </li>
              <li>
                <button 
                  onClick={() => setActiveView("agents")}
                  className={`w-full flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeView === 'agents' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  }`} 
                  data-testid="nav-agents"
                >
                  <i className="fas fa-users mr-3"></i>
                  Agents
                </button>
              </li>
              <li>
                <button 
                  onClick={() => setActiveView("reports")}
                  className={`w-full flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeView === 'reports' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  }`} 
                  data-testid="nav-reports"
                >
                  <i className="fas fa-file-export mr-3"></i>
                  Reports
                </button>
              </li>
            </ul>
          </nav>
          
          <div className="px-4 py-4 border-t border-border">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                <i className="fas fa-user-tie text-primary-foreground text-sm"></i>
              </div>
              <div className="ml-3">
                <p className="font-medium text-card-foreground" data-testid="text-manager-name">
                  Manager
                </p>
                <p className="text-xs text-muted-foreground">Operations Manager</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Dashboard Content */}
      <div className="md:pl-64">
        <header className="bg-card border-b border-border px-3 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <h1 className="text-lg sm:text-xl font-semibold text-card-foreground truncate">Operations Dashboard</h1>
              <p className="text-xs sm:text-sm text-muted-foreground">Real-time field agent submissions</p>
            </div>
            <div className="flex items-center space-x-1 sm:space-x-3 flex-shrink-0">
              <div className="relative hidden sm:block">
                <div className="w-2 h-2 bg-accent rounded-full animate-pulse absolute -top-1 -right-1"></div>
                <i className="fas fa-bell text-muted-foreground"></i>
              </div>
              <div className="flex items-center space-x-1 sm:space-x-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleRefreshData}
                  data-testid="button-refresh-all"
                  disabled={submissionsLoading}
                  className="px-2 sm:px-3"
                >
                  <i className={`fas fa-sync-alt ${submissionsLoading ? 'animate-spin' : ''} ${window.innerWidth >= 640 ? 'mr-1' : ''}`}></i>
                  <span className="hidden sm:inline">Refresh All</span>
                </Button>
                <Link href="/agent">
                  <Button variant="outline" size="sm" data-testid="button-agent-view" className="px-2 sm:px-3">
                    <i className={`fas fa-user ${window.innerWidth >= 640 ? 'mr-1' : ''}`}></i>
                    <span className="hidden sm:inline">Agent View</span>
                  </Button>
                </Link>
                <Button variant="ghost" size="sm" onClick={handleLogout} data-testid="button-logout" className="px-2 sm:px-3">
                  <i className="fas fa-sign-out-alt"></i>
                </Button>
              </div>
            </div>
          </div>
        </header>

        <main className="p-3 sm:p-6 pb-20 md:pb-6">
          {activeView === 'dashboard' && (
            <>
          {/* Stats Overview */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-8">
            <Card className="bg-gradient-to-br from-card to-muted">
              <CardContent className="p-3 sm:p-6">
                <div className="flex items-center">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                    <i className="fas fa-clipboard-list text-primary text-lg sm:text-xl"></i>
                  </div>
                  <div className="ml-3 sm:ml-4 min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-muted-foreground truncate">Total Submissions</p>
                    <p className="text-xl sm:text-2xl font-bold text-card-foreground" data-testid="stat-total-submissions">
                      {stats.total}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-card to-muted">
              <CardContent className="p-3 sm:p-6">
                <div className="flex items-center">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-accent/10 rounded-lg flex items-center justify-center">
                    <i className="fas fa-users text-accent text-lg sm:text-xl"></i>
                  </div>
                  <div className="ml-3 sm:ml-4 min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-muted-foreground truncate">Total Users</p>
                    <p className="text-xl sm:text-2xl font-bold text-card-foreground" data-testid="stat-active-agents">
                      {stats.activeAgents}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-card to-muted">
              <CardContent className="p-3 sm:p-6">
                <div className="flex items-center">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                    <i className="fas fa-plug text-primary text-lg sm:text-xl"></i>
                  </div>
                  <div className="ml-3 sm:ml-4 min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-muted-foreground truncate" dir="rtl">تغذية</p>
                    <p className="text-xl sm:text-2xl font-bold text-card-foreground" data-testid="stat-feeding-services">
                      {stats.feeding}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-card to-muted">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center">
                    <i className="fas fa-wrench text-accent text-xl"></i>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-muted-foreground" dir="rtl">🔧 صيانة</p>
                    <p className="text-2xl font-bold text-card-foreground" data-testid="stat-maintenance-services">
                      {stats.maintenance}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters and Search */}
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div className="flex flex-col sm:flex-row gap-4 flex-1">
                  <div className="relative flex-1">
                    <i className="fas fa-search absolute left-3 top-3 text-muted-foreground"></i>
                    <Input
                      placeholder="Search by client name, ATM code..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                      data-testid="input-search"
                    />
                  </div>
                  <Select value={governmentFilter} onValueChange={setGovernmentFilter}>
                    <SelectTrigger className="w-full sm:w-auto" data-testid="select-government-filter">
                      <SelectValue placeholder="All Governorates" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Governorates</SelectItem>
                      <SelectItem value="cairo">Cairo</SelectItem>
                      <SelectItem value="giza">Giza</SelectItem>
                      <SelectItem value="alexandria">Alexandria</SelectItem>
                      <SelectItem value="qalyubia">Qalyubia</SelectItem>
                      <SelectItem value="port-said">Port Said</SelectItem>
                      <SelectItem value="suez">Suez</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-full sm:w-auto" data-testid="select-type-filter">
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="feeding">تغذية (Feeding)</SelectItem>
                      <SelectItem value="maintenance">صيانة (Maintenance)</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={dateFilter} onValueChange={setDateFilter}>
                    <SelectTrigger className="w-full sm:w-auto" data-testid="select-date-filter">
                      <SelectValue placeholder="All Time" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Time</SelectItem>
                      <SelectItem value="today">Today</SelectItem>
                      <SelectItem value="week">This Week</SelectItem>
                      <SelectItem value="month">This Month</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="secondary" 
                    onClick={() => {
                      setSearchTerm('');
                      setGovernmentFilter('all');
                      setTypeFilter('all');
                      setDateFilter('all');
                    }}
                    data-testid="button-clear-filters"
                  >
                    <i className="fas fa-times mr-2"></i>
                    Clear
                  </Button>
                  <Button 
                    onClick={() => exportData('csv')}
                    data-testid="button-export-csv"
                  >
                    <i className="fas fa-download mr-2"></i>
                    CSV
                  </Button>
                  <Button 
                    variant="secondary"
                    onClick={() => exportData('txt')}
                    data-testid="button-export-txt"
                  >
                    <i className="fas fa-file-text mr-2"></i>
                    TXT
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Submissions Table */}
          <Card className="shadow-sm overflow-hidden">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Recent Submissions</CardTitle>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-accent rounded-full animate-pulse"></div>
                  <span className="text-sm text-muted-foreground">Live updates</span>
                </div>
              </div>
            </CardHeader>
            
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted hover:bg-muted">
                    <TableHead>Client</TableHead>
                    <TableHead>Governorate</TableHead>
                    <TableHead>ATM Code</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Agent</TableHead>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSubmissions.length > 0 ? (
                    filteredSubmissions.map((submission: any) => (
                      <TableRow key={submission.id} className="hover:bg-accent/50" data-testid={`row-submission-${submission.id}`}>
                        <TableCell className="font-medium" data-testid={`cell-client-${submission.id}`}>
                          {submission.clientName}
                        </TableCell>
                        <TableCell data-testid={`cell-government-${submission.id}`}>
                          {submission.government}
                        </TableCell>
                        <TableCell className="font-mono" data-testid={`cell-atm-${submission.id}`}>
                          {submission.atmCode}
                        </TableCell>
                        <TableCell>
                          <span 
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              submission.serviceType === 'feeding' 
                                ? 'bg-primary/10 text-primary' 
                                : 'bg-accent/10 text-accent'
                            }`}
                            dir="rtl"
                            data-testid={`badge-type-${submission.id}`}
                          >
                            {submission.serviceType === 'feeding' ? 'تغذية' : 'صيانة'}
                          </span>
                        </TableCell>
                        <TableCell data-testid={`cell-agent-${submission.id}`}>
                          {submission.agentName || 'Unknown'}
                        </TableCell>
                        <TableCell data-testid={`cell-timestamp-${submission.id}`}>
                          {submission.createdAt ? new Date(submission.createdAt).toLocaleString() : 'N/A'}
                        </TableCell>
                        <TableCell>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => setSelectedSubmission(submission)}
                                data-testid={`button-view-details-${submission.id}`}
                              >
                                <i className="fas fa-eye mr-1"></i>
                                View Details
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-md">
                              <DialogHeader>
                                <DialogTitle>Submission Details</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div>
                                  <label className="text-sm font-medium text-muted-foreground">Client Name</label>
                                  <p className="text-sm font-mono">{submission.clientName}</p>
                                </div>
                                <div>
                                  <label className="text-sm font-medium text-muted-foreground">Governorate</label>
                                  <p className="text-sm">{submission.government}</p>
                                </div>
                                <div>
                                  <label className="text-sm font-medium text-muted-foreground">ATM Code</label>
                                  <p className="text-sm font-mono">{submission.atmCode}</p>
                                </div>
                                <div>
                                  <label className="text-sm font-medium text-muted-foreground">Service Type</label>
                                  <p className="text-sm" dir="rtl">
                                    {submission.serviceType === 'feeding' ? 'تغذية (Feeding)' : 'صيانة (Maintenance)'}
                                  </p>
                                </div>
                                <div>
                                  <label className="text-sm font-medium text-muted-foreground">Agent</label>
                                  <p className="text-sm">{submission.agentName || 'Unknown'}</p>
                                </div>
                                <div>
                                  <label className="text-sm font-medium text-muted-foreground">Submission Time</label>
                                  <p className="text-sm">
                                    {submission.createdAt ? new Date(submission.createdAt).toLocaleString('en-US', {
                                      weekday: 'long',
                                      year: 'numeric',
                                      month: 'long',
                                      day: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    }) : 'N/A'}
                                  </p>
                                </div>
                                <div>
                                  <label className="text-sm font-medium text-muted-foreground">Submission ID</label>
                                  <p className="text-xs font-mono text-muted-foreground">{submission.id}</p>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground" data-testid="text-no-submissions">
                        No submissions found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            
            {/* Mobile Card View */}
            <div className="md:hidden">
              <div className="divide-y divide-border">
                {filteredSubmissions.length > 0 ? (
                  filteredSubmissions.map((submission: any) => (
                    <div key={submission.id} className="p-3 sm:p-4 hover:bg-accent/50 transition-colors touch-manipulation" data-testid={`card-mobile-${submission.id}`}>
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h4 className="font-semibold text-card-foreground" data-testid={`mobile-client-${submission.id}`}>
                            {submission.clientName}
                          </h4>
                          <p className="text-sm text-muted-foreground" data-testid={`mobile-government-${submission.id}`}>
                            {submission.government}
                          </p>
                        </div>
                        <div 
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            submission.serviceType === 'feeding' 
                              ? 'bg-primary/10 text-primary' 
                              : 'bg-accent/10 text-accent'
                          }`}
                          dir="rtl"
                          data-testid={`mobile-type-${submission.id}`}
                        >
                          {submission.serviceType === 'feeding' ? 'تغذية' : 'صيانة'}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="text-muted-foreground">ATM Code:</span>
                          <span className="ml-1 font-mono" data-testid={`mobile-atm-${submission.id}`}>
                            {submission.atmCode}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Agent:</span>
                          <span className="ml-1" data-testid={`mobile-agent-${submission.id}`}>
                            {submission.agentName || 'Unknown'}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-3">
                        <div className="text-xs text-muted-foreground" data-testid={`mobile-time-${submission.id}`}>
                          <i className="fas fa-clock mr-1"></i>
                          {submission.createdAt ? new Date(submission.createdAt).toLocaleString() : 'N/A'}
                        </div>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => setSelectedSubmission(submission)}
                              data-testid={`button-mobile-view-details-${submission.id}`}
                            >
                              <i className="fas fa-eye mr-1"></i>
                              Details
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-md">
                            <DialogHeader>
                              <DialogTitle>Submission Details</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <label className="text-sm font-medium text-muted-foreground">Client Name</label>
                                <p className="text-sm font-mono">{submission.clientName}</p>
                              </div>
                              <div>
                                <label className="text-sm font-medium text-muted-foreground">Governorate</label>
                                <p className="text-sm">{submission.government}</p>
                              </div>
                              <div>
                                <label className="text-sm font-medium text-muted-foreground">ATM Code</label>
                                <p className="text-sm font-mono">{submission.atmCode}</p>
                              </div>
                              <div>
                                <label className="text-sm font-medium text-muted-foreground">Service Type</label>
                                <p className="text-sm" dir="rtl">
                                  {submission.serviceType === 'feeding' ? 'تغذية (Feeding)' : 'صيانة (Maintenance)'}
                                </p>
                              </div>
                              <div>
                                <label className="text-sm font-medium text-muted-foreground">Agent</label>
                                <p className="text-sm">{submission.agentName || 'Unknown'}</p>
                              </div>
                              <div>
                                <label className="text-sm font-medium text-muted-foreground">Submission Time</label>
                                <p className="text-sm">
                                  {submission.createdAt ? new Date(submission.createdAt).toLocaleString('en-US', {
                                    weekday: 'long',
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  }) : 'N/A'}
                                </p>
                              </div>
                              <div>
                                <label className="text-sm font-medium text-muted-foreground">Submission ID</label>
                                <p className="text-xs font-mono text-muted-foreground">{submission.id}</p>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center text-muted-foreground" data-testid="mobile-no-submissions">
                    No submissions found
                  </div>
                )}
              </div>
            </div>
          </Card>
            </>
          )}
          
          {activeView === 'submissions' && (
            <div>
              <h2 className="text-2xl font-bold mb-6">All Submissions</h2>
              
              {/* Filters and Search for All Submissions */}
              <Card className="mb-6">
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div className="flex flex-col sm:flex-row gap-4 flex-1">
                      <div className="relative flex-1">
                        <i className="fas fa-search absolute left-3 top-3 text-muted-foreground"></i>
                        <Input
                          placeholder="Search by client name, ATM code..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10"
                          data-testid="input-search-all"
                        />
                      </div>
                      <Select value={governmentFilter} onValueChange={setGovernmentFilter}>
                        <SelectTrigger className="w-full sm:w-auto" data-testid="select-government-filter-all">
                          <SelectValue placeholder="All Governorates" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Governorates</SelectItem>
                          <SelectItem value="cairo">Cairo</SelectItem>
                          <SelectItem value="giza">Giza</SelectItem>
                          <SelectItem value="alexandria">Alexandria</SelectItem>
                          <SelectItem value="qalyubia">Qalyubia</SelectItem>
                          <SelectItem value="port-said">Port Said</SelectItem>
                          <SelectItem value="suez">Suez</SelectItem>
                          <SelectItem value="lagos">Lagos</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select value={typeFilter} onValueChange={setTypeFilter}>
                        <SelectTrigger className="w-full sm:w-auto" data-testid="select-type-filter-all">
                          <SelectValue placeholder="All Types" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Types</SelectItem>
                          <SelectItem value="feeding">تغذية (Feeding)</SelectItem>
                          <SelectItem value="maintenance">صيانة (Maintenance)</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select value={dateFilter} onValueChange={setDateFilter}>
                        <SelectTrigger className="w-full sm:w-auto" data-testid="select-date-filter-all">
                          <SelectValue placeholder="All Time" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Time</SelectItem>
                          <SelectItem value="today">Today</SelectItem>
                          <SelectItem value="week">This Week</SelectItem>
                          <SelectItem value="month">This Month</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="secondary" 
                        onClick={() => {
                          setSearchTerm('');
                          setGovernmentFilter('all');
                          setTypeFilter('all');
                          setDateFilter('all');
                        }}
                        data-testid="button-clear-filters-all"
                      >
                        <i className="fas fa-times mr-2"></i>
                        Clear
                      </Button>
                      <Button 
                        onClick={() => exportData('csv')}
                        data-testid="button-export-csv-all"
                      >
                        <i className="fas fa-download mr-2"></i>
                        CSV
                      </Button>
                      <Button 
                        variant="secondary"
                        onClick={() => exportData('txt')}
                        data-testid="button-export-txt-all"
                      >
                        <i className="fas fa-file-text mr-2"></i>
                        TXT
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* All Submissions Table */}
              <Card className="shadow-sm overflow-hidden">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">All Submissions ({filteredSubmissions.length})</CardTitle>
                    <div className="flex items-center space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleRefreshSubmissions}
                        data-testid="button-refresh-submissions"
                        disabled={submissionsLoading}
                      >
                        <i className={`fas fa-sync-alt mr-1 ${submissionsLoading ? 'animate-spin' : ''}`}></i>
                        Refresh
                      </Button>
                      <div className="w-2 h-2 bg-accent rounded-full animate-pulse"></div>
                      <span className="text-sm text-muted-foreground">Live from Supabase</span>
                    </div>
                  </div>
                </CardHeader>
                
                {submissionsLoading ? (
                  <CardContent className="p-6">
                    <div className="text-center text-muted-foreground">
                      <i className="fas fa-spinner fa-spin mr-2"></i>
                      Loading submissions...
                    </div>
                  </CardContent>
                ) : (
                  <>
                    {/* Desktop Table View */}
                    <div className="hidden md:block overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted hover:bg-muted">
                            <TableHead>Client</TableHead>
                            <TableHead>Governorate</TableHead>
                            <TableHead>ATM Code</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Agent</TableHead>
                            <TableHead>Timestamp</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredSubmissions.length > 0 ? (
                            filteredSubmissions.map((submission) => (
                              <TableRow key={submission.id} className="hover:bg-accent/50 cursor-pointer" data-testid={`row-submission-all-${submission.id}`}>
                                <TableCell className="font-medium" data-testid={`cell-client-all-${submission.id}`}>
                                  {submission.clientName}
                                </TableCell>
                                <TableCell data-testid={`cell-government-all-${submission.id}`}>
                                  {submission.government}
                                </TableCell>
                                <TableCell className="font-mono" data-testid={`cell-atm-all-${submission.id}`}>
                                  {submission.atmCode}
                                </TableCell>
                                <TableCell>
                                  <span 
                                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                      submission.serviceType === 'feeding' 
                                        ? 'bg-primary/10 text-primary' 
                                        : 'bg-accent/10 text-accent'
                                    }`}
                                    dir="rtl"
                                    data-testid={`badge-type-all-${submission.id}`}
                                  >
                                    {submission.serviceType === 'feeding' ? 'تغذية' : 'صيانة'}
                                  </span>
                                </TableCell>
                                <TableCell data-testid={`cell-agent-all-${submission.id}`}>
                                  {submission.agentName || 'Unknown'}
                                </TableCell>
                                <TableCell data-testid={`cell-timestamp-all-${submission.id}`}>
                                  {submission.createdAt ? new Date(submission.createdAt).toLocaleString() : 'N/A'}
                                </TableCell>
                                <TableCell>
                                  <Dialog>
                                    <DialogTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setSelectedSubmission(submission)}
                                        data-testid={`button-view-${submission.id}`}
                                      >
                                        <i className="fas fa-eye mr-1"></i>
                                        View
                                      </Button>
                                    </DialogTrigger>
                                    <DialogContent className="max-w-md">
                                      <DialogHeader>
                                        <DialogTitle>Submission Details</DialogTitle>
                                      </DialogHeader>
                                      {selectedSubmission && (
                                        <div className="space-y-4">
                                          <div className="grid grid-cols-2 gap-4 text-sm">
                                            <div>
                                              <span className="font-medium text-muted-foreground">Client:</span>
                                              <p className="font-semibold">{selectedSubmission.clientName}</p>
                                            </div>
                                            <div>
                                              <span className="font-medium text-muted-foreground">Government:</span>
                                              <p className="font-semibold">{selectedSubmission.government}</p>
                                            </div>
                                            <div>
                                              <span className="font-medium text-muted-foreground">ATM Code:</span>
                                              <p className="font-mono">{selectedSubmission.atmCode}</p>
                                            </div>
                                            <div>
                                              <span className="font-medium text-muted-foreground">Service Type:</span>
                                              <span 
                                                className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ml-1 ${
                                                  selectedSubmission.serviceType === 'feeding' 
                                                    ? 'bg-primary/10 text-primary' 
                                                    : 'bg-accent/10 text-accent'
                                                }`}
                                                dir="rtl"
                                              >
                                                {selectedSubmission.serviceType === 'feeding' ? 'تغذية' : 'صيانة'}
                                              </span>
                                            </div>
                                            <div>
                                              <span className="font-medium text-muted-foreground">Agent:</span>
                                              <p className="font-semibold">{selectedSubmission.agentName || 'Unknown'}</p>
                                            </div>
                                            <div>
                                              <span className="font-medium text-muted-foreground">Submitted:</span>
                                              <p className="text-sm">{selectedSubmission.createdAt ? new Date(selectedSubmission.createdAt).toLocaleString() : 'N/A'}</p>
                                            </div>
                                          </div>
                                        </div>
                                      )}
                                    </DialogContent>
                                  </Dialog>
                                </TableCell>
                              </TableRow>
                            ))
                          ) : (
                            <TableRow>
                              <TableCell colSpan={7} className="text-center py-8 text-muted-foreground" data-testid="text-no-submissions-all">
                                No submissions found
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                    
                    {/* Mobile Card View */}
                    <div className="md:hidden">
                      <div className="divide-y divide-border">
                        {filteredSubmissions.length > 0 ? (
                          filteredSubmissions.map((submission) => (
                            <Dialog key={submission.id}>
                              <DialogTrigger asChild>
                                <div 
                                  className="p-4 hover:bg-accent/50 transition-colors cursor-pointer" 
                                  data-testid={`card-mobile-all-${submission.id}`}
                                  onClick={() => setSelectedSubmission(submission)}
                                >
                                  <div className="flex items-start justify-between mb-3">
                                    <div className="flex-1">
                                      <h4 className="font-semibold text-card-foreground" data-testid={`mobile-client-all-${submission.id}`}>
                                        {submission.clientName}
                                      </h4>
                                      <p className="text-sm text-muted-foreground" data-testid={`mobile-government-all-${submission.id}`}>
                                        {submission.government}
                                      </p>
                                    </div>
                                    <div 
                                      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                        submission.serviceType === 'feeding' 
                                          ? 'bg-primary/10 text-primary' 
                                          : 'bg-accent/10 text-accent'
                                      }`}
                                      dir="rtl"
                                      data-testid={`mobile-type-all-${submission.id}`}
                                    >
                                      {submission.serviceType === 'feeding' ? 'تغذية' : 'صيانة'}
                                    </div>
                                  </div>
                                  <div className="grid grid-cols-2 gap-3 text-sm">
                                    <div>
                                      <span className="text-muted-foreground">ATM Code:</span>
                                      <span className="ml-1 font-mono" data-testid={`mobile-atm-all-${submission.id}`}>
                                        {submission.atmCode}
                                      </span>
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground">Agent:</span>
                                      <span className="ml-1" data-testid={`mobile-agent-all-${submission.id}`}>
                                        {submission.agentName || 'Unknown'}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="mt-3 text-xs text-muted-foreground" data-testid={`mobile-time-all-${submission.id}`}>
                                    <i className="fas fa-clock mr-1"></i>
                                    {submission.createdAt ? new Date(submission.createdAt).toLocaleString() : 'N/A'}
                                  </div>
                                </div>
                              </DialogTrigger>
                              <DialogContent className="max-w-md mx-3 sm:mx-0">
                                <DialogHeader>
                                  <DialogTitle>Submission Details</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-3 sm:space-y-4">
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-sm">
                                    <div>
                                      <span className="font-medium text-muted-foreground">Client:</span>
                                      <p className="font-semibold">{submission.clientName}</p>
                                    </div>
                                    <div>
                                      <span className="font-medium text-muted-foreground">Government:</span>
                                      <p className="font-semibold">{submission.government}</p>
                                    </div>
                                    <div>
                                      <span className="font-medium text-muted-foreground">ATM Code:</span>
                                      <p className="font-mono">{submission.atmCode}</p>
                                    </div>
                                    <div>
                                      <span className="font-medium text-muted-foreground">Service Type:</span>
                                      <span 
                                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ml-1 ${
                                          submission.serviceType === 'feeding' 
                                            ? 'bg-primary/10 text-primary' 
                                            : 'bg-accent/10 text-accent'
                                        }`}
                                        dir="rtl"
                                      >
                                        {submission.serviceType === 'feeding' ? 'تغذية' : 'صيانة'}
                                      </span>
                                    </div>
                                    <div>
                                      <span className="font-medium text-muted-foreground">Agent:</span>
                                      <p className="font-semibold">{submission.agentName || 'Unknown'}</p>
                                    </div>
                                    <div>
                                      <span className="font-medium text-muted-foreground">Submitted:</span>
                                      <p className="text-sm">{submission.createdAt ? new Date(submission.createdAt).toLocaleString() : 'N/A'}</p>
                                    </div>
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>
                          ))
                        ) : (
                          <div className="p-4 text-center text-muted-foreground" data-testid="mobile-no-submissions-all">
                            No submissions found
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </Card>
            </div>
          )}
          
          {activeView === 'agents' && (
            <div>
              <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6">Field Agents</h2>
              <Card>
                <CardContent className="p-6 sm:p-12">
                  <div className="text-center">
                    <div className="w-12 h-12 sm:w-16 sm:h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                      <i className="fas fa-users text-primary text-xl sm:text-2xl"></i>
                    </div>
                    <h3 className="text-lg sm:text-xl font-semibold text-card-foreground mb-2">Coming Soon</h3>
                    <p className="text-muted-foreground text-sm sm:text-base">Agent management features are under development and will be available soon.</p>
                    <div className="mt-4 sm:mt-6 flex items-center justify-center text-sm text-muted-foreground">
                      <div className="w-2 h-2 bg-primary rounded-full animate-pulse mr-2"></div>
                      In development
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
          
          {activeView === 'reports' && (
            <div>
              <h2 className="text-2xl font-bold mb-6">Reports & Analytics</h2>
              <Card>
                <CardContent className="p-12">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                      <i className="fas fa-chart-bar text-primary text-2xl"></i>
                    </div>
                    <h3 className="text-xl font-semibold text-card-foreground mb-2">Coming Soon</h3>
                    <p className="text-muted-foreground">Advanced analytics and reporting features are under development and will be available soon.</p>
                    <div className="mt-6 flex items-center justify-center text-sm text-muted-foreground">
                      <div className="w-2 h-2 bg-primary rounded-full animate-pulse mr-2"></div>
                      In development
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 md:hidden bg-card border-t border-border z-50">
        <div className="grid grid-cols-4 py-2">
          <button className="flex flex-col items-center py-2 text-primary" data-testid="mobile-nav-dashboard">
            <i className="fas fa-chart-line text-lg mb-1"></i>
            <span className="text-xs">Dashboard</span>
          </button>
          <button className="flex flex-col items-center py-2 text-muted-foreground" data-testid="mobile-nav-data">
            <i className="fas fa-database text-lg mb-1"></i>
            <span className="text-xs">Data</span>
          </button>
          <button className="flex flex-col items-center py-2 text-muted-foreground" data-testid="mobile-nav-agents">
            <i className="fas fa-users text-lg mb-1"></i>
            <span className="text-xs">Agents</span>
          </button>
          <button className="flex flex-col items-center py-2 text-muted-foreground" data-testid="mobile-nav-reports">
            <i className="fas fa-file-export text-lg mb-1"></i>
            <span className="text-xs">Reports</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
