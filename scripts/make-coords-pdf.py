"""좌표 실험용 PDF. 모든 페이지에 PDF 좌표 (100,600)-(250,700) 사각형을 그립니다."""
def build(pages, path):
    objs = []
    def add(s): objs.append(s); return len(objs)
    font = add(b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>")
    page_ids = []
    content_ids = []
    for p in pages:
        stream = p['stream'].encode()
        cid = add(b"<< /Length %d >>\nstream\n" % len(stream) + stream + b"\nendstream")
        content_ids.append(cid)
    pages_id = len(objs) + len(pages) + 1
    for p, cid in zip(pages, content_ids):
        extra = p.get('extra', '')
        page_ids.append(add(("<< /Type /Page /Parent %d 0 R /MediaBox [%s] %s /Resources << /Font << /F1 %d 0 R >> >> /Contents %d 0 R >>" % (pages_id, p['media'], extra, font, cid)).encode()))
    assert len(objs) + 1 == pages_id
    add(("<< /Type /Pages /Kids [%s] /Count %d >>" % (' '.join('%d 0 R' % i for i in page_ids), len(page_ids))).encode())
    cat = add(("<< /Type /Catalog /Pages %d 0 R >>" % pages_id).encode())
    out = bytearray(b"%PDF-1.7\n%\xe2\xe3\xcf\xd3\n"); offs = []
    for i, o in enumerate(objs, 1):
        offs.append(len(out)); out += b"%d 0 obj\n" % i + o + b"\nendobj\n"
    x = len(out)
    out += b"xref\n0 %d\n0000000000 65535 f \n" % (len(objs) + 1)
    for o in offs: out += b"%010d 00000 n \n" % o
    out += b"trailer\n<< /Size %d /Root %d 0 R >>\nstartxref\n%d\n%%%%EOF\n" % (len(objs) + 1, cat, x)
    open(path, 'wb').write(out)

def grid_and_box(label, w=612, h=792):
    s = ["0.85 0.87 0.9 RG 0.5 w"]
    for x in range(0, w + 1, 50): s.append(f"{x} 0 m {x} {h} l S")
    for y in range(0, h + 1, 50): s.append(f"0 {y} m {w} {y} l S")
    s.append("0.15 0.29 0.8 RG 3 w 100 600 150 100 re S")        # 기준 사각형
    s.append("BT /F1 14 Tf 0.1 0.1 0.1 rg 104 680 Td (" + label + ") Tj ET")
    s.append("BT /F1 10 Tf 0.35 0.39 0.45 rg 104 586 Td (PDF 100,600 - 250,700) Tj ET")
    s.append("0.8 0.15 0.3 rg 0 0 m 12 0 l 0 12 l f")              # 원점 표시
    return '\n'.join(s)

pages = [
    {'media': '0 0 612 792', 'stream': grid_and_box('A: plain')},
    {'media': '0 0 612 792', 'extra': '/CropBox [50 100 562 742]', 'stream': grid_and_box('B: CropBox 50,100')},
    {'media': '0 0 612 792', 'extra': '/Rotate 90', 'stream': grid_and_box('C: Rotate 90')},
]
build(pages, 'public/coords.pdf')
print('public/coords.pdf')
