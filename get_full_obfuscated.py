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
        
        m_idx = js.find('function M()')
        p_idx = js.find('let P="C5D58EF67A"')
        n_idx = js.find('function N(e,t)')
        
        if n_idx != -1 and m_idx != -1:
            m_end_phrase = 'return e})()}'
            m_end_offset = js.find(m_end_phrase, m_idx)
            if m_end_offset != -1:
                end_pos = m_end_offset + len(m_end_phrase)
                code_slice = js[n_idx : end_pos]
                print("Successfully extracted code slice! Length:", len(code_slice))
                
                # Wrap in Node.js execution and print P
                node_script = f"""
{code_slice}
console.log(P);
"""
            with open('eval_temp.js', 'w', encoding='utf-8') as f:
                f.write(node_script)
                
            res = subprocess.run(['node', 'eval_temp.js'], capture_output=True, text=True)
            print("RESOLVED P IS:")
            print(res.stdout.strip())
            if res.stderr:
                print("Node.js Errors:", res.stderr)
        else:
            print(f"Could not find indices. m_idx: {m_idx}, p_idx: {p_idx}")
            
except Exception as e:
    print("Error:", e)
