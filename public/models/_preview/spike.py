import bpy, sys, bmesh
from mathutils import Vector
argv = sys.argv[sys.argv.index("--")+1:]
src = argv[0]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)
obj = [o for o in bpy.data.objects if o.type=='MESH'][0]
bm = bmesh.new(); bm.from_mesh(obj.data); bm.verts.ensure_lookup_table()
spikes = []
for v in bm.verts:
    vs = [e.other_vert(v) for e in v.link_edges]
    if not vs: continue
    avg = Vector((0,0,0))
    for o in vs: avg += o.co
    avg /= len(vs)
    d = (v.co - avg).length
    spikes.append((d, v.co.x, v.co.y, v.co.z))
spikes.sort(reverse=True)
print("TOP SPIKES (desviacion, x, y, z):")
for d,x,y,z in spikes[:30]:
    print(f"{d:.5f} {x:.4f} {y:.4f} {z:.4f}")
bm.free()
print("SPIKE DONE")
