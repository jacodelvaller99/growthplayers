import bpy, sys, os, mathutils
argv = sys.argv[sys.argv.index("--")+1:]
glb_path, out_dir, tag = argv[0], argv[1], argv[2]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=glb_path)
meshes = [o for o in bpy.data.objects if o.type == 'MESH']
mat = bpy.data.materials.new("preview"); mat.use_nodes = True
bsdf = mat.node_tree.nodes["Principled BSDF"]
bsdf.inputs["Base Color"].default_value = (0.72, 0.75, 0.8, 1)
bsdf.inputs["Roughness"].default_value = 0.55
for o in meshes:
    o.data.materials.clear(); o.data.materials.append(mat)
def add_light(name, loc, energy):
    ld = bpy.data.lights.new(name, 'AREA'); ld.energy = energy; ld.size = 3
    lo = bpy.data.objects.new(name, ld); lo.location = loc
    bpy.context.collection.objects.link(lo); return lo
lights = [add_light("key", (2,-3,3), 600), add_light("fill", (-3,-1,1), 350), add_light("rim", (0,3,4), 500)]
cam_data = bpy.data.cameras.new("cam"); cam = bpy.data.objects.new("cam", cam_data)
bpy.context.collection.objects.link(cam); bpy.context.scene.camera = cam
scene = bpy.context.scene
scene.render.engine = 'BLENDER_EEVEE'
scene.render.resolution_x = 700; scene.render.resolution_y = 700
scene.render.film_transparent = True
scene.render.image_settings.file_format = 'PNG'
def point_at(obj, target):
    d = mathutils.Vector(target) - obj.location
    obj.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
shots = {
    "jaw_side":  ((0.0, 0.0, 1.58), (1.0, 0.0, 0.1), 0.45),
    "jaw_front": ((0.0, -0.02, 1.58), (0.0, -1.0, 0.15), 0.45),
    "thigh_side":((0.12, 0.0, 0.75), (1.0, -0.15, 0.05), 0.50),
}
for name, (target, d, dist) in shots.items():
    cam.location = mathutils.Vector(target) + mathutils.Vector(d).normalized()*dist
    point_at(cam, target)
    for l in lights: point_at(l, target)
    scene.render.filepath = os.path.join(out_dir, f"{tag}_{name}.png")
    bpy.ops.render.render(write_still=True)
print("JAW DONE")
