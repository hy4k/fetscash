import re

with open(r'C:\Users\mithu\Downloads\FETS CMA Roster - June 2026 (standalone).html', 'rb') as f:
    raw = f.read()

# Find template script content between tags
tag_start = b'<script type="__bundler/template">'
tag_end = b'</script>'
start = raw.find(tag_start)
end = raw.find(tag_end, start + len(tag_start))
if start != -1 and end != -1:
    template_data = raw[start + len(tag_start):end].strip()
    print('Raw template data length:', len(template_data))
    
    import base64, gzip
    try:
        decoded = base64.b64decode(template_data)
        print('Base64 decoded:', len(decoded))
        decompressed = gzip.decompress(decoded)
        print('Gzip decompressed:', len(decompressed))
        html = decompressed.decode('utf-8', errors='ignore')
        print('HTML decoded successfully')
        with open('roster_template.html', 'w', encoding='utf-8') as f:
            f.write(html)
        print('Saved!')
    except Exception as e:
        print('Decode error:', type(e).__name__, e)
else:
    print('Could not find template tags')
