# One keypress selects its item, wherever the cursor happens to be.
Output "hotkeys.gif"
Set Height 240
Source ".setup.tape"

# Boot off camera so the recording opens on the rendered component.
Type "demo 03-hotkeys" Enter
Sleep 4s
Show

# Beat 1 — read the list and its hotkey column.
Sleep 2.2s

# Beat 2 — "s" selects Searchable directly, no navigation.
Type "s"
Sleep 2s
