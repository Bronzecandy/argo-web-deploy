'use client';

import { ExploreContent } from '@/src/components/explore/ExploreContent';

export default function DonorDiscoverPage() {
  return (
    <ExploreContent
      title="Discover"
      description="Xem trung tâm và trẻ em trong mạng AgroTrust"
      childHref={(id) => `/donor/children/${id}`}
      campaignRegionHref={(region) => `/donor/campaigns/${encodeURIComponent(region)}`}
    />
  );
}
