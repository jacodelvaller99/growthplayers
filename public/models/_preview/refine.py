import bpy, sys, bmesh, math
from mathutils import Matrix, Vector

argv = sys.argv[sys.argv.index("--")+1:]
src, dst = argv[0], argv[1]

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)
obj = [o for o in bpy.data.objects if o.type=='MESH'][0]
me = obj.data

bm = bmesh.new(); bm.from_mesh(me)
bm.verts.ensure_lookup_table()

def clamp(v,a,b): return max(a,min(b,v))

for sign in (1,-1):
    shoulder = Vector((0.19*sign, 0.02, 1.44))
    ang = -sign * math.radians(3.0)   # abrir brazo hacia afuera
    R = Matrix.Rotation(ang, 3, 'Y')
    for v in bm.verts:
        p = v.co
        if p.x*sign < 0.13 or p.z > 1.50 or p.z < 0.55:
            continue
        # peso: 1 en el brazo, 0 en el torso (falloff en x y cerca del hombro)
        wx = clamp((p.x*sign - 0.15)/0.07, 0.0, 1.0)
        wz = clamp((1.47 - p.z)/0.10, 0.0, 1.0) if p.z < 1.47 else 0.0
        w = wx*wz
        w = w*w*(3-2*w)  # smoothstep
        if w <= 0: continue
        Ri = Matrix.Rotation(ang*w, 3, 'Y')
        v.co = shoulder + Ri @ (p - shoulder)

    # dedos: cerrar abanico (comprimir x hacia el eje local de la mano)
    for v in bm.verts:
        p = v.co
        if p.x*sign < 0.13 or p.z > 1.00:
            continue
        w = clamp((1.00 - p.z)/0.12, 0.0, 1.0)
        w = w*w*(3-2*w)
        # eje local aprox de la mano en esa altura
        axis_x = 0.262*sign
        newx = axis_x + (p.x - axis_x)*(1.0 - 0.20*w)
        v.co.x = newx
        # llevar la palma ligeramente hacia el muslo (-y) para que no quede adelantada
        v.co.y -= 0.008*w

bm.to_mesh(me); bm.free()
me.update()

# suavizado local de orejas (pliegue trasero de la cabeza)
bm = bmesh.new(); bm.from_mesh(me)
ear = [v for v in bm.verts if abs(v.co.x) > 0.055 and abs(v.co.x) < 0.105 and -0.06 < v.co.y < 0.045 and 1.60 < v.co.z < 1.72]
for _ in range(6):
    for v in ear:
        vs = [e.other_vert(v) for e in v.link_edges]
        if vs:
            avg = Vector((0,0,0))
            for o in vs: avg += o.co
            avg /= len(vs)
            v.co = v.co.lerp(avg, 0.5)
bm.to_mesh(me); bm.free(); me.update()

# suavizado global final leve
bpy.context.view_layer.objects.active = obj
mod = obj.modifiers.new("final", 'LAPLACIANSMOOTH')
mod.lambda_factor = 0.35; mod.iterations = 2
mod.use_volume_preserve = True; mod.use_normalized = True
bpy.ops.object.modifier_apply(modifier=mod.name)

bm = bmesh.new(); bm.from_mesh(me); bm.edges.ensure_lookup_table()
print("FINAL VERTS", len(bm.verts), "FACES", len(bm.faces), "NON_MANIFOLD", len([e for e in bm.edges if not e.is_manifold]))
bm.free()

bpy.ops.export_scene.gltf(filepath=dst, export_format='GLB', export_yup=True,
    export_apply=True, export_normals=True, export_texcoords=False, export_materials='EXPORT')
print("EXPORT DONE")
