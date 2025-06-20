import React, { useEffect, useRef, useState } from 'react';

interface RazorpayButtonProps {
  buttonId: string;
  onSuccess?: (paymentId: string) => void;
}

const RazorpayButton: React.FC<RazorpayButtonProps> = ({ buttonId, onSuccess }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    // Reset error state when button ID changes
    setError('');
    console.log('RazorpayButton: Button ID changed to:', buttonId);
    
    // Function to handle payment success messages
    const handlePaymentSuccess = (event: MessageEvent) => {
      if (event.data && event.data.razorpay_payment_id) {
        console.log('Payment success detected:', event.data.razorpay_payment_id);
        onSuccess && onSuccess(event.data.razorpay_payment_id);
      }
    };

    // Add event listener for payment success
    window.addEventListener('message', handlePaymentSuccess);

    // Validate button ID
    if (!buttonId || buttonId.trim() === '') {
      console.error('RazorpayButton: Invalid or empty button ID');
      setError('Invalid payment button ID');
      return;
    }

    // Create script element
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/payment-button.js';
    script.dataset.payment_button_id = buttonId;
    script.async = true;
    
    console.log('Creating Razorpay script with button ID:', buttonId);
    
    // Handle script errors
    script.onerror = (e) => {
      console.error('Razorpay script load error:', e);
      setError('Failed to load Razorpay payment button');
    };
    
    // Add load event listener
    script.onload = () => {
      console.log('Razorpay script loaded successfully for button ID:', buttonId);
    };

    // Add script to container
    if (containerRef.current) {
      const form = document.createElement('form');
      form.appendChild(script);
      containerRef.current.innerHTML = '';
      containerRef.current.appendChild(form);
    }

    // Check URL parameters on mount for direct success handling
    const checkUrlForPaymentSuccess = () => {
      const queryParams = new URLSearchParams(window.location.search);
      const razorpayPaymentId = queryParams.get('razorpay_payment_id');
      
      if (razorpayPaymentId) {
        console.log('Payment ID found in URL:', razorpayPaymentId);
        onSuccess && onSuccess(razorpayPaymentId);
      }
    };
    
    // Run the check once on mount
    checkUrlForPaymentSuccess();

    return () => {
      // Cleanup
      window.removeEventListener('message', handlePaymentSuccess);
    };
  }, [buttonId, onSuccess]);

  return (
    <div className="razorpay-wrapper">
      {error ? (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-600 text-sm">{error}</p>
          <p className="text-xs mt-2 text-gray-600">
            Please check your payment button ID and try again. Button ID: {buttonId || 'Not provided'}
          </p>
        </div>
      ) : (
        <div ref={containerRef} className="razorpay-container"></div>
      )}
    </div>
  );
};

export default RazorpayButton;