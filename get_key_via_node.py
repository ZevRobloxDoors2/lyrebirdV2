import urllib.request
import re
import subprocess

url = "https://mp3paw.nu/_next/static/chunks/app/page-d7b24636540aee16.js"
req = urllib.request.Request(
    url, 
    headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'}
)

try:
    with urllib.request.urlopen(req) as response:
        js = response.read().decode('utf-8')
        
        # We want to extract:
        # 1. function M(){...}
        # 2. function N(e,t){...}
        # 3. let D=N;
        # 4. the self-executing function !(function(...){...})(M, ...)
        # 5. the declaration of P
        
        # Let's use regex to find function M(){...}
        m_match = re.search(r'function M\(\)\{let e=\[[^\]]+\];.*?;return e\}', js)
        if not m_match:
            # Try a slightly looser match
            m_match = re.search(r'function M\(\)\{.*?;return e\}', js)
            
        n_match = re.search(r'function N\(e,t\)\{.*?\}', js)
        
        # Self executing block
        # It's right after let D=N; and before let P=...
        # We can search for the entire code block starting from function M to let P
        block_match = re.search(r'(function M\(\)\{.*?let P="C5D58EF67A"[^;]+)', js, re.DOTALL)
        
        if block_match:
            extracted_code = block_match.group(1)
            # We want to run this in Node.js and log the value of P
            node_code = f"""
{extracted_code};
console.log(P);
"""
            # Write to temp file and run
            with open('temp_eval.js', 'w', encoding='utf-8') as f:
                f.write(node_code)
                
            res = subprocess.run(['node', 'temp_eval.js'], capture_output=True, text=True)
            print("Node.js Output for P:")
            print(res.stdout.strip())
            if res.stderr:
                print("Node.js Error:", res.stderr)
        else:
            print("Could not match the code block")
            
except Exception as e:
    print("Error:", e)
