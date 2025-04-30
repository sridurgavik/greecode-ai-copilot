import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { CalendarIcon, Copy, FileUp, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

// Types
interface PasskeyData {
  passkey: string;
  job_role: string;
  company: string;
  is_used: boolean;
  user_id: string;
}

const CopilotSection = () => {
  const [activeTab, setActiveTab] = useState<string>("enter");
  const [passkey, setPasskey] = useState<string>("");
  const [generatedPasskey, setGeneratedPasskey] = useState<string>("");
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [jobRole, setJobRole] = useState<string>("");
  const [company, setCompany] = useState<string>("");
  const [jobDescription, setJobDescription] = useState<string>("");
  const [date, setDate] = useState<Date | undefined>();
  const [time, setTime] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [passkeyError, setPasskeyError] = useState<string>("");
  const [paymentComplete, setPaymentComplete] = useState<boolean>(false);
  const [resumeUrl, setResumeUrl] = useState<string>("");
  const [razorpayLoaded, setRazorpayLoaded] = useState<boolean>(false);
  const { toast } = useToast();

  // Check for payment status changes from Razorpay redirect
  useEffect(() => {
    const queryParams = new URLSearchParams(window.location.search);
    const paymentStatus = queryParams.get("payment_status");
    
    if (paymentStatus === "success") {
      setPaymentComplete(true);
      toast({
        title: "Payment Successful",
        description: "Your payment was processed successfully.",
      });
      
      // Clear URL params without refreshing
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    // Load Razorpay script
    const loadRazorpayScript = () => {
      if (!document.getElementById('razorpay-payment-button-script')) {
        const script = document.createElement('script');
        script.id = 'razorpay-payment-button-script';
        script.src = 'https://checkout.razorpay.com/v1/payment-button.js';
        script.async = true;
        script.setAttribute('data-payment_button_id', 'pl_QOEa41foHVbd1v');
        script.onload = () => setRazorpayLoaded(true);
        document.body.appendChild(script);
      }
    };

    if (activeTab === "generate" && !razorpayLoaded) {
      loadRazorpayScript();
    }
  }, [toast, activeTab, razorpayLoaded]);

  // Render Razorpay button when script loads
  useEffect(() => {
    if (razorpayLoaded && !paymentComplete) {
      const buttonContainer = document.getElementById('razorpay-button-container');
      if (buttonContainer) {
        buttonContainer.innerHTML = '';
        const form = document.createElement('form');
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/payment-button.js';
        script.async = true;
        script.setAttribute('data-payment_button_id', 'pl_QOEa41foHVbd1v');
        form.appendChild(script);
        buttonContainer.appendChild(form);
      }
    }
  }, [razorpayLoaded, paymentComplete]);

  // Handle enter passkey form submission
  const handleEnterPasskey = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!passkey) {
      setPasskeyError("Please enter a valid passkey.");
      return;
    }
    
    setIsLoading(true);
    setPasskeyError("");
    
    try {
      // Get the current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("You must be logged in to validate a passkey.");
      }
      
      // Check if the passkey exists and belongs to the user
      const { data: passkeyData, error } = await supabase
        .from("passkeys")
        .select("*")
        .eq("passkey", passkey)
        .eq("user_id", user.id)
        .eq("is_used", false)
        .single();
      
      if (error || !passkeyData) {
        setPasskeyError("Invalid or already used passkey.");
        setIsLoading(false);
        return;
      }
      
      // Mark the passkey as used
      await supabase
        .from("passkeys")
        .update({ is_used: true })
        .eq("id", passkeyData.id);
      
      // Create a new session
      await supabase.from("sessions").insert({
        passkey_id: passkeyData.id,
        user_id: user.id,
        start_time: new Date().toISOString(),
      });
      
      setIsLoading(false);
      
      toast({
        title: "Passkey Valid",
        description: "You would now be prompted for screen sharing access.",
      });
      
      // In a real implementation, this would prompt for screen sharing
      // and start the interview assistant process
      
    } catch (error) {
      console.error("Passkey validation error:", error);
      setIsLoading(false);
      setPasskeyError("Failed to validate passkey. Please try again.");
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setResumeFile(file);
      
      // If user is logged in, upload the file to Supabase storage
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        try {
          const fileExt = file.name.split('.').pop();
          const fileName = `${user.id}-${Math.random().toString(36).substring(2)}.${fileExt}`;
          const { data, error } = await supabase.storage
            .from('resumes')
            .upload(fileName, file);
            
          if (error) throw error;
          
          // Get public URL
          const { data: urlData } = supabase.storage
            .from('resumes')
            .getPublicUrl(fileName);
            
          setResumeUrl(urlData.publicUrl);
        } catch (error) {
          console.error("File upload error:", error);
          toast({
            title: "Error",
            description: "Failed to upload resume. Please try again.",
            variant: "destructive",
          });
        }
      }
    }
  };

  // Handle generate passkey
  const handleGeneratePasskey = async () => {
    if (!resumeFile) {
      toast({
        title: "Error",
        description: "Please upload your resume.",
        variant: "destructive",
      });
      return;
    }
    
    if (!jobRole || !company) {
      toast({
        title: "Error",
        description: "Please enter job role and company name.",
        variant: "destructive",
      });
      return;
    }
    
    if (!date || !time) {
      toast({
        title: "Error",
        description: "Please select interview date and time.",
        variant: "destructive",
      });
      return;
    }
    
    if (!paymentComplete) {
      toast({
        title: "Payment Required",
        description: "Please complete the payment to generate a passkey.",
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Get the current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("You must be logged in to generate a passkey.");
      }
      
      // Generate a random 6-digit passkey
      const newPasskey = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Save the passkey to Supabase
      await supabase.from("passkeys").insert({
        passkey: newPasskey,
        user_id: user.id,
        job_role: jobRole,
        company: company,
        job_description: jobDescription || null,
        resume_url: resumeUrl,
        expires_at: new Date(date!.setHours(parseInt(time.split(':')[0]), parseInt(time.split(':')[1]))).toISOString(),
        is_used: false,
      });
      
      setGeneratedPasskey(newPasskey);
      setIsLoading(false);
      
      toast({
        title: "Passkey Generated",
        description: "Your interview is scheduled successfully.",
      });
    } catch (error) {
      console.error("Generate passkey error:", error);
      setIsLoading(false);
      toast({
        title: "Error",
        description: "Failed to generate passkey. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleCopyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied",
        description: "Passkey copied to clipboard.",
      });
    } catch (error) {
      console.error("Copy error:", error);
      toast({
        title: "Error",
        description: "Failed to copy passkey. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4">
      <Tabs
        defaultValue="enter"
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-4"
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="enter">Enter Passkey</TabsTrigger>
          <TabsTrigger value="generate">Generate New Passkey</TabsTrigger>
        </TabsList>

        <TabsContent value="enter" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Enter Passkey</CardTitle>
              <CardDescription>
                Enter your 6-digit passkey to start your interview assistant
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleEnterPasskey} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="passkey">Passkey</Label>
                  <Input
                    id="passkey"
                    placeholder="Enter 6-digit passkey"
                    value={passkey}
                    onChange={(e) => {
                      setPasskey(e.target.value);
                      setPasskeyError("");
                    }}
                    required
                    minLength={6}
                    maxLength={6}
                    pattern="[0-9]{6}"
                    className="text-center text-lg tracking-widest"
                  />
                  {passkeyError && (
                    <div className="text-destructive flex items-center text-sm mt-1">
                      <AlertCircle className="h-4 w-4 mr-1" />
                      {passkeyError}
                    </div>
                  )}
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-white"></div>
                  ) : (
                    "Start Interview Assistant"
                  )}
                </Button>
              </form>
            </CardContent>
            <CardFooter className="text-xs text-muted-foreground">
              You'll be prompted to share your screen or meeting tab after validation
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="generate" className="space-y-4">
          {!generatedPasskey ? (
            <Card>
              <CardHeader>
                <CardTitle>Generate New Passkey</CardTitle>
                <CardDescription>
                  Schedule a new interview and get a passkey
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="resume">Upload Resume</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="resume"
                      type="file"
                      accept=".pdf,.doc,.docx"
                      onChange={handleFileChange}
                      className="max-w-xs"
                    />
                    {resumeFile && <FileUp className="h-4 w-4 text-primary" />}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Upload your resume in PDF or DOC format
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="jobRole">Job Role</Label>
                    <Input
                      id="jobRole"
                      placeholder="E.g., Frontend Developer"
                      value={jobRole}
                      onChange={(e) => setJobRole(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company">Company</Label>
                    <Input
                      id="company"
                      placeholder="E.g., Google"
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="jobDescription">Job Description (Optional)</Label>
                  <Input
                    id="jobDescription"
                    placeholder="Paste job description here"
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Interview Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !date && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {date ? format(date, "PPP") : <span>Pick a date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="pointer-events-auto w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={date}
                          onSelect={setDate}
                          initialFocus
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="time">Interview Time</Label>
                    <Input
                      id="time"
                      type="time"
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                    />
                  </div>
                </div>

                <div className="rounded-md bg-primary/10 p-4">
                  <h3 className="mb-2 text-sm font-medium">Payment Required</h3>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    A payment of ₹50 is required to generate a passkey. This is a one-time fee for each interview session.
                  </p>
                  
                  {!paymentComplete ? (
                    <div className="mt-2" id="razorpay-button-container">
                      {/* Razorpay button will be injected here */}
                    </div>
                  ) : (
                    <Button
                      className="mt-2 w-full"
                      onClick={handleGeneratePasskey}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-white"></div>
                      ) : (
                        "Generate Passkey"
                      )}
                    </Button>
                  )}
                </div>
              </CardContent>
              <CardFooter className="text-xs text-muted-foreground">
                The generated passkey is valid for one-time use only
              </CardFooter>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Passkey Generated</CardTitle>
                <CardDescription>
                  Your interview assistant is ready to use
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-md bg-primary/10 p-6 text-center">
                  <h3 className="mb-2 text-sm font-medium">Your Passkey</h3>
                  <p className="text-3xl font-bold tracking-widest text-primary">
                    {generatedPasskey}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopyToClipboard(generatedPasskey)}
                    className="mt-2"
                  >
                    <Copy className="mr-2 h-3 w-3" />
                    Copy
                  </Button>
                </div>

                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Interview Details</h3>
                  <div className="rounded-md bg-muted p-3 text-sm">
                    <p>
                      <span className="font-semibold">Role:</span> {jobRole}
                    </p>
                    <p>
                      <span className="font-semibold">Company:</span> {company}
                    </p>
                    <p>
                      <span className="font-semibold">Date:</span> {date && format(date, "PPP")}
                    </p>
                    <p>
                      <span className="font-semibold">Time:</span> {time}
                    </p>
                  </div>
                </div>

                <div className="space-y-2 text-center">
                  <p className="text-sm">
                    Use this passkey to start your interview assistant when your interview begins.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Note: This passkey is valid for one-time use only.
                  </p>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setGeneratedPasskey("");
                    setResumeFile(null);
                    setJobRole("");
                    setCompany("");
                    setJobDescription("");
                    setDate(undefined);
                    setTime("");
                    setPaymentComplete(false);
                  }}
                >
                  Generate Another
                </Button>
                <Button
                  onClick={() => {
                    setActiveTab("enter");
                    setPasskey(generatedPasskey);
                  }}
                >
                  Use Now
                </Button>
              </CardFooter>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CopilotSection;
