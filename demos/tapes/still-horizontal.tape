# Still: horizontal orientation.
# The GIF output is a throwaway — the `_` prefix keeps capture.sh from publishing it.
Output "_still-horizontal.gif"
Set Height 100
Source ".setup.tape"

Type "demo 02-horizontal" Enter
Sleep 5s
Show
Screenshot horizontal.png

# A trailing Sleep is required: a Screenshot on the last line races with
# recording teardown and silently writes nothing.
Sleep 1s
