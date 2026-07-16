import urllib.request
import urllib.parse

patterns = [
    "https://mp3paw.nu/?q=vine+boom",
    "https://mp3paw.nu/search?q=vine+boom",
    "https://mp3paw.nu/search/vine-boom",
    "https://mp3paw.nu/mp3/vine-boom",
    "https://mp3paw.nu/download/vine-boom",
]

for url in patterns:
    print(f"Trying: {url}")
    req = urllib.request.Request(
        url, 
        headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'}
    )
    try:
        with urllib.request.urlopen(req) as response:
            print(f" -> SUCCESS! Status: {response.status}, Length: {len(response.read())}")
    except Exception as e:
        print(f" -> FAILED: {e}")
