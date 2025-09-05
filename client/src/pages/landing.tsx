import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

export default function Landing() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    setIsLoading(true);
    try {
      // Redirect to Replit Auth login endpoint
      window.location.href = '/api/login';
    } catch (error) {
      toast({
        title: "Login Error",
        description: "Unable to initiate login. Please try again.",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center pb-4">
          <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <i className="fas fa-user-shield text-2xl text-primary"></i>
          </div>
          <CardTitle className="text-2xl font-bold text-card-foreground mb-2">Field Agent System</CardTitle>
          <p className="text-muted-foreground">Secure login for field operations</p>
        </CardHeader>
        
        <CardContent>
          <div className="space-y-6">
            <div className="text-center">
              <p className="text-muted-foreground mb-6">
                Sign in with your Replit account to access the Field Agent System
              </p>
            </div>
            
            <Button 
              onClick={handleLogin}
              className="w-full py-6 text-lg font-medium"
              disabled={isLoading}
              data-testid="button-login"
            >
              <i className="fas fa-sign-in-alt mr-2"></i>
              {isLoading ? "Redirecting..." : "Sign in with Replit"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
