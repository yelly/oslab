import React from 'react'

interface Props {
  onClose: () => void
}

const REPO = 'https://github.com/yelly/oslab'

function ExternalLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-indigo-600 hover:underline"
    >
      {children}
    </a>
  )
}

export function HelpModal({ onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Help</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto px-6 py-5 space-y-6 text-sm text-gray-700">
          {/* How it works */}
          <section>
            <h3 className="font-semibold text-gray-900 mb-2">How it works</h3>
            <ol className="list-decimal list-inside space-y-1.5 text-gray-600">
              <li>
                <span className="font-medium text-gray-800">Upload</span> one or more{' '}
                <code className="bg-gray-100 px-1 rounded">.sum</code> files exported from the SUERC
                portable OSL reader. All files should be from the same drill site.
              </li>
              <li>
                <span className="font-medium text-gray-800">Review</span> the detected samples. The
                site name is auto-detected from the common prefix of all run names. Any samples that
                don't match the naming convention are flagged — you can rename them, mark them as
                test samples, or drop them.
              </li>
              <li>
                <span className="font-medium text-gray-800">Results</span> are shown as a
                depth-sorted table. Replicates at the same depth are averaged. You can inspect the
                depth profile chart and export everything as a CSV.
              </li>
            </ol>
          </section>

          {/* Naming convention */}
          <section>
            <h3 className="font-semibold text-gray-900 mb-2">Sample naming convention</h3>
            <p className="mb-2 text-gray-600">
              Labels follow the pattern{' '}
              <code className="bg-gray-100 px-1 rounded">
                {'{SitePrefix}{RunDepth}_{Offset}{Replicate}'}
              </code>
              , for example:
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-3 py-1.5 text-left border border-gray-200 font-medium">
                      Label
                    </th>
                    <th className="px-3 py-1.5 text-left border border-gray-200 font-medium">
                      Site
                    </th>
                    <th className="px-3 py-1.5 text-left border border-gray-200 font-medium">
                      Run depth
                    </th>
                    <th className="px-3 py-1.5 text-left border border-gray-200 font-medium">
                      Offset
                    </th>
                    <th className="px-3 py-1.5 text-left border border-gray-200 font-medium">
                      Total depth
                    </th>
                    <th className="px-3 py-1.5 text-left border border-gray-200 font-medium">
                      Replicate
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['BED40150_40a', 'BED40', '150 cm', '40 cm', '190 cm', 'a'],
                    ['BED40150_40b', 'BED40', '150 cm', '40 cm', '190 cm', 'b'],
                    ['BED40300_10a', 'BED40', '300 cm', '10 cm', '310 cm', 'a'],
                  ].map((row) => (
                    <tr key={row[0]} className="border-b border-gray-100">
                      {row.map((cell, i) => (
                        <td
                          key={i}
                          className={`px-3 py-1.5 border border-gray-200 ${i === 0 ? 'font-mono' : ''}`}
                        >
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-gray-500">
              All replicates at the same total depth (any letter suffix) are averaged together.
            </p>
          </section>

          {/* Calculations */}
          <section>
            <h3 className="font-semibold text-gray-900 mb-2">Calculations</h3>
            <p className="mb-2 text-gray-600">
              Each sample produces 7 measurement rows in sequence: DARK (r1), S1 (r2), S1 (r3), DARK
              (r4), S2 (r5), S2 (r6), DARK (r7). Any negative dark count is replaced by the
              interpolated average of its neighbours before calculations begin.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-3 py-1.5 text-left border border-gray-200 font-medium">
                      Metric
                    </th>
                    <th className="px-3 py-1.5 text-left border border-gray-200 font-medium">
                      Formula
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['IRSL Net', 'r2 + r3 − 2·r1 − 2·r4'],
                    ['IRSL Front', 'r2 − r3'],
                    ['IRSL Depletion', '(r2 − r1 − r4) / (r3 − r1 − r4)'],
                    ['OSL Net', 'r5 + r6 − 2·r4 − 2·r7'],
                    ['OSL Front', 'r5 − r6'],
                    ['OSL Depletion', '(r5 − r4 − r7) / (r6 − r4 − r7)'],
                    ['IRSL/OSL', 'IRSL Net / OSL Net'],
                  ].map(([name, formula]) => (
                    <tr key={name} className="border-b border-gray-100">
                      <td className="px-3 py-1.5 border border-gray-200 font-medium whitespace-nowrap">
                        {name}
                      </td>
                      <td className="px-3 py-1.5 border border-gray-200 font-mono">{formula}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-gray-500">
              Errors are propagated analytically from the raw measurement uncertainties. When
              replicates are averaged the mean value and mean error are reported.
            </p>
          </section>

          {/* Links */}
          <section>
            <h3 className="font-semibold text-gray-900 mb-2">Links</h3>
            <ul className="space-y-1.5 text-gray-600">
              <li>
                <ExternalLink href="https://www.gla.ac.uk/research/az/suerc/luminescence/">
                  SUERC Luminescence Dating Laboratory
                </ExternalLink>
              </li>
              <li>
                <ExternalLink href={REPO}>GitHub repository</ExternalLink> — source code
              </li>
              <li>
                <ExternalLink href={`${REPO}/issues`}>
                  Report a bug or request a feature
                </ExternalLink>
              </li>
              <li>
                <ExternalLink href={`${REPO}/releases`}>Download the desktop app</ExternalLink> —
                macOS, Windows, and Linux builds
              </li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  )
}
