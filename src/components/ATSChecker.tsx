import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Check, Zap } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import ATSUserProfile from './ATSUserProfile';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { auth, db } from '@/integrations/firebase/client';
import { doc, getDoc } from 'firebase/firestore';

// Component for file upload
const FileUpload = ({ onFileUpload }: { onFileUpload: (file: File) => void }) => {
  const [isDragging, setIsDragging] = useState(false);
  
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  
  const handleDragLeave = () => {
    setIsDragging(false);
  };
  
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type === 'application/pdf' || 
          file.type === 'application/msword' || 
          file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        onFileUpload(file);
      } else {
        toast({
          title: "Invalid file type",
          description: "Please upload a PDF or Word document (.pdf, .doc, .docx)",
          variant: "destructive",
        });
      }
    }
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (file.type === 'application/pdf' || 
          file.type === 'application/msword' || 
          file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        onFileUpload(file);
      } else {
        toast({
          title: "Invalid file type",
          description: "Please upload a PDF or Word document (.pdf, .doc, .docx)",
          variant: "destructive",
        });
      }
    }
  };
  
  return (
    <div 
      className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
        isDragging ? 'border-primary bg-primary/10' : 'border-border'
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="flex flex-col items-center justify-center space-y-4">
        <div className="rounded-full bg-primary/10 p-3">
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
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
        </div>
        
        <div>
          <h3 className="text-lg font-medium">Upload your resume</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Drag and drop or click to upload
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Supported formats: PDF, DOC, DOCX
          </p>
        </div>
        
        <Button
          variant="outline"
          className="relative"
          onClick={() => document.getElementById('file-upload')?.click()}
        >
          Select File
          <input
            id="file-upload"
            type="file"
            className="sr-only"
            accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={handleFileChange}
          />
        </Button>
      </div>
    </div>
  );
};

// Get score color function
const getScoreColor = (score: number) => {
  if (score >= 90) return "text-green-500";
  if (score >= 80) return "text-emerald-500";
  if (score >= 70) return "text-yellow-500";
  return "text-red-500";
};

// Get progress color function
const getProgressColor = (score: number) => {
  if (score >= 90) return "bg-green-500";
  if (score >= 80) return "bg-emerald-500";
  if (score >= 70) return "bg-yellow-500";
  return "bg-red-500";
};

