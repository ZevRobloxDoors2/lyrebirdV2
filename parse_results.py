import re

with open('query_result.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Let's search for keywords "vine" or "boom" or "mp3"
print("Occurrences of 'vine':", len(re.findall(r'vine', html, re.I)))
print("Occurrences of 'boom':", len(re.findall(r'boom', html, re.I)))
print("Occurrences of 'mp3':", len(re.findall(r'mp3', html, re.I)))

# Check if there are any dynamic script variables that contain results
# Next.js page data is often inside <script id="__NEXT_DATA__" type="application/json"> or similar
next_data = re.findall(r'<script id="__NEXT_DATA__"[^>]*>(.*?)</script>', html, re.DOTALL)
if next_data:
    print("Found __NEXT_DATA__!")
    print("Length:", len(next_data[0]))
    with open('next_data.json', 'w', encoding='utf-8') as df:
        df.write(next_data[0])
else:
    # Also look for any self.__next_f.push lines or similar Next.js 13/14 App Router state pushes
    pushes = re.findall(r'self\.__next_f\.push\((.*?)\)', html, re.DOTALL)
    print(f"Found {len(pushes)} self.__next_f.push entries")
    for i, p in enumerate(pushes[:5]):
        print(f"Push {i+1}:", p[:150])
