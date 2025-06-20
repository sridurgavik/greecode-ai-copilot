import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { CalendarIcon, ArrowLeft, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { auth, db } from "@/integrations/firebase/client";
import { collection, query, where, getDocs, doc, updateDoc, getDoc } from "firebase/firestore";

interface Interview {
  id: string;
  passkey: string;
  company: string;
  job_role: string;
  interview_date: string;
  interview_time: string;
  is_used: boolean;
  created_at: any;
}

export default function RescheduleInterview() {
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInterview, setSelectedInterview] = useState<Interview | null>(null);
  const [newDate, setNewDate] = useState<Date | undefined>();
  const [newTime, setNewTime] = useState<string>("");
  const [isRescheduling, setIsRescheduling] = useState(false);
  const { toast } = useToast();

  // Fetch user's interviews
  useEffect(() => {
    const fetchInterviews = async () => {
      try {
        const user = auth.currentUser;
        if (!user) return;

        const interviewsRef = collection(db, "interviews");
        const q = query(interviewsRef, where("user_id", "==", user.uid));
        const querySnapshot = await getDocs(q);
        
        const interviewData: Interview[] = [];
        querySnapshot.forEach((doc) => {
          interviewData.push({
            id: doc.id,
            ...doc.data()
          } as Interview);
        });
        
        // Sort by date (newest first)
        interviewData.sort((a, b) => {
          return new Date(b.created_at.toDate()).getTime() - new Date(a.created_at.toDate()).getTime();
        });
        
        setInterviews(interviewData);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching interviews:", error);
        setLoading(false);
      }
    };
    
    fetchInterviews();
  }, []);

  const handleReschedule = (interview: Interview) => {
    setSelectedInterview(interview);
    // Set initial values from the interview
    if (interview.interview_date) {
      setNewDate(new Date(interview.interview_date));
    }
    setNewTime(interview.interview_time || "");
  };

  const handleSaveReschedule = async () => {
    if (!selectedInterview || !newDate || !newTime) {
      toast({
        title: "Error",
        description: "Please select a new date and time.",
        variant: "destructive",
      });
      return;
    }

    setIsRescheduling(true);
    
    try {
      const interviewRef = doc(db, "interviews", selectedInterview.id);
      
      await updateDoc(interviewRef, {
        interview_date: format(newDate, "yyyy-MM-dd"),
        interview_time: newTime,
      });
      
      // Update local state
      setInterviews(interviews.map(interview => {
        if (interview.id === selectedInterview.id) {
          return {
            ...interview,
            interview_date: format(newDate, "yyyy-MM-dd"),
            interview_time: newTime,
          };
        }
        return interview;
      }));
      
      setSelectedInterview(null);
      setNewDate(undefined);
      setNewTime("");
      
      toast({
        title: "Interview Rescheduled",
        description: "Your interview has been successfully rescheduled.",
      });
    } catch (error) {
      console.error("Error rescheduling interview:", error);
      toast({
        title: "Error",
        description: "Failed to reschedule interview. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsRescheduling(false);
    }
  };

  const handleCancel = () => {
    setSelectedInterview(null);
    setNewDate(undefined);
    setNewTime("");
  };

  return (
    <div className="container py-6">
      <div className="mb-6">
        <Button 
          variant="ghost" 
          onClick={() => window.history.back()}
          className="flex items-center gap-1"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Dashboard</span>
        </Button>
      </div>
      
      <h1 className="text-3xl font-bold mb-6">Reschedule Interview</h1>
      
      {selectedInterview ? (
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle>Reschedule Interview</CardTitle>
            <CardDescription>
              Update the date and time for your interview with {selectedInterview.company}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{selectedInterview.company}</p>
                  <p className="text-sm text-muted-foreground">{selectedInterview.job_role}</p>
                </div>
                <div className="bg-primary/10 px-3 py-1 rounded-full text-primary text-sm">
                  {selectedInterview.passkey}
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Current Schedule</label>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CalendarIcon className="h-4 w-4" />
                <span>
                  {selectedInterview.interview_date ? format(new Date(selectedInterview.interview_date), "PPP") : "Not set"}
                </span>
                <Clock className="h-4 w-4 ml-2" />
                <span>{selectedInterview.interview_time || "Not set"}</span>
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">New Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !newDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {newDate ? format(newDate, "PPP") : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={newDate}
                    onSelect={setNewDate}
                    disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">New Time</label>
              <div className="flex gap-2 h-10">
                <div className="w-1/3">
                  <select 
                    className="h-full w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    value={newTime.split(':')[0] || '12'}
                    onChange={(e) => {
                      const hour = e.target.value;
                      const minute = newTime.split(':')[1] || '00';
                      const ampm = newTime.includes('PM') ? 'PM' : 'AM';
                      setNewTime(`${hour}:${minute} ${ampm}`);
                    }}
                  >
                    <option value="" disabled>Hour</option>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(hour => (
                      <option key={hour} value={hour.toString().padStart(2, '0')}>{hour}</option>
                    ))}
                  </select>
                </div>
                <div className="w-1/3">
                  <select 
                    className="h-full w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    value={newTime.split(':')[1]?.split(' ')[0] || '00'}
                    onChange={(e) => {
                      const hour = newTime.split(':')[0] || '12';
                      const minute = e.target.value;
                      const ampm = newTime.includes('PM') ? 'PM' : 'AM';
                      setNewTime(`${hour}:${minute} ${ampm}`);
                    }}
                  >
                    <option value="" disabled>Min</option>
                    <option value="00">00</option>
                    <option value="15">15</option>
                    <option value="30">30</option>
                    <option value="45">45</option>
                  </select>
                </div>
                <div className="w-1/3">
                  <select 
                    className="h-full w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    value={newTime.includes('PM') ? 'PM' : 'AM'}
                    onChange={(e) => {
                      const hour = newTime.split(':')[0] || '12';
                      const minute = newTime.split(':')[1]?.split(' ')[0] || '00';
                      setNewTime(`${hour}:${minute} ${e.target.value}`);
                    }}
                  >
                    <option value="" disabled>AM/PM</option>
                    <option value="AM">AM</option>
                    <option value="PM">PM</option>
                  </select>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={handleCancel}>Cancel</Button>
            <Button 
              onClick={handleSaveReschedule} 
              disabled={isRescheduling || !newDate || !newTime}
            >
              {isRescheduling ? "Saving..." : "Save Changes"}
            </Button>
          </CardFooter>
        </Card>
      ) : (
        <>
          <h2 className="text-xl font-semibold mb-4">Your Scheduled Interviews</h2>
          
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : interviews.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {interviews.map((interview) => (
                <Card key={interview.id} className={cn(
                  "transition-all hover:shadow-md",
                  interview.is_used && "opacity-60"
                )}>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{interview.company}</CardTitle>
                        <CardDescription>{interview.job_role}</CardDescription>
                      </div>
                      <div className="bg-primary/10 px-3 py-1 rounded-full text-primary text-sm">
                        {interview.passkey}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pb-2">
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center text-muted-foreground">
                        <CalendarIcon className="h-4 w-4 mr-2" />
                        <span>
                          {interview.interview_date ? format(new Date(interview.interview_date), "PPP") : "Not set"}
                        </span>
                      </div>
                      <div className="flex items-center text-muted-foreground">
                        <Clock className="h-4 w-4 mr-2" />
                        <span>{interview.interview_time || "Not set"}</span>
                      </div>
                      <div className="pt-2">
                        <span className={cn(
                          "text-xs px-2 py-1 rounded-full",
                          interview.is_used 
                            ? "bg-muted text-muted-foreground" 
                            : "bg-green-100 text-green-800"
                        )}>
                          {interview.is_used ? "Used" : "Active"}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full"
                      disabled={interview.is_used}
                      onClick={() => handleReschedule(interview)}
                    >
                      Reschedule
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 border rounded-lg bg-muted/20">
              <p className="text-muted-foreground">You don't have any scheduled interviews yet.</p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => window.history.back()}
              >
                Back to Dashboard
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}