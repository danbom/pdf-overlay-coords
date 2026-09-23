# pdf-overlay-coords

PDF 위에 그린 박스가 확대·축소하면 어긋나는 이유를 한 화면에서 비교하는 최소 예제예요.
블로그 글 「브라우저에서 문서 다루기 #2」의 재현 저장소입니다.

## 결론 먼저

| 저장 방식 | 배율을 바꾸면 | CropBox 원점이 0이 아니면 | /Rotate 90이면 |
| --- | --- | --- | --- |
| ① 화면(CSS) 좌표로 저장 | 저장한 배율에서만 맞음 | 어긋남 | 어긋남 |
| ② PDF 좌표를 저장하고 y만 뒤집기 (`view[3] − y`) | 맞음 | x가 원점만큼 밀림 | 방향부터 틀림 |
| ③ PDF 좌표를 저장하고 `viewport.convertToViewportPoint`로 변환 | 맞음 | 맞음 | 맞음 |

박스 좌표는 **PDF 포인트로 저장하고, 그릴 때마다 그 페이지를 그린 viewport로 바꾸는 것**이 정답이에요.
반대 방향(클릭 → 저장)은 `viewport.convertToPdfPoint`를 씁니다.

## 실행

```bash
npm install
npm run dev      # http://localhost:3000
npm run versions # next / react-pdf / pdfjs-dist 버전 확인
```

`next.config.ts`는 비어 있어요. 이유는 [1편 저장소](https://github.com/danbom/nextjs-pdfjs-minimal)에 있습니다.

## 화면에서 볼 것

- `public/coords.pdf`는 세 쪽짜리예요. 모든 쪽의 PDF 좌표 (100, 600)–(250, 700)에 파란 테두리 사각형이 있습니다.
  - A · 평범한 쪽 (MediaBox 0 0 612 792)
  - B · CropBox가 `[50 100 562 742]`인 쪽 — 스캔본이나 잘라낸 PDF에서 흔해요
  - C · `/Rotate 90`인 쪽 — 가로로 저장된 문서
- 그 위에 박스 세 개(①②③)를 얹었어요. 초록(③)만 모든 쪽, 모든 배율에서 파란 사각형과 겹칩니다.
- 표에 각 박스의 left/top/width/height와 ③과의 차이가 나와요.
- 페이지를 누르면 그 점을 `convertToPdfPoint`로 바꾼 값이 나옵니다. 배율을 바꿔도 같은 점은 같은 값이어야 해요.
- `canvas.width ÷ 쪽 폭`은 `scale × devicePixelRatio`예요. react-pdf는 캔버스를 DPR만큼 크게 그리고 CSS로 줄입니다.
  캔버스 픽셀로 배율을 계산하면 박스가 DPR만큼 밀려요.

## 확인한 버전

- 코드는 react-pdf 10.4.1 소스(pdfjs-dist 5.4.296)를 기준으로 썼고, Next.js 16 개발 서버에서 세 쪽 × scale 1·2를 띄워 표 값과 박스 위치가 맞는지 확인했어요
- 좌표 값은 pdfjs-dist 5.7.284와 pdf.js 6.4.217 데모 뷰어에서도 같았어요
- react-pdf 10.2.0까지는 `page.originalWidth`/`originalHeight`가 `view[2]`/`view[3]`이었고,
  10.3.0부터 `getViewport({ scale: 1 })` 기준으로 바뀌었습니다(회전한 쪽 크기 수정, #2027)

## 테스트 PDF 다시 만들기

```bash
python3 scripts/make-coords-pdf.py   # public/coords.pdf 를 다시 씁니다
```
