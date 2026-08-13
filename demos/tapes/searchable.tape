# Hero: type to filter the list inline, then select a match.
Output "searchable.gif"
Set Height 300
Source ".setup.tape"

# Boot off camera so the recording opens on the rendered component.
Type "demo 09-searchable" Enter
Sleep 4s
Show

# Beat 1 — the unfiltered list.
Sleep 1.5s

# Beat 2 — typing filters down to the matches.
Type "ja"
Sleep 2.5s

# Beat 3 — navigate the filtered results and pick one.
Down
Sleep 1.2s
Enter
Sleep 2s
