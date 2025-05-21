import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { auth, db } from "@/integrations/firebase/client";
import { doc, updateDoc } from "firebase/firestore";

export default function PaymentSuccess() {
  const { toast } = useToast();

  useEffect(() => {
    // Add event listener for navigation completion
    const handleNavigationComplete = () => {
      // Refresh the page to show updated plan
      window.location.reload();
    };

    const updateUserPlan = async () => {
      try {
        const user = auth.currentUser;
        if (!user) {
          throw new Error("User not authenticated");
        }

        // Update user's plan in Firestore
        const userDocRef = doc(db, "profiles", user.uid);
        await updateDoc(userDocRef, {
          subscription: {
            plan: "genz",
            startDate: new Date().toISOString(),
            endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
            status: "active",
          },
          lastUpdated: new Date().toISOString(),
        });

        // Show success message
        toast({
          title: "Payment Successful!",
          description: "You have successfully upgraded to the Genz plan.",
        });

        // Redirect to main app
        setTimeout(() => {
          window.location.href = "/";
        }, 2000);
      } catch (error) {
        console.error("Error updating user plan:", error);
        toast({
          title: "Error",
          description: "There was an error updating your subscription. Please contact support.",
          variant: "destructive",
        });
      }
    };

    updateUserPlan();
  }, [router, toast]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background">
      <div className="w-full max-w-md space-y-8 rounded-lg border bg-card p-8 shadow-sm">
        <div className="flex flex-col items-center text-center">
          <div className="mb-4 rounded-full bg-green-100 p-3">
            <svg
              className="h-8 w-8 text-green-600"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
          </div>
          <h2 className="text-2xl font-bold">Payment Successful!</h2>
          <p className="mt-2 text-muted-foreground">
            Your payment has been processed successfully. You are now subscribed to the Genz plan.
          </p>
          <div className="mt-6 h-2 w-full overflow-hidden rounded-full bg-secondary">
            <div className="h-full w-full origin-left animate-pulse rounded-full bg-primary"></div>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">Redirecting you to the dashboard...</p>
        </div>
      </div>
    </div>
  );
}
