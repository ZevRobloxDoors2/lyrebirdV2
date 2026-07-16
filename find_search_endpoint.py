import re

with open('homepage_content.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Let's find any URLs or Next.js static asset chunk paths
chunks = re.findall(r'src="(/_next/static/chunks/[^"]+\.js)"', html)
print("Static chunks found:")
for chunk in chunks[:10]:
    print(" -", chunk)

# Let's find any form search handlers, inputs, or scripts with routing
scripts = re.findall(r'<script[^>]*>(.*?)</script>', html, re.DOTALL)
print(f"Inline scripts: {len(scripts)}")

# Look for text matching API or path
paths = re.findall(r'"/[a-zA-Z0-9_-]+/[a-zA-Z0-9_-]+"', html)
paths_list = list(set(paths))
print("Potential API/paths:")
for p in paths_list[:15]:
    print(" -", p)
