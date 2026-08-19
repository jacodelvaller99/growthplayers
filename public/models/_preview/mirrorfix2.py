import bpy, sys, bmesh
from mathutils import Vector
from mathutils.kdtree import KDTree
argv = sys.argv[sys.argv.index("--")+1:]
src, dst = argv[0], argv[1]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)
obj = [o for o in bpy.data.objects if o.type=='MESH'][0]
me = obj.data
bpy.context.view_layer.objects.active = obj

bm = bmesh.new(); bm.from_mesh(me); bm.verts.ensure_lookup_table()
kd = KDTree(len(bm.verts))
for v in bm.verts: kd.insert(v.co, v.index)
kd.balance()

center = Vector((0.15, 0.0, 0.50)); RADIUS = 0.095
def smooth(w): return w*w*(3-2*w)
mov = 0
for v in bm.verts:
    p = v.co
    if not (0.04 < p.x < 0.28 and -0.12 < p.y < 0.14 and 0.40 < p.z < 0.62):
        continue
    d = (p - center).length
    if d > RADIUS: continue
    w = smooth(1.0 - d/RADIUS)
    co, idx, dist = kd.find((-p.x, p.y, p.z))
    twin = bm.verts[idx].co
    if dist < 0.02 and twin.x < -0.04:
        v.co.x = p.x + ((-twin.x) - p.x)*w
        v.co.y = p.y + (( twin.y) - p.y)*w
        mov += 1
bm.to_mesh(me); bm.free(); me.update()
print("MIRRORED", mov)

for _ in range(3):
    bm = bmesh.new(); bm.from_mesh(me); bm.verts.ensure_lookup_table()
    sel = [v for v in bm.verts if 0.04<v.co.x<0.28 and -0.12<v.co.y<0.14 and 0.40<v.co.z<0.62]
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
