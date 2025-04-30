
// Background script for the Greecode extension
// Handles authentication, API calls, and communication with content scripts

// Check if we're in the extension environment
const isExtensionEnvironment = typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage;

// Listen for messages from content script or popup
if (isExtensionEnvironment) {
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log("Background script received message:", request);
    
    // Handle different message types
    switch (request.type) {
      case "AUTH_REQUEST":
        handleAuthRequest(request, sendResponse);
        break;
      case "TEXT_EXTRACTION":
        handleTextExtraction(request, sendResponse);
        break;
      case "AI_REQUEST":
        handleAIRequest(request, sendResponse);
        break;
      case "PASSKEY_VALIDATION":
        handlePasskeyValidation(request, sendResponse);
        break;
      default:
        console.log("Unknown message type:", request.type);
    }
    
    // Return true to indicate that the response will be sent asynchronously
    return true;
  });
}

// Handle authentication requests
const handleAuthRequest = async (request: any, sendResponse: any) => {
  try {
    // TODO: Implement authentication logic with Firebase/Supabase
    sendResponse({ success: true, message: "Authentication not yet implemented" });
  } catch (error) {
    console.error("Authentication error:", error);
    sendResponse({ success: false, error: "Authentication failed" });
  }
};

// Handle text extraction requests
const handleTextExtraction = async (request: any, sendResponse: any) => {
  try {
    // Just pass back the extracted text for now
    // In a real implementation, we'd do more processing here
    sendResponse({ 
      success: true, 
      extractedText: request.text 
    });
  } catch (error) {
    console.error("Text extraction error:", error);
    sendResponse({ success: false, error: "Text extraction failed" });
  }
};

// Handle AI requests (using Groq API)
const handleAIRequest = async (request: any, sendResponse: any) => {
  try {
    console.log("Processing AI request:", request);
    
    // Implement more sophisticated response logic for a more realistic chat experience
    const userMessage = request.message || "";
    
    // Simulate typing delay for more realistic experience
    const typingDelay = Math.min(1000 + userMessage.length * 10, 3000);
    
    // Create a more personalized response based on the message content
    let response = "";
    
    if (userMessage.toLowerCase().includes("hello") || userMessage.toLowerCase().includes("hi")) {
      response = "Hello! I'm GreecodePro.ai assistant. How can I help you prepare for your technical interview today?";
    }
    else if (userMessage.toLowerCase().includes("interview")) {
      response = "Technical interviews can be challenging. I recommend preparing by practicing algorithm questions, system design, and behavioral questions. Would you like me to help you with any specific area?";
    }
    else if (userMessage.toLowerCase().includes("javascript") || userMessage.toLowerCase().includes("js")) {
      response = "JavaScript is essential for frontend roles. Make sure you understand closures, promises, the event loop, and common patterns. Would you like me to explain any particular JavaScript concept or provide a practice problem?";
    }
    else if (userMessage.toLowerCase().includes("react")) {
      response = "For React interviews, focus on understanding hooks, component lifecycle, state management with tools like Redux or Context API, and performance optimization. I can help you practice React-specific questions if you'd like.";
    }
    else if (userMessage.toLowerCase().includes("algorithm") || userMessage.toLowerCase().includes("complexity")) {
      response = "Algorithmic problems typically focus on data structures like arrays, linked lists, trees, and graphs. Time complexity analysis is crucial. Would you like me to suggest some practice problems or explain a specific algorithm?";
    }
    else if (userMessage.toLowerCase().includes("system design") || userMessage.toLowerCase().includes("architecture")) {
      response = "System design interviews test your ability to design scalable systems. Focus on understanding distributed systems, databases, caching, load balancing, and microservices architecture. Would you like to discuss a specific system design topic?";
    }
    else if (userMessage.toLowerCase().includes("thank")) {
      response = "You're welcome! Feel free to ask me any questions as you prepare for your interview. I'm here to help you succeed!";
    }
    else {
      response = `I understand you're asking about "${userMessage}". As your interview preparation assistant, I can help with coding problems, system design, behavioral questions, or specific technologies. What specific aspect would you like to focus on?`;
    }
    
    // Simulate network delay for a more realistic experience
    setTimeout(() => {
      sendResponse({ 
        success: true, 
        message: response 
      });
    }, typingDelay);
    
  } catch (error) {
    console.error("AI request error:", error);
    sendResponse({ success: false, error: "AI request failed" });
  }
};

// Handle passkey validation
const handlePasskeyValidation = async (request: any, sendResponse: any) => {
  try {
    // Implement proper validation logic here
    if (!request.passkey || request.passkey.length !== 6) {
      sendResponse({ 
        success: false, 
        error: "Invalid passkey format" 
      });
      return;
    }
    
    // In a real implementation, we would validate against the database
    sendResponse({ 
      success: true, 
      message: "Passkey validation successful" 
    });
  } catch (error) {
    console.error("Passkey validation error:", error);
    sendResponse({ success: false, error: "Passkey validation failed" });
  }
};

// Initialize the extension
const initExtension = async () => {
  console.log("Greecode extension initialized");
  
  // Check if user is authenticated if in extension environment
  if (isExtensionEnvironment && chrome.storage) {
    chrome.storage.local.get("session").then((session) => {
      console.log("Session:", session);
    }).catch(error => {
      console.error("Chrome storage error:", error);
    });
  }
};

// Run initialization
initExtension();
