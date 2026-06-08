import fitz

pdf_path = r'C:\Users\mithu\Downloads\1000005868_1_C934 - Disposal Instruction - July - CP 03.pdf'
doc = fitz.open(pdf_path)

for page_num in range(len(doc)):
    page = doc[page_num]
    print(f'\n=== PAGE {page_num + 1} ===')
    text = page.get_text()
    if text.strip():
        print(text[:3000])
    else:
        print('(no text - likely scanned/image)')
    
    # Also try to get text positions for page 1
    if page_num == 0:
        blocks = page.get_text('blocks')
        print(f'\n--- BLOCKS ({len(blocks)}) ---')
        for i, block in enumerate(blocks[:30]):
            x0, y0, x1, y1, text_content, block_no, block_type = block
            print(f'Block {i}: x={x0:.1f} y={y0:.1f} w={x1-x0:.1f} h={y1-y0:.1f} | "{text_content.strip()[:60]}"')

doc.close()
