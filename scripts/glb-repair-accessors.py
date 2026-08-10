"""Repara un .glb cuyos accessor.min/max son escalares sueltos.

El spec glTF 2.0 (5.1.1) exige que `accessor.min` y `accessor.max` sean
ARRAYS de number, incluso para type=SCALAR (array de 1 elemento). El
generador escribio `"min": 0.0` en vez de `"min": [0.0]`, asi que Blender y
cualquier herramienta conforme rechazan el archivo entero. three.js lo
acepta por permisivo -- suerte, no correccion.

Reescribe solo el chunk JSON; el chunk BIN se copia byte a byte.

  python glb_repair.py entrada.glb salida.glb
"""
import json
import struct
import sys

src, dst = sys.argv[1], sys.argv[2]

with open(src, 'rb') as f:
    data = f.read()

magic, version, total = struct.unpack_from('<III', data, 0)
assert magic == 0x46546C67, 'no es un GLB'

chunks = []
off = 12
while off < total:
    clen, ctype = struct.unpack_from('<II', data, off)
    body = data[off + 8: off + 8 + clen]
    chunks.append([ctype, body])
    off += 8 + clen

JSON_T, BIN_T = 0x4E4F534A, 0x004E4942
js = json.loads(chunks[0][1].decode('utf-8'))
assert chunks[0][0] == JSON_T

fixed = []
for i, a in enumerate(js.get('accessors', [])):
    for key in ('min', 'max'):
        if key in a and not isinstance(a[key], list):
            a[key] = [a[key]]
            fixed.append('accessor[%d].%s' % (i, key))

print('corregidos:', len(fixed), fixed)
if not fixed:
    print('nada que reparar')
    sys.exit(0)

new_json = json.dumps(js, separators=(',', ':')).encode('utf-8')
new_json += b' ' * ((4 - len(new_json) % 4) % 4)  # padding con espacios (spec)
chunks[0][1] = new_json

out = bytearray()
for ctype, body in chunks:
    pad = b'\x00' if ctype == BIN_T else b' '
    body = body + pad * ((4 - len(body) % 4) % 4)
    out += struct.pack('<II', len(body), ctype) + body

header = struct.pack('<III', magic, version, 12 + len(out))
with open(dst, 'wb') as f:
    f.write(header + bytes(out))

print('escrito:', dst, '| bytes:', 12 + len(out), '(origen', total, ')')
