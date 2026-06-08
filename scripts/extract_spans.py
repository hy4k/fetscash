import fitz

pdf_path = r'C:\Users\mithu\Downloads\1000005868_1_C934 - Disposal Instruction - July - CP 03.pdf'
doc = fitz.open(pdf_path)

keywords = [
    'Remitters', 'Name', 'Address', 'Bill Amount', 'in words', 'in Figures',
    'Purpose of', 'Remittance', 'Exam Registration', 'Purpose Code', 'P1022',
    'Date:', 'Beneficiary', 'PANAMPILLY', 'DOLLARS', 'Two thousand'
]

for page_num in [0, 1, 2]:
    page = doc[page_num]
    print(f'\n=== PAGE {page_num+1} ===')
    text_dict = page.get_text('dict')
    
    for block in text_dict['blocks']:
        if 'lines' not in block:
            continue
        for line in block['lines']:
            for span in line['spans']:
                txt = span['text'].strip()
                if not txt:
                    continue
                for kw in keywords:
                    if kw.lower() in txt.lower():
                        x0, y0, x1, y1 = span['bbox']
                        print(f'  x={x0:6.1f} y={y0:6.1f} w={x1-x0:6.1f} h={y1-y0:5.1f} | font={span["font"][:20]:20s} size={span["size"]:4.1f} | "{txt[:60]}"')
                        break

doc.close()
