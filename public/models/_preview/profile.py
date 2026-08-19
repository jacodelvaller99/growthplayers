import bpy, sys, bmesh, math
argv = sys.argv[sys.argv.index("--")+1:]
src = argv[0]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)
obj = [o for o in bpy.data.objects if o.type=='MESH'][0]
bm = bmesh.new(); bm.from_mesh(obj.data)
verts = [v.co.copy() for v in bm.verts]
bm.free()
print("z | R_maxx R_meandist | L_maxx L_meandist   (max x externo y distancia radial media)")
for zi in [0.44+i*0.02 for i in range(18)]:
    out = []
    for sgn, nm in ((1,'R'),(-1,'L')):
        pts = [v for v in verts if 0.45 > abs(v.z-zi) and sgn*v.x > 0.05 and abs(v.z-zi) < 0.012 and abs(v.y) < 0.16]
        pts = [v for v in verts if sgn*v.x > 0.05 and abs(v.z-zi) < 0.012]
        if not pts:
            out.append((0,0)); continue
        cx = sum(p.x for p in pts)/len(pts); cy = sum(p.y for p in pts)/len(pts)
        maxx = max(sgn*p.x for p in pts)
        rd = [math.hypot(p.x-cx, p.y-cy) for p in pts]
        out.append((maxx, sum(rd)/len(rd)))
    print(f"{zi:.2f} | {out[0][0]:.4f} {out[0][1]:.4f} | {out[1][0]:.4f} {out[1][1]:.4f}")
print("PROFILE DONE")
