import urllib.request
import json

try:
    # 1. Get random cdn
    cdn_url = "https://media.savetube.vip/api/random-cdn"
    req_cdn = urllib.request.Request(
        cdn_url,
        headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'}
    )
    with urllib.request.urlopen(req_cdn) as resp:
        cdn_res = json.loads(resp.read().decode('utf-8'))
        cdn = cdn_res.get('cdn')
        print("Selected CDN:", cdn)

    # 2. Call v2/info
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
        print("v2/info response keys:", info_res.keys())
        
        # In JS: {key: a} = t = await R(t)
        # R(t) is probably just returning t or some decrypted/nested thing. Let's print info_res
        # Print first few characters of response to see structure
        info_res_str = json.dumps(info_res, indent=2)
        print("Info result summary:")
        print(info_res_str[:500])
        
        # Let's find key
        data = info_res.get('data', {})
        key = data.get('key') if isinstance(data, dict) else None
        print("Extracted Key:", key)
        
        if key:
            # 3. Call download endpoint
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
                print("Download response keys:", dl_res.keys())
                dl_data_res = dl_res.get('data', {})
                print("Download URL:", dl_data_res.get('downloadUrl') if isinstance(dl_data_res, dict) else dl_res.get('downloadUrl'))
except Exception as e:
    print("Error calling Savetube API:", e)
