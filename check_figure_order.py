"""List every figure caption in the order the page assembles them.

The captions are not written the same way everywhere: some carry a letter, some
say "(interactive)", so a single strict pattern misses whole families and makes
the numbering look broken when it is not. This matches the loose form and
reports the reading order, so gaps and repeats can be seen.
"""
import io
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.chdir(os.path.dirname(os.path.abspath(__file__)))
sys.stdout.reconfigure(encoding="utf-8", errors="replace")

from build_site import ORDER  # noqa: E402

CAP = re.compile(r'<figcaption>.{0,40}?Figure\s+(\d+)([a-z]?)', re.S)

seen = []
for p in ORDER:
    s = io.open(p, encoding="utf-8", errors="replace").read()
    got = ["%d%s" % (int(m.group(1)), m.group(2)) for m in CAP.finditer(s)]
    if got:
        print("%-58s %s" % (os.path.basename(p), " ".join(got)))
        seen += [int(m.group(1)) for m in CAP.finditer(s)]

nums = sorted(set(seen))
gaps = [n for n in range(1, max(nums) + 1) if n not in nums]
print("\nnomor terpakai:", nums[0], "..", nums[-1])
print("lubang:", gaps if gaps else "tidak ada")
