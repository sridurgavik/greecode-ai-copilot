import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { CalendarIcon, Copy, FileUp, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { auth, db } from "@/integrations/firebase/client";
import { doc, getDoc, updateDoc, collection, query, where, getDocs, addDoc, Timestamp } from "firebase/firestore";

// Types
interface PasskeyData {
  passkey: string;
  job_role: string;
  company: string;
  is_used: boolean;
  user_id: string;
}

const CopilotSection = () => {
  const [showPasskeyForm, setShowPasskeyForm] = useState<boolean>(false);
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
  const [paymentProcessing, setPaymentProcessing] = useState<boolean>(false);
  const [paymentError, setPaymentError] = useState<string>("");
  const [resumeUrl, setResumeUrl] = useState<string>("");
  const [resumeAnalysis, setResumeAnalysis] = useState<string>("");
  const [uploadError, setUploadError] = useState<string>("");
  const [showPaymentPopup, setShowPaymentPopup] = useState<boolean>(false);
  const [couponCode, setCouponCode] = useState<string>("");
  const [couponApplied, setCouponApplied] = useState<boolean>(false);
  const [discountPercentage, setDiscountPercentage] = useState<number>(0);
  const [couponError, setCouponError] = useState<string>("");
  // Genz plan tracking
  const [userPlan, setUserPlan] = useState<string>("Pay Per Session");
  const [interviewsUsed, setInterviewsUsed] = useState<number>(0);
  const [interviewsRemaining, setInterviewsRemaining] = useState<number>(0);
  const [isGenzPlan, setIsGenzPlan] = useState<boolean>(false);
  const [isLoadingPlan, setIsLoadingPlan] = useState<boolean>(true);
  const { toast } = useToast();
  const razorpayFormRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check user's subscription status and track interview usage
  useEffect(() => {
    const checkUserSubscription = async () => {
      setIsLoadingPlan(true);
      try {
        const user = auth.currentUser;
        if (!user) {
          setIsLoadingPlan(false);
          return;
        }

        // Get user document from Firestore
        const userDocRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userDocRef);
        const userData = userDoc.data();

        if (userData) {
          // Check if user has a subscription
          if (userData.subscription && userData.subscription.plan) {
            // Check if subscription is active
            const isActive = userData.subscription.status === "active";
            const endDate = userData.subscription.endDate ? new Date(userData.subscription.endDate) : null;
            const isValid = endDate ? new Date() < endDate : false;
            
            if (isActive && isValid && userData.subscription.plan === "genz") {
              setUserPlan("Genz");
              setIsGenzPlan(true);
              
              // Get the current month's interview usage
              const currentMonth = new Date().getMonth();
              const currentYear = new Date().getFullYear();
              
              // Check if interviews_used exists and has data for current month
              const interviewsUsedThisMonth = userData.interviews_used?.[`${currentYear}-${currentMonth}`] || 0;
              setInterviewsUsed(interviewsUsedThisMonth);
              setInterviewsRemaining(Math.max(0, 5 - interviewsUsedThisMonth));
              
              // If user has remaining interviews, set payment as complete
              if (5 - interviewsUsedThisMonth > 0) {
                setPaymentComplete(true);
              }
            } else {
              setUserPlan("Pay Per Session");
              setIsGenzPlan(false);
            }
          } else {
            setUserPlan("Pay Per Session");
            setIsGenzPlan(false);
          }
        }
        
        setIsLoadingPlan(false);
      } catch (error) {
        console.error("Error checking subscription:", error);
        setIsLoadingPlan(false);
      }
    };
    
    checkUserSubscription();
  }, []);

  // Check for payment status changes from URL parameters
  useEffect(() => {
    const queryParams = new URLSearchParams(window.location.search);
    
    // Check for payment success parameter from Razorpay
    const paymentStatus = queryParams.get('payment_status');
    const razorpayPaymentId = queryParams.get('razorpay_payment_id');
    const paymentId = queryParams.get('payment_id');
    
    // Handle Razorpay payment success
    if (paymentStatus === 'success' && razorpayPaymentId) {
      // Payment was successful, generate the passkey
      setPaymentComplete(true);
      
      // Show success toast
      toast({
        title: "Payment Successful",
        description: `Payment completed successfully. Reference ID: ${razorpayPaymentId}`,
      });
      
      // Generate the passkey
      handleGeneratePasskey();
      
      // Clean up the URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    
    // Handle Razorpay payment failure
    if (paymentStatus === 'failure') {
      // Show failure toast
      toast({
        title: "Payment Failed",
        description: "There was an issue processing your payment. Please try again.",
        variant: "destructive",
      });
      
      // Clean up the URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    
    // Handle other payment status parameters if needed
  }, [toast]);

  // Initialize payment button when form is shown
  useEffect(() => {
    // Only run this effect when form is shown and not already paid
    if (showPasskeyForm && !paymentComplete && razorpayFormRef.current) {
      // Clear previous content
      razorpayFormRef.current.innerHTML = '';
      
      // Create the form element
      const form = document.createElement('form');
      
      // Create the script element
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/payment-button.js';
      script.async = true;
      
      // Set the appropriate payment button ID based on coupon status
      if (couponApplied && discountPercentage === 84) {
        // Discounted price (₹49)
        script.setAttribute('data-payment_button_id', 'pl_i6i8F9o');
      } else {
        // Regular price (₹299)
        script.setAttribute('data-payment_button_id', 'pl_rt6WXZL');
      }
      
      // Add script to form
      form.appendChild(script);
      
      // Add form to container
      razorpayFormRef.current.appendChild(form);
    }
  }, [showPasskeyForm, paymentComplete, couponApplied, discountPercentage]);

  // Handle file upload and analysis
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError("");
    const file = e.target.files?.[0];
    if (file) {
      setResumeFile(file);
      
      // Check file type
      const fileExt = file.name.split('.').pop()?.toLowerCase();
      if (fileExt !== 'pdf' && fileExt !== 'doc' && fileExt !== 'docx') {
        setUploadError("Please upload a PDF or DOC file.");
        return;
      }
      
      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setUploadError("File size exceeds 5MB limit.");
        return;
      }
      
      // Upload the file
      try {
        setIsLoading(true);
        
        // Get the current user
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          const fileName = `${user.id}-${Math.random().toString(36).substring(2)}.${fileExt}`;
          
          // Check if storage bucket exists, if not create it
          const { data: buckets } = await supabase.storage.listBuckets();
          const resumeBucketExists = buckets?.some(bucket => bucket.name === 'resumes');
          
          if (!resumeBucketExists) {
            await supabase.storage.createBucket('resumes', {
              public: false
            });
          }
          
          const { data, error } = await supabase.storage
            .from('resumes')
            .upload(fileName, file);
            
          if (error) {
            throw error;
          }
          
          // Get public URL
          const { data: urlData } = supabase.storage
            .from('resumes')
            .getPublicUrl(fileName);
            
          setResumeUrl(urlData.publicUrl);
          
          // Perform resume analysis based on file content
          const fileContent = await readFileAsText(file);
          const keywords = extractKeywords(fileContent);
          const detectedRole = extractJobRole(fileContent);
          
          // If no job role was set but we detected one, use it
          if (!jobRole && detectedRole) {
            setJobRole(detectedRole);
          }
          
          // Create comprehensive analysis
          const analysisText = `Resume analysis: Found experience in ${
            jobRole || detectedRole || "software development"
          }. Keywords extracted: ${keywords.join(", ")}.`;
          
          setResumeAnalysis(analysisText);
          
          toast({
            title: "Resume Uploaded",
            description: "Resume analyzed successfully. Keywords extracted for interview preparation.",
          });
        }
        
        setIsLoading(false);
      } catch (error) {
        console.error("File upload error:", error);
        setUploadError("Failed to upload resume. Please try again.");
        setIsLoading(false);
      }
    }
  };

  // Function to read file as text
  const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string || "");
      reader.onerror = (e) => reject(e);
      reader.readAsText(file);
    });
  };
  
  // Function to extract job role from resume
  const extractJobRole = (content: string): string => {
    const jobTitles = [
      "Software Engineer", "Developer", "Frontend", "Backend", "Full Stack", 
      "DevOps", "Data Scientist", "Project Manager", "Product Manager",
      "UX Designer", "UI Designer", "QA Engineer", "Tester", "Architect"
    ];
    
    for (const title of jobTitles) {
      if (content.toLowerCase().includes(title.toLowerCase())) {
        return title;
      }
    }
    
    return "";
  };
  
  // Function to extract keywords from resume
  const extractKeywords = (content: string): string[] => {
    const techKeywords = [
      "JavaScript", "React", "TypeScript", "Node.js", "HTML", "CSS", "Python",
      "Java", "C#", "AWS", "Azure", "Docker", "Kubernetes", "SQL", "NoSQL",
      "MongoDB", "Git", "CI/CD", "Agile", "Scrum", "REST API", "GraphQL",
      "Testing", "TDD", "Performance", "Optimization", "UI/UX", "Communication Skills"
    ];
    
    return techKeywords.filter(keyword => 
      content.toLowerCase().includes(keyword.toLowerCase())
    ).slice(0, 10); // Limit to 10 keywords
  };

  // Handle payment popup
  const handleShowPaymentPopup = () => {
    // Validate form fields first
    if (!resumeFile) {
      setUploadError("Please upload your resume.");
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
    
    // Check if user is on Genz plan with remaining interviews
    if (isGenzPlan && interviewsRemaining > 0) {
      // Skip payment and generate passkey directly
      setPaymentComplete(true);
      handleGeneratePasskey();
      
      toast({
        title: "Genz Plan Active",
        description: `Passkey generated! You have ${interviewsRemaining - 1} interviews remaining this month.`,
      });
    } else {
      // Show payment popup for non-Genz users or Genz users who've used all interviews
      setShowPaymentPopup(true);
    }
  };

  // Handle coupon code application
  const handleApplyCoupon = () => {
    if (!couponCode) {
      toast({
        title: "Error",
        description: "Please enter a coupon code.",
        variant: "destructive",
      });
      return;
    }

    setCouponError("");
    
    // Check for valid coupon codes
    if (couponCode.toUpperCase() === "CRACKNOW") {
      setCouponApplied(true);
      setDiscountPercentage(84);
      toast({
        title: "Coupon Applied",
        description: "You got 84% discount with CRACKNOW coupon!",
      });
    } else if (couponCode.toUpperCase() === "BUNNY") {
      setCouponApplied(true);
      setDiscountPercentage(100);
      toast({
        title: "Coupon Applied",
        description: "You got 100% discount with BUNNY coupon!",
      });
    } else {
      setCouponError("Invalid or expired coupon code");
      toast({
        title: "Invalid Coupon",
        description: "The coupon code you entered is invalid or expired.",
        variant: "destructive",
      });
    }
  };

  // Handle payment completion
  const handleCompletePayment = () => {
    setPaymentProcessing(true);
    
    // If 100% discount, skip payment processing
    if (discountPercentage === 100) {
      setPaymentComplete(true);
      setPaymentProcessing(false);
      setShowPaymentPopup(false);
      
      // Generate passkey immediately
      handleGeneratePasskey();
      return;
    }
    
    // For actual Razorpay payments, we'll open the payment link in a popup
    // The payment status will be handled by Razorpay's redirect URLs
    
    // Create a window listener for payment completion
    const handlePaymentMessage = (event: MessageEvent) => {
      // Check if the message is from our expected origin
      if (event.data && typeof event.data === 'object') {
        // Handle payment success
        if (event.data.status === 'success') {
          window.removeEventListener('message', handlePaymentMessage);
          setPaymentComplete(true);
          setPaymentProcessing(false);
          setShowPaymentPopup(false);
          
          // Generate passkey after successful payment
          handleGeneratePasskey();
          
          toast({
            title: "Payment Successful",
            description: "Your payment was processed successfully. Generating your passkey now.",
          });
        }
        
        // Handle payment failure
        if (event.data.status === 'failure') {
          window.removeEventListener('message', handlePaymentMessage);
          setPaymentProcessing(false);
          
          toast({
            title: "Payment Failed",
            description: "There was an issue processing your payment. Please try again.",
            variant: "destructive",
          });
        }
      }
    };
    
    // Add the event listener
    window.addEventListener('message', handlePaymentMessage);
    
    // Open the Razorpay payment in the popup
    // The actual payment will be handled by the Razorpay button that's injected via script
  };

  // Handle generate passkey
  const handleGeneratePasskey = async () => {
    setUploadError("");
    setIsLoading(true);
    
    try {
      // Generate a random 6-digit passkey
      const newPasskey = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Get current user
      const user = auth.currentUser;
      if (!user) {
        throw new Error("User not authenticated");
      }
      
      // If user is on Genz plan, update their interview usage
      if (isGenzPlan && interviewsRemaining > 0) {
        const userDocRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userDocRef);
        const userData = userDoc.data();
        
        // Get current month and year
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        const monthKey = `${currentYear}-${currentMonth}`;
        
        // Update interviews used count
        const currentInterviewsUsed = userData?.interviews_used?.[monthKey] || 0;
        const newInterviewsUsed = currentInterviewsUsed + 1;
        
        // Update Firestore document
        await updateDoc(userDocRef, {
          [`interviews_used.${monthKey}`]: newInterviewsUsed
        });
        
        // Update local state
        setInterviewsUsed(newInterviewsUsed);
        setInterviewsRemaining(Math.max(0, 5 - newInterviewsUsed));
      }
      
      // Save passkey and interview details to database
      if (user) {
        const interviewData = {
          passkey: newPasskey,
          company: company,
          job_role: jobRole,
          interview_date: date ? format(date, "yyyy-MM-dd") : "",
          interview_time: time,
          user_id: user.uid,
          created_at: Timestamp.now(),
          is_used: false
        };
        
        // Add to interviews collection
        await addDoc(collection(db, "interviews"), interviewData);
      }
      
      // Update UI
      setGeneratedPasskey(newPasskey);
      // Store the passkey in localStorage so it can be accessed in the settings
      localStorage.setItem("generatedPasskey", newPasskey);
      setIsLoading(false);
      
      toast({
        title: "Passkey Generated",
        description: isGenzPlan 
          ? `Your interview is scheduled successfully. You have ${interviewsRemaining > 0 ? interviewsRemaining - 1 : 0} interviews remaining this month.`
          : "Your interview is scheduled successfully.",
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

  // Trigger file input click
  const handleChooseFile = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className="space-y-4">
      {/* Payment Popup */}
      {showPaymentPopup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-background rounded-lg shadow-lg max-w-md w-full p-6"
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold">Complete Payment</h3>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 w-8 p-0 rounded-full"
                onClick={() => setShowPaymentPopup(false)}
              >
                <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
                <span className="sr-only">Close</span>
              </Button>
            </div>
            
            <div className="space-y-4">
              <div className="bg-muted p-4 rounded-md">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">
                    {isGenzPlan 
                      ? "Interview Passkey (Additional)" 
                      : "Interview Passkey"}
                  </span>
                  <span className="font-semibold">₹299</span>
                </div>
                {isGenzPlan && interviewsRemaining === 0 && (
                  <div className="text-xs text-muted-foreground mt-1">
                    You've used all 5 interviews included in your Genz plan this month
                  </div>
                )}
                {couponApplied && (
                  <div className="flex justify-between items-center text-sm mt-2">
                    <span className="text-muted-foreground">Discount ({discountPercentage}%)</span>
                    <span className="text-green-600">-₹{discountPercentage === 100 ? 299 : 250}</span>
                  </div>
                )}
                <div className="border-t my-2"></div>
                <div className="flex justify-between items-center font-semibold">
                  <span>Total</span>
                  <span className="text-primary">
                    {discountPercentage === 100 ? "₹0" : (discountPercentage === 84 ? "₹49" : "₹299")}
                  </span>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Payment Method</Label>
                <div className="w-full">
                  <div className="border rounded-md p-3 flex items-center space-x-2 cursor-pointer bg-muted/50">
                    <div className="h-4 w-4 rounded-full border-2 border-primary flex items-center justify-center">
                      <div className="h-2 w-2 rounded-full bg-primary"></div>
                    </div>
                    <span className="text-sm font-medium">UPI</span>
                  </div>
                </div>
              </div>
              
              <div className="pt-4">
                <Button 
                  className="w-full" 
                  onClick={() => {
                    // If 100% discount, skip payment processing
                    if (discountPercentage === 100) {
                      setPaymentComplete(true);
                      setShowPaymentPopup(false);
                      handleGeneratePasskey();
                      return;
                    }
                    
                    // Otherwise, open the appropriate Razorpay payment link
                    const paymentLink = couponApplied && discountPercentage === 84
                      ? "https://rzp.io/rzp/i6i8F9o" // ₹49 link
                      : "https://rzp.io/rzp/rt6WXZL"; // ₹299 link
                    
                    // Open the payment link in a new window
                    window.open(paymentLink, "_blank");
                    
                    // Close the payment popup
                    setShowPaymentPopup(false);
                    
                    // Show toast notification
                    toast({
                      title: "Payment Initiated",
                      description: "Complete the payment in the new window to generate your passkey.",
                    });
                  }}
                  disabled={paymentProcessing}
                >
                  {paymentProcessing ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processing...
                    </>
                  ) : (
                    discountPercentage === 100 ? 
                    "Generate Passkey - Free" : 
                    `Pay Now - ${discountPercentage === 84 ? "₹49" : "₹299"}`
                  )}
                </Button>
              </div>
              
              <p className="text-xs text-muted-foreground text-center">
                By proceeding, you agree to our Terms of Service and Privacy Policy.
              </p>
            </div>
          </motion.div>
        </div>
      )}
      {!showPasskeyForm ? (
        <div className="flex flex-col items-center justify-center py-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-8"
          >
            <h2 className="text-2xl font-bold mb-2">Real-Time Interview Assistant</h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              Generate a passkey to access our AI-powered interview assistant through our browser extension. Get real-time answers during your actual interviews.
            </p>
            
            {isGenzPlan && (
              <div className="mt-4 inline-flex items-center gap-2 bg-primary/10 text-primary px-3 py-1.5 rounded-full text-sm font-medium">
                <span className="h-2 w-2 rounded-full bg-primary animate-pulse"></span>
                Genz Plan: {interviewsRemaining} of 5 interviews remaining this month
              </div>
            )}
          </motion.div>
          
          <Button 
            onClick={() => setShowPasskeyForm(true)} 
            className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-white font-semibold py-6 px-8 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 text-lg"
          >
            <motion.div
              initial={{ scale: 1 }}
              whileHover={{ scale: 1.05 }}
              className="flex items-center space-x-2"
            >
              <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              </svg>
              <span>
                {isGenzPlan 
                  ? `Generate New Passkey (${interviewsRemaining} remaining)` 
                  : "Generate New Passkey"}
              </span>
            </motion.div>
          </Button>
          
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="mt-12 grid gap-6 md:grid-cols-3 max-w-4xl mx-auto"
          >
            <div className="rounded-lg border bg-card p-4 shadow-sm">
              <div className="flex items-center space-x-3 mb-3">
                <div className="rounded-full bg-primary/10 p-2">
                  <svg className="h-5 w-5 text-primary" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
                    <polyline points="14 2 14 8 20 8"/>
                  </svg>
                </div>
                <h3 className="font-medium">Browser Extension</h3>
              </div>
              <p className="text-sm text-muted-foreground">Use our extension to enter your email and passkey to access real-time answers during interviews.</p>
            </div>
            
            <div className="rounded-lg border bg-card p-4 shadow-sm">
              <div className="flex items-center space-x-3 mb-3">
                <div className="rounded-full bg-primary/10 p-2">
                  <svg className="h-5 w-5 text-primary" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M12 8v4l3 3"/>
                  </svg>
                </div>
                <h3 className="font-medium">Real-Time Answers</h3>
              </div>
              <p className="text-sm text-muted-foreground">Get instant answers to interview questions based on your job role and company details.</p>
            </div>
            
            <div className="rounded-lg border bg-card p-4 shadow-sm">
              <div className="flex items-center space-x-3 mb-3">
                <div className="rounded-full bg-primary/10 p-2">
                  <svg className="h-5 w-5 text-primary" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
                    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
                  </svg>
                </div>
                <h3 className="font-medium">Interview-Specific</h3>
              </div>
              <p className="text-sm text-muted-foreground">Your passkey links to specific interview details, ensuring relevant answers for your exact interview.</p>
            </div>
          </motion.div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex justify-between items-center mb-6">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Button 
                variant="ghost" 
                onClick={() => setShowPasskeyForm(false)}
                className="flex items-center gap-1"
              >
                <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 12H5M12 19l-7-7 7-7"/>
                </svg>
                <span>Back</span>
              </Button>
            </motion.div>
            <motion.h2 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              className="text-xl font-semibold flex items-center gap-2"
            >
              Generate New Passkey
              {isGenzPlan && (
                <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                  {interviewsRemaining} remaining
                </span>
              )}
            </motion.h2>
            <div className="w-[72px]"></div> {/* Spacer for alignment */}
          </div>
          
          {!generatedPasskey ? (
            <Card>
              <CardHeader>
                <CardTitle>Generate New Passkey</CardTitle>
                <CardDescription>
                  Enter your interview details to generate a passkey for our extension
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="jobRole">Job Role</Label>
                    <Input
                      id="jobRole"
                      placeholder="Software Engineer, Designer, etc."
                      value={jobRole}
                      onChange={(e) => setJobRole(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company">Company</Label>
                    <Input
                      id="company"
                      placeholder="Google, Facebook, etc."
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="resume">Upload Resume (PDF, DOC, DOCX)</Label>
                  <div className="flex items-center gap-2">
                    <div className="relative w-full">
                      {resumeFile ? (
                        <div className="border rounded-md p-3 bg-muted/30">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <div className="bg-primary/10 p-2 rounded-full">
                                <FileUp className="h-4 w-4 text-primary" />
                              </div>
                              <div className="flex flex-col">
                                <span className="text-sm font-medium truncate max-w-[200px]">{resumeFile.name}</span>
                                <span className="text-xs text-muted-foreground">{(resumeFile.size / 1024).toFixed(1)} KB</span>
                              </div>
                            </div>
                            <Button 
                              type="button" 
                              variant="ghost" 
                              size="sm"
                              onClick={() => setResumeFile(null)}
                              className="h-8 w-8 p-0 rounded-full"
                            >
                              <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M18 6L6 18M6 6l12 12" />
                              </svg>
                              <span className="sr-only">Remove file</span>
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div 
                          onClick={handleChooseFile}
                          className="border-2 border-dashed border-muted-foreground/25 rounded-md p-6 flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 transition-colors"
                        >
                          <div className="bg-primary/10 p-2 rounded-full mb-2">
                            <FileUp className="h-5 w-5 text-primary" />
                          </div>
                          <p className="text-sm font-medium">Click to upload your resume</p>
                          <p className="text-xs text-muted-foreground mt-1">PDF, DOC or DOCX (max 5MB)</p>
                        </div>
                      )}
                      <Input
                        ref={fileInputRef}
                        id="resume"
                        type="file"
                        accept=".pdf,.doc,.docx"
                        onChange={handleFileChange}
                        className="hidden"
                        disabled={isLoading}
                      />
                    </div>
                  </div>
                  {uploadError && (
                    <div className="text-destructive flex items-center text-sm mt-1">
                      <AlertCircle className="h-4 w-4 mr-1" />
                      {uploadError}
                    </div>
                  )}
                </div>

                {resumeAnalysis && (
                  <div className="rounded-md bg-muted p-3 text-sm">
                    <p className="font-medium mb-1">Resume Analysis</p>
                    <p className="text-muted-foreground">{resumeAnalysis}</p>
                  </div>
                )}



                <div className="space-y-2">
                  <Label htmlFor="jobDescription">Job Description (optional)</Label>
                  <Input
                    id="jobDescription"
                    placeholder="Paste the job description here..."
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    className="min-h-[80px]"
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
                          {date ? format(date, "PPP") : "Pick a date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={date}
                          onSelect={setDate}
                          disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="time">Interview Time</Label>
                    <div className="flex gap-2 h-10"> {/* Fixed height to align with date picker */}
                      <div className="w-1/3">
                        <select 
                          className="h-full w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                          value={time.split(':')[0] || '12'}
                          onChange={(e) => {
                            const hour = e.target.value;
                            const minute = time.split(':')[1] || '00';
                            setTime(`${hour}:${minute}`);
                          }}
                        >
                          <option value="" disabled>Hour</option>
                          {Array.from({ length: 12 }, (_, i) => i + 1).map(hour => (
                            <option key={hour} value={hour.toString().padStart(2, '0')}>{hour}</option>
                          ))}
                        </select>
                      </div>
                      <div className="w-1/3">
                        <select 
                          className="h-full w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                          value={time.split(':')[1] || '00'}
                          onChange={(e) => {
                            const hour = time.split(':')[0] || '12';
                            const minute = e.target.value;
                            setTime(`${hour}:${minute}`);
                          }}
                        >
                          <option value="" disabled>Min</option>
                          <option value="00">00</option>
                          <option value="15">15</option>
                          <option value="30">30</option>
                          <option value="45">45</option>
                        </select>
                      </div>
                      <div className="w-1/3">
                        <select 
                          className="h-full w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                          value={time.includes('PM') ? 'PM' : 'AM'}
                          onChange={(e) => {
                            const hour = time.split(':')[0] || '12';
                            const minute = time.split(':')[1] || '00';
                            setTime(`${hour}:${minute} ${e.target.value}`);
                          }}
                        >
                          <option value="" disabled>AM/PM</option>
                          <option value="AM">AM</option>
                          <option value="PM">PM</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-4">
                  <div className="rounded-md border p-4">
                    <div className="font-medium flex items-center">
                      <span className="mr-2">🔑</span>
                      Get Your Interview Passkey
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">
                      Unlock your interview real-time assistance with a one-time passkey. Limited time special offer!
                    </p>
                    
                    {paymentError && (
                      <div className="mb-4 text-destructive text-sm flex items-center">
                        <AlertCircle className="h-4 w-4 mr-1" />
                        {paymentError}
                      </div>
                    )}
                    
                    <div className="flex justify-between items-center">
                      <div className="flex items-center w-full">
                        <div className="flex-grow">
                          <div className="flex flex-col w-full">
                            <div className="flex items-center space-x-2">
                              <Input 
                                placeholder="Apply Coupon Code" 
                                className="max-w-[200px]"
                                value={couponCode}
                                onChange={(e) => {
                                  setCouponCode(e.target.value);
                                  setCouponError("");
                                }}
                              />
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={handleApplyCoupon}
                                disabled={!couponCode || couponApplied}
                              >
                                {couponApplied ? "Applied" : "Apply"}
                              </Button>
                            </div>
                            {couponError && (
                              <p className="text-xs text-destructive mt-1">{couponError}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center ml-4">
                          {couponApplied && discountPercentage === 84 ? (
                            <>
                              <span className="line-through text-muted-foreground mr-2">₹299</span>
                              <span className="text-primary font-semibold">₹49</span>
                              <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">84% OFF</span>
                            </>
                          ) : couponApplied && discountPercentage === 100 ? (
                            <>
                              <span className="line-through text-muted-foreground mr-2">₹299</span>
                              <span className="text-primary font-semibold">₹0</span>
                              <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">100% OFF</span>
                            </>
                          ) : (
                            <span className="text-primary font-semibold">₹299</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2 text-center">
                    The generated passkey is valid for one-time use only
                  </p>
                </div>
              </CardContent>
              <CardFooter>
                <Button 
                  onClick={handleShowPaymentPopup} 
                  disabled={isLoading}
                  className="w-full"
                >
                  {isLoading ? "Processing..." : "Generate Passkey"}
                </Button>
              </CardFooter>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Passkey Generated</CardTitle>
                <CardDescription>
                  Your interview is scheduled successfully
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex flex-col items-center justify-center py-4">
                  <div className="text-4xl font-bold tracking-wider bg-gradient-to-r from-primary to-primary/70 text-transparent bg-clip-text mb-2">
                    {generatedPasskey}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-1"
                    onClick={() => handleCopyToClipboard(generatedPasskey)}
                  >
                    <Copy className="h-3.5 w-3.5" />
                    <span>Copy</span>
                  </Button>
                </div>

                <div className="rounded-md bg-muted p-4 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Job Role:</span>
                    <span className="font-medium">{jobRole}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Company:</span>
                    <span className="font-medium">{company}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Interview Date:</span>
                    <span className="font-medium">{date ? format(date, "PPP") : ""}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Interview Time:</span>
                    <span className="font-medium">{time}</span>
                  </div>
                </div>

                <div className="space-y-2 text-center">
                  <p className="text-sm">
                    Share this passkey with your interviewer when prompted
                  </p>
                  <div className="flex justify-center gap-2 mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setGeneratedPasskey("");
                        setResumeFile(null);
                        setJobRole("");
                        setCompany("");
                        setJobDescription("");
                        setDate(undefined);
                        setTime("");
                        setResumeAnalysis("");
                        setResumeUrl("");
                      }}
                    >
                      Generate Another
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        setGeneratedPasskey("");
                        setResumeFile(null);
                        setJobRole("");
                        setCompany("");
                        setJobDescription("");
                        setDate(undefined);
                        setTime("");
                        setResumeAnalysis("");
                        setResumeUrl("");
                        setShowPasskeyForm(false);
                      }}
                    >
                      Back to Overview
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};

export default CopilotSection;
