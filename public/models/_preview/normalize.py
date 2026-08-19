import bpy, sys, bmesh

argv = sys.argv[sys.argv.index("--")+1:]
src, dst = argv[0], argv[1]

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)
obj = [o for o in bpy.data.objects if o.type=='MESH'][0]
me = obj.data

bm = bmesh.new(); bm.from_mesh(me)
zs = [v.co.z for v in bm.verts]
zmin, zmax = min(zs), max(zs)
h = zmax - zmin
s = 1.8 / h
for v in bm.verts:
    v.co.x *= s
    v.co.y *= s
    v.co.z = (v.co.z - zmin) * s
bm.to_mesh(me); bm.free(); me.update()

bm = bmesh.new(); bm.from_mesh(me)
zs = [v.co.z for v in bm.verts]
print("NORM zmin", min(zs), "zmax", max(zs), "h", max(zs)-min(zs))
bm.free()

bpy.ops.export_scene.gltf(filepath=dst, export_format='GLB', export_yup=True,
    export_apply=True, export_normals=True, export_texcoords=True, export_materials='EXPORT')
print("EXPORT DONE")
