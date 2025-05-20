
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from "@/components/theme-toggle";
import { auth, db } from "@/integrations/firebase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail,
  updateProfile,
  sendEmailVerification
} from "firebase/auth";
import { collection, doc, getDoc, getDocs, query, setDoc, where } from "firebase/firestore";

interface AuthPageProps {
  onLoginSuccess: () => void;
}

const AuthPage = ({ onLoginSuccess }: AuthPageProps) => {
  const [isLogin, setIsLogin] = useState<boolean>(true);
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [name, setName] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showForgotPassword, setShowForgotPassword] = useState<boolean>(false);
  const [showVerificationUI, setShowVerificationUI] = useState<boolean>(false);
  const [showWelcomeDialog, setShowWelcomeDialog] = useState<boolean>(false);
  const [verificationEmail, setVerificationEmail] = useState<string>("");
  const { toast } = useToast();

  // Check if user is already logged in
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        // Store session info in chrome storage if extension environment
        if (typeof chrome !== 'undefined' && chrome.storage) {
          try {
            chrome.storage.local.set({
              session: {
                user: {
                  id: user.uid,
                  email: user.email,
                  displayName: user.displayName,
                },
                timestamp: Date.now(),
              },
            });
          } catch (storageError) {
            console.error("Failed to store session in chrome storage:", storageError);
          }
        }
        
        // User is signed in
        onLoginSuccess();
      }
    });
    
    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, [onLoginSuccess]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      if (isLogin) {
        // ===== LOGIN FLOW =====
        try {
          const userCredential = await signInWithEmailAndPassword(auth, email, password);
          const user = userCredential.user;
          
          // Check if email is verified
          if (!user.emailVerified) {
            // Email not verified - send verification email again
            await sendEmailVerification(user);
            await auth.signOut();
            
            // Show verification UI with the current email
            setVerificationEmail(email);
            setShowVerificationUI(true);
            
            toast({
              title: "Email Not Verified",
              description: "We've sent a new verification link to your email. Please verify to continue.",
              duration: 6000,
            });
            
            setEmail("");
            setPassword("");
            return;
          }
          
          // Email is verified - update profile
          const profileRef = doc(db, "profiles", user.uid);
          const profileSnap = await getDoc(profileRef);
          
          if (!profileSnap.exists()) {
            // Profile doesn't exist yet (rare case) - create it
            await setDoc(profileRef, {
              display_name: user.displayName || email.split('@')[0],
              email: email,
              created_at: new Date().toISOString(),
              last_login: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              email_verified: true,
              login_count: 1
            });
            
            console.log("Created new profile in Firestore for verified user:", user.uid);
          } else {
            // Profile exists - update it to mark as verified
            await setDoc(profileRef, {
              email_verified: true,
              last_login: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              login_count: 1 // First verified login
            }, { merge: true });
            
            console.log("Updated existing profile as verified for:", user.uid);
          }
          
          // Show welcome animation for new users
          setShowWelcomeDialog(true);
          
          // After animation, go to main app
          setTimeout(() => {
            setShowWelcomeDialog(false);
            onLoginSuccess();
          }, 3000);
          
          // Success toast
          toast({
            title: "Welcome Back",
            description: "Login successful!",
          });
          
          // Reset form
          setEmail("");
          setPassword("");
          
        } catch (loginError) {
          // Handle login errors
          if (loginError.code === 'auth/invalid-credential') {
            toast({
              title: "Invalid Credentials",
              description: "Please check your email and password.",
              variant: "destructive",
            });
          } else if (loginError.code === 'auth/user-not-found') {
            toast({
              title: "User Not Found",
              description: "No account exists with this email.",
              variant: "destructive",
            });
          } else {
            console.error("Login error:", loginError);
            toast({
              title: "Login Failed",
              description: loginError.message || "An error occurred during login.",
              variant: "destructive",
            });
          }
        }
      } else {
        // ===== SIGNUP FLOW =====
        // Validate password match
        if (password !== confirmPassword) {
          toast({
            title: "Passwords Don't Match",
            description: "Please make sure your passwords match.",
            variant: "destructive",
          });
          setIsLoading(false);
          return;
        }
        
        try {
          // Create the authentication account
          const userCredential = await createUserWithEmailAndPassword(auth, email, password);
          const user = userCredential.user;
          
          // Set display name
          await updateProfile(user, {
            displayName: name || email.split('@')[0]
          });
          
          // Create initial Firestore profile
          // We'll mark it as email_verified: false until verification is complete
          await setDoc(doc(db, "profiles", user.uid), {
            display_name: name || email.split('@')[0],
            email: email,
            created_at: new Date().toISOString(),
            last_login: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            email_verified: false,
            login_count: 0 // Will be incremented on first verified login
          });
          
          console.log("Created initial profile in Firestore for:", user.uid);
          
          // Send verification email
          await sendEmailVerification(user);
          
          // Store email for verification UI
          setVerificationEmail(email);
          
          // Sign out - user must verify email before proceeding
          await auth.signOut();
          
          // Show verification UI
          setShowVerificationUI(true);
          
          // Reset form fields
          setPassword("");
          setConfirmPassword("");
          setName("");
          setEmail("");
          
        } catch (signupError) {
          if (signupError.code === 'auth/email-already-in-use') {
            toast({
              title: "Email Already in Use",
              description: "An account with this email already exists. Please log in instead.",
              variant: "destructive",
            });
            setIsLogin(true);
          } else {
            console.error("Signup error:", signupError);
            toast({
              title: "Signup Failed",
              description: signupError.message || "An error occurred during signup.",
              variant: "destructive",
            });
          }
        }
      }
    } catch (error) {
      console.error("Auth error:", error);
      toast({
        title: "Authentication Error",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      await sendPasswordResetEmail(auth, email);
      
      toast({
        title: "Password Reset Email Sent",
        description: "Please check your email for instructions to reset your password.",
      });
      
      setShowForgotPassword(false);
    } catch (error) {
      console.error("Password reset error:", error);
      toast({
        title: "Password Reset Error",
        description: error instanceof Error ? error.message : "Failed to send password reset email. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      // For Firebase v9+, we need to import the additionalUserInfo function
      // Since we don't have this import, we'll always save user data to ensure it exists
      
      // Always save user data to Firestore to ensure it exists
      await setDoc(doc(db, "profiles", user.uid), {
        display_name: user.displayName,
        email: user.email,
        created_at: new Date().toISOString(),
        last_login: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, { merge: true }); // Use merge to avoid overwriting existing data
      
      // Store session info in chrome storage if extension environment
      if (typeof chrome !== 'undefined' && chrome.storage) {
        try {
          await chrome.storage.local.set({
            session: {
              user: {
                id: user.uid,
                email: user.email,
                displayName: user.displayName,
              },
              timestamp: Date.now(),
            },
          });
        } catch (storageError) {
          console.error("Failed to store session in chrome storage:", storageError);
        }
      }
      
      toast({
        title: "Google Authentication Successful",
        description: "You have been signed in with Google.",
      });
      
      onLoginSuccess();
    } catch (error) {
      console.error("Google auth error:", error);
      toast({
        title: "Authentication Error",
        description: error instanceof Error ? error.message : "Failed to authenticate with Google. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle verification resend
  const handleResendVerification = async () => {
    // Switch to login view with email pre-filled
    setShowVerificationUI(false);
    setIsLogin(true);
    setEmail(verificationEmail);
    
    toast({
      title: "Sign In to Resend",
      description: "Please sign in to resend the verification email.",
    });
  };

  // Handle checking verification status
  const handleCheckVerification = async () => {
    // Switch to login view with email pre-filled
    setShowVerificationUI(false);
    setIsLogin(true);
    setEmail(verificationEmail);
    
    toast({
      title: "Sign In to Continue",
      description: "Please sign in with your password to complete verification.",
    });
  };

  // Handle back to login
  const handleBackToLogin = () => {
    setShowVerificationUI(false);
    setIsLogin(true);
  };

return (
  <div className="flex min-h-screen flex-col items-center justify-center p-4">
    <div className="absolute right-4 top-4">
      <ThemeToggle />
    </div>
    
    {/* Welcome dialog for new users */}
    <Dialog open={showWelcomeDialog} onOpenChange={setShowWelcomeDialog}>
      <DialogContent className="sm:max-w-md">
        <div className="flex flex-col items-center space-y-4 text-center py-4">
          <div className="rounded-full bg-primary/20 p-4">
            <svg
              className="h-12 w-12 text-primary animate-pulse"
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
          </div>
          <DialogTitle className="text-2xl">Welcome to Greecode!</DialogTitle>
          <DialogDescription>
            We're excited to have you on board. Preparing your experience...
          </DialogDescription>
          <div className="w-16 h-1 bg-primary/50 rounded-full mt-2 animate-pulse"></div>
        </div>
      </DialogContent>
    </Dialog>
    
    {
      showVerificationUI ? (
        <div className="w-full max-w-md space-y-6">
          <div className="flex flex-col items-center space-y-2 text-center">
            <div className="rounded-full bg-primary/20 p-2">
              <svg
                className="h-8 w-8 text-primary"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                <path d="M6 12v5c3 3 9 3 12 0v-5" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold">Verify Your Email</h1>
            <p className="text-muted-foreground">
              We've sent a verification link to <strong>{verificationEmail}</strong>.
              Please check your inbox and click the link to verify your account.
            </p>
          </div>
          
          <div className="space-y-4">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Verification Options
                </span>
              </div>
            </div>
            
            <div className="space-y-2">
              <Button
                className="w-full"
                onClick={handleCheckVerification}
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-white"></div>
                ) : (
                  "I've Verified My Email"
                )}
              </Button>
              
              <Button
                variant="outline"
                className="w-full"
                onClick={handleResendVerification}
                disabled={isLoading}
              >
                Resend Verification Email
              </Button>
              
              <Button
                variant="link"
                className="w-full"
                onClick={handleBackToLogin}
                disabled={isLoading}
              >
                Back to Login
              </Button>
            </div>
          </div>
        </div>
      ) : showWelcomeDialog ? (
        <div className="w-full max-w-md space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-1000">
          <div className="flex flex-col items-center space-y-4 text-center">
            <div className="rounded-full bg-primary/20 p-4">
              <svg
                className="h-12 w-12 text-primary animate-pulse"
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
            </div>
            <h1 className="text-3xl font-bold animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">Welcome to Greecode!</h1>
            <p className="text-muted-foreground animate-in fade-in slide-in-from-bottom-4 duration-700 delay-500">
              We're excited to have you on board. Preparing your experience...
            </p>
            <div className="w-16 h-1 bg-primary/50 rounded-full mt-4 animate-pulse"></div>
          </div>
        </div>
      ) : (
        <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center space-y-2 text-center">
          <div className="rounded-full bg-primary/20 p-2">
            <svg
              className="h-8 w-8 text-primary"
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
          </div>
          <h1 className="text-2xl font-bold">Welcome to Greecode</h1>
          <p className="text-muted-foreground">
            {isLogin
              ? "Sign in to your account to continue"
              : "Create a new account to get started"}
          </p>
        </div>

        <div className="space-y-4">
          <Button
            variant="outline"
            className="w-full"
            onClick={handleGoogleLogin}
            disabled={isLoading}
          >
            <svg
              className="mr-2 h-4 w-4"
              aria-hidden="true"
              focusable="false"
              data-prefix="fab"
              data-icon="google"
              role="img"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 488 512"
            >
              <path
                fill="currentColor"
                d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"
              ></path>
            </svg>
            Continue with Google
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or continue with email
              </span>
            </div>
          </div>

          {false ? (
            <div className="space-y-6">
              <div className="flex flex-col items-center space-y-2 text-center">
                <div className="rounded-full bg-primary/20 p-2">
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
                    <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                    <path d="M6 12v5c3 3 9 3 12 0v-5" />
                  </svg>
                </div>
                <h1 className="text-2xl font-bold">Verify Your Email</h1>
                <p className="text-muted-foreground">
                  We've sent a verification link to <strong>{verificationEmail}</strong>.
                  Please check your inbox and click the link to verify your account.
                </p>
              </div>
              
              <div className="space-y-4">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border"></div>
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                      Verification Options
                    </span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Button
                    className="w-full"
                    onClick={handleCheckVerification}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-white"></div>
                    ) : (
                      "I've Verified My Email"
                    )}
                  </Button>
                  
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={handleResendVerification}
                    disabled={isLoading}
                  >
                    Resend Verification Email
                  </Button>
                  
                  <Button
                    variant="link"
                    className="w-full"
                    onClick={handleBackToLogin}
                    disabled={isLoading}
                  >
                    Back to Login
                  </Button>
                </div>
              </div>
            </div>
          ) : showForgotPassword ? (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              
              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-white"></div>
                ) : (
                  "Send Reset Link"
                )}
              </Button>
              
              <Button
                variant="link"
                className="w-full"
                onClick={() => setShowForgotPassword(false)}
                disabled={isLoading}
              >
                Back to Login
              </Button>
            </form>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="Your Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              
              {!isLogin && (
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
              )}
              
              {isLogin && (
                <Button
                  variant="link"
                  className="p-0 text-primary w-full text-right"
                  onClick={(e) => {
                    e.preventDefault();
                    setShowForgotPassword(true);
                  }}
                  disabled={isLoading}
                >
                  Forgot Password?
                </Button>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-white"></div>
                ) : isLogin ? (
                  "Sign In"
                ) : (
                  "Sign Up"
                )}
              </Button>
            </form>
          )}
        </div>

        <div className="text-center text-sm">
          {isLogin ? (
            <p>
              Don't have an account?{" "}
              <Button
                variant="link"
                className="p-0 text-primary"
                onClick={() => setIsLogin(false)}
                disabled={isLoading}
              >
                Sign Up
              </Button>
            </p>
          ) : (
            <p>
              Already have an account?{" "}
              <Button
                variant="link"
                className="p-0 text-primary"
                onClick={() => setIsLogin(true)}
                disabled={isLoading}
              >
                Sign In
              </Button>
            </p>
          )}
        </div>
      </div>
      )}
    </div>
  );
};

export default AuthPage;
