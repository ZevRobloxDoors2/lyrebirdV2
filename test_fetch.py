import urllib.request
import re

url = "https://mp3paw.nu/"
req = urllib.request.Request(
    url, 
    headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'}
)

try:
    with urllib.request.urlopen(req) as response:
        html = response.read().decode('utf-8')
        print("Successfully fetched!")
        print("HTML Length:", len(html))
        
        # Look for forms or action attributes
        forms = re.findall(r'<form[^>]*>.*?</form>', html, re.DOTALL | re.IGNORECASE)
        print("Found forms:", len(forms))
        for i, f in enumerate(forms):
            print(f"Form {i+1}:", f[:300])
except Exception as e:
    print("Error:", e)
