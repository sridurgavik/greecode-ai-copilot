
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { auth, db } from "@/integrations/firebase/client";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ThemeToggle } from "@/components/theme-toggle";
import ProSection from "@/components/ProSection";
import CopilotSection from "@/components/CopilotSection";
import SettingsPopover from "@/components/SettingsPopover";
import SettingsIcon from "@/components/SettingsIcon";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface MainAppProps {
  onLogout: () => void;
}

const MainApp = ({ onLogout }: MainAppProps) => {
  const [activeTab, setActiveTab] = useState<string>("copilot");
  const [userName, setUserName] = useState<string>("");
  const [showWelcome, setShowWelcome] = useState<boolean>(true);
  const [isFirstVisit, setIsFirstVisit] = useState<boolean>(false);
  const [showResourcesDialog, setShowResourcesDialog] = useState<boolean>(false);
  
  // Fetch user data on component mount
  useEffect(() => {
    const fetchUserData = async () => {
      const user = auth.currentUser;
      if (user) {
        // Get display name from Firebase Auth
        if (user.displayName) {
          setUserName(user.displayName);
        } else {
          // Fallback to email username
          setUserName(user.email?.split('@')[0] || "User");
        }
        
        // Check if this is first login by looking at Firestore
        try {
          const userDocRef = doc(db, "profiles", user.uid);
          const userDoc = await getDoc(userDocRef);
          const userData = userDoc.data();
          
          if (userData) {
            // Update login count and check if first login
            const loginCount = (userData.login_count || 0) + 1;
            const isFirstLogin = loginCount === 1;
            setIsFirstVisit(isFirstLogin);
            
            // Update login count in Firestore
            await setDoc(userDocRef, {
              login_count: loginCount,
              last_login: new Date().toISOString()
            }, { merge: true });
          }
        } catch (error) {
          console.error("Error fetching/updating user data:", error);
        }
      }
    };
    
    fetchUserData();
    
    // Hide welcome animation after 3 seconds
    const timer = setTimeout(() => {
      setShowWelcome(false);
    }, 3000);
    
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex min-h-screen flex-col">
      {/* Welcome Animation Overlay */}
      <AnimatePresence>
        {showWelcome && (
          <motion.div 
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <motion.div 
              className="flex flex-col items-center space-y-6 text-center"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              <motion.div
                className="rounded-full bg-primary/20 p-6"
                animate={{ 
                  scale: [1, 1.1, 1],
                  boxShadow: [
                    "0 0 0 0 rgba(var(--primary), 0.2)",
                    "0 0 0 10px rgba(var(--primary), 0.1)",
                    "0 0 0 0 rgba(var(--primary), 0.2)"
                  ]
                }}
                transition={{ 
                  repeat: 2,
                  duration: 1.5
                }}
              >
                <svg
                  className="h-16 w-16 text-primary"
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
              </motion.div>
              
              <motion.h1 
                className="text-3xl font-bold tracking-tight"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.5 }}
              >
                {isFirstVisit ? `Welcome to Greecode, ${userName}!` : `Welcome back, ${userName}!`}
              </motion.h1>
              
              <motion.p
                className="text-muted-foreground"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8, duration: 0.5 }}
              >
                {isFirstVisit 
                  ? "Thanks for verifying your email. Let's get started!" 
                  : "Your AI coding assistant is ready to help you."}
              </motion.p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Header with personalized greeting */}
      <header className="border-b border-border">
        <div className="container flex h-14 items-center">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <svg
                className="h-6 w-6 text-primary"
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
              <span className="text-lg font-bold">Greecode</span>
            </div>
          </div>
          
          {/* Personalized greeting */}
          <div className="ml-6 text-sm font-medium">
            <span className="text-muted-foreground">Hello, </span>
            <span className="text-foreground">{userName}</span>
          </div>
          <div className="ml-auto flex items-center space-x-2">
            {/* Download Icon */}
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-9 w-9"
              onClick={() => setShowResourcesDialog(true)}
            >
              <svg
                className="h-5 w-5"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              <span className="sr-only">Download</span>
            </Button>
            <SettingsIcon />
            <ThemeToggle />
            <Button
              variant="ghost"
              size="sm"
              onClick={onLogout}
              className="text-sm"
            >
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container flex-1 py-6">
        {/* Dashboard Overview - Only visible on initial load */}
        <AnimatePresence>
          {!showWelcome && (
            <motion.div 
              className="mb-6 grid gap-6 md:grid-cols-2 lg:grid-cols-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              {/* Quick Stats Card */}
              <motion.div 
                className="rounded-lg border bg-card text-card-foreground shadow-sm"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1, duration: 0.4 }}
              >
                <div className="p-6 flex flex-col space-y-2">
                  <h3 className="text-sm font-medium text-muted-foreground">Today</h3>
                  <p className="text-2xl font-bold">{new Date().toLocaleDateString('en-US', { weekday: 'long' })}</p>
                  <p className="text-sm text-muted-foreground">{new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>
              </motion.div>
              
              {/* Recent Activity Card */}
              <motion.div 
                className="rounded-lg border bg-card text-card-foreground shadow-sm"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2, duration: 0.4 }}
              >
                <div className="p-6 flex flex-col space-y-2">
                  <h3 className="text-sm font-medium text-muted-foreground">Recent Activity</h3>
                  <p className="text-2xl font-bold">3 Sessions</p>
                  <p className="text-sm text-muted-foreground">Last active: Today</p>
                </div>
              </motion.div>
              
              {/* Productivity Score Card */}
              <motion.div 
                className="rounded-lg border bg-card text-card-foreground shadow-sm"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3, duration: 0.4 }}
              >
                <div className="p-6 flex flex-col space-y-2">
                  <h3 className="text-sm font-medium text-muted-foreground">Productivity</h3>
                  <p className="text-2xl font-bold">92%</p>
                  <p className="text-sm text-muted-foreground">+5% from last week</p>
                </div>
              </motion.div>
              
              {/* Plans Card */}
              <motion.div 
                className="rounded-lg border bg-card text-card-foreground shadow-sm"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4, duration: 0.4 }}
              >
                <div className="p-6 flex flex-col space-y-2">
                  <h3 className="text-sm font-medium text-muted-foreground">Plan</h3>
                  <p className="text-2xl font-bold">Pay Per Session</p>
                  <p className="text-sm text-muted-foreground">
                    <a href="#" className="text-primary hover:underline text-xs">
                      Upgrade plan
                    </a>
                  </p>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Quick Actions */}
        <AnimatePresence>
          {!showWelcome && (
            <motion.div 
              className="mb-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
            >
              <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
              <div className="grid gap-4 md:grid-cols-3">
                <button className="flex items-center space-x-3 rounded-lg border bg-card p-4 text-card-foreground shadow-sm hover:bg-accent/50 transition-colors">
                  <div className="rounded-full bg-primary/10 p-2">
                    <svg className="h-5 w-5 text-primary" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
                      <polyline points="14 2 14 8 20 8"/>
                    </svg>
                  </div>
                  <div className="text-left">
                    <h3 className="font-medium">New Project</h3>
                    <p className="text-sm text-muted-foreground">Start a coding project</p>
                  </div>
                </button>
                
                <button className="flex items-center space-x-3 rounded-lg border bg-card p-4 text-card-foreground shadow-sm hover:bg-accent/50 transition-colors">
                  <div className="rounded-full bg-primary/10 p-2">
                    <svg className="h-5 w-5 text-primary" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/>
                      <path d="M12 8v4l3 3"/>
                    </svg>
                  </div>
                  <div className="text-left">
                    <h3 className="font-medium">Recent Sessions</h3>
                    <p className="text-sm text-muted-foreground">View your history</p>
                  </div>
                </button>
                
                <button className="flex items-center space-x-3 rounded-lg border bg-card p-4 text-card-foreground shadow-sm hover:bg-accent/50 transition-colors">
                  <div className="rounded-full bg-primary/10 p-2">
                    <svg className="h-5 w-5 text-primary" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
                      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
                    </svg>
                  </div>
                  <div className="text-left">
                    <h3 className="font-medium">Documentation</h3>
                    <p className="text-sm text-muted-foreground">Learn how to use</p>
                  </div>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Main Tabs */}
        <Tabs
          defaultValue="copilot"
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-4"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="copilot">Copilot</TabsTrigger>
            <TabsTrigger value="pro">Pro</TabsTrigger>
          </TabsList>

          <TabsContent value="copilot" className="space-y-4">
            <CopilotSection />
          </TabsContent>

          <TabsContent value="pro" className="space-y-4">
            <ProSection />
          </TabsContent>
        </Tabs>
      </div>

      {/* Resources Dialog */}
      <Dialog open={showResourcesDialog} onOpenChange={setShowResourcesDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Greecode Resources</DialogTitle>
            <DialogDescription>
              Access helpful resources to enhance your Greecode experience.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col space-y-3 py-4">
            <Button 
              variant="outline" 
              className="w-full justify-start text-left font-normal"
              onClick={() => window.open('#', '_blank')}
            >
              <svg className="mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                <line x1="8" y1="21" x2="16" y2="21"></line>
                <line x1="12" y1="17" x2="12" y2="21"></line>
              </svg>
              Download Extension
            </Button>
            
            <Button 
              variant="outline" 
              className="w-full justify-start text-left font-normal"
              onClick={() => window.open('#', '_blank')}
            >
              <svg className="mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
                <polyline points="10 9 9 9 8 9"></polyline>
              </svg>
              User Manual
            </Button>
            
            <Button 
              variant="outline" 
              className="w-full justify-start text-left font-normal"
              onClick={() => window.open('#', '_blank')}
            >
              <svg className="mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
              </svg>
              Help & Support
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Footer with fixed position */}
      <footer className="border-t border-border py-4 mt-auto">
        <div className="container flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Greecode
          </p>
          <p className="text-xs text-muted-foreground">
            Version 1.0.0
          </p>
        </div>
      </footer>
    </div>
  );
};

export default MainApp;
