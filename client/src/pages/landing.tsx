import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function Landing() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true);
    
    // Demo login logic - you'll replace this with Supabase
    setTimeout(() => {
      if (data.email === "admin@company.com") {
        toast({
          title: "Login Successful",
          description: "Welcome back, Manager!",
        });
        // Store user role for demo
        localStorage.setItem('userRole', 'manager');
        setLocation("/agent"); // Go to agent dashboard first
      } else {
        toast({
          title: "Login Successful", 
          description: "Welcome back, Agent!",
        });
        localStorage.setItem('userRole', 'agent');
        setLocation("/agent");
      }
      setIsLoading(false);
    }, 1000);
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
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input 
                        type="email" 
                        placeholder="Enter your email" 
                        {...field} 
                        data-testid="input-email"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input 
                        type="password" 
                        placeholder="Enter your password" 
                        {...field}
                        data-testid="input-password"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <Button 
                type="submit" 
                className="w-full py-6 text-lg font-medium"
                disabled={isLoading}
                data-testid="button-login"
              >
                <i className="fas fa-sign-in-alt mr-2"></i>
                {isLoading ? "Signing in..." : "Sign In"}
              </Button>
            </form>
          </Form>
          
          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground mb-2">
              Demo Credentials:
            </p>
            <p className="text-xs text-muted-foreground">
              Admin: admin@company.com | Agent: agent@company.com
            </p>
            <p className="text-xs text-muted-foreground">
              Password: any
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
