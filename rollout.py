"""Convert the dark inner pages to the Volty light edition.
Source: /home/claude/site/_dark_backup/<page>.html (the approved dark pages)
Output: /home/claude/site/<page>.html
"""
import re, sys, os
SP = '/tmp/claude-0/-home-claude/3bd42a42-9e90-56ca-9e23-7db058f7838c/scratchpad/'
SITE = '/home/claude/site/'
FONTS = open(SP + 'fonts-inline.css').read()
CHROME = open(SP + 'chrome.css').read()
PAGECSS = {}
if os.path.exists(SP + 'pages.css'):
    # page specific blocks, separated by lines "/*@@page.html@@*/"
    cur = None
    for line in open(SP + 'pages.css').read().split('\n'):
        m = re.match(r'/\*@@(.+?)@@\*/', line)
        if m: cur = m.group(1); PAGECSS[cur] = ''; continue
        if cur: PAGECSS[cur] += line + '\n'

COLORS = [
    (r'#0a0a0b', '#F3EFE7'), (r'#0c0c0e', '#FFFFFF'), (r'#0d0d0f', '#FFFFFF'), (r'#101012', '#FFFFFF'),
    (r'#101013', '#FFFFFF'), (r'#111114', '#EFE9DE'), (r'#121214', '#FFFFFF'), (r'#141416', '#FFFFFF'),
    (r'#17171a', '#EFE9DE'), (r'#08080a', '#FFFFFF'), (r'#070708', '#FFFFFF'),
    (r'rgba\(10,10,11,', 'rgba(243,239,231,'), (r'rgba\(6,6,8,', 'rgba(243,239,231,'),
    (r'rgba\(255,255,255,', 'rgba(21,21,20,'), (r'rgba\(245,245,246,', 'rgba(21,21,20,'),
    (r'#f5f5f6', '#151514'), (r'#aef24a', '#3F8A45'), (r'#7bbf1f', '#2F7A38'),
    (r'#9b9ba2', '#4B4944'), (r'#6c6c73', '#8C887E'),
]
LOGO_PATH = 'fill="#f5f5f6" transform="translate(900,800) scale(.72) translate(-900,-800)"'

SKIP_BAND = ('hero', 'vhero', 'ehero', 'chero', 'pager', 'contact', 'notewrap')

def convert(page):
    s = open(SITE + '_dark_backup/' + page, encoding='utf-8').read()
    # 1. fonts: drop url() faces and the preload, embed the fonts once
    s = re.sub(r'@font-face\{[^}]*\}\s*', '', s)
    s = re.sub(r'<link[^>]*rel="preload"[^>]*woff2[^>]*>\s*', '', s)
    s = re.sub(r'<link[^>]*woff2[^>]*rel="preload"[^>]*>\s*', '', s)
    s = s.replace('</title>', '</title>\n<style>\n' + FONTS + '\n</style>', 1)
    # 2. colours: protect the logo chevron, then repaint dark values light
    s = s.replace(LOGO_PATH, LOGO_PATH.replace('#f5f5f6', '#FFFFFE'))
    for a, b in COLORS:
        s = re.sub(a, b, s, flags=re.I)
    # 3. section grounds: rotate white, beige, warm beige on the content bands
    bands = ['band-w', 'band-b', 'band-k']
    i = 0
    def tag(m):
        nonlocal i
        attrs = m.group(1)
        cls = re.search(r'class="([^"]*)"', attrs)
        classes = cls.group(1).split() if cls else []
        if any(c in SKIP_BAND for c in classes): return m.group(0)
        b = bands[i % 3]; i += 1
        if cls:
            attrs = attrs.replace(cls.group(0), 'class="' + ' '.join(classes + [b]) + '"')
        else:
            attrs = ' class="' + b + '"' + attrs
        return '<section' + attrs + '>'
    body_at = s.index('<body')
    head, body = s[:body_at], s[body_at:]
    body = re.sub(r'<section((?:\s[^>]*)?)>', tag, body)
    s = head + body
    # 4. shared chrome + page specific styles, last in the head so they win
    extra = CHROME + '\n/* ---------- section grounds ---------- */\n' \
        'body .band-w{background:var(--card)!important}body .band-b{background:var(--paper)!important}body .band-k{background:var(--paper2)!important}\n' \
        + PAGECSS.get(page, '')
    s = s.replace('</head>', '<style>\n' + extra + '\n</style>\n</head>', 1)
    open(SITE + page, 'w', encoding='utf-8').write(s)
    return len(s)

if __name__ == '__main__':
    pages = sys.argv[1:] or ['u1.html', 'design.html', 'audience.html', 'rider-economics.html', 'fleet-economics.html', 'contact.html']
    for p in pages:
        print(p, convert(p) // 1024, 'KB')
