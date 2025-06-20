// Razorpay helper utility

// Add Razorpay type declaration
declare global {
  interface Window {
    Razorpay: any;
  }
}

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  notes?: Record<string, string>;
  theme?: {
    color?: string;
  };
  handler?: (response: any) => void;
  modal?: {
    ondismiss?: () => void;
  };
}

interface ToastOptions {
  title: string;
  description: string;
  variant?: "default" | "destructive";
}

type ToastFunction = (options: ToastOptions) => void;

/**
 * Initialize and open Razorpay checkout directly
 */
export const openRazorpayCheckout = (
  amount: string,
  buttonId: string,
  onSuccess: (paymentId: string) => void,
  onCancel: () => void,
  setLoading: (loading: boolean) => void,
  toast: ToastFunction
) => {
  try {
    if (!window.Razorpay) {
      toast({
        title: "Error",
        description: "Payment gateway is not loaded. Please try again.",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }
    
    // For testing purposes, we're using fixed values
    // In production, these would come from your server
    const amountInPaise = parseInt(amount) * 100;
    
    const options: RazorpayOptions = {
      key: 'rzp_test_JRHMMBSNWq0kef', // Your test key ID
      amount: amountInPaise,
      currency: "INR",
      name: "Greecode",
      description: `Interview Passkey - ₹${amount}`,
      handler: function (response: any) {
        console.log('Payment success:', response);
        setLoading(false);
        if (response.razorpay_payment_id) {
          // Generate passkey directly after payment
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
          setLoading(false);
          onCancel();
        }
      }
    };
    
    const razorpay = new window.Razorpay(options);
    razorpay.on('payment.failed', function (response: any) {
      console.error('Payment failed:', response.error);
      setLoading(false);
      toast({
        title: "Payment Failed",
        description: response.error.description || "Your payment was not successful. Please try again.",
        variant: "destructive",
      });
    });
    
    razorpay.open();
  } catch (error) {
    console.error('Error opening Razorpay:', error);
    setLoading(false);
    toast({
      title: "Error",
      description: "Failed to initialize payment. Please try again.",
      variant: "destructive",
    });
  }
};