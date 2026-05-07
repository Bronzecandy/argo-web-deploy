/**
 * Walrus testnet: a single official publisher/aggregator often returns errors, 403, or
 * connection issues. We mirror the mobile app by trying multiple public endpoints.
 * @see https://docs.wal.app/docs/system-overview/public-aggregators-and-publishers
 */

const DEFAULT_EPOCHS = 20;

/** Public HTTPS publishers (PUT /v1/blobs) — same blob is registered on the network. */
/** Nodes.Guru is first: most reliable in this deployment; others are fallbacks. */
const WALRUS_PUBLISHERS = [
  'https://walrus-testnet-publisher.nodes.guru',
  'https://publisher.walrus-testnet.walrus.space',
  'https://publisher.walrus-testnet.h2o-nodes.com',
  'https://sui-walrus-testnet-publisher.bwarelabs.com',
  'https://publisher.walrus-01.tududes.com',
] as const;

/** Aggregator read paths (GET .../v1/blobs/{blobId}) — order tried for image display. */
export const WALRUS_AGGREGATOR_PREFIXES = [
  'https://walrus-testnet-aggregator.nodes.guru/v1/blobs',
  'https://aggregator.walrus-testnet.walrus.space/v1/blobs',
  'https://walrus-testnet.blockscope.net/v1/blobs',
  'https://walrus-testnet-aggregator.stakeengine.co.uk/v1/blobs',
  'https://walrus-testnet-aggregator.starduststaking.com/v1/blobs',
  'https://walrus-testnet-aggregator.brightlystake.com/v1/blobs',
] as const;

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

export function walrusBlobSrcList(blobId: string): string[] {
  const id = blobId.trim();
  if (!id) return [];
  return WALRUS_AGGREGATOR_PREFIXES.map((prefix) => `${prefix}/${id}`);
}

class BlobService {
  async upload(file: File): Promise<string> {
    const buffer = await file.arrayBuffer();
    const binaryData = new Uint8Array(buffer);

    let lastError: Error | null = null;

    for (const publisherBase of WALRUS_PUBLISHERS) {
      try {
        const response = await fetch(
          `${publisherBase}/v1/blobs?epochs=${DEFAULT_EPOCHS}`,
          {
            method: 'PUT',
            body: binaryData,
            headers: { 'Content-Type': 'application/octet-stream' },
          },
        );

        if (!response.ok) {
          lastError = new Error(`Walrus upload failed: ${response.status} ${response.statusText}`);
          continue;
        }

        const data: WalrusUploadResponse = await response.json();
        const blobId = data.newlyCreated?.blobObject?.blobId || data.blobObject?.blobId || '';

        if (!blobId) {
          lastError = new Error('No blobId received from Walrus');
          continue;
        }

        return blobId;
      } catch (e) {
        lastError = e instanceof Error ? e : new Error(String(e));
      }
    }

    throw lastError ?? new Error('Walrus upload failed on all publishers');
  }

  getUrl(blobId: string): string {
    if (!blobId) return '';
    return `${WALRUS_AGGREGATOR_PREFIXES[0]}/${blobId.trim()}`;
  }
}

export const blobService = new BlobService();
