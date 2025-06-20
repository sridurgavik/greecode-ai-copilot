import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Home } from "lucide-react";

const NotFoundPage = () => {
  return (
    <div className="container max-w-6xl mx-auto px-4 py-16 flex flex-col items-center justify-center min-h-[70vh] text-center">
      <h1 className="text-4xl md:text-6xl font-bold text-primary mb-4">404</h1>
      <h2 className="text-2xl md:text-3xl font-semibold mb-6">Page Not Found</h2>
      
      <p className="text-muted-foreground max-w-md mb-8">
        The page you're looking for doesn't exist or has been moved. 
        Let's get you back on track to ace your technical interviews.
      </p>
      
      <div className="flex flex-col sm:flex-row gap-4">
        <Button 
          variant="default" 
          onClick={() => window.history.back()}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Go Back
        </Button>
        
        <Button 
          variant="outline" 
          asChild
        >
          <Link to="/" className="flex items-center gap-2">
            <Home className="h-4 w-4" />
            Return Home
          </Link>
        </Button>
      </div>
      
      <div className="mt-12 border-t pt-8 w-full max-w-md">
        <h3 className="text-lg font-medium mb-4">Looking for something specific?</h3>
        <ul className="grid grid-cols-2 gap-3 text-sm">
          <li>
            <Link to="/" className="text-primary hover:underline">Home</Link>
          </li>
          <li>
            <Link to="/pricing" className="text-primary hover:underline">Pricing</Link>
          </li>
          <li>
            <Link to="/features" className="text-primary hover:underline">Features</Link>
          </li>
          <li>
            <Link to="/login" className="text-primary hover:underline">Login</Link>
          </li>
          <li>
            <Link to="/register" className="text-primary hover:underline">Register</Link>
          </li>
          <li>
            <Link to="/contact" className="text-primary hover:underline">Contact Us</Link>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default NotFoundPage;