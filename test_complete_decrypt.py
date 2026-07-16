import urllib.request
import json
import subprocess

try:
    # 1. Get cdn
    cdn_url = "https://media.savetube.vip/api/random-cdn"
    req_cdn = urllib.request.Request(
        cdn_url,
        headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'}
    )
    with urllib.request.urlopen(req_cdn) as resp:
        cdn = json.loads(resp.read().decode('utf-8')).get('cdn')
        print("CDN:", cdn)

    # 2. Get info
    info_url = f"https://{cdn}/v2/info"
    video_url = "https://www.youtube.com/watch?v=Oc7Cin_87H4"
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
        print("Full encrypted string length:", len(encrypted_data))
        
        # 3. Decrypt using node decrypt.js
        res = subprocess.run(['node', 'decrypt.js', encrypted_data], capture_output=True, text=True)
        print("Decryption Output:")
        print(res.stdout.strip())
        if res.stderr:
            print("Decryption Errors:", res.stderr)
            
except Exception as e:
    print("Error:", e)
