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
        idx = js.find('let P="C5D58EF67A"')
        if idx != -1:
            # Let's print 1200 characters before and 300 characters after
            start = max(0, idx - 1500)
            end = min(len(js), idx + 200)
            print("CONTEXT AROUND P:")
            print(js[start:end])
        else:
            print("Could not find P string index")
except Exception as e:
    print("Error:", e)
