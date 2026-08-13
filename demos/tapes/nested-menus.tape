# Drill into a submenu, back out with Escape, then commit to a different branch.
Output "nested-menus.gif"
Set Height 250
Source ".setup.tape"

# Boot off camera so the recording opens on the rendered component.
Type "demo recipes/nested-menus" Enter
Sleep 4s
Show

# Beat 1 — the root menu.
Sleep 1.5s

# Beat 2 — drill into Deploy's submenu (note the group header).
Enter
Sleep 2.2s

# Beat 3 — Escape backs out to the root menu.
Escape
Sleep 1.8s

# Beat 4 — into Database instead, and select.
Down
Sleep 0.7s
Enter
Sleep 1.8s
Enter
Sleep 2s
