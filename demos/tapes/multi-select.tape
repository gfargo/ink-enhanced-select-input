# Space toggles items, Enter confirms the whole selection.
Output "multi-select.gif"
Set Height 300
Source ".setup.tape"

# Boot off camera so the recording opens on the rendered component.
Type "demo 08-multi-select" Enter
Sleep 4s
Show

# Beat 1 — TypeScript starts checked via defaultSelectedKeys.
Sleep 1.8s

# Beat 2 — toggle two more (the count tracks the 1-3 bounds).
Down
Sleep 0.6s
Space
Sleep 1s
Down
Sleep 0.6s
Space
Sleep 1.4s

# Beat 3 — confirm.
Enter
Sleep 2s
