import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function Landing() {
  const handleLogin = () => {
    window.location.href = '/api/login';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardContent className="pt-8 pb-8 px-8">
          <div className="text-center mb-8">
            <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="fas fa-user-shield text-2xl text-primary"></i>
            </div>
            <h1 className="text-2xl font-bold text-card-foreground mb-2">Field Agent System</h1>
            <p className="text-muted-foreground">Secure login for field operations</p>
          </div>
          
          <Button 
            onClick={handleLogin}
            className="w-full py-6 text-lg font-medium"
            data-testid="button-login"
          >
            <i className="fas fa-sign-in-alt mr-2"></i>
            Sign In with Replit
          </Button>
          
          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Need access? Contact your system administrator
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
