import bpy, sys, bmesh

argv = sys.argv[sys.argv.index("--")+1:]
src, dst = argv[0], argv[1]

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)
obj = [o for o in bpy.data.objects if o.type=='MESH'][0]
bpy.context.view_layer.objects.active = obj
bpy.ops.object.mode_set(mode='EDIT')

# 1) Soldar vertices duplicados (costuras abiertas del repose procedural)
bpy.ops.mesh.select_all(action='SELECT')
bpy.ops.mesh.remove_doubles(threshold=0.0002)

# 2) Rellenar huecos restantes (plantas de pies, ojos, boca) -> malla cerrada
bpy.ops.mesh.select_all(action='SELECT')
bpy.ops.mesh.fill_holes(sides=0)

# 3) Normales consistentes hacia afuera
bpy.ops.mesh.select_all(action='SELECT')
bpy.ops.mesh.normals_make_consistent(inside=False)

bpy.ops.object.mode_set(mode='OBJECT')

# 4) Suavizado laplaciano con preservacion de volumen:
#    quita pliegues/artefactos del repose (codos, rodillas, orejas, cara)
mod = obj.modifiers.new("lapsmooth", 'LAPLACIANSMOOTH')
mod.lambda_factor = 0.6
mod.iterations = 4
mod.use_volume_preserve = True
mod.use_normalized = True

# 5) Triangular y exportar
bpy.ops.object.modifier_apply(modifier=mod.name)
bpy.ops.object.mode_set(mode='EDIT')
bpy.ops.mesh.select_all(action='SELECT')
bpy.ops.mesh.quads_convert_to_tris(quad_method='BEAUTY', ngon_method='BEAUTY')
bpy.ops.object.mode_set(mode='OBJECT')

# verificar resultado
bm = bmesh.new(); bm.from_mesh(obj.data); bm.edges.ensure_lookup_table()
nm = [e for e in bm.edges if not e.is_manifold]
print("RESULT VERTS", len(bm.verts), "FACES", len(bm.faces), "NON_MANIFOLD", len(nm))
bm.free()

bpy.ops.export_scene.gltf(
    filepath=dst,
    export_format='GLB',
    export_yup=True,
    export_apply=True,
    export_normals=True,
    export_texcoords=False,
    export_materials='EXPORT',
)
print("EXPORT DONE")
