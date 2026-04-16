const WALRUS_CONFIG = {
  AGGREGATOR: 'https://aggregator.walrus-testnet.walrus.space/v1/blobs',
  PUBLISHER: 'https://publisher.walrus-testnet.walrus.space',
  DEFAULT_EPOCHS: 20,
};

interface WalrusUploadResponse {
  newlyCreated?: {
    blobObject?: {
      blobId: string;
    };
  };
  blobObject?: {
    blobId: string;
  };
}

class BlobService {
  async upload(file: File): Promise<string> {
    const buffer = await file.arrayBuffer();
    const binaryData = new Uint8Array(buffer);

    const response = await fetch(
      `${WALRUS_CONFIG.PUBLISHER}/v1/blobs?epochs=${WALRUS_CONFIG.DEFAULT_EPOCHS}`,
      {
        method: 'PUT',
        body: binaryData,
        headers: { 'Content-Type': 'application/octet-stream' },
      },
    );

    if (!response.ok) {
      throw new Error(`Walrus upload failed: ${response.status} ${response.statusText}`);
    }

    const data: WalrusUploadResponse = await response.json();
    const blobId = data.newlyCreated?.blobObject?.blobId || data.blobObject?.blobId || '';

    if (!blobId) {
      throw new Error('No blobId received from Walrus');
    }

    return blobId;
  }

  getUrl(blobId: string): string {
    if (!blobId) return '';
    return `${WALRUS_CONFIG.AGGREGATOR}/${blobId}`;
  }
}

export const blobService = new BlobService();
