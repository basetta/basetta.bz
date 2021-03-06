+++
title="Extract a Directory From a Git Branch/Repository Preserving The History"
date=2012-05-12
[extra]
tags = "git"
+++
<!-- more -->
At work we wanted to extract from a branch a subdirectory containing a specific feature that had to be used from everyone in the team.
Just for sake of example, let's define the terms of our problem.
Our repository (MAIN) structure looks like:

~~~~~~~~~~~~~~~~~~~~~~~~~~
MAIN/
        Library/
            libA/
            libB/
            libC/
~~~~~~~~~~~~~~~~~~~~~~~~~~

Our goal is to extract the libA contained in the branch FTR-B in its own branch called FTR-A.


If you are not interested in preserving the history the task is quite easy. **Git checkout** is our friend in this case.

~~~~~~~~~~~~~~~~~~~~~~~~~~
$ git checkout master
$ git checkout -b FTR-A
$ git checkout FTR-B Library/libA
$ git commit -a -m "Extract libA"
$ git push
~~~~~~~~~~~~~~~~~~~~~~~~~~

 More complicated is the case in which preserving the history is a matter of importance.
 For God's sake **git** has a powerful command **git filter-branch**.
 The following are my notes and observations, for pleasing my poor memory.

+ Clone the local repository into a temporary repository DIRTY.

~~~~~~~~~~~~~~~~~~~~~~~~~~
$ git clone ~/MAIN/ ~/DIRTY/
$ cd DIRTY
$ git checkout FTR-B
~~~~~~~~~~~~~~~~~~~~~~~~~~

+ Remove everything except the desired subdirectory ( libA ).
~~~~~~~~~~~~~~~~~~~~~~~~~~
$ git filter-branch --prune-empty --tree-filter 'rm -rf Library/libB Library/libC'
~~~~~~~~~~~~~~~~~~~~~~~~~~
Basically, **Git filter-branch** executes a command on each commit in a specific branch. Instead of the option **tree-filter** you could have used **subdirectory-filter** that removes everything except the desired directory moving it up to the root project. I will explain it better in another post.

+ Clean all the cruft
~~~~~~~~~~~~~~~~~~~~~~~~~~
$ git gc --aggressive
~~~~~~~~~~~~~~~~~~~~~~~~~~

+ Merge the new feature in its own branch FTR-A.
~~~~~~~~~~~~~~~~~~~~~~~~~~
$ cd ~/MAIN
$ git remote add dirty ~/DIRTY
$ git fetch dirty
$ git branch dirty remotes/tools/FTR-B
$ git checkout master
$ git checkout -b FTR-A
$ git merge dirty
$ git remote rm dirty
~~~~~~~~~~~~~~~~~~~~~~~~~~

+ Create a pull request