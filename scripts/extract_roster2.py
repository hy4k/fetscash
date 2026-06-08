import re, json, base64, gzip, zlib

with open(r'C:\Users\mithu\Downloads\FETS CMA Roster - June 2026 (standalone).html', 'r', encoding='utf-8', errors='ignore') as f:
    text = f.read()

# Find manifest script
manifest_match = re.search(r'<script type="__bundler/manifest">(.*?)</script>', text, re.DOTALL)
if manifest_match:
    manifest_text = manifest_match.group(1).strip()
    print('Manifest length:', len(manifest_text))
    
    # Try base64
    try:
        decoded = base64.b64decode(manifest_text)
        print('Manifest decoded:', len(decoded))
        manifest = json.loads(decoded.decode('utf-8', errors='ignore'))
        print('Manifest keys:', list(manifest.keys())[:5])
        print('Total entries:', len(manifest))
    except Exception as e:
        print('Manifest decode error:', e)
        manifest = None
else:
    print('No manifest found')
    manifest = None

# Find template script
template_match = re.search(r'<script type="__bundler/template">(.*?)</script>', text, re.DOTALL)
if template_match:
    template_text = template_match.group(1).strip()
    print('\nTemplate length:', len(template_text))
    
    # Try various decompression methods
    for name, decoder in [
        ('base64+zlib', lambda x: zlib.decompress(base64.b64decode(x))),
        ('base64+gzip', lambda x: gzip.decompress(base64.b64decode(x))),
    ]:
        try:
            result = decoder(template_text)
            html = result.decode('utf-8', errors='ignore')
            print(f'{name} SUCCESS! Decoded {len(html)} chars')
            with open('roster_template.html', 'w', encoding='utf-8') as f:
                f.write(html)
            print('Saved to roster_template.html')
            break
        except Exception as e:
            print(f'{name} failed: {e}')
else:
    print('No template found')
