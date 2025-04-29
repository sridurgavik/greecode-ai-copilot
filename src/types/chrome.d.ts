
// Type definitions for Chrome extension API
declare namespace chrome {
  namespace runtime {
    function sendMessage(message: any, callback?: (response: any) => void): void;
    const onMessage: {
      addListener(callback: (message: any, sender: any, sendResponse: (response?: any) => void) => void): void;
      removeListener(callback: (message: any, sender: any, sendResponse: (response?: any) => void) => void): void;
    };
    const lastError: chrome.runtime.LastError | undefined;
    interface LastError {
      message?: string;
    }
  }
  
  namespace tabs {
    function query(queryInfo: { active: boolean; currentWindow: boolean }, callback: (tabs: chrome.tabs.Tab[]) => void): void;
    function sendMessage(tabId: number, message: any, callback?: (response: any) => void): void;
    interface Tab {
      id?: number;
      url?: string;
      title?: string;
    }
  }
  
  namespace storage {
    const local: {
      get(keys: string | string[] | object | null, callback?: (items: { [key: string]: any }) => void): Promise<{ [key: string]: any }>;
      set(items: object, callback?: () => void): Promise<void>;
      remove(keys: string | string[], callback?: () => void): Promise<void>;
    };
  }
}
