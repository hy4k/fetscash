import re, base64, gzip

with open(r'C:\Users\mithu\Downloads\FETS CMA Roster - June 2026 (standalone).html', 'r', encoding='utf-8', errors='ignore') as f:
    text = f.read()

# Find template script
match = re.search(r'<script type="__bundler/template">(.*?)</script>', text, re.DOTALL)
if match:
    template_b64 = match.group(1).strip()
    print('Template base64 length:', len(template_b64))
    
    # Clean non-ASCII
    clean = ''.join(c for c in template_b64 if ord(c) < 128)
    print('Clean length:', len(clean))
    
    decoded = base64.b64decode(clean)
    print('Decoded bytes:', len(decoded))
    
    # Try gzip
    try:
        decompressed = gzip.decompress(decoded)
        print('Gzip decompressed:', len(decompressed))
        html = decompressed.decode('utf-8', errors='ignore')
    except Exception as e:
        print('Gzip failed:', e)
        html = decoded.decode('utf-8', errors='ignore')
    
    with open('roster_template.html', 'w', encoding='utf-8') as f:
        f.write(html)
    print('Saved roster_template.html')
    print('\n--- Preview ---')
    print(html[:5000])
