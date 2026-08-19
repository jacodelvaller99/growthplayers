import bpy, sys, bmesh
from mathutils import Vector

argv = sys.argv[sys.argv.index("--")+1:]
src, dst = argv[0], argv[1]

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)
obj = [o for o in bpy.data.objects if o.type=='MESH'][0]
me = obj.data
bpy.context.view_layer.objects.active = obj

def clamp(v,a,b): return max(a,min(b,v))
def smooth(w): return w*w*(3-2*w)

def local_smooth(box, iters, alpha):
    bm = bmesh.new(); bm.from_mesh(me); bm.verts.ensure_lookup_table()
    sel = [v for v in bm.verts if box[0]<=v.co.x<=box[1] and box[2]<=v.co.y<=box[3] and box[4]<=v.co.z<=box[5]]
    for _ in range(iters):
        for v in sel:
            vs = [e.other_vert(v) for e in v.link_edges]
            if vs:
                avg = Vector((0,0,0))
                for o in vs: avg += o.co
                v.co = v.co.lerp(avg/len(vs), alpha)
    bm.to_mesh(me); bm.free(); me.update()

# 1) costura de la coronilla (linea sobre el craneo)
local_smooth((-0.12, 0.12, -0.14, 0.14, 1.68, 1.82), 5, 0.5)

# 2) costura de la columna (guiones sobre la linea media de la espalda)
local_smooth((-0.025, 0.025, 0.04, 0.16, 0.85, 1.55), 6, 0.55)

# 3) anillo de muneca (pliegue tipo brazalete)
local_smooth(( 0.16, 0.36, -0.14, 0.12, 0.97, 1.10), 5, 0.5)
local_smooth((-0.36,-0.16, -0.14, 0.12, 0.97, 1.10), 5, 0.5)

# 4) anillo de tobillo
local_smooth((-0.20, 0.20, -0.22, 0.18, 0.05, 0.20), 5, 0.5)

# 5) dedos: cerrar mas el abanico hacia el eje de la mano
bm = bmesh.new(); bm.from_mesh(me); bm.verts.ensure_lookup_table()
for v in bm.verts:
    p = v.co
    sign = 1 if p.x >= 0 else -1
    if p.x*sign > 0.15 and 0.60 < p.z < 1.00:
        wf = smooth(clamp((1.00 - p.z)/0.10, 0.0, 1.0))
        axis_x = 0.266*sign
        v.co.x = axis_x + (p.x - axis_x)*(1.0 - 0.28*wf)
bm.to_mesh(me); bm.free(); me.update()

# verificacion
bm = bmesh.new(); bm.from_mesh(me); bm.edges.ensure_lookup_table()
nm = len([e for e in bm.edges if not e.is_manifold])
zs=[v.co.z for v in bm.verts]; xs=[v.co.x for v in bm.verts]
print("FINAL verts", len(bm.verts), "faces", len(bm.faces), "nonmanifold", nm,
      "z", round(min(zs),4), round(max(zs),4), "x", round(min(xs),4), round(max(xs),4))
bm.free()

bpy.ops.export_scene.gltf(filepath=dst, export_format='GLB', export_yup=True,
    export_apply=True, export_normals=True, export_texcoords=False, export_materials='EXPORT')
print("EXPORT DONE")
