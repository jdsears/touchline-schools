import IdentityBlock from '../../components/pupil-lounge/IdentityBlock'
import TodayStrip from '../../components/pupil-lounge/TodayStrip'
import NextEventCard from '../../components/pupil-lounge/NextEventCard'

export default function TodayPage() {
  return (
    <div>
      <IdentityBlock />
      <TodayStrip />
      <NextEventCard />
      <div className="px-4 pb-4">
        <p className="text-navy-500 text-xs">More sections coming in 2.4-2.6</p>
      </div>
    </div>
  )
}
