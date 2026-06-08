import fitz, os

pdf_path = r'C:\Users\mithu\Downloads\1000005868_1_C934 - Disposal Instruction - July - CP 03.pdf'
doc = fitz.open(pdf_path)

out_path = r'C:\fetscash\firc_text_dump.txt'
with open(out_path, 'w', encoding='utf-8') as f:
    for page_num in range(len(doc)):
        page = doc[page_num]
        f.write(f'\n=== PAGE {page_num + 1} ===\n')
        text = page.get_text()
        f.write(text)
        f.write('\n')
        
        if page_num == 0:
            f.write('\n--- BLOCKS ---\n')
            blocks = page.get_text('blocks')
            for i, block in enumerate(blocks):
                x0, y0, x1, y1, text_content, block_no, block_type = block
                f.write(f'Block {i}: x={x0:.1f} y={y0:.1f} w={x1-x0:.1f} h={y1-y0:.1f} | "{text_content.strip()[:80]}"\n')

doc.close()
print('saved to', out_path)
