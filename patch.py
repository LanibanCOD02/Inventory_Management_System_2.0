import sys

with open('app.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()

try_start = -1
for i, line in enumerate(lines):
    if "const response = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });" in line:
        try_start = i
        break

if try_start != -1:
    end_idx = -1
    for i in range(try_start, len(lines)):
        if "window.URL.revokeObjectURL(downloadUrl);" in lines[i]:
            end_idx = i
            break
    
    if end_idx != -1:
        new_lines = lines[:try_start]
        new_lines.append("    // Navigate directly to download to prevent silent blocking by popup blockers or Safari\n")
        new_lines.append("    window.location.href = url;\n")
        new_lines.extend(lines[end_idx+1:])
        
        with open('app.js', 'w', encoding='utf-8') as f:
            f.writelines(new_lines)
        print("Success")
    else:
        print("End not found")
else:
    print("Start not found")
