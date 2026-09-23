'use client'

import dynamic from 'next/dynamic'

// pdf.js는 모듈을 읽는 순간 DOMMatrix를 만들어서 서버에서 평가되면 죽습니다(1편 내용).
// 그래서 뷰어는 처음부터 ssr:false로 불러옵니다.
const Lab = dynamic(() => import('./lab'), {
  ssr: false,
  loading: () => <p>뷰어 불러오는 중…</p>,
})

export default function Page() {
  return (
    <main>
      <h1>PDF 위 좌표 실험</h1>
      <p className="sub">
        세 쪽 모두 PDF 좌표 (100, 600)–(250, 700)에 파란 테두리 사각형이 그려져 있어요. 그 위에 박스 세 개를
        저장 방식만 다르게 얹었습니다. 배율과 쪽을 바꿔 보면서 어느 박스가 따라오는지 보세요.
      </p>
      <Lab />
    </main>
  )
}
