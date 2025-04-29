
// Background script for the Greecode extension
// Handles authentication, API calls, and communication with content scripts

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
    // TODO: Implement secure API call to Groq through backend
    // We should NOT include the API key in client-side code
    sendResponse({ 
      success: true, 
      message: "AI request handling not yet implemented" 
    });
  } catch (error) {
    console.error("AI request error:", error);
    sendResponse({ success: false, error: "AI request failed" });
  }
};

// Handle passkey validation
const handlePasskeyValidation = async (request: any, sendResponse: any) => {
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
  // Check if user is authenticated
  const session = await chrome.storage.local.get("session");
  console.log("Session:", session);
};

// Run initialization
initExtension();
