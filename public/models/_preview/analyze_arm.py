import bpy, sys, bmesh

argv = sys.argv[sys.argv.index("--")+1:]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=argv[0])
obj = [o for o in bpy.data.objects if o.type=='MESH'][0]

bm = bmesh.new(); bm.from_mesh(obj.data)
verts = [v.co.copy() for v in bm.verts]
bm.free()

# Brazo derecho: x > 0.14 (fuera del torso). Centro por franja de z
print("ARM RIGHT (x>0.14): z_band -> n, cx, cy, minx, maxx, miny, maxy")
z = 1.50
while z > 0.70:
    band = [c for c in verts if c.x > 0.14 and z-0.02 <= c.z < z]
    if band:
        n=len(band)
        cx=sum(c.x for c in band)/n; cy=sum(c.y for c in band)/n
        print(f"{z-0.01:.2f} n={n} c=({cx:.3f},{cy:.3f}) x[{min(c.x for c in band):.3f},{max(c.x for c in band):.3f}] y[{min(c.y for c in band):.3f},{max(c.y for c in band):.3f}]")
    z -= 0.02

# Mano: region extrema inferior del brazo
hand = [c for c in verts if c.x > 0.14 and c.z < 1.00]
if hand:
    n=len(hand)
    print("HAND region: n=",n," x[",min(c.x for c in hand),",",max(c.x for c in hand),"] y[",min(c.y for c in hand),",",max(c.y for c in hand),"] z[",min(c.z for c in hand),",",max(c.z for c in hand),"]")

# Muslo derecho en la zona de la mano para ver solapamiento: x 0.02..0.16, z 0.75..1.0
thigh = [c for c in verts if 0.02 < c.x < 0.16 and 0.75 < c.z < 1.0]
if thigh:
    print("THIGH y range at hand zone: [", min(c.y for c in thigh), ",", max(c.y for c in thigh), "]")
print("ANALYSIS DONE")
