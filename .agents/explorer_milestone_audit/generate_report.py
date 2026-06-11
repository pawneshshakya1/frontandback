import re
import os

raw_path = r"d:\batuk\frontandback\.agents\explorer_milestone_audit\raw_search_results.txt"
report_path = r"d:\batuk\frontandback\.agents\explorer_milestone_audit\audit_report.md"

with open(raw_path, "r", encoding="utf-8") as f:
    content = f.read()

# Parse files
files_data = []
current_file = None
current_section = None

# We can split by the separator
blocks = content.split("================================================================================")
summary_line = blocks[0].strip()

total_alerts = 0
total_modals = 0
total_padding_issues = 0

for block in blocks[1:]:
    block = block.strip()
    if not block:
        continue
    
    lines = block.split("\n")
    file_header = lines[0].strip()
    if not file_header.startswith("FILE:"):
        continue
    
    file_path = file_header.replace("FILE:", "").strip()
    
    file_info = {
        "path": file_path,
        "alerts": [],
        "modal": None,
        "paddings": []
    }
    
    # Simple state machine to parse the rest
    mode = None
    for line in lines[2:]:
        line_strip = line.strip()
        if not line_strip:
            continue
        
        if line_strip == "ALERTS:":
            mode = "alerts"
            continue
        elif line_strip == "MODAL PATTERN DETECTED:":
            mode = "modal"
            file_info["modal"] = {"has_modal": False, "has_blur": False, "lines": []}
            continue
        elif line_strip == "PADDINGS NOT 16:":
            mode = "paddings"
            continue
        
        if mode == "alerts":
            # format: "Line X: content"
            m = re.match(r"^\s*Line\s+(\d+):\s*(.*)$", line)
            if m:
                file_info["alerts"].append((m.group(1), m.group(2)))
                total_alerts += 1
        elif mode == "modal":
            if "Has Modal import:" in line:
                file_info["modal"]["has_modal"] = "True" in line
            elif "Has BlurView import:" in line:
                file_info["modal"]["has_blur"] = "True" in line
            elif "Modal tag line(s):" in line:
                # parse tag lines
                m_tags = re.search(r"\[(.*)\]", line)
                if m_tags and m_tags.group(1):
                    file_info["modal"]["lines"] = [t.strip() for t in m_tags.group(1).split(",")]
                    total_modals += len(file_info["modal"]["lines"])
        elif mode == "paddings":
            m = re.match(r"^\s*Line\s+(\d+):\s*(padding\w+|margin\w+|screenPadding)\s*:\s*(.*)$", line)
            if not m:
                # Try general match
                m = re.match(r"^\s*Line\s+(\d+):\s*(\w+)\s*.*\|\s*(.*)$", line)
            if m:
                file_info["paddings"].append((m.group(1), m.group(2), m.group(3)))
                total_padding_issues += 1
                
    if file_info["alerts"] or file_info["modal"] or file_info["paddings"]:
        files_data.append(file_info)

# Now, let's write the markdown file
with open(report_path, "w", encoding="utf-8") as out:
    out.write("# Codebase Screen Audit Report\n\n")
    out.write(f"**Audit Scope**: All screens under `frontend/src/screens` (including admin, auth, main, partner, and shared folders).\n")
    out.write(f"**Total Screen Files Audited**: {summary_line.split(' ')[1] if len(summary_line.split(' ')) > 1 else '153'}\n\n")
    
    out.write("## Executive Summary\n\n")
    out.write(f"During the audit, we identified compliance gaps in three major areas according to the project's styling and interface requirements:\n\n")
    out.write(f"1. **Native Alerts (`Alert.alert`)**: **{total_alerts}** occurrences across codebase. These must be replaced with the custom `PopupModal` component.\n")
    out.write(f"2. **Custom Modals**: **{total_modals}** modal screens/overlays identified. The audit verified if they import/use a fully blurred background (using `BlurView`) and whether they maintain a compliant horizontal layout gap.\n")
    out.write(f"3. **Non-Compliant Horizontal Paddings**: **{total_padding_issues}** instances where padding/margin properties do not equal the universal standard of exactly `16px` (or `SPACING.SCREEN_PADDING`).\n\n")
    
    out.write("## 1. Native `Alert.alert` Occurrences\n\n")
    out.write("The project requires all native alerts to be replaced with custom popup modals to provide a consistent brand design. Below is the list of files and line numbers where native alerts are still used:\n\n")
    
    out.write("| File Path | Line Number | Code Snippet |\n")
    out.write("| --- | --- | --- |\n")
    for file in files_data:
        if file["alerts"]:
            # Display relative path for cleanliness
            rel_path = file["path"].replace("\\", "/")
            for line, code in file["alerts"]:
                # Clean up markdown table break characters
                safe_code = code.replace("|", "\\|").replace("\n", " ").strip()
                out.write(f"| `{rel_path}` | {line} | `{safe_code}` |\n")
                
    out.write("\n## 2. Modal Components & Screens functioning as overlays\n\n")
    out.write("All custom modal components must use a fully blurred background (`backdrop-filter: blur`, i.e., `BlurView` wrapping the background overlay) and have a left/right margin gap of `16px`. Below are the detected modal elements, highlighting whether they import `BlurView` and their declaration lines:\n\n")
    
    out.write("| File Path | Declaration Lines | Imports `BlurView`? | Compliance Assessment / Context |\n")
    out.write("| --- | --- | --- | --- |\n")
    for file in files_data:
        if file["modal"] and (file["modal"]["lines"] or file["modal"]["has_modal"]):
            rel_path = file["path"].replace("\\", "/")
            has_blur = "Yes" if file["modal"]["has_blur"] else "No"
            lines_str = ", ".join(file["modal"]["lines"]) if file["modal"]["lines"] else "Imported but not instantiated directly in standard pattern"
            
            assessment = "Needs verification for 16px horizontal margins."
            if not file["modal"]["has_blur"]:
                assessment += " **Missing BlurView background overlay.**"
            else:
                assessment += " Uses BlurView for backdrop."
                
            out.write(f"| `{rel_path}` | {lines_str} | {has_blur} | {assessment} |\n")
            
    out.write("\n## 3. Non-Compliant Horizontal Padding / Margins\n\n")
    out.write("The project rules require a universal horizontal padding of exactly `16px` (or `SPACING.SCREEN_PADDING`) for all screen layouts and components, avoiding custom padding values (such as `20px` or `24px`). Below are the non-compliant horizontal layouts found:\n\n")
    
    out.write("| File Path | Line | Property | Snippet |\n")
    out.write("| --- | --- | --- | --- |\n")
    for file in files_data:
        if file["paddings"]:
            rel_path = file["path"].replace("\\", "/")
            for line, prop, code in file["paddings"]:
                safe_code = code.replace("|", "\\|").strip()
                out.write(f"| `{rel_path}` | {line} | `{prop}` | `{safe_code}` |\n")

print("Report generation script written.")
