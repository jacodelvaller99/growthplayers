import bpy, sys, bmesh
from collections import defaultdict

argv = sys.argv[sys.argv.index("--")+1:]
glb_path = argv[0]

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=glb_path)
obj = [o for o in bpy.data.objects if o.type=='MESH'][0]

bm = bmesh.new(); bm.from_mesh(obj.data); bm.edges.ensure_lookup_table()

# agrupar aristas de borde por region (grid 5cm)
grid = defaultdict(int)
for e in bm.edges:
    if len(e.link_faces) <= 1:
        c = (e.verts[0].co + e.verts[1].co) / 2
        key = (round(c.x,1), round(c.y,1), round(c.z,1))
        grid[key] += 1
print("BOUNDARY CLUSTERS (x,y,z):count")
for k,v in sorted(grid.items(), key=lambda kv:-kv[1])[:25]:
    print(k, v)
bm.free()
