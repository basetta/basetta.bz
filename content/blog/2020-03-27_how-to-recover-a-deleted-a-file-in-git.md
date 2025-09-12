+++
title="How to recover a deleted file in Git"
[extra]
tags = "git"
+++

<!-- more -->
At work happens multiple times that I got asked how to recover a file somebody else deleted from a git repository.

Even if it is not complicated, I decided to jot down a quick tutorial for future reference.
The process takes 3 steps:
find all deleted files
~~~~~~~~~~~~~~~~~~~~~~~~~~
$ git log --diff-filter=D --summary | grep delete
~~~~~~~~~~~~~~~~~~~~~~~~~~
find the file you are looking for
~~~~~~~~~~~~~~~~~~~~~~~~~~
$ git log -- <filename>
~~~~~~~~~~~~~~~~~~~~~~~~~~
  find the last commit before the file was deleted
~~~~~~~~~~~~~~~~~~~~~~~~~~
git rev-list -n 1 HEAD -- <filename>
~~~~~~~~~~~~~~~~~~~~~~~~~~
restore the file
~~~~~~~~~~~~~~~~~~~~~~~~~~
git checkout ~<commit> -- <filename>
~~~~~~~~~~~~~~~~~~~~~~~~~~
Restore the file!
That is it. Your deleted file has been recovered.