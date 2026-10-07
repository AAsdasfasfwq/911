#!/bin/sh
# tile frames of a dir (sorted numerically) into a contact sheet: tools_tile.sh dir out.jpg cols width
d=$1; out=$2; cols=${3:-4}; w=${4:-480}
ls $d/*.jpg | sort -t_ -k2 -g > /tmp/_tl.txt
n=$(wc -l < /tmp/_tl.txt); rows=$(( (n + cols - 1) / cols ))
awk '{print "file \x27" $0 "\x27"}' /tmp/_tl.txt > /tmp/_tl2.txt
ffmpeg -v error -y -f concat -safe 0 -i /tmp/_tl2.txt -vf "scale=$w:-1,tile=${cols}x${rows}" -frames:v 1 $out
