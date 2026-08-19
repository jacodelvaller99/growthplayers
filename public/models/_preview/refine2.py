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
def smooth(w): return w*w*(3-2*w)

for v in bm.verts:
    p = v.co
    sign = 1 if p.x >= 0 else -1

    # 1) brazos: abduccion adicional ~5 grados desde el hombro
    if p.x*sign > 0.13 and p.z < 1.50 and p.z > 0.55:
        shoulder = Vector((0.19*sign, 0.02, 1.44))
        wx = clamp((p.x*sign - 0.15)/0.07, 0.0, 1.0)
        wz = clamp((1.47 - p.z)/0.10, 0.0, 1.0) if p.z < 1.47 else 0.0
        w = smooth(wx*wz)
        if w > 0:
            R = Matrix.Rotation(-sign*math.radians(5.0)*w, 3, 'Y')
            v.co = shoulder + R @ (p - shoulder)
            p = v.co

    # 2) codo: flexion ligera hacia adelante (~8 grados) para mano a mitad de muslo
    if p.x*sign > 0.14 and p.z < 1.14:
        elbow = Vector((0.25*sign, -0.01, 1.13))
        w = smooth(clamp((1.14 - p.z)/0.10, 0.0, 1.0))
        R = Matrix.Rotation(math.radians(8.0)*w, 3, 'X')
        v.co = elbow + R @ (p - elbow)
        p = v.co

    # 3) dedos: cerrar abanico por completo hacia el eje de la mano
    if p.x*sign > 0.13 and p.z < 1.02:
        w = smooth(clamp((1.02 - p.z)/0.10, 0.0, 1.0))
        axis_x = 0.262*sign
        v.co.x = axis_x + (p.x - axis_x)*(1.0 - 0.35*w)
        p = v.co

    # 4) hombros/deltoides mas anchos (atletico)
    if 1.30 < p.z < 1.55:
        w = smooth(clamp((p.x*sign - 0.08)/0.10, 0.0, 1.0)) * smooth(clamp((p.z-1.30)/0.06,0,1) * clamp((1.55-p.z)/0.06,0,1))
        v.co.x *= (1.0 + 0.05*w)
        p = v.co

    # 5) cintura mas marcada
    if 0.98 < p.z < 1.20 and abs(p.x) < 0.17:
        w = smooth(clamp((p.z-0.98)/0.06,0,1) * clamp((1.20-p.z)/0.06,0,1))
        v.co.x *= (1.0 - 0.04*w)
        v.co.y *= (1.0 - 0.02*w)
        p = v.co

    # 6) pies separados a ancho de cadera
    if p.z < 0.45:
        w = smooth(clamp((0.45 - p.z)/0.35, 0.0, 1.0))
        v.co.x += sign * 0.016 * w

bm.to_mesh(me); bm.free(); me.update()

# suavizado final leve
bpy.context.view_layer.objects.active = obj
mod = obj.modifiers.new("final", 'LAPLACIANSMOOTH')
mod.lambda_factor = 0.3; mod.iterations = 2
mod.use_volume_preserve = True; mod.use_normalized = True
bpy.ops.object.modifier_apply(modifier=mod.name)

# normalizar altura a 1.80 exactos, origen suelo
bm = bmesh.new(); bm.from_mesh(me)
zmin = min(v.co.z for v in bm.verts); zmax = max(v.co.z for v in bm.verts)
s = 1.8/(zmax-zmin)
for v in bm.verts:
    v.co.x *= s; v.co.y *= s; v.co.z = (v.co.z - zmin)*s
bm.to_mesh(me); bm.free(); me.update()

bm = bmesh.new(); bm.from_mesh(me); bm.edges.ensure_lookup_table()
nm = len([e for e in bm.edges if not e.is_manifold])
zs=[v.co.z for v in bm.verts]; xs=[v.co.x for v in bm.verts]
print("FINAL verts", len(bm.verts), "nonmanifold", nm, "z", round(min(zs),4), round(max(zs),4), "x", round(min(xs),4), round(max(xs),4))
bm.free()

bpy.ops.export_scene.gltf(filepath=dst, export_format='GLB', export_yup=True,
    export_apply=True, export_normals=True, export_texcoords=False, export_materials='EXPORT')
print("EXPORT DONE")
