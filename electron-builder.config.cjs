module.exports = {
  appId: 'com.oslab.app',
  productName: 'OSLab',
  files: ['dist/web/**/*', 'dist/compiled/*'],
  directories: { output: 'dist/release' },
  publish: { provider: 'github', releaseType: 'release' },
  releaseInfo: { releaseNotes: process.env.RELEASE_NOTES },
  icon: 'build/icon.png',
  mac: {
    category: 'public.app-category.science',
    notarize: !!process.env.APPLE_TEAM_ID,
  },
  win: { target: 'nsis' },
  linux: { target: 'AppImage', category: 'Science' },
}
