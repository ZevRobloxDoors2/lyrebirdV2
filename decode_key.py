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
        
        # Let's find "let P=" context
        match = re.search(r'let P\s*=\s*"[^"]+"[^;]*', js)
        if match:
            print("Found P assignment:", match.group(0))
            
        # Let's find the array of strings in M()
        # It usually looks like a large array literal: e = ["...", "..."]
        arr_match = re.search(r'let e\s*=\s*(\[[^\]]+\])', js)
        if arr_match:
            arr_str = arr_match.group(1)
            print("String array length:", len(arr_str))
            
            # Find D(456) and D(464)
            # D is the string decoder function. Let's find D definition context
            # It usually looks like function D(e, t) or function D(t, n)
            d_matches = re.finditer(r'function\s+[a-zA-Z_$][a-zA-Z0-9_$]*\s*\(\s*[a-zA-Z_$][a-zA-Z0-9_$]*\s*,\s*[a-zA-Z_$][a-zA-Z0-9_$]*\s*\)', js)
            for dm in d_matches:
                idx = dm.start()
                print("Potential D function definition:")
                print(js[idx:idx+300])
                print("-" * 40)
except Exception as e:
    print("Error:", e)
