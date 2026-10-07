#!/bin/sh
# syntax-check all ES modules
fail=0
for f in $(find src -name "*.js"); do
  out=$(node --input-type=module --check < "$f" 2>&1) || { echo "$f: $out" | head -5; fail=1; }
done
[ $fail = 0 ] && echo "syntax OK"
