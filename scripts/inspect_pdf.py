import fitz, os, sys

pdf_path = r'C:\Users\mithu\Downloads\1000005868_1_C934 - Disposal Instruction - July - CP 03.pdf'
out_path = r'C:\fetscash\firc_template.png'

print('opening pdf...')
if not os.path.exists(pdf_path):
    print('PDF NOT FOUND:', pdf_path)
    sys.exit(1)

try:
    doc = fitz.open(pdf_path)
    print('pages:', len(doc))
    page = doc[0]
    print('rect:', page.rect)
    zoom = 150/72
    mat = fitz.Matrix(zoom, zoom)
    pix = page.get_pixmap(matrix=mat)
    print('pixmap:', pix.width, 'x', pix.height)
    pix.save(out_path)
    print('saved:', out_path, os.path.getsize(out_path))
    doc.close()
except Exception as e:
    print('ERROR:', type(e).__name__, e)
