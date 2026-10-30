---
title: How to fetch upstream changes in git easily
slug: how-to-fetch-upstream-changes-in-git-easily
date: 2012-04-18
draft: false
tags:
  - tech
  - git
---

It is quite common to update your git fork repository with the upstream changes.

Here it is the workflow I use to keep synchronize my branch with [Octopress](http://www.google.com).

+   First of all, we should configure the remotes.

    ```sh
    $ git remote add upstream git://github.com/imathis/octopress.git
    ```

+   Check the remotes

    ```sh
    $ git remote
    ```

+   Merge/Rebase the changes

    ```sh
    $ git fetch origin -v
    $ git fetch upstream -v
    $ git merge upstream/master
    ```

If you prefere you can create an alias in your _.gitconfig_.

```ini
[alias]
  pull_upstream = !"git fetch origin -v; git fetch upstream -v; git merge upstream/master"
```

Now _git pull_upstream_ will fetch the changes of both remotes, and the merge in the upstream changes.
