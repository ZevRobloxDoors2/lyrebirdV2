import urllib.request
import re

url = "https://mp3paw.nu/_next/static/chunks/app/page-d7b24636540aee16.js"
req = urllib.request.Request(
    url, 
    headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'}
)

try:
    with urllib.request.urlopen(req) as response:
        js = response.read().decode('utf-8')
        
        # Let's search for "/v2/info" or "v2/"
        for term in ["/v2/", "info", "R = async", "fetch", "axios"]:
            matches = [m.start() for m in re.finditer(term, js)]
            print(f"Found {len(matches)} occurrences of '{term}':")
            for idx in matches[:3]:
                start = max(0, idx - 150)
                end = min(len(js), idx + 250)
                print("-" * 30 + f" Match for {term} " + "-" * 30)
                print(js[start:end])
                print("-" * 65)
            
except Exception as e:
    print("Error:", e)
