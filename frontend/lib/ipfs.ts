/**
 * IPFS Upload Utility
 * Uploads files to IPFS using Pinata API
 */

const IPFS_GATEWAY = process.env.NEXT_PUBLIC_IPFS_GATEWAY || 'https://gateway.pinata.cloud';
const PINATA_JWT = process.env.NEXT_PUBLIC_PINATA_JWT || '';

/**
 * Upload file to IPFS via Pinata
 * @param file - File to upload
 * @returns IPFS hash (CID v0, e.g., "QmXxxx...")
 */
export async function uploadToIPFS(file: File): Promise<string> {
  if (!file) {
    throw new Error('No file provided');
  }

  // Validate file size (max 10MB for this implementation)
  const maxSizeBytes = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSizeBytes) {
    throw new Error(`File size exceeds limit. Max: 10MB, Got: ${(file.size / 1024 / 1024).toFixed(2)}MB`);
  }

  console.log(`📤 Uploading file to IPFS: ${file.name} (${(file.size / 1024).toFixed(2)} KB)`);

  const formData = new FormData();
  formData.append('file', file);

  // Add metadata
  const metadata = JSON.stringify({
    name: file.name,
    keyvalues: {
      uploadedAt: new Date().toISOString(),
      originalName: file.name,
      fileType: file.type,
    },
  });
  formData.append('pinataMetadata', metadata);

  try {
    // Use Pinata API endpoint
    const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PINATA_JWT}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Pinata API error: ${errorData.error || response.statusText}`);
    }

    const data = await response.json();
    const ipfsHash = data.IpfsHash;

    if (!ipfsHash) {
      throw new Error('No IPFS hash returned from Pinata');
    }

    console.log(`✅ File uploaded to IPFS: ${ipfsHash}`);
    console.log(`📎 Access via: ${IPFS_GATEWAY}/ipfs/${ipfsHash}`);

    return ipfsHash;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ IPFS upload failed:', errorMsg);
    throw new Error(`IPFS upload failed: ${errorMsg}`);
  }
}

/**
 * Get accessible IPFS URL from hash
 * @param ipfsHash - IPFS hash (CID)
 * @returns Full IPFS gateway URL
 */
export function getIPFSUrl(ipfsHash: string): string {
  if (!ipfsHash.startsWith('Qm') && !ipfsHash.startsWith('ba')) {
    throw new Error('Invalid IPFS hash format');
  }
  return `${IPFS_GATEWAY}/ipfs/${ipfsHash}`;
}

/**
 * Verify IPFS hash is accessible
 * @param ipfsHash - IPFS hash to verify
 * @returns true if accessible, false otherwise
 */
export async function verifyIPFSHash(ipfsHash: string): Promise<boolean> {
  try {
    const url = getIPFSUrl(ipfsHash);
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok;
  } catch (error) {
    console.error('IPFS verification failed:', error);
    return false;
  }
}
