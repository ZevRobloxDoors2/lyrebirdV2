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
        
        # Search for "R(" or "R=" or decrypt patterns
        for pattern in [r'\b[a-zA-Z_$][a-zA-Z0-9_$]*\s*=\s*async\s*\b', r'\b[a-zA-Z_$][a-zA-Z0-9_$]*\s*=\s*function\b', r'function\s+[a-zA-Z_$][a-zA-Z0-9_$]*']:
            matches = list(re.finditer(pattern, js))
            print(f"Pattern {pattern} matched {len(matches)} times")
            
        # Let's search for "R = " or "R=" or similar near R(a) or R(t)
        # We saw: "key:a}=t=await R(t)"
        # Let's search for "R(" and look backwards or forwards
        for match in re.finditer(r'await R\(', js):
            idx = match.start()
            print("-" * 50)
            print("Context of await R(:")
            print(js[max(0, idx - 200):min(len(js), idx + 200)])
            
        # Let's search for the definition of R in the module
        # It could be passed as a parameter, e.g. "R="
        for match in re.finditer(r'\bR\s*=\s*', js):
            idx = match.start()
            print("-" * 50)
            print("Context of R = :")
            print(js[max(0, idx - 100):min(len(js), idx + 300)])
            
except Exception as e:
    print("Error:", e)
