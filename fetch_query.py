import urllib.request

url = "https://mp3paw.nu/?q=vine+boom"
req = urllib.request.Request(
    url, 
    headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'}
)

try:
    with urllib.request.urlopen(req) as response:
        html = response.read().decode('utf-8')
        with open('query_result.html', 'w', encoding='utf-8') as f:
            f.write(html)
        print("Saved query_result.html")
except Exception as e:
    print("Error:", e)
