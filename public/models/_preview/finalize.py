import bpy, sys, bmesh
from mathutils import Vector
argv = sys.argv[sys.argv.index("--")+1:]
src, dst = argv[0], argv[1]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)
meshes = [o for o in bpy.data.objects if o.type=='MESH']
assert len(meshes) == 1, f"esperaba 1 malla, hay {len(meshes)}"
obj = meshes[0]; me = obj.data
bpy.context.view_layer.objects.active = obj

# suavizado local extra: rodilla y tobillo
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

local_smooth((-0.20, 0.20, -0.16, 0.14, 0.42, 0.62), 6, 0.6)   # rodillas
local_smooth((-0.18, 0.18, -0.20, 0.16, 0.04, 0.16), 4, 0.5)   # tobillos

# normales: quitar split normals personalizadas heredadas, recalcular, suave
bpy.ops.object.mode_set(mode='OBJECT')
if me.has_custom_normals:
    bpy.ops.mesh.customdata_custom_splitnormals_clear()
bpy.ops.object.mode_set(mode='EDIT')
bpy.ops.mesh.select_all(action='SELECT')
bpy.ops.mesh.normals_make_consistent(inside=False)
bpy.ops.object.mode_set(mode='OBJECT')
for p in me.polygons: p.use_smooth = True

# verificacion final
bm = bmesh.new(); bm.from_mesh(me); bm.edges.ensure_lookup_table()
nm = len([e for e in bm.edges if not e.is_manifold])
zs=[v.co.z for v in bm.verts]; xs=[v.co.x for v in bm.verts]
print("FINAL verts", len(bm.verts), "faces", len(bm.faces), "nonmanifold", nm,
      "z", round(min(zs),4), round(max(zs),4), "x", round(min(xs),4), round(max(xs),4))
bm.free()

bpy.ops.export_scene.gltf(filepath=dst, export_format='GLB', export_yup=True,
    export_apply=True, export_normals=True, export_texcoords=False, export_materials='EXPORT')
print("EXPORT DONE")
