import bpy, sys, bmesh, math
from mathutils import Vector
argv = sys.argv[sys.argv.index("--")+1:]
src, dst = argv[0], argv[1]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)
obj = [o for o in bpy.data.objects if o.type=='MESH'][0]
me = obj.data
bpy.context.view_layer.objects.active = obj

bm = bmesh.new(); bm.from_mesh(me); bm.verts.ensure_lookup_table()
Z0, Z1 = 0.36, 0.70
region = [v for v in bm.verts if v.co.x > 0.05 and -0.16 < v.co.y < 0.16 and Z0-0.04 < v.co.z < Z1+0.04]

# slices de 2mm
slices = {}
for v in region:
    k = round(v.co.z / 0.002)
    slices.setdefault(k, []).append(v)

info = {}
for k, vs in slices.items():
    cx = sum(v.co.x for v in vs)/len(vs)
    cy = sum(v.co.y for v in vs)/len(vs)
    # ajuste de elipse (rx, ry) por busqueda en rejilla con verts FUERA del sector de la abolladura
    best = None
    for rx in [0.07+i*0.001 for i in range(60)]:
        for ry in [0.05+j*0.001 for j in range(60)]:
            err = 0.0; n = 0
            for v in vs:
                dx = v.co.x-cx; dy = v.co.y-cy
                th = math.atan2(dy, dx)
                if abs(th) < math.radians(50):   # sector de la abolladura: excluir del ajuste
                    continue
                err += ((dx/rx)**2 + (dy/ry)**2 - 1.0)**2; n += 1
            if n and (best is None or err/n < best[0]):
                best = (err/n, rx, ry)
    if best:
        info[k] = (cx, cy, best[1], best[2])

# suavizar parametros a lo largo de z
ks = sorted(info)
sm = {}
for k in ks:
    vals = [info[j] for j in ks if abs(j-k) <= 8 and j in info]
    sm[k] = tuple(sum(p[i] for p in vals)/len(vals) for i in range(4))

center = Vector((0.15, 0.0, 0.50)); RADIUS = 0.11
def smooth(w): return w*w*(3-2*w)
mov = 0
for v in region:
    p = v.co
    d = (p - center).length
    if d > RADIUS: continue
    k = round(p.z / 0.002)
    if k not in sm: continue
    cx, cy, rx, ry = sm[k]
    dx, dy = p.x-cx, p.y-cy
    th = math.atan2(dy, dx)
    if abs(th) > math.radians(60): continue
    # radio objetivo de la elipse en ese angulo
    r_ell = (rx*ry) / math.hypot(ry*math.cos(th), rx*math.sin(th))
    r_cur = math.hypot(dx, dy)
    wz = smooth(1.0 - d/RADIUS)
    # peso angular: maximo en el centro del sector
    wa = smooth(1.0 - abs(th)/math.radians(60))
    w = wz * wa
    r_new = r_cur + (r_ell - r_cur)*w
    if r_cur > 1e-6:
        v.co.x = cx + dx/r_cur*r_new
        v.co.y = cy + dy/r_cur*r_new
        mov += 1
bm.to_mesh(me); bm.free(); me.update()
print("CYLFIX moved", mov)

# asentar
for _ in range(3):
    bm = bmesh.new(); bm.from_mesh(me); bm.verts.ensure_lookup_table()
    sel = [v for v in bm.verts if 0.05<v.co.x<0.28 and -0.14<v.co.y<0.16 and 0.38<v.co.z<0.68]
    for v in sel:
        vs=[e.other_vert(v) for e in v.link_edges]
        if vs:
            avg=Vector((0,0,0))
            for o in vs: avg+=o.co
            v.co = v.co.lerp(avg/len(vs), 0.3)
    bm.to_mesh(me); bm.free(); me.update()

bpy.ops.object.mode_set(mode='EDIT')
bpy.ops.mesh.select_all(action='SELECT')
bpy.ops.mesh.normals_make_consistent(inside=False)
bpy.ops.object.mode_set(mode='OBJECT')
for p in me.polygons: p.use_smooth = True
bm = bmesh.new(); bm.from_mesh(me); bm.edges.ensure_lookup_table()
print("FINAL verts", len(bm.verts), "nonmanifold", len([e for e in bm.edges if not e.is_manifold]))
bm.free()
bpy.ops.export_scene.gltf(filepath=dst, export_format='GLB', export_yup=True,
    export_apply=True, export_normals=True, export_texcoords=False, export_materials='EXPORT')
print("EXPORT DONE")
