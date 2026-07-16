import urllib.request
import urllib.parse
import re

# Let's try searching for "vine-boom" or "vine boom"
query = "vine boom"
slug = urllib.parse.quote(query.lower().replace(" ", "-"))
url = f"https://mp3paw.nu/mp3/{slug}.html"
print(f"Fetching: {url}")

req = urllib.request.Request(
    url, 
    headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'}
)

try:
    with urllib.request.urlopen(req) as response:
        html = response.read().decode('utf-8')
        print("Successfully fetched search results page!")
        print("HTML length:", len(html))
        with open('search_result.html', 'w', encoding='utf-8') as f:
            f.write(html)
        
        # Look for any .mp3 or play/download links
        links = re.findall(r'href="([^"]+)"', html)
        mp3_links = [l for l in links if 'mp3' in l or 'download' in l or 'save' in l]
        print(f"Found {len(mp3_links)} potential download/mp3 links:")
        for l in mp3_links[:10]:
            print(" -", l)
except Exception as e:
    print("Error:", e)
