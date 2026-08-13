# Demos

The GIFs and screenshots used in [`readme.md`](../readme.md), recorded from the
real [`examples/`](../examples) with [VHS](https://github.com/charmbracelet/vhs).

Every capture drives an actual example file, so the demos can't quietly drift
away from the component's real behavior — if an example changes, re-running the
capture shows it.

## Regenerating

```bash
brew install vhs gifsicle

./demos/capture.sh                 # render everything
./demos/capture.sh searchable      # render only tapes matching a name
```

Output lands in [`assets/demos/`](../assets/demos) and is committed, so reading
the README on GitHub needs no toolchain. The assets are excluded from the
published npm tarball by the `files` whitelist in `package.json`, which keeps the
package small.

> [!NOTE]
> The README references these with repo-relative paths. npm rewrites relative
> paths against the `repository` field, which `package.json` does not currently
> set — so the demos render on GitHub but appear broken on npmjs.com until that
> field is added.

## Layout

| Path               | What it is                                                |
| ------------------ | --------------------------------------------------------- |
| `tapes/*.tape`     | One capture each — a screenplay of keystrokes and pauses  |
| `capture.sh`       | Driver: resolves Node, renders every tape, optimizes GIFs |
| `../assets/demos/` | Generated artifacts referenced by the README              |

Tapes named `still-*.tape` produce a PNG; the rest produce a GIF.

## How the tapes work

`capture.sh` generates a `.setup.tape` that each tape pulls in with
`Source ".setup.tape"`. It holds two things:

1. **The look** — font size, padding, theme, framerate. Shared so every capture
   in the set is visually consistent; change it in one place.
2. **A bootstrap** that puts a suitable Node on `PATH`, `cd`s to the repo, and
   defines the `demo` helper the tapes launch with.

`demo <name>` runs the command documented in
[`examples/README.md`](../examples/README.md):

```bash
node --no-warnings --loader ts-node/esm examples/<name>.tsx
```

### Why nothing shows the shell

Every capture is nothing but the component — no prompt, no `demo …` command, no
boot sequence. Two mechanisms working together:

- **The setup tape opens with `Hide` and never calls `Show`.** Each tape calls it
  itself, _after_ the app has booted. So the bootstrap, the launch, and the
  2-4s of `ts-node` cold start all happen off camera, and frame one is a fully
  rendered component.
- **`demo` switches to the terminal's alternate screen buffer first**
  (`printf '\033[?1049h'` — the same thing `vim` and `less` do). The prompt and
  the echoed command stay behind on the primary buffer, so even the line that
  launched the app is absent. It deliberately never switches back: restoring the
  primary buffer on exit would replace the final frame with a shell prompt.

`Hide` alone is not enough for this. It stops VHS recording _new_ frames, but
whatever is already on screen stays there — so hiding the launch still leaves the
echoed command sitting at the top of every frame. The alternate screen is what
actually removes it.

### Things worth knowing before editing a tape

- **`Screenshot` only takes a bare, unquoted filename.** Quoting it, or giving a
  directory or absolute path, fails _silently_ — VHS logs the command and writes
  nothing. (`Output` has neither restriction, which makes the difference easy to
  miss.) `capture.sh` works around it by rendering inside a staging directory and
  copying the artifacts out.
- **Never end a tape on `Screenshot`.** It races with recording teardown and
  writes nothing — again, silently. Every still tape ends with a trailing
  `Sleep 1s`.
- **Every tape needs an `Output`**, even the stills; VHS always records a
  session. Still tapes point theirs at a `_`-prefixed throwaway GIF, and
  `capture.sh` skips publishing anything starting with `_`.
- **`--no-warnings` matters.** Without it Node's loader and deprecation notices
  cover the component in every frame.
- **Give the app ~4s to boot** between the launch and `Show`. Under VHS the
  example cold-starts a fresh `ts-node` process; calling `Show` sooner opens the
  capture on an empty screen. Stills allow 5s — they only get one frame.
- **Node version.** `capture.sh` resolves a Node satisfying the package's
  `engines` floor (>= 22.20), because VHS's clean login shell may otherwise
  resolve an older one.
- **`Set Height` frames each capture.** Each tape sizes the terminal to its own
  content: roughly `(lines + 1) × 27px + 40` at the shared `FontSize 20`. Too
  short silently scrolls the top line out of frame — check the result after
  changing what an example renders.

  Size for the _tallest_ moment in the story, not the final frame. The searchable
  demo has to fit the full unfiltered list before it filters down, and demos that
  end in a selection gain a line for the `Selected: …` output.

### File size

`capture.sh` runs `gifsicle -O3` (lossless) on each published GIF as it is
rendered. Raw VHS output is tens of megabytes of undeduplicated frames; rewriting
only the pixels that change between frames brings it down by 20-30x with no
visible difference. It lives in the pipeline rather than in a manual step so
regenerating never re-bloats the assets.

That same pass doubles as the wedged-recording detector described above — a
frozen capture is hundreds of identical frames, so it collapses to a hollow
file instead of merely shrinking. `capture.sh` treats a GIF under 5 KB or with
fewer than 3 frames as a failed render and retries it.

If a GIF is still large afterward, shorten the story rather than reaching for
lossy compression.
