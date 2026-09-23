'use client'

import { useRef, useState, type ComponentProps, type MouseEvent } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'

// 1편과 같습니다. 워커는 번들러가 직접 해석하게 둡니다.
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString()

type LoadedPage = Parameters<NonNullable<ComponentProps<typeof Page>['onLoadSuccess']>>[0]
type Box = { left: number; top: number; width: number; height: number }
type Kind = 'saved' | 'flip' | 'vp'

// 세 쪽 모두 이 PDF 좌표에 파란 테두리 사각형이 그려져 있습니다.
// 단위는 포인트(1/72인치), 원점은 왼쪽 아래예요.
const TARGET = { x1: 100, y1: 600, x2: 250, y2: 700 }

// ① 화면 좌표로 저장한 박스.
// A쪽을 scale 1.5로 띄워 놓고 사각형 위에 그렸을 때의 CSS 좌표를 그대로 저장했다고 가정합니다.
const SAVED_AT_1_5: Box = { left: 150, top: 138, width: 225, height: 150 }

const PAGES = [
  { n: 1, label: 'A · 평범한 쪽' },
  { n: 2, label: 'B · CropBox 원점 (50, 100)' },
  { n: 3, label: 'C · /Rotate 90' },
]

const SCALES = [
  { v: 0.75, label: '0.75' },
  { v: 1, label: '1' },
  { v: 4 / 3, label: '1.333 (pdf.js 뷰어 100%)' },
  { v: 1.5, label: '1.5' },
  { v: 2, label: '2' },
]

const LABEL: Record<Kind, string> = {
  saved: '① 화면 좌표로 저장',
  flip: '② y만 뒤집기',
  vp: '③ viewport로 변환',
}

// ② y만 뒤집는 코드. 원점이 (0, 0)이고 회전이 없다고 가정합니다.
// page.view[3]은 react-pdf 10.2까지의 page.originalHeight와 같은 값이에요.
function flipOnly(page: LoadedPage, scale: number): Box {
  const pageTop = page.view[3]
  return {
    left: TARGET.x1 * scale,
    top: (pageTop - TARGET.y2) * scale,
    width: (TARGET.x2 - TARGET.x1) * scale,
    height: (TARGET.y2 - TARGET.y1) * scale,
  }
}

// ③ 페이지를 그린 것과 같은 viewport로 두 꼭짓점을 바꿉니다.
// rotation을 따로 넘기지 않으면 react-pdf도 pdf.js도 page.rotate를 씁니다. 그래서 같은 viewport예요.
// 회전하면 꼭짓점 순서가 바뀌니까 min/abs로 정리합니다.
function viaViewport(page: LoadedPage, scale: number): Box {
  const vp = page.getViewport({ scale })
  const [ax, ay] = vp.convertToViewportPoint(TARGET.x1, TARGET.y1)
  const [bx, by] = vp.convertToViewportPoint(TARGET.x2, TARGET.y2)
  return {
    left: Math.min(ax, bx),
    top: Math.min(ay, by),
    width: Math.abs(bx - ax),
    height: Math.abs(by - ay),
  }
}

const f = (n: number) => (Math.round(n * 10) / 10).toString()

