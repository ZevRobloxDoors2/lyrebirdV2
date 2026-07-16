import urllib.request

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
        print("m_idx:", m_idx)
        print("p_idx:", p_idx)
        if m_idx != -1:
            print("Around m_idx:", js[m_idx:m_idx+100])
        if p_idx != -1:
            print("Around p_idx:", js[p_idx:p_idx+100])
except Exception as e:
    print("Error:", e)
