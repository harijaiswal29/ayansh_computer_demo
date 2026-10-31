"""Builds the planet maps in solar-system/tex/ from public planet texture sets.

Sources (clone them first, then pass their parent folder):
  https://github.com/sanderblue/solar-system-threejs   (Apache-2.0) -> folder repos/sanderblue_solar-system-threejs
  https://github.com/SoumyaEXE/3d-Solar-System-ThreeJS  (MIT)        -> folder repos/s1
Both sets are made from NASA imagery (Blue Marble, Black Marble city lights, mission mosaics).

Run:  python tools/make_textures.py <folder holding repos/> solar-system/tex
"""
from PIL import Image, ImageEnhance, ImageDraw, ImageFilter
import numpy as np
SP = sys.argv[1]; OUT = sys.argv[2]
S = SP + '/repos/sanderblue_solar-system-threejs/src/assets/textures/'
Q = SP + '/repos/s1/public/textures/'
def save(name, im, fmt='JPEG', q=82):
    b = io.BytesIO()
    if fmt == 'JPEG': im.save(b, 'JPEG', quality=q, optimize=True, progressive=True)
    else: im.save(b, 'PNG', optimize=True)
    mime = 'image/jpeg' if fmt == 'JPEG' else 'image/png'
    uri = f'data:{mime};base64,' + base64.b64encode(b.getvalue()).decode()
    return name, uri, len(b.getvalue())
def rs(f, w, mode=None):
    im = Image.open(f)
    im = im.convert(mode) if mode else im.convert('RGB')
    return im.resize((w, w // 2), Image.LANCZOS)
big = []
big.append(save('earth_day', rs(S + 'earth_10k.jpg', 4096), q=80))
big.append(save('earth_night', rs(S + 'earth_night_4k.jpg', 2048), q=80))
big.append(save('earth_clouds', rs(S + 'earth_clouds_4k.png', 2048, 'L'), q=80))
big.append(save('earth_spec', rs(S + 'earth_ocean_reflectance_4k.jpg', 1024, 'L'), q=80))
big.append(save('earth_bump', rs(S + 'earth_topo_4k.jpg', 2048, 'L'), q=78))
big.append(save('moon', rs(S + 'moon_4k.jpg', 2048, 'L').convert('RGB'), q=82))
big.append(save('moon_bump', rs(S + 'moon_topo_4k.jpg', 1024, 'L'), q=80))
big.append(save('sun', rs(S + 'sun.jpg', 1024), q=82))
big.append(save('mercury', rs(Q + 'mercury.jpg', 2048), q=80))
big.append(save('venus', rs(Q + 'venus.jpg', 2048), q=80))
big.append(save('mars', rs(Q + 'mars.jpg', 2048), q=80))
big.append(save('mars_bump', rs(S + 'mars_topo.jpg', 1024, 'L'), q=80))
big.append(save('jupiter', rs(S + 'jupiter_4k.jpg', 2048), q=82))
big.append(save('saturn', rs(Q + 'saturn.jpg', 2048), q=82))
big.append(save('uranus', rs(S + 'uranus.jpg', 1024), q=85))
big.append(save('neptune', rs(S + 'neptune.jpg', 1024), q=85))
for m in ['io', 'europa', 'ganymede']: big.append(save(m, rs(S + f'jupiter/satellites/{m}.jpg', 1024), q=82))
big.append(save('ceres', rs(S + 'ceres.png', 1024), q=82))
# Pluto: recolour the old map to New Horizons colours and add Tombaugh Regio, the heart
p = np.asarray(rs(S + 'pluto_2k.jpg', 2048, 'L'), dtype=np.float32) / 255
H, W = p.shape
lat = (0.5 - (np.arange(H) + .5) / H)[:, None] * 180; lon = ((np.arange(W) + .5) / W)[None, :] * 360 - 180
lo, hi = np.array([70, 38, 28]), np.array([238, 214, 184])
t = np.clip((p - p.mean()) * 2.6 + .55, 0, 1)[..., None]
rgb = lo * (1 - t) + hi * t
dl = lon
x = dl * np.cos(np.radians(lat)) / 26; y = (lat - 12) / 26 + .3
q = x * x + y * y - 1; inside = ((q ** 3 - x * x * y ** 3) < 0).astype(np.uint8) * 255
heart = (np.asarray(Image.fromarray(inside).filter(ImageFilter.GaussianBlur(4)), dtype=np.float32) / 255)[..., None]
rgb = rgb * (1 - heart * .85) + np.array([248, 240, 228]) * heart * .85
big.append(save('pluto', Image.fromarray(rgb.clip(0, 255).astype(np.uint8)), q=82))
# Saturn's rings: colour strip + see-through strip in one PNG
c = Image.open(S + 'saturn/rings/rings_color_map.png').convert('RGB').resize((1024, 8))
a = Image.open(S + 'saturn/rings/rings_map.png').convert('RGBA').resize((1024, 8)).split()[3]
ring = c.copy(); ring.putalpha(a); big.append(save('saturn_ring', ring, 'PNG'))
st = rs(Q + '8k_stars.jpg', 4096); st = ImageEnhance.Brightness(st).enhance(1.8); big.append(save('stars', st, q=78))
# India and its neighbours from space, 66–98°E, 5–37°N
e = Image.open(S + 'earth_10k.jpg').convert('RGB'); ew, eh = e.size
box = (int((66 + 180) / 360 * ew), int((90 - 37) / 180 * eh), int((98 + 180) / 360 * ew), int((90 - 5) / 180 * eh))
ind = e.crop(box).resize((1024, 1024), Image.LANCZOS)
ind = ImageEnhance.Color(ind).enhance(1.25); ind = ImageEnhance.Contrast(ind).enhance(1.1)
big.append(save('india', ind, q=84))
os.makedirs(OUT, exist_ok=True)
tot = 0
for name, uri, n in big:
    open(f'{OUT}/{name}.js', 'w').write(f"(window.TEXDATA = window.TEXDATA || {{}})['{name}'] = '{uri}';\n"); tot += n
    print(f'{name:14s} {n // 1024:5d} KB')
# small copies for the flat painter used across the app (one file, loaded at start)
small = {}
for name, f, w, mode in [('sun', S + 'sun.jpg', 512, None), ('mercury', Q + 'mercury.jpg', 512, None), ('venus', Q + 'venus.jpg', 512, None), ('earth', S + 'earth_10k.jpg', 1024, None),
                         ('clouds', S + 'earth_clouds_4k.png', 1024, 'L'), ('earth_night', S + 'earth_night_4k.jpg', 1024, None), ('moon', S + 'moon_4k.jpg', 512, None), ('mars', Q + 'mars.jpg', 512, None),
                         ('jupiter', S + 'jupiter_4k.jpg', 1024, None), ('saturn', Q + 'saturn.jpg', 512, None), ('uranus', S + 'uranus.jpg', 512, None), ('neptune', S + 'neptune.jpg', 512, None)]:
    small[name] = save(name, rs(f, w, mode) if mode else rs(f, w), q=80)[1]
plut = [b for b in big if b[0] == 'pluto'][0]
pim = Image.open(io.BytesIO(base64.b64decode(plut[1].split(',')[1]))).resize((512, 256)); small['pluto'] = save('pluto', pim, q=80)[1]
open(f'{OUT}/small.js', 'w').write('window.TEXSMALL = {\n' + ',\n'.join(f"  {k}: '{v}'" for k, v in small.items()) + '\n};\n')
print('small.js', os.path.getsize(f'{OUT}/small.js') // 1024, 'KB; big total', tot // 1024, 'KB')
