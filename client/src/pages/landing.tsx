import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "wouter";

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardContent className="pt-8 pb-8 px-8">
          <div className="text-center mb-8">
            <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="fas fa-clipboard-list text-2xl text-primary"></i>
            </div>
            <h1 className="text-2xl font-bold text-card-foreground mb-2">Field Agent System</h1>
            <p className="text-muted-foreground">ATM Service Management Portal</p>
          </div>
          
          <div className="space-y-4">
            <Link href="/agent">
              <Button className="w-full py-6 text-lg font-medium" data-testid="button-agent-dashboard">
                <i className="fas fa-user mr-2"></i>
                Field Agent Dashboard
              </Button>
            </Link>
            
            <Link href="/manager">
              <Button variant="secondary" className="w-full py-6 text-lg font-medium" data-testid="button-manager-dashboard">
                <i className="fas fa-chart-line mr-2"></i>
                Manager Dashboard
              </Button>
            </Link>
          </div>
          
          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Choose your role to access the dashboard
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
