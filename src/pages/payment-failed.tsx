import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

export default function PaymentFailed() {
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Show failure message
    toast({
      title: "Payment Failed",
      description: "Your payment could not be processed. Please try again.",
      variant: "destructive",
    });
  }, [toast]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background">
      <div className="w-full max-w-md space-y-8 rounded-lg border bg-card p-8 shadow-sm">
        <div className="flex flex-col items-center text-center">
          <div className="mb-4 rounded-full bg-red-100 p-3">
            <svg
              className="h-8 w-8 text-red-600"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="15" y1="9" x2="9" y2="15"></line>
              <line x1="9" y1="9" x2="15" y2="15"></line>
            </svg>
          </div>
          <h2 className="text-2xl font-bold">Payment Failed</h2>
          <p className="mt-2 text-muted-foreground">
            We couldn't process your payment. This could be due to insufficient funds, 
            network issues, or other payment-related problems.
          </p>
          <div className="mt-6 flex space-x-4">
            <Button
              variant="outline"
              onClick={() => navigate("/")}
            >
              Return to Dashboard
            </Button>
            <Button
              onClick={() => navigate("/#plans")}
            >
              Try Again
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
