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
        print("Downloaded JS chunk! Length:", len(js))
        
        # Look for fetch or api strings
        apis = re.findall(r'fetch\("([^"]+)"\)', js)
        print("Fetch calls found in JS:")
        for api in apis[:10]:
            print(" -", api)
            
        # Search for post/get endpoints or anything containing api/mp3/search/download
        matches = list(set(re.findall(r'"/api/[^"]*"|\'/api/[^\']*\'', js)))
        print("API endpoints:")
        for m in matches:
            print(" -", m)
            
        # Find any other interesting strings
        paths = list(set(re.findall(r'"/mp3/[^"]*"', js)))
        print("MP3 paths:")
        for p in paths[:10]:
            print(" -", p)
            
except Exception as e:
    print("Error:", e)
