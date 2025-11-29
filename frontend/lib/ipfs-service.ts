export interface IPFSService {
  uploadJSON(data: object): Promise<string>;
  getGatewayUrl(cid: string): string;
  fetchJSON(cid: string): Promise<any>;
}

// Mock implementation for prototype
const MOCK_DELAY = 1000;

// In a real app, this would interact with Pinata API
class MockIPFSService implements IPFSService {
  async uploadJSON(data: object): Promise<string> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, MOCK_DELAY));
    
    // Generate a fake CID (simple hash for mock)
    const jsonString = JSON.stringify(data);
    // Simple hash function for mock purposes
    let hash = 0;
    for (let i = 0; i < jsonString.length; i++) {
      const char = jsonString.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0; 
    }
    const cid = `QmMock${Math.abs(hash)}${Date.now()}`;
    
    // Store in memory (refreshing page will lose this in mock mode, 
    // but for a demo ensuring "upload" works is key. 
    // To persist across reloads without a backend, we can use localStorage)
    try {
      localStorage.setItem(`ipfs_${cid}`, jsonString);
    } catch (e) {
      console.warn("LocalStorage failed", e);
    }

    return cid;
  }

  getGatewayUrl(cid: string): string {
    // In reality: `https://gateway.pinata.cloud/ipfs/${cid}`
    return `ipfs://${cid}`;
  }

  async fetchJSON(cid: string): Promise<any> {
    await new Promise(resolve => setTimeout(resolve, MOCK_DELAY));
    
    // Try local storage first
    const stored = localStorage.getItem(`ipfs_${cid}`);
    if (stored) {
      return JSON.parse(stored);
    }
    
    // Fallback for demo data
    return {
      description: "Evidence not found (Mock IPFS storage cleared)",
      files: []
    };
  }
}

export const ipfsService = new MockIPFSService();
