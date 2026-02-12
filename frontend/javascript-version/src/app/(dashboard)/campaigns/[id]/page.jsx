import CampaignView from '@/views/campaigns/CampaignView'

const CampaignViewPage = ({ params }) => {
  return <CampaignView campaignId={params.id} />
}

export default CampaignViewPage
