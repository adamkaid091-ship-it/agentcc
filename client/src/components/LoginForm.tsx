import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LogIn } from 'lucide-react';

export function LoginForm() {
  const { signIn, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto w-16 h-16 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full flex items-center justify-center">
            <LogIn className="h-8 w-8 text-white" />
          </div>
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Field Agent System
          </CardTitle>
          <CardDescription className="text-gray-600 dark:text-gray-400">
            Sign in with your Replit account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Button
            onClick={signIn}
            className="w-full h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium transition-all duration-200 transform hover:scale-[1.02]"
            data-testid="button-signin-replit"
          >
            <LogIn className="w-5 h-5 mr-2" />
            Sign in with Replit
          </Button>
          
          <div className="text-center text-sm text-gray-500 dark:text-gray-400">
            <p>Secure authentication powered by Replit OAuth</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}