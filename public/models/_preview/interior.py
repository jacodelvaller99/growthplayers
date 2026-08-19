import bpy, sys, bmesh, mathutils
from mathutils import Vector
argv = sys.argv[sys.argv.index("--")+1:]
src = argv[0]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)
obj = [o for o in bpy.data.objects if o.type=='MESH'][0]
me = obj.data
from mathutils.bvhtree import BVHTree
bvh = BVHTree.FromPolygons([v.co for v in me.vertices], [p.vertices for p in me.polygons])
inside = 0
hist = {}
for p in me.polygons:
    c = p.center
    n = p.normal.normalized()
    o = c + n*1e-5
    hits = 0
    loc = o
    d = Vector((0.17, 0.31, 0.93)).normalized()
    for _ in range(40):
        r = bvh.ray_cast(loc, d)
        if r[0] is None: break
        hits += 1
        loc = r[0] + d*1e-5
    if hits % 2 == 1:
        inside += 1
        key = (round(c.x,1), round(c.y,1), round(c.z,1))
        hist[key] = hist.get(key,0)+1
print("TOTAL_FACES", len(me.polygons), "INSIDE_FACES", inside)
for k in sorted(hist, key=hist.get, reverse=True)[:15]:
    print("CLUSTER", k, hist[k])
print("INTERIOR DONE")
