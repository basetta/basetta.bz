---
title: Speeding Up Zsh Startup with zprof and zcompile
slug: speeding-up-zsh-startup
date: 2026-11-10T10:00:00Z
description: How I used zprof to find what was slowing down my terminal, and fixed it with zcompile. Plus the one culprit I chose to keep.
draft: false
featured: true
tags:
  - tech
  - zsh
  - dotfiles
  - performance
---

A new terminal tab was taking noticeably longer than it should. Not enough to block anything — just enough to be annoying a few dozen times a day. The kind of friction that accumulates.

The problem was somewhere in my Zsh startup. I have a modular config spread across several sourced files: aliases, keybindings, fzf setup, gcloud, github helpers, a handful of plugins loaded straight from cloned git repositories, and a prompt powered by Starship. Any of those could be the culprit, and guessing seemed like a waste.

Zsh ships with a profiler. I used it.

## Measuring first

The tool is `zsh/zprof`, a built-in module. Load it at the very start of the startup sequence, then call `zprof` at the end to print a sorted function call table. In practice, the easiest way to run a one-shot profile is:

```zsh
ZDOTDIR=~/.config/zsh zsh -c '
  zmodload zsh/zprof
  source ~/.config/zsh/.zshrc
  zprof
'
```

The output ranks every function by cumulative time. Mine looked like this:

```text
num  calls        time              self          name
----------------------------------------------------------
 1)    1     18.10   18.10  40.17%  18.10  40.17%  _mise_hook
 2)    4     18.57    4.64  41.23%  14.22   3.55%  _zplugin_load
 3)    1      7.98    7.98  17.72%   7.98  17.72%  compinit
 4)    1      2.55    2.55   5.66%   2.55   5.66%  _zsh_highlight_bind_widgets
 5)    1      1.16    1.16   2.58%   1.16   2.58%  _history-substring-search-function-callable
```

Three things dominate:

- `_mise_hook` at 40% — this is what `eval "$(mise activate zsh)"` installs
- `_zplugin_load` at ~31% — sourcing four plugins from cloned repos
- `compinit` at ~18%

No guessing required. I fixed the second and third. The first one I chose to keep — more on that at the end.

## Compiling plugins with zcompile

Every time Zsh sources a `.zsh` file, it reads the text, tokenises it, and parses it into an internal representation before executing it. For a small aliases file this is negligible. For a plugin, less so.

The four plugins I load are not small:

| Plugin | Lines | Size |
|---|---|---|
| `zsh-autosuggestions` | 1,709 | 52 KB |
| `zsh-history-substring-search` | 848 | 29 KB |
| `zsh-vi-mode` | 4,045 | 101 KB |
| `fast-syntax-highlighting` | 1,488 | 60 KB |

Zsh parses all of that from scratch on every new shell. The `.plugin.zsh` entry point for each one is a thin wrapper that immediately sources the real file, so sourcing four plugins means reading and parsing roughly 240 KB of text before a single line of user config runs.

`zcompile` is a Zsh built-in that pre-compiles a `.zsh` file into a `.zwc` word-code file alongside it. Word code is Zsh's internal bytecode: it skips the tokenise-and-parse step entirely. When Zsh sources a `.zsh` file, it automatically uses the `.zwc` if one exists and is newer than the source. No changes to how the files are sourced are needed.

To compile all four plugins:

```zsh
cd ~/.config/zsh/plugins
for dir in */; do
  plugin="${dir%/}"
  main="${dir}${plugin}.plugin.zsh"
  [[ -f "$main" ]] && zcompile "$main" && echo "compiled $main"
done
```

This writes four new files:

```text
plugins/zsh-autosuggestions/zsh-autosuggestions.plugin.zwc
plugins/zsh-history-substring-search/zsh-history-substring-search.plugin.zwc
plugins/zsh-vi-mode/zsh-vi-mode.plugin.zwc
plugins/fast-syntax-highlighting/fast-syntax-highlighting.plugin.zwc
```

