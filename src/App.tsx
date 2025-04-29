
import { useState, useEffect } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme-provider";
import AuthPage from "@/pages/AuthPage";
import MainApp from "@/pages/MainApp";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { toast } = useToast();

  // Check if user is already authenticated on load
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // First check Supabase auth
        const { data } = await supabase.auth.getSession();
        
        if (data?.session) {
          setIsAuthenticated(true);
          toast({
            title: "Welcome back!",
            description: "You are now logged in.",
          });
          return;
        }
        
        // If no Supabase session, check extension storage as fallback
        if (typeof chrome !== 'undefined' && chrome.storage) {
          chrome.storage.local.get("session").then((result) => {
            if (result.session) {
              setIsAuthenticated(true);
              toast({
                title: "Welcome back!",
                description: "You are now logged in.",
              });
            }
          }).catch(error => {
            console.error("Chrome storage error:", error);
          });
        }
      } catch (error) {
        console.error("Auth check error:", error);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [toast]);

  // Handle login success
  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
    toast({
      title: "Login successful",
      description: "You are now logged in.",
    });
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      // Sign out of Supabase
      await supabase.auth.signOut();
      
      // Clear extension storage if in extension environment
      if (typeof chrome !== 'undefined' && chrome.storage) {
        await chrome.storage.local.remove("session");
      }
      
      setIsAuthenticated(false);
      toast({
        title: "Logged out",
        description: "You have been logged out successfully.",
      });
    } catch (error) {
      console.error("Logout error:", error);
      toast({
        title: "Error",
        description: "Failed to log out. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center space-y-4">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <ThemeProvider defaultTheme="dark" storageKey="greecode-theme">
      <div className="min-h-screen bg-background text-foreground">
        {isAuthenticated ? (
          <MainApp onLogout={handleLogout} />
        ) : (
          <AuthPage onLoginSuccess={handleLoginSuccess} />
        )}
        <Toaster />
      </div>
    </ThemeProvider>
  );
};

export default App;
