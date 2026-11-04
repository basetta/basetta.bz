---
title: Multiple GitHub Accounts Without the Manual Switching
slug: multiple-github-accounts
date: 2026-11-04
description: Separate personal and work GitHub identities with SSH aliases, conditional Git configuration, and a Zsh wrapper that selects the right gh account per command.
draft: false
featured: true
tags:
  - tech
  - git
  - dotfiles
---

I have two GitHub accounts: one for work, and `basetta` for my personal projects. Both live on the same laptop, usually with several terminals open. What I do not want is another mental checklist every time I move from one project to the next. Open the right folder, remember the right account, check it again… I thought the computer was supposed to do the repetitive bits.

For Git over SSH, I already have a useful convention: my personal repositories use the host alias `gbasetta`, which selects my personal SSH key. What I wanted was for `gh` to take the hint too. If I am in a personal checkout, `gh pr list` and `gh issue create` should use `basetta`, without an account-switching ceremony first.

So I gave Zsh a small job: look at the remote, pick the personal token when needed, and leave the other terminals alone.

The function is short. The mildly annoying part is that “my GitHub identity” actually means three different things.

## One laptop, three identity checks

| Concern | What controls it |
| --- | --- |
| Who authenticates a Git fetch or push over SSH? | The SSH key selected for the remote host |
| Whose name and email appear on a commit? | Git's `user.name` and `user.email` |
| Who makes requests through the GitHub CLI? | The token used by `gh` |

These settings do not automatically talk to each other. My personal SSH key can get me through GitHub's front door while Git still puts a work email on the commit. Meanwhile, `gh` has its own guest list.

Here is how I get the three to agree. The personal account and SSH alias below are mine; the work alias, usernames, email addresses, and repository names are generic examples. To follow along, you will need Git, OpenSSH, Zsh, and a recent GitHub CLI with multi-account support.

## Give SSH two names for the same place

Each GitHub account needs its own SSH key, with the public key added to that account under **Settings → SSH and GPG keys**. Never upload or share the private key.

My relevant `~/.ssh/config` entries look like this:

```text
Host *
  IdentitiesOnly yes

Host github-work
  HostName github.com
  User git
  IdentityFile ~/.ssh/id_rsa

Host gbasetta
  HostName github.com
  User git
  IdentityFile ~/.ssh/id_rsa_basetta
```

Those key filenames reflect my existing setup. If you are creating new keys, use `ssh-keygen -t ed25519` with a separate filename for each account and update the `IdentityFile` paths accordingly.

Same GitHub, different keys. The aliases tell SSH which key to bring, and `IdentitiesOnly yes` stops it from trying unrelated keys from the agent. No need to empty the entire keyring at the door.

I check each alias before going further:

```sh
ssh -T git@gbasetta
ssh -T git@github-work
```

GitHub should greet the expected account. One small gotcha: even a successful test exits with status `1`, because GitHub does not provide shell access. Read the greeting before worrying about the exit code.

Use the alias in the repository's remote URL:

```sh
git clone git@gbasetta:basetta/my-project.git
```

For an existing checkout:

```sh
git remote set-url origin git@gbasetta:basetta/my-project.git
git remote get-url origin
```

Work repositories use `git@github-work:work-org/project.git` instead. Neither alias is a separate GitHub server; both are local SSH configuration names.

## Let the folder choose the commit identity

Years ago, I wrote about [keeping private Git settings in a separate configuration file](/blog/protect-your-private-data-using-gitconfig-include-directive/). I am still using that idea. Conditional includes just give it a useful extra rule: where the repository lives decides which identity Git loads.

I keep my personal repositories under `~/Sandbox/personal/`. With `~/Sandbox/work/` as an example work directory, the configuration looks like this. Add these entries at the end of `~/.gitconfig`, after any global user settings:

```ini
[includeIf "gitdir:~/Sandbox/personal/"]
  path = ~/.gitconfig-personal

[includeIf "gitdir:~/Sandbox/work/"]
  path = ~/.gitconfig-work
```

The trailing slash makes each condition match repositories under that directory, including nested directories.

In `~/.gitconfig-personal`:

```ini
[user]
  name = Basetta
  email = your-personal-email@example.com
```

In `~/.gitconfig-work`:

```ini
[user]
  name = Your Work Name
  email = your-work-email@example.com
```

Replace those addresses with emails associated with the corresponding GitHub accounts, or their GitHub-provided no-reply addresses.

From inside a repository, check the effective values and where they came from:

```sh
git config --show-origin --get user.name
git config --show-origin --get user.email
```

Repository-local settings can override these includes. If the result is unexpected, check `.git/config` too. If you sign commits, configure the appropriate `user.signingkey` in each identity file as well; changing the author email does not select a different signing key.

There is no magic link between this directory rule and SSH. I keep them aligned myself: personal folder, personal remote alias. Two simple conventions are easier to remember than a collection of exceptions.