Note that this only compiles the entry-point file, not every `.zsh` file inside the plugin directory. The entry point is what Zsh sources directly; any files it sources internally will still be read as text unless compiled separately. For these four plugins, the entry point is either the whole plugin or sources one additional file — compiling the entry point is enough to cover the parse-time overhead on load.

The same applies to modular config files. My `.zshrc` splits things across `aliases.zsh`, `bindings.zsh`, `fzf.zsh`, and a few others. They all get sourced on every startup:

```zsh
for f in ~/.config/zsh/*.zsh; do
  zcompile "$f" && echo "compiled $f"
done
```

And the completion dump that `compinit` generates — which can be several hundred lines of generated code:

```zsh
zcompile ~/.cache/zsh/zcompdump
```

### What the numbers say

After compiling everything, `zprof` showed `_zplugin_load` dropping from roughly **44ms to 26ms** in the profiling run from earlier in the session — about a 40% reduction in the time spent loading plugins. That is the parsing overhead disappearing.

Wall-time measurements across five repeated runs tell a more conservative story: compiled shells averaged **~112ms**, uncompiled ones **~120ms**. The smaller gap is expected: these runs happen with a warm filesystem cache, so the disk read cost is already low. The benefit is most pronounced on the first shell after a fresh login or when the system is under load and the page cache is cold. That is exactly the moment when a slow terminal is most noticeable.

## One maintenance step

Compiled `.zwc` files become stale when the original `.zsh` changes. A plugin update replaces the source but leaves the old bytecode. Zsh will use the new source if it is newer than the `.zwc`, so it will not silently run old code — but the compiled speedup disappears until you recompile.

I updated my `zplugin-update` function to recompile each plugin after pulling:

```zsh
zplugin-update() {
  local dir plugin main
  for dir in "${ZPLUGINDIR}"/*/; do
    plugin="${dir:t}"
    echo "Updating ${plugin}..."
    git -C "$dir" pull --ff-only
    main="${dir}${plugin}.plugin.zsh"
    [[ -f "$main" ]] && zcompile "$main"
  done
}
```

Now running `zplugin-update` leaves everything in a compiled state.

## The result

After compiling plugins and config files, the profiler output looks like:

```text
num  calls        time              self          name
----------------------------------------------------------
 1)    4     26.14    6.53  68.86%  20.58   5.15%  _zplugin_load
 2)    1     11.50   11.50  30.30%  11.50  11.50%  compinit
 3)    1      3.03    3.03   7.99%   3.03   7.99%  _zsh_highlight_bind_widgets
```

`_zplugin_load` dropped from ~44ms to ~26ms. `_mise_hook` is gone from the table entirely — not because I removed it, but because it is no longer the bottleneck worth talking about. Overall wall time went from around 205ms to 138ms, a 33% improvement.

## What `zprof` is good for

Startup performance is easy to misjudge without measurement. I had assumed the prompt — Starship, which does a few subprocess calls — was the main slowdown. It barely showed up. The actual time was being spent on text parsing that a one-line command eliminates for good.

`zprof` makes the guess unnecessary. Run it once, look at the table, fix what the numbers say to fix.

## The one thing I left alone

`_mise_hook` was the single biggest entry in the original profile at 40%. It comes from `eval "$(mise activate zsh)"`, which registers a hook that fires on every prompt to check the current directory and activate the right tool versions.

Mise offers an escape hatch: `--shims`. Instead of hooks, it just prepends a shims directory to `PATH`. Startup cost disappears entirely.

```zsh
if command -v mise >/dev/null 2>&1; then
  eval "$(mise activate zsh --shims)"
fi
```

I did not use it. I have several projects with different Node and Python versions in `.mise.toml` files, and I rely on the automatic switching when moving between directories. Removing the hook would mean remembering to run `mise activate` manually after a `cd`, which is a different kind of friction.

Knowing it is there is enough for now. If I ever drop the per-directory switching habit, that 40% is still waiting.
