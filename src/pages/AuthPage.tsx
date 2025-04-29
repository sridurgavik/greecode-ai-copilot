import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from "@/components/theme-toggle";
import { supabase } from "@/integrations/supabase/client";

interface AuthPageProps {
  onLoginSuccess: () => void;
}

const AuthPage = ({ onLoginSuccess }: AuthPageProps) => {
  const [isLogin, setIsLogin] = useState<boolean>(true);
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      let result;
      
      if (isLogin) {
        // Sign in existing user
        result = await supabase.auth.signInWithPassword({
          email,
          password,
        });
      } else {
        // Sign up new user
        result = await supabase.auth.signUp({
          email,
          password,
        });
      }
      
      if (result.error) {
        throw result.error;
      }
      
      // Store session info in chrome storage if extension environment
      if (typeof chrome !== 'undefined' && chrome.storage) {
        await chrome.storage.local.set({
          session: {
            user: result.data.user,
            timestamp: Date.now(),
          },
        });
      }
      
      toast({
        title: isLogin ? "Login successful" : "Account created",
        description: isLogin ? "Welcome back!" : "Please check your email to verify your account.",
      });
      
      onLoginSuccess();
    } catch (error) {
      console.error("Auth error:", error);
      toast({
        title: "Authentication Error",
        description: error instanceof Error ? error.message : "Failed to authenticate. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        }
      });
      
      if (error) {
        throw error;
      }
      
      // We won't get here immediately as we'll be redirected to Google
      toast({
        title: "Google Authentication",
        description: "Redirecting to Google for authentication...",
      });
    } catch (error) {
      console.error("Google auth error:", error);
      toast({
        title: "Authentication Error",
        description: error instanceof Error ? error.message : "Failed to authenticate with Google. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center space-y-2 text-center">
          <div className="rounded-full bg-primary/20 p-2">
            <svg
              className="h-8 w-8 text-primary"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold">Welcome to Greecode</h1>
          <p className="text-muted-foreground">
            {isLogin
              ? "Sign in to your account to continue"
              : "Create a new account to get started"}
          </p>
        </div>

        <div className="space-y-4">
          <Button
            variant="outline"
            className="w-full"
            onClick={handleGoogleLogin}
            disabled={isLoading}
          >
            <svg
              className="mr-2 h-4 w-4"
              aria-hidden="true"
              focusable="false"
              data-prefix="fab"
              data-icon="google"
              role="img"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 488 512"
            >
              <path
                fill="currentColor"
                d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"
              ></path>
            </svg>
            Continue with Google
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or continue with email
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-white"></div>
              ) : isLogin ? (
                "Sign In"
              ) : (
                "Sign Up"
              )}
            </Button>
          </form>
        </div>

        <div className="text-center text-sm">
          {isLogin ? (
            <p>
              Don't have an account?{" "}
              <Button
                variant="link"
                className="p-0 text-primary"
                onClick={() => setIsLogin(false)}
                disabled={isLoading}
              >
                Sign Up
              </Button>
            </p>
          ) : (
            <p>
              Already have an account?{" "}
              <Button
                variant="link"
                className="p-0 text-primary"
                onClick={() => setIsLogin(true)}
                disabled={isLoading}
              >
                Sign In
              </Button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
