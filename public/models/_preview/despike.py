import bpy, sys, bmesh
from mathutils import Vector
argv = sys.argv[sys.argv.index("--")+1:]
src, dst = argv[0], argv[1]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)
obj = [o for o in bpy.data.objects if o.type=='MESH'][0]
me = obj.data
bpy.context.view_layer.objects.active = obj

for pasada, thr in enumerate([0.012, 0.009, 0.007, 0.006]):
    bm = bmesh.new(); bm.from_mesh(me); bm.verts.ensure_lookup_table()
    mov = []
    for v in bm.verts:
        vs = [e.other_vert(v) for e in v.link_edges]
        if not vs: continue
        avg = Vector((0,0,0))
        for o in vs: avg += o.co
        avg /= len(vs)
        if (v.co - avg).length > thr:
            mov.append((v.index, avg))
    for idx, avg in mov:
        bm.verts[idx].co = avg
    bm.to_mesh(me); bm.free(); me.update()
    print(f"PASS {pasada} thr {thr} moved {len(mov)}")

# suavizado ligero global para asentar
mod = obj.modifiers.new("s", 'LAPLACIANSMOOTH')
mod.lambda_factor = 0.25; mod.iterations = 2
mod.use_volume_preserve = True; mod.use_normalized = True
bpy.ops.object.modifier_apply(modifier=mod.name)

# normales consistentes + suave
bpy.ops.object.mode_set(mode='EDIT')
bpy.ops.mesh.select_all(action='SELECT')
bpy.ops.mesh.normals_make_consistent(inside=False)
bpy.ops.object.mode_set(mode='OBJECT')
for p in me.polygons: p.use_smooth = True

# normalizar altura 1.80
bm = bmesh.new(); bm.from_mesh(me)
zmin=min(v.co.z for v in bm.verts); zmax=max(v.co.z for v in bm.verts)
xs=[v.co.x for v in bm.verts]; ys=[v.co.y for v in bm.verts]
cx=(min(xs)+max(xs))/2; cy=(min(ys)+max(ys))/2
s=1.8/(zmax-zmin)
for v in bm.verts:
    v.co.x=(v.co.x-cx)*s; v.co.y=(v.co.y-cy)*s; v.co.z=(v.co.z-zmin)*s
bm.to_mesh(me); bm.free(); me.update()

bm = bmesh.new(); bm.from_mesh(me); bm.edges.ensure_lookup_table()
print("FINAL verts", len(bm.verts), "faces", len(bm.faces), "nonmanifold", len([e for e in bm.edges if not e.is_manifold]))
bm.free()
bpy.ops.export_scene.gltf(filepath=dst, export_format='GLB', export_yup=True,
    export_apply=True, export_normals=True, export_texcoords=False, export_materials='EXPORT')
print("EXPORT DONE")
