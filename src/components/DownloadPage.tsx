import { useEffect, useState } from 'react'

const REPO_API = 'https://api.github.com/repos/yelly/oslab/releases/latest'

interface Asset {
  name: string
  browser_download_url: string
  size: number
}

interface Release {
  tag_name: string
  assets: Asset[]
}

type Platform = 'mac' | 'windows' | 'linux' | 'unknown'

const PLATFORM_LABELS: Record<Exclude<Platform, 'unknown'>, string> = {
  mac: 'macOS',
  windows: 'Windows',
  linux: 'Linux',
}

const PLATFORM_EXTS: Record<Exclude<Platform, 'unknown'>, string> = {
  mac: '.dmg',
  windows: '.exe',
  linux: '.AppImage',
}

function detectPlatform(): Platform {
  const ua = navigator.userAgent
  if (ua.includes('Mac OS X')) return 'mac'
  if (ua.includes('Windows')) return 'windows'
  if (ua.includes('Linux')) return 'linux'
  return 'unknown'
}

function findAsset(releaseAssets: Asset[], ext: string): Asset | undefined {
  return releaseAssets.find((a) => a.name.endsWith(ext))
}

function formatBytes(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(0)} MB`
}

interface Props {
  onBack: () => void
}

export function DownloadPage({ onBack }: Props) {
  const [release, setRelease] = useState<Release | null>(null)
  const [error, setError] = useState(false)
  const platform = detectPlatform()

  useEffect(() => {
    fetch(REPO_API)
      .then((r) => r.json())
      .then(setRelease)
      .catch(() => setError(true))
  }, [])

  if (error) {
    return (
      <div className="text-center py-16 text-gray-500 text-sm">
        Failed to load release information. View releases on{' '}
        <a
          href="https://github.com/yelly/oslab/releases/latest"
          className="text-indigo-600 hover:underline"
        >
          GitHub
        </a>
        .
      </div>
    )
  }

  if (!release) {
    return <div className="text-center py-16 text-gray-400 text-sm">Loading...</div>
  }

  const recommendedExt = platform !== 'unknown' ? PLATFORM_EXTS[platform] : null
  const recommended = recommendedExt ? findAsset(release.assets, recommendedExt) : null

  return (
    <div className="max-w-lg mx-auto py-12">
      <button onClick={onBack} className="text-sm text-indigo-600 hover:underline mb-6 block">
        ← Back
      </button>
      <h2 className="text-2xl font-semibold text-gray-900 mb-1">Download OSLab</h2>
      <p className="text-sm text-gray-500 mb-8">Latest release: {release.tag_name}</p>

      {recommended && platform !== 'unknown' && (
        <a
          href={recommended.browser_download_url}
          className="flex items-center justify-between w-full px-5 py-4 bg-indigo-600 text-white rounded-xl mb-6 hover:bg-indigo-700 transition-colors"
        >
          <div>
            <p className="font-medium">Download for {PLATFORM_LABELS[platform]}</p>
            <p className="text-indigo-200 text-sm">{recommended.name}</p>
          </div>
          <div className="text-right text-indigo-200 text-sm">{formatBytes(recommended.size)}</div>
        </a>
      )}

      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 text-xs font-medium text-gray-500">
          All platforms
        </div>
        {(Object.keys(PLATFORM_EXTS) as Exclude<Platform, 'unknown'>[]).map((p) => {
          const asset = findAsset(release.assets, PLATFORM_EXTS[p])
          if (!asset) return null
          return (
            <a
              key={p}
              href={asset.browser_download_url}
              className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0"
            >
              <div>
                <p className="text-sm font-medium text-gray-800">{PLATFORM_LABELS[p]}</p>
                <p className="text-xs text-gray-400">{asset.name}</p>
              </div>
              <span className="text-xs text-gray-400">{formatBytes(asset.size)}</span>
            </a>
          )
        })}
      </div>
    </div>
  )
}