export default function Lab() {
  const [pageNumber, setPageNumber] = useState(1)
  const [scale, setScale] = useState(1)
  const [page, setPage] = useState<LoadedPage | null>(null)
  const [show, setShow] = useState<Record<Kind, boolean>>({ saved: true, flip: true, vp: true })
  const [probe, setProbe] = useState<{ css: number[]; pdf: number[] } | null>(null)
  const [canvasInfo, setCanvasInfo] = useState<{ width: number; cssWidth: string } | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const ready = page !== null && page.pageNumber === pageNumber
  const boxes: Record<Kind, Box> | null = ready
    ? { saved: SAVED_AT_1_5, flip: flipOnly(page, scale), vp: viaViewport(page, scale) }
    : null

  function onPointer(e: MouseEvent<HTMLDivElement>) {
    if (!page) return
    // canvas.width가 아니라 화면에 보이는 CSS 상자를 기준으로 잽니다.
    const r = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - r.left
    const y = e.clientY - r.top
    const [px, py] = page.getViewport({ scale }).convertToPdfPoint(x, y)
    setProbe({ css: [x, y], pdf: [px, py] })
  }

  const dpr = typeof window === 'undefined' ? 1 : window.devicePixelRatio
  const pageWidthPt = ready ? page.getViewport({ scale: 1 }).width : 0

  return (
    <>
      <div className="panel">
        <div className="row">
          <strong>쪽</strong>
          {PAGES.map((p) => (
            <button key={p.n} aria-pressed={pageNumber === p.n} onClick={() => setPageNumber(p.n)}>
              {p.label}
            </button>
          ))}
        </div>
        <div className="row" style={{ marginTop: 10 }}>
          <strong>scale</strong>
          {SCALES.map((s) => (
            <button key={s.label} aria-pressed={scale === s.v} onClick={() => setScale(s.v)}>
              {s.label}
            </button>
          ))}
        </div>
        <div className="row" style={{ marginTop: 10 }}>
          <strong>박스</strong>
          {(Object.keys(LABEL) as Kind[]).map((k) => (
            <label key={k} className={`legend ${k}`}>
              <input
                type="checkbox"
                checked={show[k]}
                onChange={(e) => setShow((s) => ({ ...s, [k]: e.target.checked }))}
              />
              {LABEL[k]}
            </label>
          ))}
        </div>
      </div>

      {boxes && (
        <div className="panel">
          <table>
            <thead>
              <tr>
                <th>박스</th>
                <th>left</th>
                <th>top</th>
                <th>width</th>
                <th>height</th>
                <th>③과 왼쪽 위 차이</th>
              </tr>
            </thead>
            <tbody>
              {(Object.keys(LABEL) as Kind[]).map((k) => {
                const b = boxes[k]
                const d = Math.hypot(b.left - boxes.vp.left, b.top - boxes.vp.top)
                return (
                  <tr key={k}>
                    <td className={`legend ${k}`}>{LABEL[k]}</td>
                    <td>{f(b.left)}</td>
                    <td>{f(b.top)}</td>
                    <td>{f(b.width)}</td>
                    <td>{f(b.height)}</td>
                    <td className={d > 0.5 ? 'bad' : 'ok'}>{d > 0.5 ? `${f(d)}px` : '같음'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <p className="note">
            page.view <code>[{page?.view.join(', ')}]</code> · page.rotate <code>{page?.rotate}</code> · 화면
            크기 <code>{f(page ? page.getViewport({ scale }).width : 0)} × {f(page ? page.getViewport({ scale }).height : 0)}</code>
          </p>
        </div>
      )}

      <div className="panel">
        <div className="row">
          <strong>devicePixelRatio</strong>
          <code>{dpr}</code>
          {canvasInfo && (
            <>
              <span>canvas.width</span>
              <code>{canvasInfo.width}</code>
              <span>CSS 폭</span>
              <code>{canvasInfo.cssWidth}</code>
              <span>canvas.width ÷ 쪽 폭(pt)</span>
              <code>{pageWidthPt ? (canvasInfo.width / pageWidthPt).toFixed(2) : '-'}</code>
              <span className="mute">← scale × devicePixelRatio. 이걸 배율로 쓰면 박스가 그만큼 밀려요.</span>
            </>
          )}
        </div>
        <div className="row" style={{ marginTop: 8 }}>
          <strong>클릭한 곳</strong>
          {probe ? (
            <>
              <span>CSS</span>
              <code>
                ({f(probe.css[0])}, {f(probe.css[1])})
              </code>
              <span>→ PDF</span>
              <code>
                ({f(probe.pdf[0])}, {f(probe.pdf[1])})
              </code>
            </>
          ) : (
            <span className="mute">페이지 아무 데나 누르면 convertToPdfPoint 결과가 나와요. 배율을 바꿔도 같은 점은 같은 값이 나와야 합니다.</span>
          )}
        </div>
      </div>

      <div className="doc">
        <Document file="/coords.pdf" loading="PDF 여는 중…">
          <Page
            pageNumber={pageNumber}
            scale={scale}
            canvasRef={canvasRef}
            renderTextLayer={false}
            renderAnnotationLayer={false}
            onLoadSuccess={(p) => {
              setPage(p)
              setProbe(null)
            }}
            onRenderSuccess={() => {
              const c = canvasRef.current
              if (c) setCanvasInfo({ width: c.width, cssWidth: c.style.width })
            }}
          >
            {boxes && (
              <div className="overlay" onClick={onPointer}>
                {(Object.keys(LABEL) as Kind[]).map((k) =>
                  show[k] ? <div key={k} className={`box ${k}`} style={boxes[k]} title={LABEL[k]} /> : null,
                )}
                {probe && <div className="dot" style={{ left: probe.css[0], top: probe.css[1] }} />}
              </div>
            )}
          </Page>
        </Document>
      </div>
    </>
  )
}
