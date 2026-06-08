import fitz, os, sys

pdf_path = r'C:\Users\mithu\Downloads\1000005868_1_C934 - Disposal Instruction - July - CP 03.pdf'
out_dir = r'C:\fetscash\public'

os.makedirs(out_dir, exist_ok=True)

print('Opening PDF...')
doc = fitz.open(pdf_path)
print(f'Pages: {len(doc)}')

zoom = 150/72
mat = fitz.Matrix(zoom, zoom)

for i in range(len(doc)):
    page = doc[i]
    pix = page.get_pixmap(matrix=mat)
    out = os.path.join(out_dir, f'firc_page{i+1}.png')
    pix.save(out)
    print(f'Saved {out} ({os.path.getsize(out)} bytes)')

doc.close()
print('Done.')
