
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare, FileText, Copy, BookOpen, Search, Github, Linkedin, Upload, Check } from "lucide-react";
import GroqChat from "./GroqChat";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
                    
                    <div className="flex justify-end">
                      <Button 
                        onClick={handleSaveProfile} 
                        disabled={isSaving}
                        className="bg-primary text-white"
                      >
                        {isSaving ? (
                          <>
                            <div className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-white"></div>
                            Saving...
                          </>
                        ) : (
                          <>
                            Save Profile
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                  
                  <div className="space-y-4 pt-4">
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
                  
                  <div className="grid grid-cols-2 gap-3 pt-4">
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
