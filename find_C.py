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
        
        # Search for "C\s*=\s*async" or "C\s*=\s*\(" or "function C"
        for match in re.finditer(r'\bC\s*=\s*(?:async)?\s*(?:\([^)]*\)|[a-zA-Z_$][a-zA-Z0-9_$]*)\s*=>', js):
            idx = match.start()
            print("-" * 50)
            print("Context of C definition:")
            print(js[max(0, idx - 100):min(len(js), idx + 400)])
            
except Exception as e:
    print("Error:", e)
