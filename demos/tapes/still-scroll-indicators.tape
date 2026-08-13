# Still: limit=3 with ▲/▼ hidden-item counts.
# Arrow down past the visible window first so both indicators are showing.
Output "_still-scroll-indicators.gif"
Set Height 235
Source ".setup.tape"

Type "demo 07-limit-scroll-indicators" Enter
Sleep 5s
Down
Down
Down
Sleep 1.5s
Show
Screenshot scroll-indicators.png

# A trailing Sleep is required: a Screenshot on the last line races with
# recording teardown and silently writes nothing.
Sleep 1s
