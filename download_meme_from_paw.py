import sys
import urllib.request
import json
import subprocess
import os
import time

def download_meme(query, filename):
    print("==================================================")
    print(f"Processing: Query='{query}', Filename='{filename}'")
    print("==================================================")
    
    # 1. Search MP3Paw
    try:
        url = "https://mp3paw.nu/api/yt-data"
        data = {"query": query}
        req_data = json.dumps(data).encode('utf-8')
        req = urllib.request.Request(
            url,
            data=req_data,
            headers={
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Content-Type': 'application/json'
            }
        )
        with urllib.request.urlopen(req) as response:
            res = json.loads(response.read().decode('utf-8'))
            items = res.get('items', [])
            if not items:
                print(f"Error: No search results found for '{query}' on MP3Paw.")
                return False
            
            first_item = items[0]
            video_url = first_item.get('url')
            title = first_item.get('title')
            print(f"Top Result: '{title}' -> URL: {video_url}")
    except Exception as e:
        print(f"Error searching MP3Paw for '{query}': {e}")
        return False

    # 2. Call SaveTube random CDN
    try:
        print("Fetching random CDN...")
        cdn_url = "https://media.savetube.vip/api/random-cdn"
        req_cdn = urllib.request.Request(
            cdn_url,
            headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'}
        )
        with urllib.request.urlopen(req_cdn) as resp:
            cdn = json.loads(resp.read().decode('utf-8')).get('cdn')
            print(f"Selected CDN: {cdn}")
            
        if not cdn:
            print("Failed to get CDN.")
            return False

        # 3. Call v2/info
        print(f"Calling v2/info for URL: {video_url}...")
        info_url = f"https://{cdn}/v2/info"
        info_data = {"url": video_url}
        req_info_data = json.dumps(info_data).encode('utf-8')
        req_info = urllib.request.Request(
            info_url,
            data=req_info_data,
            headers={
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Content-Type': 'application/json'
            }
        )
        with urllib.request.urlopen(req_info) as resp_info:
            info_res = json.loads(resp_info.read().decode('utf-8'))
            encrypted_data = info_res.get('data')
            
        if not encrypted_data:
            print(f"Failed to get info response. API returned: {info_res}")
            return False
            
        # 4. Decrypt encrypted string using node decrypt.js
        print("Decrypting info response...")
        res = subprocess.run(['node', 'decrypt.js', encrypted_data], capture_output=True, text=True)
        if res.returncode != 0:
            print("Decryption failed with stderr:", res.stderr)
            return False
            
        decrypted_json = json.loads(res.stdout.strip())
        key = decrypted_json.get('key')
        if not key:
            print(f"No key found in decrypted data: {decrypted_json}")
            return False
        print(f"Extracted Key: {key}")
        
        # 5. Request download URL from CDN
        print("Requesting download URL from CDN...")
        dl_url = f"https://{cdn}/download"
        dl_data = {"downloadType": "audio", "quality": 128, "key": key}
        req_dl_data = json.dumps(dl_data).encode('utf-8')
        
        req_dl = urllib.request.Request(
            dl_url,
            data=req_dl_data,
            headers={
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Content-Type': 'application/json'
            }
        )
        with urllib.request.urlopen(req_dl) as resp_dl:
            dl_res = json.loads(resp_dl.read().decode('utf-8'))
            dl_data_res = dl_res.get('data', {})
            if isinstance(dl_data_res, dict):
                download_url = dl_data_res.get('downloadUrl')
            else:
                download_url = dl_res.get('downloadUrl')
                
        if not download_url:
            print("Failed to get download URL. Response:", dl_res)
            return False
            
        # 6. Download file
        target_path = os.path.join("public", "sounds", filename)
        print(f"Downloading MP3 from {download_url} to {target_path}...")
        os.makedirs(os.path.dirname(target_path), exist_ok=True)
        
        req_file = urllib.request.Request(
            download_url,
            headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'}
        )
        with urllib.request.urlopen(req_file) as response, open(target_path, 'wb') as out_file:
            out_file.write(response.read())
            
        print(f"Successfully downloaded {filename} to {target_path}!")
        return True
    except Exception as e:
        print(f"An error occurred during download of '{filename}': {e}")
        return False

# List of memes to download
memes_to_download = [
    {"query": "daddy's home usher meme", "filename": "daddys-home.mp3"},
    {"query": "metal pipe falling sound effect", "filename": "metal-pipe.mp3"},
    {"query": "bing chilling john cena sound effect", "filename": "bing-chilling.mp3"},
    {"query": "directed by robert b weide", "filename": "robert-weide.mp3"},
    {"query": "what the dog doin sound effect", "filename": "dog-doin.mp3"},
    {"query": "rickroll never gonna give you up", "filename": "rickroll.mp3"}
]

print("Starting MP3Paw download process...")
success_count = 0
for meme in memes_to_download:
    success = download_meme(meme["query"], meme["filename"])
    if success:
        success_count += 1
    # Small pause between downloads to be polite to the CDN
    time.sleep(1.0)

print(f"Finished! Successfully downloaded {success_count}/{len(memes_to_download)} memes.")
sys.exit(0 if success_count > 0 else 1)
