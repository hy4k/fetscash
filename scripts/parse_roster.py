import re, json

with open(r'C:\Users\mithu\Downloads\FETS CMA Roster - June 2026 (standalone).html', 'r', encoding='utf-8', errors='ignore') as f:
    text = f.read()

# The roster data is in inline JS/HTML. Extract staff/shift data.
# Look for the roster table cells - they contain shift assignments

# Pattern: find all text that looks like staff rows
# Typical format: Name followed by shifts across days

# Extract the main body HTML from the inline template
# The actual roster content starts after "</style>" or similar

# Find all occurrences of day abbreviations with shift patterns
shift_pattern = re.compile(r'(\d{1,2}[:\.]\d{2}\s*(?:AM|PM|am|pm)|OFF|DAY|NIGHT|REST|LEAVE|9\s*AM|2\s*PM|1\s*PM|10\s*AM|11\s*AM)')

# Find table-like data
# Look for staff names that appear with shifts
lines = text.split('\\n')
print(f'Total lines in file: {len(lines)}')

# Search for specific roster content
roster_keywords = ['CMA', 'Staff', 'Roster', 'June', 'Shift', 'Morning', 'Evening', 'Night']
for kw in roster_keywords:
    count = text.count(kw)
    if count > 0:
        print(f'{kw}: {count} occurrences')

# Extract all text nodes that might contain staff data
# The roster likely has entries like: "John" "7:30 AM" "OFF" etc.
all_shifts = shift_pattern.findall(text)
print(f'\nShift occurrences found: {len(all_shifts)}')
unique_shifts = sorted(set(s.strip() for s in all_shifts))
print(f'Unique shifts: {unique_shifts}')

# Try to find staff names by looking for capitalized words near shifts
# Save a snippet around first shift occurrence
first_shift = all_shifts[0] if all_shifts else None
if first_shift:
    idx = text.find(first_shift)
    snippet = text[max(0, idx-500):idx+1000]
    print(f'\nSnippet around first shift:\n{snippet[:1000]}')
