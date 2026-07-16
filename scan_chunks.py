import urllib.request
import re

chunks = [
    "fd9d1056-764cda20c6e1258e.js",
    "117-89e27d41f00d9bf6.js",
    "main-app-6fca1515cee9a03c.js",
    "795d4814-88c33303dec56276.js",
    "5e22fd23-e43a6809aff4ce6a.js",
    "972-8f21c9db584abd4a.js",
    "822-29626f7c7ab183c3.js"
]

all_urls = set()

for chunk in chunks:
    url = f"https://mp3paw.nu/_next/static/chunks/{chunk}"
    req = urllib.request.Request(
        url, 
        headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'}
    )
    try:
        with urllib.request.urlopen(req) as r:
            code = r.read().decode('utf-8')
            # Find URLs
            urls = re.findall(r'https?://[^\s"\'`()<>]+', code)
            for u in urls:
                all_urls.add(u)
    except Exception as e:
        print(f"Error {chunk}:", e)

print("All found URLs across chunks:")
for u in sorted(list(all_urls)):
    if 'next' not in u and 'react' not in u and 'w3.org' not in u:
        print(" -", u)
