import urllib.request
import json

url = "https://mp3paw.nu/api/yt-data"
data = {"query": "vine boom"}
req_data = json.dumps(data).encode('utf-8')

req = urllib.request.Request(
    url,
    data=req_data,
    headers={
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Content-Type': 'application/json'
    }
)

try:
    with urllib.request.urlopen(req) as response:
        res = json.loads(response.read().decode('utf-8'))
        print("API Response keys:", res.keys())
        if 'items' in res:
            items = res['items']
            print("Found items:", len(items))
            if items:
                print("First item structure:")
                print(json.dumps(items[0], indent=2))
except Exception as e:
    print("Error calling yt-data API:", e)
