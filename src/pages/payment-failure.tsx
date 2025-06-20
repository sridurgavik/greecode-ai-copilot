import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const PaymentFailure = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [paymentId, setPaymentId] = useState<string | null>(null);

  useEffect(() => {
    // Extract payment ID from URL if available
    const queryParams = new URLSearchParams(window.location.search);
    const razorpayPaymentId = queryParams.get('razorpay_payment_id');
    const paymentIdParam = queryParams.get('payment_id');
    
    // Set payment ID if available
    if (razorpayPaymentId || paymentIdParam) {
      setPaymentId(razorpayPaymentId || paymentIdParam);
    }
    
    // Show toast notification
    toast({
      title: "Payment Failed",
      description: "There was an issue processing your payment.",
      variant: "destructive",
    });
    
    // Clean up URL parameters
    window.history.replaceState({}, document.title, window.location.pathname);
  }, [toast]);

  const handleRetry = () => {
    // Navigate back to the main page
    navigate("/");
  };

  return (
    <div className="container max-w-md mx-auto py-12">
      <div className="bg-white p-8 rounded-lg shadow-md">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
            <AlertCircle className="h-8 w-8 text-red-600" />
          </div>
          
          <h1 className="text-2xl font-bold text-gray-900">Payment Failed</h1>
          
          <p className="text-gray-600">
            We couldn't process your payment. Please try again or contact support if the issue persists.
          </p>
          
          {paymentId && (
            <div className="text-sm text-gray-500">
              Reference ID: {paymentId}
            </div>
          )}
          
          <div className="pt-6 space-y-4 w-full">
            <Button 
              className="w-full" 
              onClick={handleRetry}
            >
              Try Again
            </Button>
            
            <Button 
              variant="outline" 
              className="w-full" 
              onClick={() => navigate("/")}
            >
              Return to Home
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentFailure;