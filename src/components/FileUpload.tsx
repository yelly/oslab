import React, { useCallback, useState } from 'react'
import { parseSumFile, type ParsedFile } from '../lib/parser'

interface Props {
  onFilesLoaded: (files: ParsedFile[]) => void
}

export function FileUpload({ onFilesLoaded }: Props) {
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const processFiles = useCallback(
    async (fileList: FileList | File[]) => {
      const files = Array.from(fileList).filter((f) => f.name.toLowerCase().endsWith('.sum'))
      if (files.length === 0) {
        setError('No .sum files found. Please select valid SUERC OSL reader output files.')
        return
      }
      setError(null)
      try {
        const parsed = await Promise.all(
          files.map(async (f) => {
            const text = await f.text()
            return parseSumFile(text, f.name)
          }),
        )
        onFilesLoaded(parsed)
      } catch (e) {
        setError(`Failed to parse files: ${e instanceof Error ? e.message : String(e)}`)
      }
    },
    [onFilesLoaded],
  )

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragging(false)
      processFiles(e.dataTransfer.files)
    },
    [processFiles],
  )

  const onInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) processFiles(e.target.files)
    },
    [processFiles],
  )

  return (
    <div className="max-w-xl mx-auto mt-16">
      <div
        className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors
          ${dragging ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300 hover:border-indigo-400 hover:bg-gray-50'}`}
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => document.getElementById('file-input')?.click()}
      >
        <div className="text-4xl mb-3">📂</div>
        <p className="text-lg font-medium text-gray-700">Drop .sum files here</p>
        <p className="text-sm text-gray-500 mt-1">or click to browse</p>
        <p className="text-xs text-gray-400 mt-3">One or more files from a single drill site</p>
        <input
          id="file-input"
          type="file"
          accept=".sum"
          multiple
          className="hidden"
          onChange={onInputChange}
        />
      </div>
      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}
    </div>
  )
}
