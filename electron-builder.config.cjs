module.exports = {
  appId: 'com.oslab.app',
  productName: 'OSLab',
  files: ['dist/web/**/*', 'dist/compiled/*'],
  directories: { output: 'dist/release' },
  icon: 'build/icon.png',
  mac: { category: 'public.app-category.science' },
  win: { target: 'nsis' },
  linux: { target: 'AppImage', category: 'Science' },
}