// Main ATS Checker component
const ATSChecker = () => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [remainingScans, setRemainingScans] = useState(1);
  const [userData, setUserData] = useState<any>(null);
  const [score] = useState(Math.floor(Math.random() * 31) + 70); // Random score between 70-100
  const user = auth.currentUser;
  
  // Mock ATS feedback
  const feedback = [
    {
      category: "Format & Structure",
      score: Math.floor(Math.random() * 11) + 90,
      feedback: "Your resume has a clean, ATS-friendly format. The section headers are clear and the overall structure is well-organized."
    },
    {
      category: "Keywords & Skills",
      score: Math.floor(Math.random() * 21) + 70,
      feedback: "Good use of industry-specific keywords. Consider adding more technical skills relevant to the positions you're applying for."
    },
    {
      category: "Experience Description",
      score: Math.floor(Math.random() * 16) + 75,
      feedback: "Your experience descriptions use strong action verbs, but could benefit from more quantifiable achievements and metrics."
    },
    {
      category: "Education & Certifications",
      score: Math.floor(Math.random() * 11) + 85,
      feedback: "Education section is well-formatted. Consider adding relevant certifications if applicable to your field."
    }
  ];
  
  // Fetch user data from Firestore
  useEffect(() => {
    const fetchUserData = async () => {
      if (user) {
        try {
          const userDocRef = doc(db, 'users', user.uid);
          const userDoc = await getDoc(userDocRef);
          
          if (userDoc.exists()) {
            setUserData(userDoc.data());
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
        }
      }
    };
    
    fetchUserData();
  }, [user]);
  
  const handleFileUpload = (file: File) => {
    if (remainingScans <= 0) {
      toast({
        title: "Daily limit reached",
        description: "You can only upload one resume per day. Come back tomorrow.",
        variant: "destructive",
      });
      return;
    }

    setUploadedFileName(file.name);
    setRemainingScans(remainingScans - 1);
    setIsLoading(true);
    
    // Simulate loading and then flip to results
    setTimeout(() => {
      setIsLoading(false);
      setIsFlipped(true);
    }, 2000);
  };

  const handleReset = () => {
    setIsFlipped(false);
    setUploadedFileName('');
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8">
      {/* Header Section with Logo and User Profile */}
      <div className="flex justify-between items-center mb-8 pb-4 border-b">
        <div className="flex items-center gap-2">
          <Zap className="h-6 w-6" />
          <div className="flex flex-col">
            <h2 className="text-xl font-semibold leading-none">GreecodeATS</h2>
            <span className="text-xs text-muted-foreground">by greecode.in</span>
          </div>
        </div>
        
        <div>
          <ATSUserProfile userName={user?.displayName || userData?.name} />
        </div>
      </div>
      
      {/* Flip Card Container */}
      <div className="perspective-1000 relative w-full max-w-4xl mx-auto">
        {/* Front Side - Upload UI */}
        <div 
          className={`w-full transition-all duration-700 ${isFlipped ? 'opacity-0 absolute inset-0 rotate-y-180 pointer-events-none' : 'opacity-100 rotate-y-0'}`}
        >
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-4xl mx-auto"
          >
            <h1 className="text-3xl font-bold tracking-tight mb-6">
              Free ATS Resume Checker
            </h1>
            
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-lg text-muted-foreground mb-8"
            >
              Analyze your resume for ATS compatibility and get instant feedback.
            </motion.p>

            {/* Loading State */}
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="h-12 w-12 rounded-full border-4 border-primary/30 border-t-primary animate-spin mb-4"></div>
                <h3 className="text-lg font-medium">Analyzing your resume...</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  This will just take a moment
                </p>
              </div>
            ) : (
              <>
                {/* Upload Section */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.4 }}
                  className="max-w-2xl mx-auto"
                >
                  <FileUpload onFileUpload={handleFileUpload} />
                </motion.div>

                {/* Features */}
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.6 }}
                  className="mt-16 max-w-4xl mx-auto"
                >
                  <div className="grid md:grid-cols-3 gap-8 text-center">
                    <div className="space-y-4">
                      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto">
                        <span className="text-2xl">⚡</span>
                      </div>
                      <h3 className="text-lg font-semibold">Instant Analysis</h3>
                      <p className="text-sm text-muted-foreground">
                        Get your ATS score and detailed feedback in seconds
                      </p>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto">
                        <span className="text-2xl">🎯</span>
                      </div>
                      <h3 className="text-lg font-semibold">Smart Recommendations</h3>
                      <p className="text-sm text-muted-foreground">
                        Actionable suggestions to improve your resume's ATS compatibility
                      </p>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto">
                        <span className="text-2xl">🔒</span>
                      </div>
                      <h3 className="text-lg font-semibold">Privacy First</h3>
                      <p className="text-sm text-muted-foreground">
                        Your resume is never stored. Analysis happens locally and securely
                      </p>
                    </div>
                  </div>
                </motion.div>
              </>
            )}
          </motion.div>
        </div>

        {/* Back Side - Results UI */}
        <div 
          className={`w-full transition-all duration-700 ${isFlipped ? 'opacity-100 rotate-y-0' : 'opacity-0 absolute inset-0 rotate-y-180 pointer-events-none'}`}
        >
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold">ATS Compatibility Report</h2>
              <p className="text-muted-foreground mt-1">{uploadedFileName}</p>
            </div>
            
            <div className="flex flex-col items-center justify-center py-4 border rounded-lg">
              <div className="text-5xl font-bold mb-2 relative">
                <span className={getScoreColor(score)}>{score}</span>
                <span className="text-2xl absolute top-0">/100</span>
              </div>
              <p className="text-lg font-medium">Overall ATS Score</p>
            </div>
            
            <div className="space-y-6">
              <h3 className="text-xl font-semibold">Detailed Analysis</h3>
              
              {feedback.map((item, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <h4 className="font-medium">{item.category}</h4>
                    <span className={`font-semibold ${getScoreColor(item.score)}`}>{item.score}/100</span>
                  </div>
                  <Progress value={item.score} className={getProgressColor(item.score)} />
                  <p className="text-sm text-muted-foreground">{item.feedback}</p>
                </div>
              ))}
            </div>
            
            <div className="space-y-2 border-t pt-4">
              <h3 className="text-xl font-semibold">Recommendations</h3>
              <ul className="space-y-2">
                <li className="flex items-start">
                  <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                  <span>Use a clean, single-column format for better ATS parsing</span>
                </li>
                <li className="flex items-start">
                  <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                  <span>Include keywords from the job description in your skills and experience sections</span>
                </li>
                <li className="flex items-start">
                  <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                  <span>Quantify achievements with specific metrics and numbers</span>
                </li>
                <li className="flex items-start">
                  <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                  <span>Use standard section headings like "Experience," "Education," and "Skills"</span>
                </li>
              </ul>
            </div>
            
            <div className="flex justify-end">
              <Button onClick={handleReset}>Check Another Resume</Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ATSChecker;