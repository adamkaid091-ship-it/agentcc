import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Link, useLocation } from "wouter";
import type { Submission } from "@shared/schema";

export default function ManagerDashboard() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [governmentFilter, setGovernmentFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [submissions] = useState([]);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [stats] = useState({
    total: 0,
    feeding: 0,
    maintenance: 0,
    todayCount: 0,
    activeAgents: 0
  });

  useEffect(() => {
    const role = localStorage.getItem('userRole');
    setUserRole(role);
    // Only managers should access this dashboard
    if (role !== 'manager') {
      toast({
        title: "Access Denied",
        description: "You need manager permissions to access this page",
        variant: "destructive",
      });
      setLocation('/agent');
    }
  }, [toast, setLocation]);

  // This will be connected to Supabase later

  const handleLogout = () => {
    localStorage.removeItem('userRole');
    window.location.href = '/';
  };

  const filteredSubmissions = Array.isArray(submissions) ? submissions.filter((submission: any) => {
    const matchesSearch = submission.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         submission.atmCode.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesGovernment = governmentFilter === 'all' || !governmentFilter || submission.government === governmentFilter;
    const matchesType = typeFilter === 'all' || !typeFilter || submission.serviceType === typeFilter;
    
    return matchesSearch && matchesGovernment && matchesType;
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
                <a href="#" className="flex items-center px-3 py-2 rounded-md text-sm font-medium bg-primary/10 text-primary" data-testid="nav-dashboard">
                  <i className="fas fa-chart-line mr-3"></i>
                  Dashboard
                </a>
              </li>
              <li>
                <a href="#" className="flex items-center px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground" data-testid="nav-submissions">
                  <i className="fas fa-database mr-3"></i>
                  All Submissions
                </a>
              </li>
              <li>
                <a href="#" className="flex items-center px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground" data-testid="nav-agents">
                  <i className="fas fa-users mr-3"></i>
                  Agents
                </a>
              </li>
              <li>
                <a href="#" className="flex items-center px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground" data-testid="nav-reports">
                  <i className="fas fa-file-export mr-3"></i>
                  Reports
                </a>
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
        <header className="bg-card border-b border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-card-foreground">Operations Dashboard</h1>
              <p className="text-sm text-muted-foreground">Real-time field agent submissions</p>
            </div>
            <div className="flex items-center space-x-3">
              <div className="relative">
                <div className="w-2 h-2 bg-accent rounded-full animate-pulse absolute -top-1 -right-1"></div>
                <i className="fas fa-bell text-muted-foreground"></i>
              </div>
              <div className="flex items-center space-x-2">
                <Link href="/agent">
                  <Button variant="outline" size="sm" data-testid="button-agent-view">
                    <i className="fas fa-user mr-1"></i>
                    Agent View
                  </Button>
                </Link>
                <Button variant="ghost" size="sm" onClick={handleLogout} data-testid="button-logout">
                  <i className="fas fa-sign-out-alt"></i>
                </Button>
              </div>
            </div>
          </div>
        </header>

        <main className="p-6">
          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="bg-gradient-to-br from-card to-muted">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                    <i className="fas fa-clipboard-list text-primary text-xl"></i>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-muted-foreground">Total Submissions</p>
                    <p className="text-2xl font-bold text-card-foreground" data-testid="stat-total-submissions">
                      {stats.total}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-card to-muted">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center">
                    <i className="fas fa-users text-accent text-xl"></i>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-muted-foreground">Active Agents</p>
                    <p className="text-2xl font-bold text-card-foreground" data-testid="stat-active-agents">
                      {stats.activeAgents}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-card to-muted">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                    <i className="fas fa-plug text-primary text-xl"></i>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-muted-foreground" dir="rtl">تغذية</p>
                    <p className="text-2xl font-bold text-card-foreground" data-testid="stat-feeding-services">
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
                    <p className="text-sm font-medium text-muted-foreground" dir="rtl">صيانة</p>
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
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" data-testid="button-filter">
                    <i className="fas fa-filter mr-2"></i>
                    Filter
                  </Button>
                  <Button data-testid="button-export">
                    <i className="fas fa-download mr-2"></i>
                    Export
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
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground" data-testid="text-no-submissions">
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
                    <div key={submission.id} className="p-4 hover:bg-accent/50 transition-colors" data-testid={`card-mobile-${submission.id}`}>
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
                      <div className="mt-3 text-xs text-muted-foreground" data-testid={`mobile-time-${submission.id}`}>
                        <i className="fas fa-clock mr-1"></i>
                        {submission.createdAt ? new Date(submission.createdAt).toLocaleString() : 'N/A'}
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
