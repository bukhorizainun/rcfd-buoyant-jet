"""Find which section stops the page from painting.

Builds the page with the first N sections, loads each in the headless browser,
and measures how much of the viewport is not blank white. A healthy page paints
thousands of non-white pixels; the broken one paints almost none.
"""
import io
import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
os.chdir(HERE)
sys.path.insert(0, HERE)

import importlib.util
spec = importlib.util.spec_from_file_location("bs", "build_site.py")
bs = importlib.util.module_from_spec(spec)
try:
    spec.loader.exec_module(bs)
except SystemExit:
    pass

T = os.path.expandvars(r"%LOCALAPPDATA%\Temp\sitecmp")
os.makedirs(T, exist_ok=True)
B = os.path.expanduser("~/.claude/skills/gstack/browse/dist/browse")

parts = bs.ORDER
head = io.open(parts[0], encoding="utf-8", errors="replace").read()
full = io.open("index.html", encoding="utf-8", errors="replace").read()
tail = full[full.rindex("</main>"):]


def ink(png):
    from PIL import Image
    im = Image.open(png).convert("RGB")
    px = im.getdata()
    return sum(1 for r, g, b in px if r < 240 or g < 240 or b < 240)


def build_and_test(n):
    body = "".join(io.open(p, encoding="utf-8", errors="replace").read()
                   for p in parts[1:n + 1])
    f = os.path.join(T, "b%02d.html" % n)
    io.open(f, "w", encoding="utf-8", errors="replace").write(head + body + tail)
    url = "file:///C:/Users/User/AppData/Local/Temp/sitecmp/b%02d.html" % n
    r = subprocess.run([B, "goto", url], capture_output=True, timeout=180, text=True)
    got = subprocess.run([B, "url"], capture_output=True, timeout=60, text=True).stdout.strip()
    if "b%02d.html" % n not in got:
        return -1, "NAV GAGAL: " + (r.stdout or r.stderr)[:70]
    shot = os.path.join(T, "b%02d.png" % n)
    if os.path.exists(shot):
        os.remove(shot)
    subprocess.run([B, "screenshot", "--viewport", shot], capture_output=True, timeout=180)
    return (ink(shot), "") if os.path.exists(shot) else (-1, "no shot")


if __name__ == "__main__":
    todo = [int(x) for x in sys.argv[1:]] or [1, 5, 10, 15, 20, 25, 30, len(parts) - 1]
    for n in todo:
        v, note = build_and_test(n)
        name = os.path.basename(parts[n])[:42]
        print("%2d parts  ink=%7d  %-5s %s %s" % (n, v, "OK" if v > 5000 else "BLANK", name, note))
