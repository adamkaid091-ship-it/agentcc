import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { LoginForm } from "@/components/LoginForm";
import AgentDashboard from "@/pages/agent-dashboard";
import ManagerDashboard from "@/pages/manager-dashboard";
import NotFound from "@/pages/not-found";

function ProtectedRouter() {
  const { user, loading, signOut } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
        <div className="absolute bottom-10 text-center">
          <p className="text-sm text-gray-500 mb-2">Loading taking too long?</p>
          <button 
            onClick={() => {
              console.log('Force clearing session and reloading...');
              signOut().then(() => {
                window.location.reload();
              });
            }}
            className="text-sm text-blue-500 hover:text-blue-700 underline mr-4"
          >
            Clear Session & Reload
          </button>
          <button 
            onClick={() => {
              console.log('Force page reload...');
              window.location.reload();
            }}
            className="text-sm text-red-500 hover:text-red-700 underline"
          >
            Force Reload
          </button>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginForm />;
  }

  return (
    <Switch>
      <Route path="/" component={user.role === 'manager' || user.role === 'admin' ? ManagerDashboard : AgentDashboard} />
      <Route path="/agent" component={AgentDashboard} />
      <Route path="/manager" component={user.role === 'manager' || user.role === 'admin' ? ManagerDashboard : AgentDashboard} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <ProtectedRouter />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
