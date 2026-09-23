import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'PDF 위 좌표 실험',
  description: '확대·축소하면 PDF 위에 그린 박스가 어긋나는 이유를 한 화면에서 비교합니다',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  )
}
