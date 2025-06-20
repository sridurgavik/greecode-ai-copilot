import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Ticket, HelpCircle, Send } from "lucide-react";
import { motion } from "framer-motion";

const HelpSupport = () => {
  const [activeTab, setActiveTab] = useState("tickets");
  const [showNewTicket, setShowNewTicket] = useState(false);
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [concern, setConcern] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isChatOpen, setIsChatOpen] = useState(false);

  const sampleTickets = [
    {
      id: 'TICK-12345',
      subject: 'Integration Issue',
      status: 'waiting',
      createdAt: '2025-06-20',
      lastMessage: 'Your message here...',
      lastMessageTime: '15:53'
    },
    {
      id: 'TICK-12346',
      subject: 'Account Issue',
      status: 'waiting',
      createdAt: '2025-06-20',
      lastMessage: 'Please help with my account...',
      lastMessageTime: '16:00'
    }
  ];

  const handleTicketClick = (ticket: any) => {
    setSelectedTicket(ticket);
    setIsChatOpen(true);
    // Simulate fetching chat history
    setMessages([
      {
        id: 1,
        text: ticket.lastMessage,
        sender: 'user',
        timestamp: ticket.lastMessageTime
      }
    ]);
  };

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;
    
    const newMsg = {
      id: Date.now(),
      text: newMessage,
      sender: 'user',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, newMsg]);
    setNewMessage('');

    // Simulate admin response after 2 seconds
    setTimeout(() => {
      const adminResponse = {
        id: Date.now() + 1,
        text: 'We are looking into your issue. Please wait for further updates.',
        sender: 'admin',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, adminResponse]);
    }, 2000);
  };
  const { toast } = useToast();

  const handleRaiseTicket = async () => {
    if (!email || !subject || !concern) {
      toast({
        title: "Error",
        description: "Please fill in all fields before submitting.",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      // Simulate ticket creation
      await new Promise(resolve => setTimeout(resolve, 1500));
      toast({
        title: "Success",
        description: "Your ticket has been submitted successfully!",
      });
      setShowNewTicket(true);
      setEmail("");
      setSubject("");
      setConcern("");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to submit ticket. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header Section */}
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col items-center mb-8">
          {/* Center: Help & Support Text */}
          <motion.div
            className="flex items-center justify-center mb-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-3xl font-bold">Help & Support</h1>
          </motion.div>

          {/* Left: Greecode Logo */}
          <motion.div
            className="flex items-center gap-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <div className="rounded-full bg-primary/20 p-3">
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
            <h1 className="text-xl font-bold">Greecode</h1>
          </motion.div>
        </div>

        {/* Main Content */}
        <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
          <div className="w-full max-w-4xl space-y-8">
            <Tabs defaultValue="tickets" value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="tickets" className="justify-center">
                  <div className="flex items-center gap-2">
                    <Ticket className="h-4 w-4" />
                    <span>Raise Tickets</span>
                  </div>
                </TabsTrigger>
                <TabsTrigger value="active" className="justify-center">
                  <div className="flex items-center gap-2">
                    <HelpCircle className="h-4 w-4" />
                    <span>Active Tickets</span>
                  </div>
                </TabsTrigger>
              </TabsList>

              {/* Raise Tickets Tab */}
              <TabsContent value="tickets">
                <Card>
                  <CardHeader>
                    <CardTitle>Raise a New Ticket</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleRaiseTicket}>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="email">Email</Label>
                          <Input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="your.email@example.com"
                          />
                        </div>
                        <div>
                          <Label htmlFor="subject">Subject</Label>
                          <Input
                            id="subject"
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            placeholder="Brief description of your issue"
                          />
                        </div>
                        <div>
                          <Label htmlFor="concern">Your Concern</Label>
                          <Textarea
                            id="concern"
                            value={concern}
                            onChange={(e) => setConcern(e.target.value)}
                            placeholder="Please describe your issue in detail..."
                            className="min-h-[100px]"
                          />
                        </div>
                        <Button
                          type="submit"
                          className="w-full"
                          disabled={loading}
                        >
                          {loading ? 'Submitting...' : 'Submit Ticket'}
                        </Button>
                      </div>
                    </form>
                    
                    {/* FAQ Section */}
                    <div className="mt-8 space-y-4">
                      <h2 className="text-lg font-semibold">FAQs</h2>
                      <div className="space-y-2">
                        <details className="group">
                          <summary className="flex items-center justify-between w-full p-4 rounded-lg bg-muted/50 cursor-pointer">
                            <span className="text-sm font-medium">How can I contact support?</span>
                            <svg className="w-3 h-3 shrink-0 ml-1.5 fill-current group-open:rotate-180" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 6">
                              <path d="M1.5 1.41L5 5.41 8.5 1.41" />
                            </svg>
                          </summary>
                          <p className="px-4 py-3 text-sm text-muted-foreground">You can contact us through this help and support page. Our support team is available 24/7 to assist you.</p>
                        </details>
                        <details className="group">
                          <summary className="flex items-center justify-between w-full p-4 rounded-lg bg-muted/50 cursor-pointer">
                            <span className="text-sm font-medium">What is your response time?</span>
                            <svg className="w-3 h-3 shrink-0 ml-1.5 fill-current group-open:rotate-180" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 6">
                              <path d="M1.5 1.41L5 5.41 8.5 1.41" />
                            </svg>
                          </summary>
                          <p className="px-4 py-3 text-sm text-muted-foreground">We aim to respond to all support tickets within 24 hours during business hours. Critical issues are prioritized and addressed immediately.</p>
                        </details>
                        <details className="group">
                          <summary className="flex items-center justify-between w-full p-4 rounded-lg bg-muted/50 cursor-pointer">
                            <span className="text-sm font-medium">How do I track my ticket?</span>
                            <svg className="w-3 h-3 shrink-0 ml-1.5 fill-current group-open:rotate-180" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 6">
                              <path d="M1.5 1.41L5 5.41 8.5 1.41" />
                            </svg>
                          </summary>
                          <p className="px-4 py-3 text-sm text-muted-foreground">After submitting a ticket, you can track its status in the "Active Tickets" tab. You'll receive updates via email as well.</p>
                        </details>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Active Tickets Tab */}
              <TabsContent value="active">
                <Card>
                  <CardHeader>
                    <CardTitle>Active Tickets</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* Ticket List */}
                      {sampleTickets.map((ticket) => (
                        <Card 
                          key={ticket.id} 
                          className="p-4 hover:bg-muted/50 cursor-pointer"
                          onClick={() => handleTicketClick(ticket)}
                        >
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <h3 className="font-medium">Ticket #{ticket.id}</h3>
                              <span className="text-sm text-muted-foreground">
                                Created: {ticket.createdAt}
                              </span>
                            </div>
                            <p className="text-sm">Subject: {ticket.subject}</p>
                            <p className="text-sm text-muted-foreground">
                              Status: {ticket.status === 'waiting' ? (
                                <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
                                  Waiting for Admin Response
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                                  Active Chat
                                </span>
                              )}
                            </p>
                            <div className="mt-4 space-y-4">
                              <div className="flex items-start gap-3">
                                <div className="flex-shrink-0 h-8 w-8 bg-primary/10 rounded-full flex items-center justify-center">
                                  <Send className="h-4 w-4 text-primary" />
                                </div>
                                <div className="flex-1">
                                  <p className="text-sm">{ticket.lastMessage}</p>
                                  <p className="text-xs text-muted-foreground">
                                    Sent: {ticket.lastMessageTime}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </Card>
                      ))}

                      {/* Chat Interface */}
                      {isChatOpen && selectedTicket && (
                        <div className="mt-4 space-y-4">
                          <div className="flex justify-between items-center">
                            <h3 className="text-lg font-semibold">Ticket #{selectedTicket.id}</h3>
                            <Button variant="ghost" onClick={() => setIsChatOpen(false)}>
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </Button>
                          </div>
                          
                          <div className="space-y-4">
                            {messages.map((msg) => (
                              <div 
                                key={msg.id} 
                                className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                              >
                                <div 
                                  className={`max-w-[80%] rounded-lg p-3 ${
                                    msg.sender === 'user' 
                                      ? 'bg-primary/10 text-primary' 
                                      : 'bg-muted/50'
                                  }`}
                                >
                                  <p className="text-sm">{msg.text}</p>
                                  <p className="text-xs text-muted-foreground mt-1">{msg.timestamp}</p>
                                </div>
                              </div>
                            ))}
                          </div>

                          <div className="flex gap-2">
                            <Input
                              placeholder="Type your message..."
                              value={newMessage}
                              onChange={(e) => setNewMessage(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                            />
                            <Button 
                              onClick={handleSendMessage}
                              disabled={!newMessage.trim()}
                            >
                              Send
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HelpSupport;


