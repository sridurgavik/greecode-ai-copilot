import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare, FileText, Copy, BookOpen, Search, Github, Linkedin, Upload, Check, X, ExternalLink } from "lucide-react";
import ATSChecker from "./ATSChecker";
import GroqChat from "./GroqChat";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { auth, db } from "@/integrations/firebase/client";
import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs } from "firebase/firestore";
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
  const [activeTab, setActiveTab] = useState<string>("chat");
  const [showATSDialog, setShowATSDialog] = useState(false);
  const [githubUrl, setGithubUrl] = useState<string>("");
  const [linkedinUrl, setLinkedinUrl] = useState<string>("");
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [previousInterviews, setPreviousInterviews] = useState<any[]>([]);
  const [isLoadingProfile, setIsLoadingProfile] = useState<boolean>(true);
  const [showActivePasskeys, setShowActivePasskeys] = useState<boolean>(false);
  const [showUsedPasskeys, setShowUsedPasskeys] = useState<boolean>(false);
  const [isGithubVerified, setIsGithubVerified] = useState<boolean>(false);
  const [isLinkedinVerified, setIsLinkedinVerified] = useState<boolean>(false);
  const [isVerifyingGithub, setIsVerifyingGithub] = useState<boolean>(false);
  const [isVerifyingLinkedin, setIsVerifyingLinkedin] = useState<boolean>(false);
  const [isEditingGithub, setIsEditingGithub] = useState<boolean>(false);
  const [isEditingLinkedin, setIsEditingLinkedin] = useState<boolean>(false);
  const { toast } = useToast();
  const { isExtensionEnvironment, sendTabMessage } = useChromeAPI();
  
  // Event listener for setting dashboard tab
  useEffect(() => {
    // Listen for the startInterviewPractice event
    const handleStartInterviewPractice = () => {
      console.log('startInterviewPractice event received');
      setActiveTab("chat");
    };

    // Listen for the setProSectionTab event
    const handleSetProSectionTab = (event: any) => {
      console.log('setProSectionTab event received:', event);
      
      try {
        if (event.detail && event.detail.tab) {
          const tabValue = event.detail.tab;
          console.log('Setting active tab to:', tabValue);
          
          // Validate that the tab value is one of the available tabs
          if (tabValue === 'chat' || tabValue === 'dashboard') {
            setActiveTab(tabValue);
          } else {
            console.error('Invalid tab value:', tabValue);
          }
        } else {
          console.error('Invalid event detail structure:', event.detail);
        }
      } catch (error) {
        console.error('Error handling setProSectionTab event:', error);
      }
    };

    // Add event listeners with explicit type casting
    window.addEventListener("startInterviewPractice", handleStartInterviewPractice);
    window.addEventListener("setProSectionTab", handleSetProSectionTab);

    // For debugging - log the current active tab whenever it changes
    console.log('ProSection mounted, activeTab:', activeTab);

    return () => {
      window.removeEventListener("startInterviewPractice", handleStartInterviewPractice);
      window.removeEventListener("setProSectionTab", handleSetProSectionTab);
    };
  }, []);

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
            
            // Load GitHub and LinkedIn data
            if (userData.github_url) {
              setGithubUrl(userData.github_url);
              setIsGithubVerified(userData.is_github_verified || false);
            }
            
            if (userData.linkedin_url) {
              setLinkedinUrl(userData.linkedin_url);
              setIsLinkedinVerified(userData.is_linkedin_verified || false);
            }
            
            // Load passkeys (previous interviews)
            const passkeys = userData.passkeys || [];
            setPreviousInterviews(passkeys);
          }
          
          // Also fetch interview history from Supabase if needed
          const { data: supabasePasskeys } = await supabase
            .from("passkeys")
            .select("*")
            .eq("user_id", user.uid)
            .order("created_at", { ascending: false });
            
          if (supabasePasskeys && supabasePasskeys.length > 0) {
            setPreviousInterviews(prev => [...prev, ...supabasePasskeys]);
          }
        }
      } catch (error) {
        console.error("Error loading profile:", error);
        toast({
          title: "Error",
          description: "Failed to load profile data. Please refresh the page.",
          variant: "destructive",
        });
      } finally {
        setIsLoadingProfile(false);
      }
    };
    
    loadUserProfile();
  }, [toast]);
  
  // Handle save profile
  const handleSaveProfile = async () => {
    try {
      setIsSaving(true);
      const user = auth.currentUser;
      
      if (user) {
        // Check if the profile document exists, if not create it
        const userDocRef = doc(db, "profiles", user.uid);
        const userDoc = await getDoc(userDocRef);
        
        const profileData = {
          github_url: githubUrl,
          linkedin_url: linkedinUrl,
          // Reset verification status if URLs are edited
          is_github_verified: isEditingGithub ? false : isGithubVerified,
          is_linkedin_verified: isEditingLinkedin ? false : isLinkedinVerified,
          updated_at: new Date().toISOString(),
        };
        
        if (!userDoc.exists()) {
          // Create new profile document
          await setDoc(userDocRef, {
            ...profileData,
            user_id: user.uid,
            email: user.email,
            display_name: user.displayName,
            created_at: new Date().toISOString(),
          });
        } else {
          // Update existing profile document
          await updateDoc(userDocRef, profileData);
        }
        
        // Reset editing state
        setIsEditingGithub(false);
        setIsEditingLinkedin(false);
        
        // If URLs were edited and now need verification, update the state
        if (isEditingGithub) setIsGithubVerified(false);
        if (isEditingLinkedin) setIsLinkedinVerified(false);
        
        toast({
          title: "Profile updated",
          description: "Your profile has been updated successfully.",
        });
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
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
    // Open the ATS checker dialog
    setShowATSDialog(true);
    
    toast({
      title: "ATS Resume Checker",
      description: "ATS Resume Checker is ready to use.",
    });
  };
  
  // Handle copy text button
  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text)
      .then(() => {
        toast({
          title: "Copied",
          description: "Text copied to clipboard.",
        });
      })
      .catch((error) => {
        console.error("Error copying text:", error);
        toast({
          title: "Error",
          description: "Failed to copy text. Please try again.",
          variant: "destructive",
        });
      });
  };
  
  // Verify GitHub profile
  const verifyGithubProfile = async () => {
    if (!githubUrl) {
      toast({
        title: "Error",
        description: "Please enter a GitHub URL first.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setIsVerifyingGithub(true);
      const user = auth.currentUser;
      
      if (!user) {
        throw new Error("User not authenticated");
      }
      
      // Extract username from GitHub URL
      const githubUsername = extractGithubUsername(githubUrl);
      if (!githubUsername) {
        throw new Error("Invalid GitHub URL format");
      }
      
      // Check if URL is already used by another account
      const profilesRef = collection(db, "profiles");
      const q = query(
        profilesRef, 
        where("github_url", "==", githubUrl),
        where("is_github_verified", "==", true)
      );
      
      const querySnapshot = await getDocs(q);
      const existingProfiles = querySnapshot.docs.filter(doc => doc.id !== user.uid);
      
      if (existingProfiles.length > 0) {
        throw new Error("This GitHub profile is already linked to another account");
      }
      
      // Verify that the profile exists (could use GitHub API in a real implementation)
      // For demo purposes, we'll just check the URL format
      const isValidUrl = /^https:\/\/github\.com\/[\w-]+\/?$/.test(githubUrl);
      if (!isValidUrl) {
        throw new Error("Invalid GitHub URL format");
      }
      
      // Update verification status and save GitHub URL in Firestore
      const userDocRef = doc(db, "profiles", user.uid);
      await updateDoc(userDocRef, {
        github_url: githubUrl,
        is_github_verified: true,
        github_verified_at: new Date().toISOString(),
      });
      
      setIsGithubVerified(true);
      setIsEditingGithub(false); // Exit edit mode after verification
      
      toast({
        title: "GitHub Verified",
        description: "Your GitHub profile has been verified and saved successfully.",
      });
    } catch (error: any) {
      console.error("Error verifying GitHub profile:", error);
      toast({
        title: "Verification Failed",
        description: error.message || "Failed to verify GitHub profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsVerifyingGithub(false);
    }
  };
  
  // Verify LinkedIn profile
  const verifyLinkedinProfile = async () => {
    if (!linkedinUrl) {
      toast({
        title: "Error",
        description: "Please enter a LinkedIn URL first.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setIsVerifyingLinkedin(true);
      const user = auth.currentUser;
      
      if (!user) {
        throw new Error("User not authenticated");
      }
      
      // Extract username/ID from LinkedIn URL
      const linkedinId = extractLinkedinId(linkedinUrl);
      if (!linkedinId) {
        throw new Error("Invalid LinkedIn URL format");
      }
      
      // Check if URL is already used by another account
      const profilesRef = collection(db, "profiles");
      const q = query(
        profilesRef, 
        where("linkedin_url", "==", linkedinUrl),
        where("is_linkedin_verified", "==", true)
      );
      
      const querySnapshot = await getDocs(q);
      const existingProfiles = querySnapshot.docs.filter(doc => doc.id !== user.uid);
      
      if (existingProfiles.length > 0) {
        throw new Error("This LinkedIn profile is already linked to another account");
      }
      
      // Verify that the profile exists (could use LinkedIn API in a real implementation)
      // For demo purposes, we'll just check the URL format
      const isValidUrl = /^https:\/\/(?:www\.)?linkedin\.com\/in\/[\w-]+\/?$/.test(linkedinUrl);
      if (!isValidUrl) {
        throw new Error("Invalid LinkedIn URL format");
      }
      
      // Update verification status and save LinkedIn URL in Firestore
      const userDocRef = doc(db, "profiles", user.uid);
      await updateDoc(userDocRef, {
        linkedin_url: linkedinUrl,
        is_linkedin_verified: true,
        linkedin_verified_at: new Date().toISOString(),
      });
      
      setIsLinkedinVerified(true);
      setIsEditingLinkedin(false); // Exit edit mode after verification
      
      toast({
        title: "LinkedIn Verified",
        description: "Your LinkedIn profile has been verified and saved successfully.",
      });
    } catch (error: any) {
      console.error("Error verifying LinkedIn profile:", error);
      toast({
        title: "Verification Failed",
        description: error.message || "Failed to verify LinkedIn profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsVerifyingLinkedin(false);
    }
  };
  
  // Helper functions to extract usernames
  const extractGithubUsername = (url: string): string | null => {
    const match = url.match(/github\.com\/([\w-]+)/);
    return match ? match[1] : null;
  };
  
  const extractLinkedinId = (url: string): string | null => {
    const match = url.match(/linkedin\.com\/in\/([\w-]+)/);
    return match ? match[1] : null;
  };
  
  // Toggle edit mode for GitHub
  const toggleEditGithub = () => {
    setIsEditingGithub(!isEditingGithub);
  };
  
  // Toggle edit mode for LinkedIn
  const toggleEditLinkedin = () => {
    setIsEditingLinkedin(!isEditingLinkedin);
  };

  return (
    <div className="space-y-4">
      <Tabs defaultValue="chat" value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="chat">AI Chat</TabsTrigger>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
        </TabsList>
        
        <TabsContent value="chat" className="space-y-4">
          <GroqChat />
        </TabsContent>
        
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
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <Github className="mr-2 h-4 w-4" />
                            <span className="text-sm font-medium">GitHub Profile</span>
                          </div>
                          {isGithubVerified && !isEditingGithub ? (
                            <div className="flex items-center">
                              <span className="text-xs mr-2 px-2 py-1 bg-green-100 text-green-800 rounded-full">
                                Verified
                              </span>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                className="h-8 px-2 text-xs"
                                onClick={toggleEditGithub}
                              >
                                Edit
                              </Button>
                            </div>
                          ) : (
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="h-8 px-2 text-xs"
                              onClick={verifyGithubProfile}
                              disabled={!githubUrl || isVerifyingGithub}
                            >
                              {isVerifyingGithub ? (
                                <>
                                  <svg className="animate-spin -ml-1 mr-2 h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                  </svg>
                                  Verifying
                                </>
                              ) : (
                                "Verify"
                              )}
                            </Button>
                          )}
                        </div>
                        <Input
                          placeholder="https://github.com/username"
                          value={githubUrl}
                          onChange={(e) => setGithubUrl(e.target.value)}
                          disabled={isGithubVerified && !isEditingGithub}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <Linkedin className="mr-2 h-4 w-4" />
                            <span className="text-sm font-medium">LinkedIn Profile</span>
                          </div>
                          {isLinkedinVerified && !isEditingLinkedin ? (
                            <div className="flex items-center">
                              <span className="text-xs mr-2 px-2 py-1 bg-green-100 text-green-800 rounded-full">
                                Verified
                              </span>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                className="h-8 px-2 text-xs"
                                onClick={toggleEditLinkedin}
                              >
                                Edit
                              </Button>
                            </div>
                          ) : (
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="h-8 px-2 text-xs"
                              onClick={verifyLinkedinProfile}
                              disabled={!linkedinUrl || isVerifyingLinkedin}
                            >
                              {isVerifyingLinkedin ? (
                                <>
                                  <svg className="animate-spin -ml-1 mr-2 h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                  </svg>
                                  Verifying
                                </>
                              ) : (
                                "Verify"
                              )}
                            </Button>
                          )}
                        </div>
                        <Input
                          placeholder="https://linkedin.com/in/username"
                          value={linkedinUrl}
                          onChange={(e) => setLinkedinUrl(e.target.value)}
                          disabled={isLinkedinVerified && !isEditingLinkedin}
                        />
                      </div>
                      
                      <Button 
                        onClick={handleSaveProfile} 
                        disabled={isSaving}
                        className="w-full mt-2"
                      >
                        {isSaving ? (
                          <>
                            <span className="mr-2">Saving...</span>
                            <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                          </>
                        ) : (
                          "Save Profile"
                        )}
                      </Button>
                    </div>
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
      </Tabs>

      {/* ATS Checker Dialog */}
      <Dialog open={showATSDialog} onOpenChange={setShowATSDialog}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto p-0">
          <ATSChecker />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProSection;