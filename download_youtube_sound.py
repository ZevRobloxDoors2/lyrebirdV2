import sys
import urllib.request
import json
import subprocess
import os

if len(sys.argv) < 3:
    print("Usage: python download_youtube_sound.py <youtube_url> <target_filename>")
    sys.exit(1)

video_url = sys.argv[1]
filename = sys.argv[2]
if not filename.endswith('.mp3'):
    filename += '.mp3'

target_path = os.path.join("public", "sounds", filename)

try:
    print(f"Fetching random CDN...")
    cdn_url = "https://media.savetube.vip/api/random-cdn"
    req_cdn = urllib.request.Request(
        cdn_url,
        headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'}
    )
    with urllib.request.urlopen(req_cdn) as resp:
        cdn = json.loads(resp.read().decode('utf-8')).get('cdn')
        print(f"Selected CDN: {cdn}")

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
        
    print("Decrypting info response...")
    res = subprocess.run(['node', 'decrypt.js', encrypted_data], capture_output=True, text=True)
    if res.returncode != 0:
        print("Decryption failed with stderr:", res.stderr)
        sys.exit(1)
        
    decrypted_json = json.loads(res.stdout.strip())
    key = decrypted_json.get('key')
    print(f"Extracted Key: {key}")
    
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
        sys.exit(1)
        
    print(f"Downloading MP3 from {download_url} to {target_path}...")
    os.makedirs(os.path.dirname(target_path), exist_ok=True)
    
    # Download with a User-Agent to avoid blocks
    req_file = urllib.request.Request(
        download_url,
        headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'}
    )
    with urllib.request.urlopen(req_file) as response, open(target_path, 'wb') as out_file:
        out_file.write(response.read())
        
    print(f"Successfully downloaded {filename} to {target_path}!")
    
except Exception as e:
    print("An error occurred during download:", e)
    sys.exit(1)
