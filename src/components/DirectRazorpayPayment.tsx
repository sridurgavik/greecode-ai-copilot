import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface DirectRazorpayPaymentProps {
  amount: string;
  buttonId: string;
  onSuccess: (paymentId: string) => void;
  onCancel: () => void;
}

declare global {
  interface Window {
    Razorpay: any;
  }
}

const DirectRazorpayPayment: React.FC<DirectRazorpayPaymentProps> = ({
  amount,
  buttonId,
  onSuccess,
  onCancel
}) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  
  useEffect(() => {
    // Load Razorpay script
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);
    
    return () => {
      // Cleanup
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);
  
  const openRazorpayCheckout = () => {
    try {
      setIsLoading(true);
      
      if (!window.Razorpay) {
        toast({
          title: "Error",
          description: "Payment gateway is not loaded. Please try again.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }
      
      // For testing purposes, we're using fixed values
      // In production, these would come from your server
      const amountInPaise = parseInt(amount) * 100;
      
      const options = {
        key: 'rzp_test_JRHMMBSNWq0kef', // Your test key ID
        amount: amountInPaise,
        currency: "INR",
        name: "Greecode",
        description: `Interview Passkey - ₹${amount}`,
        // We're skipping order_id for testing as it requires server-side creation
        handler: function (response: any) {
          console.log('Payment success:', response);
          setIsLoading(false);
          if (response.razorpay_payment_id) {
            onSuccess(response.razorpay_payment_id);
          }
        },
        prefill: {
          name: "Test User",
          email: "test@example.com",
          contact: "9999999999"
        },
        notes: {
          buttonId: buttonId
        },
        theme: {
          color: "#3B82F6"
        },
        modal: {
          ondismiss: function() {
            setIsLoading(false);
            onCancel();
          }
        }
      };
      
      const razorpay = new window.Razorpay(options);
      razorpay.on('payment.failed', function (response: any) {
        console.error('Payment failed:', response.error);
        setIsLoading(false);
        toast({
          title: "Payment Failed",
          description: response.error.description || "Your payment was not successful. Please try again.",
          variant: "destructive",
        });
      });
      
      razorpay.open();
    } catch (error) {
      console.error('Error opening Razorpay:', error);
      setIsLoading(false);
      toast({
        title: "Error",
        description: "Failed to initialize payment. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  return (
    <Button 
      onClick={openRazorpayCheckout}
      className="w-full"
      disabled={isLoading}
    >
      {isLoading ? "Processing..." : `Pay Now - ₹${amount}`}
    </Button>
  );
};

export default DirectRazorpayPayment;