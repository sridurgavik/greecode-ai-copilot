
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare, FileText, Copy, BookOpen, Search, Github, Linkedin, Upload, Check, X, ExternalLink } from "lucide-react";
import GroqChat from "./GroqChat";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { auth, db } from "@/integrations/firebase/client";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { supabase } from "@/integrations/supabase/client";

// Helper function to safely interact with Chrome API
const useChromeAPI = () => {
  const isExtensionEnvironment = typeof chrome !== 'undefined' && chrome.tabs && chrome.runtime;
  
  const sendTabMessage = async (message: any): Promise<any> => {
    if (!isExtensionEnvironment) {
      console.warn("Not in extension environment, cannot send tab message");
      return { success: false, error: "Not in extension environment" };
    }
    
    try {
      const tabsPromise = new Promise<chrome.tabs.Tab[]>((resolve) => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          resolve(tabs);
        });
      });
      
      const tabs = await tabsPromise;
      const activeTab = tabs[0];
      
      if (!activeTab?.id) {
        return { success: false, error: "No active tab found" };
      }
      
      return new Promise((resolve) => {
        chrome.tabs.sendMessage(activeTab.id, message, (response) => {
          if (chrome.runtime.lastError) {
            resolve({ success: false, error: chrome.runtime.lastError.message });
            return;
          }
          resolve(response || { success: false, error: "No response from content script" });
        });
      });
    } catch (error) {
      console.error("Error sending tab message:", error);
      return { success: false, error: String(error) };
    }
  };
  
  return { isExtensionEnvironment, sendTabMessage };
};

const ProSection = () => {
  const [selectedText, setSelectedText] = useState<string>("");
  const [aiResponse, setAiResponse] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [githubUrl, setGithubUrl] = useState<string>("");
  const [linkedinUrl, setLinkedinUrl] = useState<string>("");
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [previousInterviews, setPreviousInterviews] = useState<any[]>([]);
  const [isLoadingProfile, setIsLoadingProfile] = useState<boolean>(true);
  const [showActivePasskeys, setShowActivePasskeys] = useState<boolean>(false);
  const [showUsedPasskeys, setShowUsedPasskeys] = useState<boolean>(false);
  const { toast } = useToast();
  const { isExtensionEnvironment, sendTabMessage } = useChromeAPI();
  
  // Load user profile data when component mounts
  useEffect(() => {
    const loadUserProfile = async () => {
      try {
        setIsLoadingProfile(true);
        const user = auth.currentUser;
        
        if (user) {
          const userDocRef = doc(db, "profiles", user.uid);
          const userDoc = await getDoc(userDocRef);
          
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setGithubUrl(userData.github_url || "");
            setLinkedinUrl(userData.linkedin_url || "");
          }
          
          // Load previous interviews
          const { data: passkeys } = await supabase
            .from("passkeys")
            .select("*")
            .eq("user_id", user.uid)
            .order("created_at", { ascending: false });
            
          if (passkeys) {
            setPreviousInterviews(passkeys);
          }
        }
      } catch (error) {
        console.error("Error loading profile:", error);
        toast({
          title: "Error",
          description: "Failed to load profile data.",
          variant: "destructive",
        });
      } finally {
        setIsLoadingProfile(false);
      }
    };
    
    loadUserProfile();
  }, []);
  
  // Handle save profile
  const handleSaveProfile = async () => {
    try {
      setIsSaving(true);
      const user = auth.currentUser;
      
      if (user) {
        const userDocRef = doc(db, "profiles", user.uid);
        await updateDoc(userDocRef, {
          github_url: githubUrl,
          linkedin_url: linkedinUrl,
          updated_at: new Date().toISOString()
        });
        
        toast({
          title: "Profile Saved",
          description: "Your profile links have been updated successfully.",
        });
      }
    } catch (error) {
      console.error("Save profile error:", error);
      toast({
        title: "Error",
        description: "Failed to save profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  // Handle resume upload
  const handleUploadResume = () => {
    // This would be implemented to handle resume uploads
    toast({
      title: "Resume Upload",
      description: "This feature will be available soon.",
    });
  };
  
  // Handle ATS check
  const handleCheckATS = () => {
    // This would be implemented to check resume against ATS
    toast({
      title: "ATS Check",
      description: "This feature will be available soon.",
    });
  };
  
  // Handle copy text button
  const handleCopyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied",
        description: "Text copied to clipboard.",
      });
    } catch (error) {
      console.error("Copy text error:", error);
      toast({
        title: "Error",
        description: "Failed to copy text. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="dashboard">User Dashboard</TabsTrigger>
          <TabsTrigger value="chat">AI Chat</TabsTrigger>
        </TabsList>
        
        <TabsContent value="dashboard" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>User Dashboard</CardTitle>
              <CardDescription>
                Manage your profile and interview history
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {isLoadingProfile ? (
                <div className="flex justify-center py-4">
                  <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
                </div>
              ) : (
                <>
                  <div className="space-y-4">
                    <h3 className="text-sm font-medium">Profile Links</h3>
                    
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <Github className="h-5 w-5 text-muted-foreground" />
                        <Input 
                          placeholder="Your GitHub URL"
                          value={githubUrl}
                          onChange={(e) => setGithubUrl(e.target.value)}
                          className="flex-1"
                        />
                        {githubUrl && <Check className="h-4 w-4 text-green-500" />}
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Linkedin className="h-5 w-5 text-muted-foreground" />
                        <Input 
                          placeholder="Your LinkedIn URL"
                          value={linkedinUrl}
                          onChange={(e) => setLinkedinUrl(e.target.value)}
                          className="flex-1"
                        />
                        {linkedinUrl && <Check className="h-4 w-4 text-green-500" />}
                      </div>
                    </div>
                    
                    <Button 
                      onClick={handleSaveProfile} 
                      disabled={isSaving}
                      className="w-full mt-4 bg-background text-primary border border-primary hover:bg-primary hover:text-background transition-colors"
                    >
                      {isSaving ? (
                        <>
                          <div className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-primary"></div>
                          Saving...
                        </>
                      ) : (
                        <>
                          Save Profile
                        </>
                      )}
                    </Button>
                  </div>
                  
                  <div className="space-y-4 pt-6 border-t mt-6">
                    <h3 className="text-sm font-medium">Previous Interviews</h3>
                    
                    {previousInterviews.length > 0 ? (
                      <div className="space-y-3 max-h-60 overflow-y-auto">
                        {previousInterviews.map((interview) => (
                          <div key={interview.id} className="rounded-md border p-3 space-y-1">
                            <div className="flex justify-between items-center">
                              <span className="font-medium">{interview.company}</span>
                              <span className="text-xs text-muted-foreground">
                                {new Date(interview.created_at).toLocaleDateString()}
                              </span>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              <p>Role: {interview.job_role}</p>
                              <p>Passkey: {interview.passkey}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-md border border-dashed p-6 text-center">
                        <p className="text-muted-foreground text-sm">No interviews available yet.</p>
                        <p className="text-xs text-muted-foreground mt-1">Your completed interviews will appear here.</p>
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-4 pt-6 border-t mt-6">
                    <h3 className="text-sm font-medium">Passkeys History</h3>
                    
                    <div className="bg-muted/30 rounded-lg p-4">
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-sm font-medium">Total Passkeys Generated</span>
                        <span className="text-xl font-bold text-primary">{previousInterviews.length}</span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-center">
                        <div 
                          className="rounded-md bg-background p-3 cursor-pointer hover:border-primary hover:border transition-all duration-200"
                          onClick={() => setShowActivePasskeys(true)}
                        >
                          <p className="text-xs text-muted-foreground flex items-center justify-center">
                            Active Passkeys
                            <ExternalLink className="ml-1 h-3 w-3" />
                          </p>
                          <p className="text-lg font-semibold">
                            {previousInterviews.filter(i => !i.is_used).length}
                          </p>
                        </div>
                        <div 
                          className="rounded-md bg-background p-3 cursor-pointer hover:border-primary hover:border transition-all duration-200"
                          onClick={() => setShowUsedPasskeys(true)}
                        >
                          <p className="text-xs text-muted-foreground flex items-center justify-center">
                            Used Passkeys
                            <ExternalLink className="ml-1 h-3 w-3" />
                          </p>
                          <p className="text-lg font-semibold">
                            {previousInterviews.filter(i => i.is_used).length}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 pt-6 border-t mt-6">
                    <Button 
                      onClick={handleUploadResume} 
                      variant="outline"
                      className="flex items-center justify-center"
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      Upload Resume
                    </Button>
                    
                    <Button 
                      onClick={handleCheckATS} 
                      variant="outline"
                      className="flex items-center justify-center"
                    >
                      <Check className="mr-2 h-4 w-4" />
                      Check ATS
                    </Button>
                  </div>
                  
                  <p className="text-xs text-muted-foreground mt-2">
                    Make sure you're on the webpage you want to analyze
                  </p>
                  
                  {/* Active Passkeys Dialog */}
                  <Dialog open={showActivePasskeys} onOpenChange={setShowActivePasskeys}>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>Active Passkeys</DialogTitle>
                        <DialogDescription>
                          Passkeys that are still available for use in interviews
                        </DialogDescription>
                      </DialogHeader>
                      
                      <div className="space-y-4 max-h-[60vh] overflow-y-auto py-4">
                        {previousInterviews.filter(i => !i.is_used).length > 0 ? (
                          previousInterviews
                            .filter(i => !i.is_used)
                            .map((passkey) => (
                              <div key={passkey.id} className="rounded-md border p-4 space-y-2">
                                <div className="flex justify-between items-center">
                                  <span className="font-medium text-base">{passkey.company}</span>
                                  <div className="flex items-center space-x-2">
                                    <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded-full">
                                      Active
                                    </span>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 w-6 p-0"
                                      onClick={() => handleCopyText(passkey.passkey)}
                                    >
                                      <Copy className="h-3.5 w-3.5" />
                                    </Button>
                                  </div>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                  <div>
                                    <p className="text-xs text-muted-foreground">Role</p>
                                    <p>{passkey.job_role || "N/A"}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-muted-foreground">Passkey</p>
                                    <p className="font-mono font-medium">{passkey.passkey}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-muted-foreground">Created</p>
                                    <p>{new Date(passkey.created_at).toLocaleDateString()}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-muted-foreground">Expires</p>
                                    <p>{passkey.expires_at ? new Date(passkey.expires_at).toLocaleDateString() : "N/A"}</p>
                                  </div>
                                </div>
                                
                                {passkey.job_description && (
                                  <div className="mt-2">
                                    <p className="text-xs text-muted-foreground">Job Description</p>
                                    <p className="text-sm mt-1 line-clamp-2">{passkey.job_description}</p>
                                  </div>
                                )}
                              </div>
                            ))
                        ) : (
                          <div className="text-center py-8">
                            <p className="text-muted-foreground">No active passkeys found</p>
                          </div>
                        )}
                      </div>
                      
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setShowActivePasskeys(false)}>
                          Close
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                  
                  {/* Used Passkeys Dialog */}
                  <Dialog open={showUsedPasskeys} onOpenChange={setShowUsedPasskeys}>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>Used Passkeys</DialogTitle>
                        <DialogDescription>
                          Passkeys that have been used in previous interviews
                        </DialogDescription>
                      </DialogHeader>
                      
                      <div className="space-y-4 max-h-[60vh] overflow-y-auto py-4">
                        {previousInterviews.filter(i => i.is_used).length > 0 ? (
                          previousInterviews
                            .filter(i => i.is_used)
                            .map((passkey) => (
                              <div key={passkey.id} className="rounded-md border p-4 space-y-2">
                                <div className="flex justify-between items-center">
                                  <span className="font-medium text-base">{passkey.company}</span>
                                  <div className="flex items-center space-x-2">
                                    <span className="text-xs px-2 py-1 bg-gray-100 text-gray-800 rounded-full">
                                      Used
                                    </span>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 w-6 p-0"
                                      onClick={() => handleCopyText(passkey.passkey)}
                                    >
                                      <Copy className="h-3.5 w-3.5" />
                                    </Button>
                                  </div>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                  <div>
                                    <p className="text-xs text-muted-foreground">Role</p>
                                    <p>{passkey.job_role || "N/A"}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-muted-foreground">Passkey</p>
                                    <p className="font-mono font-medium">{passkey.passkey}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-muted-foreground">Created</p>
                                    <p>{new Date(passkey.created_at).toLocaleDateString()}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-muted-foreground">Used On</p>
                                    <p>{passkey.used_at ? new Date(passkey.used_at).toLocaleDateString() : "N/A"}</p>
                                  </div>
                                </div>
                                
                                {passkey.job_description && (
                                  <div className="mt-2">
                                    <p className="text-xs text-muted-foreground">Job Description</p>
                                    <p className="text-sm mt-1 line-clamp-2">{passkey.job_description}</p>
                                  </div>
                                )}
                              </div>
                            ))
                        ) : (
                          <div className="text-center py-8">
                            <p className="text-muted-foreground">No used passkeys found</p>
                          </div>
                        )}
                      </div>
                      
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setShowUsedPasskeys(false)}>
                          Close
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="chat" className="space-y-4">
          <GroqChat />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ProSection;
