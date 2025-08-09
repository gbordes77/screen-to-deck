import React, { useState } from 'react'
import toast from 'react-hot-toast'
import api from '@/services/api'

export const ConverterPage: React.FC = () => {
  const [file, setFile] = useState<File | null>(null)
  const [processId, setProcessId] = useState<string | null>(null)
  const [status, setStatus] = useState<any | null>(null)
  const [loading, setLoading] = useState(false)

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFile(e.target.files?.[0] || null)
  }

  const onUpload = async () => {
    if (!file) return toast.error('Sélectionnez une image')
    try {
      setLoading(true)
      const res = await api.uploadImage(file, { validateCards: true })
      if (!res.success) throw new Error('Upload failed')
      const pid = (res.data as any).processId
      setProcessId(pid)
      toast.success('Image envoyée, traitement en cours…')
      const final = await api.pollProcessingStatus(pid, (s) => setStatus(s))
      setStatus(final)
      if (final.status === 'completed') toast.success('Terminé !')
      else toast.error('Échec du traitement')
    } catch (e: any) {
      toast.error(api.handleError?.(e) || e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Convertir une capture</h2>
      <input type="file" accept="image/*" onChange={onFileChange} />
      <button className="btn-primary" onClick={onUpload} disabled={loading}>{loading ? 'Envoi…' : 'Envoyer'}</button>

      {processId && (
        <div className="mt-4">
          <div className="text-sm text-gray-600">ID: {processId}</div>
          <pre className="mt-2 text-sm bg-gray-50 p-3 rounded border border-gray-200 overflow-auto">
            {JSON.stringify(status, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}
