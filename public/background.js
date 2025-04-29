
// Background script for the Greecode extension
// This file is bundled and loaded into the extension

console.log("Greecode background script loaded");

// Listen for messages from content script or popup
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

// Handle authentication requests
const handleAuthRequest = async (request, sendResponse) => {
  try {
    // TODO: Implement authentication logic with Firebase/Supabase
    sendResponse({ success: true, message: "Authentication not yet implemented" });
  } catch (error) {
    console.error("Authentication error:", error);
    sendResponse({ success: false, error: "Authentication failed" });
  }
};

// Handle text extraction requests
const handleTextExtraction = async (request, sendResponse) => {
  try {
    // Just pass back the extracted text for now
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
const handleAIRequest = async (request, sendResponse) => {
  try {
    console.log("Processing AI request:", request);
    
    // In a real implementation, we would call the Groq API securely
    // For now, we'll simulate different responses based on the message content
    
    const userMessage = request.message || "";
    let response = "";
    
    if (userMessage.toLowerCase().includes("hello") || userMessage.toLowerCase().includes("hi")) {
      response = "Hello! I'm GreecodePro.ai assistant. How can I help you with your coding or technical interview today?";
    }
    else if (userMessage.toLowerCase().includes("interview")) {
      response = "Preparing for interviews can be challenging. I can help you practice coding questions, review algorithms, or discuss common interview topics. What specific area would you like to focus on?";
    }
    else if (userMessage.toLowerCase().includes("javascript") || userMessage.toLowerCase().includes("js")) {
      response = "JavaScript is a versatile language! Are you looking for help with specific concepts like closures, promises, or the event loop? Or perhaps you'd like to practice some JavaScript coding challenges?";
    }
    else if (userMessage.toLowerCase().includes("react")) {
      response = "React is a popular frontend library. Would you like to discuss React hooks, component lifecycle, state management, or performance optimization techniques?";
    }
    else if (userMessage.toLowerCase().includes("algorithm") || userMessage.toLowerCase().includes("complexity")) {
      response = "Understanding algorithms and time complexity is crucial for technical interviews. I can explain concepts like Big O notation, sorting algorithms, or help you solve specific algorithmic challenges.";
    }
    else {
      response = `I've processed your message: "${userMessage}". As an AI assistant specialized in helping with technical interviews and coding challenges, I'd be happy to provide guidance on programming concepts, algorithm problems, or interview preparation strategies.`;
    }
    
    // Simulate network delay for a more realistic experience
    setTimeout(() => {
      sendResponse({ 
        success: true, 
        message: response 
      });
    }, 500);
    
  } catch (error) {
    console.error("AI request error:", error);
    sendResponse({ success: false, error: "AI request failed" });
  }
};

// Handle passkey validation
const handlePasskeyValidation = async (request, sendResponse) => {
  try {
    // TODO: Implement passkey validation with Firebase/Supabase
    sendResponse({ 
      success: true, 
      message: "Passkey validation not yet implemented" 
    });
  } catch (error) {
    console.error("Passkey validation error:", error);
    sendResponse({ success: false, error: "Passkey validation failed" });
  }
};

// Initialize the extension
const initExtension = async () => {
  console.log("Greecode extension initialized");
};

// Run initialization
initExtension();
