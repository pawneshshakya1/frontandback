import os
import re

SCREENS_DIR = r"d:\batuk\frontandback\frontend\src\screens"
OUTPUT_FILE = r"d:\batuk\frontandback\.agents\explorer_milestone_audit\raw_search_results.txt"

def find_files(directory):
    files_list = []
    for root, dirs, files in os.walk(directory):
        for file in files:
            if file.endswith(('.ts', '.tsx', '.js', '.jsx')):
                files_list.append(os.path.join(root, file))
    return files_list

def audit_file(filepath):
    rel_path = os.path.relpath(filepath, r"d:\batuk\frontandback")
    with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()
        lines = content.splitlines()

    alerts = []
    modals = []
    paddings = []

    # 1. Look for Alert.alert
    # Let's search with regex
    alert_pattern = re.compile(r'Alert\.alert\s*\(')
    for idx, line in enumerate(lines):
        if alert_pattern.search(line):
            alerts.append({
                'line_no': idx + 1,
                'content': line.strip()
            })

    # 2. Look for Modal or BlurView
    # Let's search for imports of Modal, BlurView, or <Modal, custom modals, modal overlays
    # Also search for 'backdrop-filter', 'blur' or standard styles that might indicate modal overlays.
    has_modal_import = "Modal" in content
    has_blur_import = "BlurView" in content
    
    # Check for Modal usage
    modal_usage_pattern = re.compile(r'<Modal\b|<PopupModal\b|<ModalContainer\b')
    modal_lines = []
    for idx, line in enumerate(lines):
        if modal_usage_pattern.search(line):
            modal_lines.append(idx + 1)
            
    if has_modal_import or modal_lines:
        # We'll flag this file as having a modal pattern
        # Let's analyze details (e.g. style properties)
        modals.append({
            'has_modal_import': has_modal_import,
            'has_blur_import': has_blur_import,
            'modal_lines': modal_lines,
        })

    # 3. Look for horizontal paddings in styles
    # We want paddingHorizontal, paddingLeft, paddingRight, screenPadding, or inline styles
    # We are looking for values NOT equal to 16, or SPACING.SCREEN_PADDING (assuming SPACING.SCREEN_PADDING is 16)
    # Let's search for patterns like:
    # paddingHorizontal: <value>
    # paddingLeft: <value>
    # paddingRight: <value>
    # screenPadding: <value>
    # horizontalPadding: <value>
    # Also look for styles referencing padding.
    # We want to identify values that are NOT 16, '16', "16", SPACING.SCREEN_PADDING, or spacing.screenPadding.
    # Let's match line by line:
    padding_pattern = re.compile(r'(paddingHorizontal|paddingLeft|paddingRight|screenPadding|horizontalPadding)\s*:\s*([^,\}\n]+)')
    for idx, line in enumerate(lines):
        match = padding_pattern.search(line)
        if match:
            prop = match.group(1)
            val = match.group(2).strip().strip("'\"")
            # Let's filter out values that are exactly 16 or SPACING.SCREEN_PADDING (or spacing.screenPadding, SPACING.screenPadding, etc.)
            is_valid = False
            # Check if value is 16
            if val == "16":
                is_valid = True
            elif val.lower() in ["spacing.screen_padding", "spacing.screenpadding", "spacing.screen_padding_horizontal"]:
                is_valid = True
            
            # If not 16 or SPACING.SCREEN_PADDING, report it!
            if not is_valid:
                paddings.append({
                    'line_no': idx + 1,
                    'property': prop,
                    'value': val,
                    'content': line.strip()
                })

    return alerts, modals, paddings

def main():
    files = find_files(SCREENS_DIR)
    results = []
    
    for f in files:
        alerts, modals, paddings = audit_file(f)
        if alerts or modals or paddings:
            rel_path = os.path.relpath(f, r"d:\batuk\frontandback")
            results.append({
                'file': rel_path,
                'alerts': alerts,
                'modals': modals,
                'paddings': paddings
            })
            
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as out:
        out.write(f"Audited {len(files)} files under {SCREENS_DIR}\n")
        out.write("="*80 + "\n\n")
        for res in results:
            out.write(f"FILE: {res['file']}\n")
            out.write("-" * len(res['file']) + "\n")
            if res['alerts']:
                out.write("  ALERTS:\n")
                for alert in res['alerts']:
                    out.write(f"    Line {alert['line_no']}: {alert['content']}\n")
            if res['modals']:
                for modal in res['modals']:
                    out.write(f"    MODAL PATTERN DETECTED:\n")
                    out.write(f"      Has Modal import: {modal['has_modal_import']}\n")
                    out.write(f"      Has BlurView import: {modal['has_blur_import']}\n")
                    out.write(f"      Modal tag line(s): {modal['modal_lines']}\n")
            if res['paddings']:
                out.write("  PADDINGS NOT 16:\n")
                for pad in res['paddings']:
                    out.write(f"    Line {pad['line_no']}: {pad['property']}: {pad['value']} | `{pad['content']}`\n")
            out.write("\n" + "="*80 + "\n\n")
            
    print(f"Audit completed. Results written to {OUTPUT_FILE}")

if __name__ == "__main__":
    main()
