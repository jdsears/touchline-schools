import { useParams } from 'react-router-dom'

export default function SportDetailPage() {
  const { sportKey } = useParams()
  return (
    <div className="p-4">
      <h1 className="text-xl font-bold text-white capitalize">{sportKey}</h1>
      <p className="text-navy-400 text-sm mt-1">Sport detail view coming in sub-task 4.2</p>
    </div>
  )
}
