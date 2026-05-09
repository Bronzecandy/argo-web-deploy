'use client';

import GuestPublicShell from '@/src/components/guest/GuestPublicShell';
import { CampaignRegionView } from '@/src/components/campaigns/CampaignRegionView';

export default function PublicCampaignRegionPage() {
  return (
    <GuestPublicShell>
      <CampaignRegionView
        backHref="/explore?tab=campaigns"
        backLabel="Back to Explore"
        childHref={(id) => `/children/${id}`}
      />
    </GuestPublicShell>
  );
}
