import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Check, Copy, Calendar, Clock, Briefcase, Building2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { auth, db } from "@/integrations/firebase/client";
import { doc, getDoc, updateDoc, addDoc, collection, Timestamp } from "firebase/firestore";

interface InterviewDetails {
  jobRole: string;
  company: string;
  date: string;
  time: string;
  resumeUrl?: string;
  jobDescription?: string;
}

const PasskeyGeneration = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [generatedPasskey, setGeneratedPasskey] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [interviewDetails, setInterviewDetails] = useState<InterviewDetails | null>(null);

  useEffect(() => {
    // Set up a timeout to redirect to failure page if passkey generation takes too long
    const failureTimeout = setTimeout(() => {
      if (isLoading && !generatedPasskey) {
        // If still loading after timeout, redirect to failure page
        window.location.href = '/payment-failure';
      }
    }, 20000); // 20 seconds timeout - increased to allow more time

    // Extract payment ID and source from URL
    const queryParams = new URLSearchParams(window.location.search);
    const razorpayPaymentId = queryParams.get('razorpay_payment_id');
    const paymentIdParam = queryParams.get('payment_id');
    const source = queryParams.get('source');
    const paymentStatus = queryParams.get('payment_status');
    
    // Check if this is a valid payment redirect
    const isValidPayment = (razorpayPaymentId || paymentIdParam || (paymentStatus === 'success'));
    
    if (!isValidPayment) {
      console.log('No valid payment information found in URL');
      // If no payment info, check if we have a stored payment ID in session
      const storedPaymentId = sessionStorage.getItem('last_payment_id');
      if (!storedPaymentId) {
        // No payment info at all, show a message but still try to generate a passkey
        toast({
          title: "Warning",
          description: "No payment information found. Attempting to generate passkey anyway.",
        });
      }
    }
    
    // Set payment ID if available
    if (razorpayPaymentId || paymentIdParam) {
      const payId = razorpayPaymentId || paymentIdParam;
      setPaymentId(payId);
      // Store in session storage for potential page reloads
      sessionStorage.setItem('last_payment_id', payId);
    }
    
    // Main function to handle the entire process
    const initializePasskeyGeneration = async () => {
      try {
        // First fetch interview details
        await fetchInterviewDetails();
        
        // Then generate passkey
        await generatePasskey(source);
      } catch (error) {
        console.error("Error in passkey generation process:", error);
        setError("Failed to complete the passkey generation process. Please try again.");
        setIsLoading(false);
      }
    };
    
    // Fetch interview details from session storage
    const fetchInterviewDetails = async () => {
      try {
        console.log("Fetching interview details...");
        // Try to get interview details from session storage
        const storedDetails = sessionStorage.getItem('interviewDetails');
        
        if (storedDetails) {
          console.log("Found interview details in session storage");
          setInterviewDetails(JSON.parse(storedDetails));
          return true;
        } else {
          console.log("No interview details in session storage, checking Firestore...");
          // If not in session storage, try to get from Firestore
          const user = auth.currentUser;
          if (user) {
            const userDocRef = doc(db, "users", user.uid);
            const userDoc = await getDoc(userDocRef);
            
            if (userDoc.exists()) {
              const userData = userDoc.data();
              if (userData.pendingInterview) {
                console.log("Found interview details in Firestore");
                const details = {
                  jobRole: userData.pendingInterview.jobRole || '',
                  company: userData.pendingInterview.company || '',
                  date: userData.pendingInterview.date || '',
                  time: userData.pendingInterview.time || '',
                  resumeUrl: userData.pendingInterview.resumeUrl || '',
                  jobDescription: userData.pendingInterview.jobDescription || ''
                };
                setInterviewDetails(details);
                // Also save to session storage for future use
                sessionStorage.setItem('interviewDetails', JSON.stringify(details));
                return true;
              }
            }
          }
          console.log("No interview details found in Firestore");
          return false;
        }
      } catch (error) {
        console.error("Error fetching interview details:", error);
        return false;
      }
    };
    
    // Start the process
    initializePasskeyGeneration();
    
    // Clean up function
    return () => {
      clearTimeout(failureTimeout);
    };
  }, []); // Empty dependency array to run only once

  const generatePasskey = async (source: string | null) => {
    console.log("Starting passkey generation process...");
    try {
      setIsLoading(true);
      
      // Check if user is authenticated
      const user = auth.currentUser;
      console.log("Current user status:", user ? "Logged in" : "Not logged in");
      
      if (!user) {
        console.log("No user found, trying fallback authentication...");
        // Try to get user from local storage or session as fallback
        try {
          // Wait for Firebase auth to initialize
          console.log("Waiting for Firebase auth to initialize...");
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // Check again after waiting
          const currentUser = auth.currentUser;
          if (currentUser) {
            console.log("User found after waiting!");
            // Generate passkey with the current user
            const passkey = generateRandomPasskey();
            console.log("Passkey generated:", passkey);
            setGeneratedPasskey(passkey);
            
            // Store passkey in database
            console.log("Storing passkey in database...");
            await storePasskey(passkey, currentUser.uid, source);
            
            // Show success toast
            toast({
              title: "Passkey Generated",
              description: "Your interview passkey has been generated successfully!",
            });
            
            setIsLoading(false);
            return passkey;
          } else {
            console.log("Still no user, using anonymous passkey generation");
            // Still no user, try to use anonymous passkey generation
            const passkey = generateRandomPasskey();
            console.log("Anonymous passkey generated:", passkey);
            setGeneratedPasskey(passkey);
            
            // Store in local storage at minimum
            localStorage.setItem('anonymous_passkey', passkey);
            
            // Show success toast with warning
            toast({
              title: "Passkey Generated",
              description: "Your interview passkey has been generated, but you're not logged in. This passkey is temporary.",
            });
            
            setIsLoading(false);
            return passkey;
          }
        } catch (fallbackError) {
          console.error("Fallback authentication failed:", fallbackError);
          
          // Even if authentication fails, still generate a passkey
          console.log("Generating emergency passkey despite authentication failure");
          const emergencyPasskey = generateRandomPasskey();
          setGeneratedPasskey(emergencyPasskey);
          localStorage.setItem('emergency_passkey', emergencyPasskey);
          
          toast({
            title: "Passkey Generated",
            description: "A temporary passkey has been generated. Please save it immediately.",
          });
          
          setIsLoading(false);
          return emergencyPasskey;
        }
      }
      
      // User is authenticated, generate a passkey normally
      console.log("Generating passkey for authenticated user...");
      const passkey = generateRandomPasskey();
      console.log("Passkey generated:", passkey);
      setGeneratedPasskey(passkey);
      
      // Store passkey in database
      console.log("Storing passkey in database...");
      await storePasskey(passkey, user.uid, source);
      
      // Show success toast
      toast({
        title: "Passkey Generated",
        description: "Your interview passkey has been generated successfully!",
      });
      
      setIsLoading(false);
      return passkey;
    } catch (error) {
      console.error("Error generating passkey:", error);
      
      // Generate a fallback passkey even if database storage fails
      try {
        console.log("Generating fallback passkey due to error...");
        const fallbackPasskey = generateRandomPasskey();
        console.log("Fallback passkey generated:", fallbackPasskey);
        setGeneratedPasskey(fallbackPasskey);
        
        // Store in local storage at minimum
        localStorage.setItem('fallback_passkey', fallbackPasskey);
        
        toast({
          title: "Passkey Generated",
          description: "Your interview passkey has been generated with limited functionality.",
        });
        
        setIsLoading(false);
        return fallbackPasskey;
      } catch (fallbackError) {
        console.error("Even fallback passkey generation failed:", fallbackError);
        setError("Failed to generate passkey. Please try again.");
        setIsLoading(false);
        return null;
      }
    }
  };

  const generateRandomPasskey = () => {
    // Generate a random 6-digit numeric passkey
    const characters = '0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
  };

  const storePasskey = async (passkey: string, userId: string, source: string | null) => {
    try {
      console.log(`Attempting to store passkey ${passkey} for user ${userId}...`);
      
      // Set a timeout to resolve anyway after 5 seconds to prevent hanging
      const timeoutPromise = new Promise<void>(resolve => {
        setTimeout(() => {
          console.log('Passkey storage timeout reached, continuing anyway');
          resolve();
        }, 5000);
      });
      
      // The actual storage operation
      const storagePromise = (async () => {
        try {
          // Get user document
          console.log('Getting user document...');
          const userDocRef = doc(db, "users", userId);
          const userDoc = await getDoc(userDocRef);
          
          // Prepare passkey data with interview details
          const passKeyData = {
            passkey: passkey,
            created_at: Timestamp.now(),
            is_used: false,
            source: source || "payment",
            payment_id: paymentId,
            active: true, // Mark as active passkey
            // Include interview details if available
            interview_details: interviewDetails ? {
              job_role: interviewDetails.jobRole || '',
              company: interviewDetails.company || '',
              date: interviewDetails.date || '',
              time: interviewDetails.time || '',
              resume_url: interviewDetails.resumeUrl || '',
              job_description: interviewDetails.jobDescription || ''
            } : null
          };
          
          if (userDoc.exists()) {
            console.log('User document exists, adding passkey to collection...');
            // Add passkey to user's passkeys collection
            const passkeysCollectionRef = collection(db, "users", userId, "passkeys");
            await addDoc(passkeysCollectionRef, passKeyData);
            
            // Update user document with new passkey count and active passkey
            console.log('Updating passkey count and active passkey...');
            const userData = userDoc.data();
            const currentPasskeys = userData.passkeys_count || 0;
            await updateDoc(userDocRef, {
              passkeys_count: currentPasskeys + 1,
              active_passkey: passkey, // Set this as the active passkey
              last_passkey_generated: Timestamp.now()
            });
            
            console.log('Passkey successfully stored in database');
            return true;
          } else {
            console.log('User document does not exist, creating new document...');
            // Create user document if it doesn't exist
            await updateDoc(userDocRef, {
              passkeys_count: 1,
              active_passkey: passkey, // Set this as the active passkey
              last_passkey_generated: Timestamp.now(),
              updated_at: Timestamp.now()
            });
            
            // Add passkey to user's passkeys collection
            const passkeysCollectionRef = collection(db, "users", userId, "passkeys");
            await addDoc(passkeysCollectionRef, passKeyData);
            
            console.log('New user document created with passkey');
            return true;
          }
        } catch (innerError) {
          console.error('Error in storage operation:', innerError);
          return false;
        }
      })();
      
      // Race between the timeout and the actual operation
      await Promise.race([timeoutPromise, storagePromise]);
      console.log('Passkey storage process completed (either succeeded or timed out)');
      
      // Always store in localStorage as a backup with interview details
      const backupData = {
        passkey: passkey,
        timestamp: new Date().toISOString(),
        interview_details: interviewDetails || null
      };
      localStorage.setItem('backup_passkey', JSON.stringify(backupData));
      console.log('Backup passkey stored in localStorage with interview details');
      
      return true;
    } catch (error) {
      console.error("Error storing passkey:", error);
      // Don't throw the error, just log it and continue
      return false;
    }
  };

  const copyPasskeyToClipboard = () => {
    navigator.clipboard.writeText(generatedPasskey);
    toast({
      title: "Copied to Clipboard",
      description: "Passkey has been copied to clipboard",
    });
  };

  return (
    <div className="container max-w-lg mx-auto py-12">
      <div className="bg-white p-8 rounded-lg shadow-md">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
            <Check className="h-8 w-8 text-green-600" />
          </div>
          
          <h1 className="text-2xl font-bold text-gray-900">Payment Successful</h1>
          
          {isLoading ? (
            <div className="py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-gray-600">Generating your passkey...</p>
            </div>
          ) : error ? (
            <div className="py-8">
              <p className="text-red-500">{error}</p>
              <Button 
                className="mt-4" 
                onClick={() => navigate("/")}
              >
                Return to Home
              </Button>
            </div>
          ) : (
            <>
              <p className="text-gray-600">
                Your payment was successful and your interview passkey has been generated.
              </p>
              
              {paymentId && (
                <div className="text-sm text-gray-500 mb-4">
                  Payment ID: {paymentId}
                </div>
              )}
              
              <div className="w-full mt-4">
                <div className="bg-gray-100 p-4 rounded-md flex items-center justify-between">
                  <span className="font-mono text-xl font-bold">{generatedPasskey}</span>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={copyPasskeyToClipboard}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  The generated passkey is valid for one-time use only
                </p>
              </div>
              
              {/* Interview Details Section */}
              {interviewDetails && (
                <div className="w-full mt-6 border-t pt-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4 text-left">Interview Details</h2>
                  
                  <div className="space-y-4 text-left">
                    {interviewDetails.jobRole && (
                      <div className="flex items-start">
                        <Briefcase className="h-5 w-5 text-gray-500 mr-3 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-gray-700">Job Role</p>
                          <p className="text-sm text-gray-600">{interviewDetails.jobRole}</p>
                        </div>
                      </div>
                    )}
                    
                    {interviewDetails.company && (
                      <div className="flex items-start">
                        <Building2 className="h-5 w-5 text-gray-500 mr-3 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-gray-700">Company</p>
                          <p className="text-sm text-gray-600">{interviewDetails.company}</p>
                        </div>
                      </div>
                    )}
                    
                    {interviewDetails.date && (
                      <div className="flex items-start">
                        <Calendar className="h-5 w-5 text-gray-500 mr-3 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-gray-700">Interview Date</p>
                          <p className="text-sm text-gray-600">{interviewDetails.date}</p>
                        </div>
                      </div>
                    )}
                    
                    {interviewDetails.time && (
                      <div className="flex items-start">
                        <Clock className="h-5 w-5 text-gray-500 mr-3 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-gray-700">Interview Time</p>
                          <p className="text-sm text-gray-600">{interviewDetails.time}</p>
                        </div>
                      </div>
                    )}
                    
                    {interviewDetails.resumeUrl && (
                      <div className="mt-4">
                        <p className="text-sm font-medium text-gray-700 mb-2">Resume</p>
                        <a 
                          href={interviewDetails.resumeUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:underline"
                        >
                          View Resume
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              <div className="pt-6 w-full">
                <Button 
                  className="w-full" 
                  onClick={() => {
                    // Clean up URL parameters before navigating
                    window.history.replaceState({}, document.title, window.location.pathname);
                    navigate("/");
                  }}
                >
                  Return to Home
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default PasskeyGeneration;