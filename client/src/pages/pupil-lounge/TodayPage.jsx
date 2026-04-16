import IdentityBlock from '../../components/pupil-lounge/IdentityBlock'
import TodayStrip from '../../components/pupil-lounge/TodayStrip'

export default function TodayPage() {
  return (
    <div>
      <IdentityBlock />
      <TodayStrip />
      <div className="px-4 pb-4">
        <p className="text-navy-500 text-xs">More sections coming in 2.3-2.6</p>
      </div>
    </div>
  )
}
