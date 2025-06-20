
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
import { Settings, User, Key, Copy, Calendar, Clock, Briefcase, Building2 } from "lucide-react";
import { auth, db } from "@/integrations/firebase/client";
import { doc, getDoc, collection, query, orderBy, getDocs, Timestamp } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";

interface PasskeyData {
  passkey: string;
  created_at: Timestamp;
  is_used: boolean;
  source: string;
  payment_id?: string;
  active?: boolean;
  interview_details?: {
    job_role: string;
    company: string;
    date: string;
    time: string;
    resume_url?: string;
    job_description?: string;
  };
}

const SettingsPopover = () => {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [passkeys, setPasskeys] = useState<PasskeyData[]>([]);
  const [activePasskey, setActivePasskey] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { toast } = useToast();

  // Load user data and passkeys
  useEffect(() => {
    const loadUserData = async () => {
      try {
        setIsLoading(true);
        
        // Get current user from Firebase
        const user = auth.currentUser;
        
        if (user) {
          setUserEmail(user.email);
          
          // Load user's data including active passkey
          const userDocRef = doc(db, "users", user.uid);
          const userDoc = await getDoc(userDocRef);
          
          if (userDoc.exists()) {
            const userData = userDoc.data();
            if (userData.active_passkey) {
              setActivePasskey(userData.active_passkey);
            }
            
            // Load user's passkeys from Firebase
            const passkeysCollectionRef = collection(db, "users", user.uid, "passkeys");
            const passkeysQuery = query(passkeysCollectionRef, orderBy("created_at", "desc"));
            const passkeysSnapshot = await getDocs(passkeysQuery);
            
            const passkeysList: PasskeyData[] = [];
            passkeysSnapshot.forEach((doc) => {
              passkeysList.push(doc.data() as PasskeyData);
            });
            
            setPasskeys(passkeysList);
          }
        } else {
          // Check localStorage for backup passkey
          const backupPasskeyData = localStorage.getItem('backup_passkey');
          if (backupPasskeyData) {
            try {
              const backupData = JSON.parse(backupPasskeyData);
              if (backupData.passkey) {
                setActivePasskey(backupData.passkey);
              }
            } catch (e) {
              console.error("Error parsing backup passkey data:", e);
            }
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
  const formatDate = (timestamp: Timestamp | string) => {
    let date: Date;
    if (timestamp instanceof Timestamp) {
      date = timestamp.toDate();
    } else {
      date = new Date(timestamp);
    }
    return date.toLocaleDateString() + " " + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  // Copy passkey to clipboard
  const copyPasskeyToClipboard = (passkey: string) => {
    navigator.clipboard.writeText(passkey);
    toast({
      title: "Copied to Clipboard",
      description: "Passkey has been copied to clipboard",
    });
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
                
                {/* Active Passkey Section */}
                {activePasskey && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium flex items-center">
                      <Key className="h-4 w-4 mr-2 text-primary" /> 
                      Active Passkey
                    </h3>
                    <div className="text-sm p-3 rounded bg-muted relative">
                      <div className="flex justify-between items-center">
                        <span className="font-mono font-bold text-lg">{activePasskey}</span>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-6 w-6 p-0" 
                          onClick={() => copyPasskeyToClipboard(activePasskey)}
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      <div className="absolute top-0 right-0 transform -translate-y-1/2 translate-x-1/4">
                        <span className="bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full">
                          Active
                        </span>
                      </div>
                      
                      {/* Find the active passkey details in the passkeys array */}
                      {passkeys.find(pk => pk.passkey === activePasskey)?.interview_details && (
                        <div className="mt-3 pt-3 border-t border-muted-foreground/20 space-y-2">
                          <h4 className="text-xs font-medium">Interview Details</h4>
                          
                          {passkeys.find(pk => pk.passkey === activePasskey)?.interview_details?.job_role && (
                            <div className="flex items-start text-xs">
                              <Briefcase className="h-3 w-3 text-muted-foreground mr-1 mt-0.5" />
                              <span>{passkeys.find(pk => pk.passkey === activePasskey)?.interview_details?.job_role}</span>
                            </div>
                          )}
                          
                          {passkeys.find(pk => pk.passkey === activePasskey)?.interview_details?.company && (
                            <div className="flex items-start text-xs">
                              <Building2 className="h-3 w-3 text-muted-foreground mr-1 mt-0.5" />
                              <span>{passkeys.find(pk => pk.passkey === activePasskey)?.interview_details?.company}</span>
                            </div>
                          )}
                          
                          {passkeys.find(pk => pk.passkey === activePasskey)?.interview_details?.date && (
                            <div className="flex items-start text-xs">
                              <Calendar className="h-3 w-3 text-muted-foreground mr-1 mt-0.5" />
                              <span>{passkeys.find(pk => pk.passkey === activePasskey)?.interview_details?.date}</span>
                            </div>
                          )}
                          
                          {passkeys.find(pk => pk.passkey === activePasskey)?.interview_details?.time && (
                            <div className="flex items-start text-xs">
                              <Clock className="h-3 w-3 text-muted-foreground mr-1 mt-0.5" />
                              <span>{passkeys.find(pk => pk.passkey === activePasskey)?.interview_details?.time}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                {/* All Passkeys Section */}
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
                            {pk.interview_details ? (
                              <>
                                <p>{pk.interview_details.job_role} at {pk.interview_details.company}</p>
                                <p>Created: {formatDate(pk.created_at)}</p>
                              </>
                            ) : (
                              <p>Created: {formatDate(pk.created_at)}</p>
                            )}
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
