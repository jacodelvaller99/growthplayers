import bpy, sys, bmesh, mathutils

argv = sys.argv[sys.argv.index("--")+1:]
glb_path = argv[0]

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=glb_path)
obj = [o for o in bpy.data.objects if o.type=='MESH'][0]
me = obj.data

bm = bmesh.new()
bm.from_mesh(me)
bm.edges.ensure_lookup_table()

nonmanifold = [e for e in bm.edges if not e.is_manifold]
boundary = [e for e in bm.edges if len(e.link_faces)==0 or len(e.link_faces)==1]
degenerate = [e for e in bm.edges if e.calc_length() < 1e-7]
deg_faces = [f for f in bm.faces if f.calc_area() < 1e-12]

print("VERTS", len(bm.verts), "FACES", len(bm.faces), "EDGES", len(bm.edges))
print("NON_MANIFOLD_EDGES", len(nonmanifold))
print("BOUNDARY_EDGES", len(boundary))
print("DEGENERATE_EDGES", len(degenerate))
print("DEGENERATE_FACES", len(deg_faces))
print("LOOSE_VERTS", len([v for v in bm.verts if not v.link_faces]))

# volumen con signo -> detecta normales invertidas
vol = me.calc_volume() if hasattr(me,'calc_volume') else 0
print("SIGNED_VOLUME", vol)

# duplicados exactos
seen = {}
dups = 0
for v in bm.verts:
    k = (round(v.co.x,6), round(v.co.y,6), round(v.co.z,6))
    if k in seen: dups += 1
    seen[k] = v.index
print("DUPLICATE_VERTS", dups)

# proporciones: usar posiciones en Z para landmarks aproximados
zs = sorted(v.co.z for v in bm.verts)
xs = [v.co.x for v in bm.verts]
print("HEIGHT", max(zs)-min(zs), "WIDTH_X", max(xs)-min(xs))
# ancho de hombros: max |x| entre z=1.35..1.45
shoulder = [abs(v.co.x) for v in bm.verts if 1.35 < v.co.z < 1.45]
print("SHOULDER_HALF", max(shoulder) if shoulder else None)
# cabeza: z > 1.55
head = [v.co.z for v in bm.verts if v.co.z > 1.5]
print("HEAD_TOP", max(head) if head else None)
bm.free()
print("DIAG DONE")
