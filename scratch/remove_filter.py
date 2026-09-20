import re

with open('client/src/components/MapView.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Remove the action menu button
content = re.sub(r'<button[^>]*onClick=\{[^}]*onFilter.*?</button>', '', content, flags=re.DOTALL)
content = re.sub(r'\{\s*/\*\s*ตัวกรอง\s*\*/\s*\}\s*', '', content, flags=re.DOTALL)

with open('client/src/components/MapView.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
