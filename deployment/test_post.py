import requests

# Set the URL and data
url = 'https://httpbin.org/post'
data = 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'

# Set the headers
headers = {
    'sec-ch-ua-platform': '"Windows"',
    'Referer': 'https://humusmonitor.de/',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36',
    'sec-ch-ua': '"Chromium";v="134", "Not:A-Brand";v="24", "Google Chrome";v="134"',
    'Content-Type': 'text/plain',
    'sec-ch-ua-mobile': '?0'
}

# Send the POST request with headers and data
response = requests.post(url, headers=headers, data=data)

# Print the response
print(response.json())