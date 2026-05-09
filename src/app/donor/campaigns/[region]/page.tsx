'use client';

import { CampaignRegionView } from '@/src/components/campaigns/CampaignRegionView';

export default function DonorCampaignRegionPage() {
  return (
    <CampaignRegionView
      backHref="/donor/discover?tab=campaigns"
      backLabel="Back to Discover"
      childHref={(id) => `/donor/children/${id}`}
    />
  );
}
