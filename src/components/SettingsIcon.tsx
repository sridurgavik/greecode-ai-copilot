
import { useState, useEffect } from "react";
import { User, Settings, Copy } from "lucide-react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { auth } from "@/integrations/firebase/client";
import { useToast } from "@/hooks/use-toast";

const SettingsIcon = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [userInfo, setUserInfo] = useState<{ name: string; email: string; activePasskeys: any[] } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [generatedPasskey, setGeneratedPasskey] = useState<string>("");
  const { toast } = useToast();
  
  // Get the latest generated passkey from localStorage
  useEffect(() => {
    const storedPasskey = localStorage.getItem("generatedPasskey");
    if (storedPasskey) {
      setGeneratedPasskey(storedPasskey);
    }
  }, [isOpen]);

  const fetchUserInfo = async () => {
    setIsLoading(true);
    try {
      // Get current Firebase user for name
      const firebaseUser = auth.currentUser;
      let userName = "User";
      let userEmail = "";
      
      if (firebaseUser) {
        userName = firebaseUser.displayName || firebaseUser.email?.split('@')[0] || "User";
        userEmail = firebaseUser.email || "";
      }
      
      // Initialize passkeys array with the generated passkey if it exists
      let allPasskeys = [];
      if (generatedPasskey) {
        allPasskeys = [{
          id: "local-" + Date.now(),
          passkey: generatedPasskey,
          job_role: "Current Session",
          company: "Greecode",
          created_at: new Date().toISOString(),
          is_used: false
        }];
      }
      
      // Try to get additional passkeys from Supabase if available
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          userEmail = user.email || userEmail;
          
          // Get active passkeys for the user
          const { data: passkeys } = await supabase
            .from("passkeys")
            .select("*")
            .eq("user_id", user.id)
            .eq("is_used", false)
            .order("created_at", { ascending: false });
          
          // Add database passkeys to our list if they're not already included
          if (passkeys && passkeys.length > 0) {
            // Filter out any passkeys that might duplicate our generated one
            const filteredPasskeys = passkeys.filter(p => p.passkey !== generatedPasskey);
            allPasskeys = [...allPasskeys, ...filteredPasskeys];
          }
        }
      } catch (supabaseError) {
        console.error("Supabase error:", supabaseError);
        // Continue with just the local data
      }
      
      // Always set user info, even if we only have partial data
      setUserInfo({
        name: userName,
        email: userEmail,
        activePasskeys: allPasskeys
      });
      
    } catch (error) {
      console.error("Error fetching user info:", error);
      // Set default values even on error
      setUserInfo({
        name: "User",
        email: "",
        activePasskeys: generatedPasskey ? [{
          id: "local-" + Date.now(),
          passkey: generatedPasskey,
          job_role: "Current Session",
          company: "Greecode",
          created_at: new Date().toISOString(),
          is_used: false
        }] : []
      });
    }
    setIsLoading(false);
  };

  const handleOpenChange = (open: boolean) => {
    if (open) {
      fetchUserInfo();
    }
    setIsOpen(open);
  };
  
  const handleCopyPasskey = (passkey: string) => {
    navigator.clipboard.writeText(passkey);
    toast({
      title: "Copied",
      description: "Passkey copied to clipboard",
    });
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <Settings className="h-5 w-5" />
            <span className="sr-only">Settings</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>My Account</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => handleOpenChange(true)}>
            <User className="mr-2 h-4 w-4" />
            View Profile & Passkeys
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      
      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>User Profile</DialogTitle>
            <DialogDescription>
              Your account information and active passkeys.
            </DialogDescription>
          </DialogHeader>
          
          {isLoading ? (
            <div className="flex justify-center py-4">
              <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-primary"></div>
            </div>
          ) : userInfo ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Profile</h3>
                <div className="rounded-md border p-3">
                  <div className="flex flex-col space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Name</span>
                      <span className="text-sm">{userInfo.name}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Email</span>
                      <span className="text-sm">{userInfo.email}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Active Passkeys ({userInfo.activePasskeys.length})</h3>
                {userInfo.activePasskeys.length > 0 ? (
                  <div className="max-h-48 overflow-y-auto space-y-2">
                    {userInfo.activePasskeys.map((passkey) => (
                      <div key={passkey.id} className="rounded-md border p-3 text-sm">
                        <div className="flex justify-between items-center">
                          <div className="font-medium">{passkey.passkey}</div>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-6 w-6 p-0" 
                            onClick={() => handleCopyPasskey(passkey.passkey)}
                          >
                            <Copy className="h-3.5 w-3.5" />
                            <span className="sr-only">Copy</span>
                          </Button>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          <p>Role: {passkey.job_role || "N/A"}</p>
                          <p>Company: {passkey.company || "N/A"}</p>
                          <p className="mt-1 text-xs text-primary/70">
                            {passkey.id.startsWith("local-") ? "Generated in current session" : ""}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No active passkeys found.</p>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Unable to load profile information.</p>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SettingsIcon;
