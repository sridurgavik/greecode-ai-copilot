
import { useState } from "react";
import { ThemeToggle } from "@/components/theme-toggle";
import ProSection from "@/components/ProSection";
import CopilotSection from "@/components/CopilotSection";
import SettingsPopover from "@/components/SettingsPopover";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface MainAppProps {
  onLogout: () => void;
}

const MainApp = ({ onLogout }: MainAppProps) => {
  const [activeTab, setActiveTab] = useState<string>("pro");

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
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
          <div className="ml-auto flex items-center space-x-2">
            <SettingsPopover />
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
        <Tabs
          defaultValue="pro"
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-4"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="pro">Pro</TabsTrigger>
            <TabsTrigger value="copilot">Copilot</TabsTrigger>
          </TabsList>

          <TabsContent value="pro" className="space-y-4">
            <ProSection />
          </TabsContent>

          <TabsContent value="copilot" className="space-y-4">
            <CopilotSection />
          </TabsContent>
        </Tabs>
      </div>

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
