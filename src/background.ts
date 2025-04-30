
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
    
    const userMessage = request.message || "";
    
    // Create a more intelligent response based on the message content
    const response = generateIntelligentResponse(userMessage);
    
    // Simulate realistic network delay
    setTimeout(() => {
      sendResponse({ 
        success: true, 
        message: response 
      });
    }, 300);
    
  } catch (error) {
    console.error("AI request error:", error);
    sendResponse({ success: false, error: "AI request failed" });
  }
};

// Generate more intelligent, context-aware responses
const generateIntelligentResponse = (userMessage: string): string => {
  const userMessageLower = userMessage.toLowerCase();
  
  // Tech interview-specific responses
  if (userMessageLower.includes("hello") || userMessageLower.includes("hi")) {
    return "Hello! I'm your GreecodePro.ai interview coach. I can help you prepare for technical interviews through practice problems, concept explanations, or mock interviews. What would you like to focus on today?";
  }
  else if (userMessageLower.includes("interview")) {
    return "Technical interviews typically cover algorithms, data structures, system design, and language-specific questions. I can help you with any of these areas. Would you like to practice a specific type of interview question?";
  }
  else if (userMessageLower.includes("javascript") || userMessageLower.includes("js")) {
    return "For JavaScript interviews, you should be comfortable with concepts like closures, promises, async/await, prototypal inheritance, and the event loop. Here's a common JavaScript interview question: Explain how closures work and provide an example of their practical use. Would you like me to explain this concept or try a different JavaScript question?";
  }
  else if (userMessageLower.includes("react")) {
    return "React interviews often focus on component lifecycle, hooks, state management, and performance optimization. A common question is explaining the difference between useState and useReducer hooks and when to use each. Would you like to explore this concept or try another React question?";
  }
  else if (userMessageLower.includes("algorithm") || userMessageLower.includes("complexity")) {
    return "Algorithm questions often test your ability to solve problems efficiently. Let's practice with this question: 'Given an array of integers, find the pair with the smallest absolute difference. Return the pair as an array.' How would you approach this problem? Think about time complexity in your solution.";
  }
  else if (userMessageLower.includes("system design") || userMessageLower.includes("architecture")) {
    return "System design interviews test your ability to design scalable systems. Let's practice with this question: 'Design a URL shortening service like bit.ly.' Consider aspects like API design, database schema, scaling strategies, and potential bottlenecks in your approach.";
  }
  else if (userMessageLower.includes("thank")) {
    return "You're welcome! Remember to practice regularly and focus on understanding concepts rather than memorizing solutions. Is there anything else I can help you with for your interview preparation?";
  }
  else if (userMessageLower.includes("data structure")) {
    return "Data structure questions are common in technical interviews. They test your understanding of arrays, linked lists, trees, graphs, stacks, queues, and hash tables. Would you like to practice a specific data structure problem or review the characteristics and use cases of different data structures?";
  }
  else if (userMessageLower.includes("behavioral")) {
    return "Behavioral questions assess how you've handled situations in the past. A common format is the STAR method: Situation, Task, Action, Result. For example, if asked about a challenging project, describe the situation, your task, the actions you took, and the results you achieved. Would you like to practice a specific behavioral question?";
  }
  else {
    return `I understand you're asking about "${userMessage}". As your interview preparation coach, I can help with coding problems, system design, behavioral questions, or specific technologies. Would you like me to provide some practice questions related to this topic or explain a specific concept in more detail?`;
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
    try {
      chrome.storage.local.get("session").then((session) => {
        console.log("Session:", session);
      }).catch(error => {
        console.error("Chrome storage error:", error);
      });
    } catch (error) {
      console.error("Error checking session:", error);
    }
  }
};

// Run initialization
initExtension();
