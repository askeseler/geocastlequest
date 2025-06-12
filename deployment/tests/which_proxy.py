import requests

url = "http://www.google.com"

for label, proxy in [("proxies=None", None), ("proxies={'http': None, 'https': None}", {"http": None, "https": None})]:
    try:
        print(f"Testing with {label}")
        response = requests.get(url, proxies=proxy, timeout=1)
        print(f"Success: {response.status_code}")
    except Exception as e:
        print(f"Failed: {e}")
    print()
