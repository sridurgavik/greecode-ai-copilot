
import { useState, useRef, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageCircle, Send, Copy } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const GroqChat = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Welcome to GreecodePro.ai! How can I help you today?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Auto scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = {
      role: "user" as const,
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);
    setIsTyping(true);

    try {
      // Check if we're in extension environment
      const isExtensionEnvironment = typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.sendMessage;

      if (isExtensionEnvironment) {
        // Send message to background script for processing
        chrome.runtime.sendMessage(
          { type: "AI_REQUEST", message: input },
          (response) => {
            if (chrome.runtime.lastError) {
              throw new Error(chrome.runtime.lastError.message);
            }

            const fullResponse = response?.success ? response.message : "Sorry, I couldn't process your request.";
            simulateRealTimeTyping(fullResponse);
          }
        );
      } else {
        // If not in extension environment, simulate a response with realistic typing
        simulateAPIResponse(input);
      }
    } catch (error) {
      console.error("Send message error:", error);
      setIsLoading(false);
      setIsTyping(false);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Simulate API response for testing/fallback
  const simulateAPIResponse = (userInput: string) => {
    // Generate more contextual responses based on user input
    const userInputLower = userInput.toLowerCase();
    let responseText = "";
    
    if (userInputLower.includes("hello") || userInputLower.includes("hi")) {
      responseText = "Hello there! I'm your interview preparation assistant. How can I help you today?";
    } else if (userInputLower.includes("interview")) {
      responseText = "Preparing for interviews is crucial. I can help with technical questions, behavioral questions, or mock interviews. What specific area would you like to focus on?";
    } else if (userInputLower.includes("algorithm") || userInputLower.includes("data structure")) {
      responseText = "Algorithms and data structures are common in technical interviews. I can help with specific problems or explain concepts like arrays, linked lists, trees, graphs, sorting algorithms, or dynamic programming. What would you like to practice?";
    } else if (userInputLower.includes("javascript") || userInputLower.includes("react")) {
      responseText = "For JavaScript interviews, you should understand closures, promises, the event loop, and frameworks like React. I can help with specific concepts or coding problems related to front-end development.";
    } else if (userInputLower.includes("system design")) {
      responseText = "System design interviews test your ability to architect scalable systems. Key concepts include load balancing, caching, database sharding, microservices, and API design. Would you like to practice a specific system design scenario?";
    } else {
      responseText = `I understand you're asking about "${userInput}". As an AI interview coach, I can help with technical concepts, coding problems, behavioral questions, or resume tips. Could you provide more details about what you'd like to learn?`;
    }
    
    setTimeout(() => {
      simulateRealTimeTyping(responseText);
    }, 500);
  };

  const simulateRealTimeTyping = (fullResponse: string) => {
    // Create a temporary assistant message for the typing effect
    const assistantMessage = {
      role: "assistant" as const,
      content: "",
      timestamp: new Date(),
    };
    
    setMessages((prev) => [...prev, assistantMessage]);
    
    let index = 0;
    const characterDelay = 15; // Time between characters in ms
    
    // Simulate typing character by character
    const typingInterval = setInterval(() => {
      if (index < fullResponse.length) {
        // Update the last message in the array with one more character
        setMessages(prev => {
          const updated = [...prev];
          const lastMessage = updated[updated.length - 1];
          updated[updated.length - 1] = {
            ...lastMessage,
            content: fullResponse.substring(0, index + 1)
          };
          return updated;
        });
        
        index++;
      } else {
        // Typing complete
        clearInterval(typingInterval);
        setIsLoading(false);
        setIsTyping(false);
      }
    }, characterDelay);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleCopyMessage = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      toast({
        title: "Copied",
        description: "Message copied to clipboard.",
      });
    } catch (error) {
      console.error("Copy error:", error);
      toast({
        title: "Error",
        description: "Failed to copy message.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="flex flex-col h-[500px]">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center">
          <MessageCircle className="mr-2 h-5 w-5" />
          GreecodePro.ai Assistant
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col pt-0">
        <div className="flex-1 overflow-y-auto mb-4 space-y-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[80%] p-3 rounded-lg ${
                  message.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                }`}
              >
                <div className="flex justify-between items-start gap-2">
                  <div className="break-words">{message.content}</div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 opacity-50 hover:opacity-100 shrink-0"
                    onClick={() => handleCopyMessage(message.content)}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
                <div
                  className={`text-xs mt-1 ${
                    message.role === "user"
                      ? "text-primary-foreground/70"
                      : "text-muted-foreground"
                  }`}
                >
                  {message.timestamp.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}
                </div>
              </div>
            </div>
          ))}
          {isTyping && (
            <div className="flex justify-start">
              <div className="max-w-[80%] p-3 rounded-lg bg-muted">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse delay-150"></div>
                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse delay-300"></div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        <div className="flex items-center space-x-2">
          <Input
            placeholder="Type your message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            className="flex-1"
          />
          <Button
            onClick={handleSendMessage}
            disabled={isLoading || !input.trim()}
            size="icon"
          >
            {isLoading ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-foreground" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default GroqChat;
