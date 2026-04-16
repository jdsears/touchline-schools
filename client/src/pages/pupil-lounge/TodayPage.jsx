import IdentityBlock from '../../components/pupil-lounge/IdentityBlock'
import TodayStrip from '../../components/pupil-lounge/TodayStrip'
import NextEventCard from '../../components/pupil-lounge/NextEventCard'
import RecentFeedbackCard from '../../components/pupil-lounge/RecentFeedbackCard'
import SportTilesGrid from '../../components/pupil-lounge/SportTilesGrid'

export default function TodayPage() {
  return (
    <div>
      <IdentityBlock />
      <TodayStrip />
      <NextEventCard />
      <RecentFeedbackCard />
      <SportTilesGrid />
    </div>
  )
}
