
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from "@/components/ui/popover";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Settings, User, Key } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface PasskeyData {
  passkey: string;
  job_role: string;
  company: string;
  is_used: boolean;
  expires_at: string;
  created_at: string;
}

const SettingsPopover = () => {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [passkeys, setPasskeys] = useState<PasskeyData[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Load user data and passkeys
  useEffect(() => {
    const loadUserData = async () => {
      try {
        setIsLoading(true);
        
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          setUserEmail(user.email);
          
          // Load user's passkeys
          const { data: userPasskeys, error } = await supabase
            .from("passkeys")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false });
            
          if (!error && userPasskeys) {
            setPasskeys(userPasskeys as PasskeyData[]);
          }
        }
      } catch (error) {
        console.error("Error loading user data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadUserData();
  }, []);
  
  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + " " + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon">
          <Settings className="h-5 w-5" />
          <span className="sr-only">Settings</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80">
        <Card className="border-0 shadow-none">
          <CardHeader className="p-3 pb-1">
            <CardTitle className="text-base">Account Settings</CardTitle>
            <CardDescription className="text-xs">
              View your account information
            </CardDescription>
          </CardHeader>
          <CardContent className="p-3 space-y-4">
            {isLoading ? (
              <div className="flex justify-center p-4">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
              </div>
            ) : (
              <>
                <div className="space-y-1">
                  <h3 className="text-sm font-medium flex items-center">
                    <User className="h-4 w-4 mr-2 text-primary" /> 
                    User Email
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {userEmail || "Not logged in"}
                  </p>
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-sm font-medium flex items-center">
                    <Key className="h-4 w-4 mr-2 text-primary" /> 
                    Your Passkeys
                  </h3>
                  
                  {passkeys.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No passkeys generated yet
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {passkeys.map((pk) => (
                        <div key={pk.passkey} className="text-xs p-2 rounded bg-muted">
                          <div className="flex justify-between">
                            <span className="font-semibold">{pk.passkey}</span>
                            <span className={pk.is_used ? "text-destructive" : "text-primary"}>
                              {pk.is_used ? "Used" : "Active"}
                            </span>
                          </div>
                          <div className="mt-1 text-muted-foreground">
                            <p>{pk.job_role} at {pk.company}</p>
                            <p>Expires: {formatDate(pk.expires_at)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </CardContent>
          <CardFooter className="p-3 pt-0">
            <p className="text-xs text-muted-foreground">
              © {new Date().getFullYear()} GreecodePro.ai • v1.0
            </p>
          </CardFooter>
        </Card>
      </PopoverContent>
    </Popover>
  );
};

export default SettingsPopover;
