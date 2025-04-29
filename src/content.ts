
// Content script for the Greecode extension
// This runs on web pages and handles interaction with the page content

console.log("Greecode content script loaded");

// Check if we're in the extension environment
const isExtensionEnvironment = typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage;

// Text selection and extraction functionality
let selectedElement: HTMLElement | null = null;
let isSelectionMode = false;

// Listen for messages from the extension popup/background
if (isExtensionEnvironment) {
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log("Content script received message:", request);
    
    switch (request.action) {
      case "START_SELECTION":
        startSelectionMode();
        sendResponse({ success: true });
        break;
        
      case "EXTRACT_PAGE_CONTENT":
        const content = extractPageContent();
        sendResponse({ success: true, content });
        break;
        
      case "SUMMARIZE_PAGE":
        const pageContent = extractPageContent();
        if (chrome.runtime && isExtensionEnvironment) {
          chrome.runtime.sendMessage({
            type: "AI_REQUEST",
            action: "summarize",
            content: pageContent
          }, response => {
            console.log("Summarize response:", response);
          });
        }
        sendResponse({ success: true, message: "Summarization request sent" });
        break;
        
      case "CANCEL_SELECTION":
        cancelSelectionMode();
        sendResponse({ success: true });
        break;
    }
    
    return true;
  });
}

// Extract all text content from the page
const extractPageContent = (): string => {
  // This is a basic implementation - might need refinement for better content extraction
  return document.body.innerText;
};

// Start element selection mode
const startSelectionMode = () => {
  if (isSelectionMode) return;
  
  isSelectionMode = true;
  document.body.style.cursor = 'crosshair';
  
  // Add event listeners for hover highlighting and selection
  document.addEventListener('mouseover', handleMouseOver);
  document.addEventListener('mouseout', handleMouseOut);
  document.addEventListener('click', handleMouseClick);
  
  // Add selection mode indicator
  addSelectionModeIndicator();
};

// Cancel element selection mode
const cancelSelectionMode = () => {
  if (!isSelectionMode) return;
  
  isSelectionMode = false;
  document.body.style.cursor = 'default';
  
  // Remove event listeners
  document.removeEventListener('mouseover', handleMouseOver);
  document.removeEventListener('mouseout', handleMouseOut);
  document.removeEventListener('click', handleMouseClick);
  
  // Remove selection mode indicator
  removeSelectionModeIndicator();
  
  // Remove highlight from any selected element
  if (selectedElement) {
    selectedElement.style.outline = '';
    selectedElement = null;
  }
};

// Handle mouse over events in selection mode
const handleMouseOver = (event: MouseEvent) => {
  if (!isSelectionMode) return;
  
  const target = event.target as HTMLElement;
  target.style.outline = '2px solid #9b87f5';
};

// Handle mouse out events in selection mode
const handleMouseOut = (event: MouseEvent) => {
  if (!isSelectionMode) return;
  
  const target = event.target as HTMLElement;
  if (target !== selectedElement) {
    target.style.outline = '';
  }
};

// Handle mouse click events in selection mode
const handleMouseClick = (event: MouseEvent) => {
  if (!isSelectionMode) return;
  
  event.preventDefault();
  event.stopPropagation();
  
  // Update selected element
  if (selectedElement) {
    selectedElement.style.outline = '';
  }
  
  selectedElement = event.target as HTMLElement;
  selectedElement.style.outline = '3px solid #7E69AB';
  
  // Extract text from the selected element
  const selectedText = selectedElement.innerText;
  
  // Send the extracted text to the background script
  if (isExtensionEnvironment && chrome.runtime) {
    chrome.runtime.sendMessage({
      type: "TEXT_EXTRACTION",
      text: selectedText
    }, response => {
      console.log("Text extraction response:", response);
    });
  }
  
  // Exit selection mode
  cancelSelectionMode();
};

// Add selection mode indicator to the page
const addSelectionModeIndicator = () => {
  const indicator = document.createElement('div');
  indicator.id = 'greecode-selection-indicator';
  indicator.textContent = 'Greecode: Select an element';
  indicator.style.position = 'fixed';
  indicator.style.top = '0';
  indicator.style.left = '50%';
  indicator.style.transform = 'translateX(-50%)';
  indicator.style.backgroundColor = '#9b87f5';
  indicator.style.color = 'white';
  indicator.style.padding = '8px 16px';
  indicator.style.borderRadius = '0 0 8px 8px';
  indicator.style.zIndex = '9999999';
  indicator.style.fontFamily = 'Arial, sans-serif';
  indicator.style.fontSize = '14px';
  document.body.appendChild(indicator);
};

// Remove selection mode indicator from the page
const removeSelectionModeIndicator = () => {
  const indicator = document.getElementById('greecode-selection-indicator');
  if (indicator) {
    document.body.removeChild(indicator);
  }
};
