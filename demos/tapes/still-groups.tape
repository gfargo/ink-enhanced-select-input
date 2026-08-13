# Still: items organized under non-navigable group headers.
Output "_still-groups.gif"
Set Height 260
Source ".setup.tape"

Type "demo 10-item-groups" Enter
Sleep 5s
Show
Screenshot groups.png

# A trailing Sleep is required: a Screenshot on the last line races with
# recording teardown and silently writes nothing.
Sleep 1s
