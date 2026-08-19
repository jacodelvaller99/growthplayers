import bpy, sys, bmesh, math
from mathutils import Matrix, Vector

argv = sys.argv[sys.argv.index("--")+1:]
src, dst = argv[0], argv[1]

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)
meshes = [o for o in bpy.data.objects if o.type=='MESH']
print("MESH_OBJECTS", len(meshes))
obj = meshes[0]
me = obj.data

def clamp(v,a,b): return max(a,min(b,v))
def smooth(w): return w*w*(3-2*w)

bm = bmesh.new(); bm.from_mesh(me)
bm.verts.ensure_lookup_table()

# --- 1) manos: separar del muslo (+x) y cerrar abanico de dedos ---
for v in bm.verts:
    p = v.co
    sign = 1 if p.x >= 0 else -1
    if p.x*sign > 0.14 and 0.60 < p.z < 1.06:
        w = smooth(clamp((1.05 - p.z)/0.12, 0.0, 1.0))
        v.co.x += sign * 0.009 * w          # separar palma del muslo
        p = v.co
        if p.z < 1.00:                       # cerrar dedos hacia eje de la mano
            wf = smooth(clamp((1.00 - p.z)/0.10, 0.0, 1.0))
            axis_x = 0.268*sign
            v.co.x = axis_x + (p.x - axis_x)*(1.0 - 0.25*wf)

bm.to_mesh(me); bm.free(); me.update()

# --- 2) suavizado local de artefactos (pliegues/muescas) ---
def local_smooth(box, iters, alpha):
    bm2 = bmesh.new(); bm2.from_mesh(me)
    bm2.verts.ensure_lookup_table()
    sel = [v for v in bm2.verts if
           box[0] <= v.co.x <= box[1] and
           box[2] <= v.co.y <= box[3] and
           box[4] <= v.co.z <= box[5]]
    for _ in range(iters):
        for v in sel:
            vs = [e.other_vert(v) for e in v.link_edges]
            if vs:
                avg = Vector((0,0,0))
                for o in vs: avg += o.co
                avg /= len(vs)
                v.co = v.co.lerp(avg, alpha)
    bm2.to_mesh(me); bm2.free(); me.update()

# codo (ambos lados): muesca interna
local_smooth(( 0.14, 0.34, -0.14, 0.12, 1.02, 1.22), 4, 0.5)
local_smooth((-0.34,-0.14, -0.14, 0.12, 1.02, 1.22), 4, 0.5)
# rodilla (ambos lados): pliegue horizontal
local_smooth((-0.20, 0.20, -0.16, 0.14, 0.42, 0.62), 4, 0.5)

# --- 3) normalizar: altura 1.80 exacta, origen en el suelo, centrado en x/y ---
bm = bmesh.new(); bm.from_mesh(me)
zmin = min(v.co.z for v in bm.verts); zmax = max(v.co.z for v in bm.verts)
xs = [v.co.x for v in bm.verts]; ys = [v.co.y for v in bm.verts]
cx = (min(xs)+max(xs))/2; cy = (min(ys)+max(ys))/2
s = 1.8/(zmax-zmin)
for v in bm.verts:
    v.co.x = (v.co.x - cx)*s
    v.co.y = (v.co.y - cy)*s
    v.co.z = (v.co.z - zmin)*s
bm.to_mesh(me); bm.free(); me.update()

# --- 4) verificacion ---
bm = bmesh.new(); bm.from_mesh(me); bm.edges.ensure_lookup_table()
nm = len([e for e in bm.edges if not e.is_manifold])
zs=[v.co.z for v in bm.verts]; xs=[v.co.x for v in bm.verts]; ys=[v.co.y for v in bm.verts]
print("FINAL verts", len(bm.verts), "faces", len(bm.faces), "nonmanifold", nm,
      "z", round(min(zs),4), round(max(zs),4),
      "x", round(min(xs),4), round(max(xs),4),
      "y", round(min(ys),4), round(max(ys),4))
bm.free()

bpy.ops.export_scene.gltf(filepath=dst, export_format='GLB', export_yup=True,
    export_apply=True, export_normals=True, export_texcoords=False, export_materials='EXPORT')
print("EXPORT DONE")
