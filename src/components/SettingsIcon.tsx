
import { useState } from "react";
import { User, Settings } from "lucide-react";
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

const SettingsIcon = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [userInfo, setUserInfo] = useState<{ email: string; activePasskeys: any[] } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchUserInfo = async () => {
    setIsLoading(true);
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setIsLoading(false);
        return;
      }
      
      // Get active passkeys for the user
      const { data: passkeys, error } = await supabase
        .from("passkeys")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_used", false)
        .order("created_at", { ascending: false });
      
      setUserInfo({
        email: user.email || "",
        activePasskeys: passkeys || []
      });
      
    } catch (error) {
      console.error("Error fetching user info:", error);
    }
    setIsLoading(false);
  };

  const handleOpenChange = (open: boolean) => {
    if (open) {
      fetchUserInfo();
    }
    setIsOpen(open);
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
                <h3 className="text-sm font-medium">Email</h3>
                <p className="text-sm text-muted-foreground">{userInfo.email}</p>
              </div>
              
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Active Passkeys ({userInfo.activePasskeys.length})</h3>
                {userInfo.activePasskeys.length > 0 ? (
                  <div className="max-h-48 overflow-y-auto space-y-2">
                    {userInfo.activePasskeys.map((passkey) => (
                      <div key={passkey.id} className="rounded-md border p-3 text-sm">
                        <div className="font-medium">{passkey.passkey}</div>
                        <div className="text-xs text-muted-foreground">
                          <p>Role: {passkey.job_role || "N/A"}</p>
                          <p>Company: {passkey.company || "N/A"}</p>
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
