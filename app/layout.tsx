import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'RoboDebug',
  description: 'ROS-aware AI debugger for robot software',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
