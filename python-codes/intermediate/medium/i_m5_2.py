from pathlib import Path

filename = Path("sample.txt")
if not filename.exists():
    filename.write_text("Hello, file!\nThis is a second line.", encoding="utf-8")

content = filename.read_text(encoding="utf-8")
lines = content.splitlines()
line_count = len(lines)
print(content)
