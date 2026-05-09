'use client';

import { ExploreContent } from '@/src/components/explore/ExploreContent';

export default function DonorDiscoverPage() {
  return (
    <ExploreContent
      title="Discover"
      description="Browse centers and children in the AgroTrust network"
      childHref={(id) => `/donor/children/${id}`}
      campaignRegionHref={(region) => `/donor/campaigns/${encodeURIComponent(region)}`}
    />
  );
}
