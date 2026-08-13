# Still: descriptions, hints, and a disabled item with its disabledReason.
Output "_still-descriptions.gif"
Set Height 180
Source ".setup.tape"

Type "demo 04-disabled-items" Enter
Sleep 5s
Show
Screenshot descriptions.png

# A trailing Sleep is required: a Screenshot on the last line races with
# recording teardown and silently writes nothing.
Sleep 1s