## Introduce both accounts to `gh`

At this point, Git knows which key to use and which name to put on commits. Job done? Almost. `gh` needs its own API credentials, so there is one more introduction to make.

Log in once for each account:

```sh
gh auth login --hostname github.com --git-protocol ssh --web
```

Run the login flow separately for the personal and work accounts, making sure the browser authorizes the intended account each time. If prompted to upload an SSH key, select the appropriate key or skip that step if you already added it.

Check that both accounts are stored:

```sh
gh auth status --hostname github.com
```

Outside personal repositories, my wrapper leaves the CLI's normal account selection alone. I therefore keep the work account as the default:

```sh
gh auth switch --hostname github.com --user your-work-username
```

I could run `gh auth switch` every time I change projects, but that is exactly the chore I am trying to avoid. Worse, the active account is shared CLI state: switching it in one terminal can affect another terminal too. I want to choose an account for this command, not rearrange things for every other shell.

## Give Zsh the boring part

Here is the small function that connects the SSH convention to `gh`. I save it in `~/.config/zsh/github.zsh`:

```zsh
# Select the GitHub API account from origin's SSH alias without changing
# gh's globally active account. `command gh ...` bypasses this wrapper.
# Selection follows the current repository, even when --repo is supplied.
gh() {
  emulate -L zsh
  local remote token
  remote=$(command git remote get-url origin 2>/dev/null) || remote=''

  case "$remote" in
    git@gbasetta:*|ssh://git@gbasetta/*)
      token=$(command gh auth token \
        --hostname github.com \
        --user basetta) || return

      GH_TOKEN="$token" command gh "$@"
      ;;
    *)
      command gh "$@"
      ;;
  esac
}
```

Source it from your `.zshrc`—normally `~/.zshrc`, or `$ZDOTDIR/.zshrc` if you keep Zsh configuration elsewhere:

```zsh
source ~/.config/zsh/github.zsh
```

Start a new shell, or source the file in the current one.

There is not much machinery here, which is how I like my shell helpers. The function:

1. Reads the current repository's `origin` URL.
2. Recognizes the personal alias in either SCP-style or `ssh://` form.
3. Retrieves the stored token for the GitHub user `basetta`.
4. Supplies that token through `GH_TOKEN` for this invocation only.

`gbasetta` is the SSH alias; `basetta` is the GitHub username. Change both if you adapt this function.

A few details keep this helper out of its own way. `command gh` calls the executable rather than calling the function again; recursion is not the kind of automation I am after. `"$@"` passes the arguments along with their boundaries intact. And `emulate -L zsh` gives the function standard Zsh option settings, restoring the caller's settings when it returns. It does not start another shell.

If retrieving the personal token fails, the function returns immediately rather than running the requested command with the default account. It never writes the token to the shell configuration or changes the globally active account.

## Ask GitHub who I am

Rather than trusting the setup on principle, I check all three pieces. Inside a repository whose `origin` uses `gbasetta`, run:

```sh
git remote get-url origin
git config user.email
gh api user --jq .login
```

The remote should use the personal alias, the email should be your personal commit address, and the API response should be `basetta`.

To compare that with the CLI's normal account selection, bypass the function:

```sh
command gh api user --jq .login
```

With the work account active and no token environment overrides, that command should return the work username. Calling the wrapper has not switched it.

## What this little helper does not know

I have kept this deliberately small. It knows my personal SSH alias; it does not read my mind. A few boundaries are worth knowing before borrowing it:

- **Only `origin` matters.** It does not inspect `upstream`, repository ownership, or the target of an individual command.
- **`--repo` does not change account selection.** Running `gh --repo other-owner/project ...` from a personal checkout still supplies the personal token. Bypass the function when you need different behavior.
- **Cloning has no destination-based selection.** Before a checkout exists, the function cannot infer the desired identity from its future remote. I use `git clone` with the explicit SSH alias for that step.
- **Other remotes fall through.** HTTPS URLs, plain `github.com` SSH URLs, missing origins, and commands outside a repository use normal `gh` authentication. Work is not explicitly selected; it is the default I configured earlier.
- **Environment variables still matter.** In the personal branch, the function replaces `GH_TOKEN` for the child process. In the fallback branch, existing `GH_TOKEN` or `GITHUB_TOKEN` values can override the stored active account. Even `command gh` still honors those variables.
- **Git URL rewrites can affect matching.** `git remote get-url origin` expands `insteadOf` rules. If the wrapper does not match, inspect that command's output rather than relying only on the URL written in `.git/config`.

That is enough for the way I work. The folder picks the commit identity, the SSH alias picks the key, and Zsh gives `gh` the matching personal token without changing the active account for other terminals.

I still have two GitHub accounts. I just have one less thing to remember when switching projects, which feels like a reasonable job for a computer.
