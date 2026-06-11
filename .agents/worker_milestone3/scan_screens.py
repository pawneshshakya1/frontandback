import os
import re

dir_path = r"d:\batuk\frontandback\frontend\src\screens\partner"
files = os.listdir(dir_path)

alert_pattern = re.compile(r"Alert\.alert")
padding_pattern = re.compile(r"paddingHorizontal:\s*(\d+|SPACING\.\w+)")
modal_pattern = re.compile(r"<Modal[^>]*>")

print("Scanning files in partner screens directory...")
for filename in sorted(files):
    if not filename.endswith(".tsx"):
        continue
    filepath = os.path.join(dir_path, filename)
    with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
        content = f.read()
    
    has_alert = alert_pattern.search(content)
    has_modal = modal_pattern.search(content)
    has_blurview = "BlurView" in content
    
    # Check padding horizontal values
    paddings = []
    lines = content.splitlines()
    for idx, line in enumerate(lines):
        match = padding_pattern.search(line)
        if match:
            val = match.group(1)
            # If not 16 or SPACING.lg or SPACING.SCREEN_PADDING
            if val not in ["16", "SPACING.lg", "SPACING.SCREEN_PADDING"]:
                paddings.append((idx + 1, line.strip()))
                
    if has_alert or has_modal or paddings:
        print(f"\n--- {filename} ---")
        if has_alert:
            alert_lines = [idx + 1 for idx, line in enumerate(lines) if "Alert.alert" in line]
            print(f"  [ALERT] found on lines: {alert_lines}")
        if has_modal:
            modal_lines = [idx + 1 for idx, line in enumerate(lines) if "<Modal" in line]
            print(f"  [MODAL] found on lines: {modal_lines} (BlurView imported: {has_blurview})")
        if paddings:
            print("  [PADDING] non-compliant paddings:")
            for line_no, text in paddings:
                print(f"    Line {line_no}: {text}")
