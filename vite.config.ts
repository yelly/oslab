import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

const isElectron = process.env.VITE_BUILD_TARGET === 'electron'

export default defineConfig({
  plugins: [react()],
  base: isElectron ? './' : '/oslab/',
  build: {
    outDir: 'dist/web',
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom'))
            return 'react'
          if (id.includes('node_modules/recharts')) return 'recharts'
        },
      },
    },
  },
  test: {
    environment: 'node',
    globals: true,
  },
})
