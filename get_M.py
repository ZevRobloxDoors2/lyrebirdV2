import urllib.request
import re
import json

url = "https://mp3paw.nu/_next/static/chunks/app/page-d7b24636540aee16.js"
req = urllib.request.Request(
    url, 
    headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'}
)

try:
    with urllib.request.urlopen(req) as response:
        js = response.read().decode('utf-8')
        
        # Let's extract the array in M()
        # It looks like: function M(){let e=["...", "..."]
        m_match = re.search(r'function M\(\)\{\s*let e\s*=\s*(\[[^\]]+\])', js)
        if m_match:
            e_arr = json.loads(m_match.group(1))
            print("Array e length:", len(e_arr))
            
            # The function N(e, t) does: e -= 450; return n[e] (where n = M())
            # But wait! There is a self-executing function right after N that rotates the array!
            # Let's inspect the rotation loop:
            # !function(e,t){ ... for(;;)try{ ... r.push(r.shift()) }...
            # This is a standard obfuscator array rotation.
            # Let's find the exact rotation code block!
            rot_match = re.search(r'!\s*function\s*\(\s*([a-zA-Z_$][a-zA-Z0-9_$]*)\s*,\s*([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\)\{\s*let n\s*=\s*[a-zA-Z_$][a-zA-Z0-9_$]*\s*,\s*r\s*=\s*e\(\);\s*for\(;;\)try\{.*?\}\s*catch\s*\(\s*[a-zA-Z_$][a-zA-Z0-9_$]*\s*\)\s*\{\s*[a-zA-Z_$][a-zA-Z0-9_$]*\.push\([a-zA-Z_$][a-zA-Z0-9_$]*\.shift\(\)\)\s*\}\s*\}\s*\(\s*M\s*,\s*([0-9]+)\s*\)', js)
            if rot_match:
                limit = int(rot_match.group(3))
                print("Rotation limit:", limit)
                
                # Let's run a simulation in Python to rotate the array e_arr!
                # We can write a quick javascript evaluator or just run a node subprocess to get the evaluated P!
                # Wait! We can write a 1-line Node.js script to run the decrypted module and output P! That is 100% accurate because Node.js has the actual JavaScript engine!
                
except Exception as e:
    print("Error:", e)
