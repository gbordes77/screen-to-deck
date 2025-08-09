import { useParams } from 'react-router-dom'
import React, { useEffect, useState } from 'react'
import api from '@/services/api'

export const ResultsPage: React.FC = () => {
  const { processId } = useParams<{ processId: string }>()
  const [status, setStatus] = useState<any | null>(null)
  useEffect(() => {
    if (!processId) return
    let cancelled = false
    ;(async () => {
      try {
        const s = await api.getProcessingStatus(processId)
        if (!cancelled) setStatus(s.data)
      } catch (e) {}
    })()
    return () => { cancelled = true }
  }, [processId])
  return (
    <div>
      <h2 className="text-xl font-semibold">Résultat</h2>
      <pre className="mt-2 text-sm bg-gray-50 p-3 rounded border border-gray-200 overflow-auto">
        {JSON.stringify(status, null, 2)}
      </pre>
    </div>
  )
}
