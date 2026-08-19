import bpy, sys, math, os, mathutils

argv = sys.argv[sys.argv.index("--")+1:]
glb_path = argv[0]
out_dir = argv[1]
tag = argv[2] if len(argv) > 2 else "model"

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=glb_path)

meshes = [o for o in bpy.data.objects if o.type == 'MESH']

mins = [1e9]*3; maxs = [-1e9]*3
for o in meshes:
    for corner in o.bound_box:
        w = o.matrix_world @ mathutils.Vector(corner)
        for i in range(3):
            mins[i] = min(mins[i], w[i]); maxs[i] = max(maxs[i], w[i])
center = [(mins[i]+maxs[i])/2 for i in range(3)]
size = max(maxs[i]-mins[i] for i in range(3))

mat = bpy.data.materials.new("preview")
mat.use_nodes = True
bsdf = mat.node_tree.nodes["Principled BSDF"]
bsdf.inputs["Base Color"].default_value = (0.72, 0.75, 0.8, 1)
bsdf.inputs["Roughness"].default_value = 0.55
for o in meshes:
    o.data.materials.clear()
    o.data.materials.append(mat)

def add_light(name, loc, energy, size_=5):
    ld = bpy.data.lights.new(name, 'AREA')
    ld.energy = energy; ld.shape='DISK'; ld.size = size_
    lo = bpy.data.objects.new(name, ld)
    lo.location = loc
    bpy.context.collection.objects.link(lo)
    return lo

key = add_light("key", (3, -4, 4), 900)
fill = add_light("fill", (-4, -2, 2), 500)
rim = add_light("rim", (0, 4, 5), 800)

cam_data = bpy.data.cameras.new("cam")
cam = bpy.data.objects.new("cam", cam_data)
bpy.context.collection.objects.link(cam)
bpy.context.scene.camera = cam

scene = bpy.context.scene
scene.render.engine = 'BLENDER_EEVEE'
scene.render.resolution_x = 700
scene.render.resolution_y = 900
scene.render.film_transparent = True
scene.render.image_settings.file_format = 'PNG'

views = {
    "front": (0, -1, 0),
    "side":  (1, 0, 0),
    "back":  (0, 1, 0),
    "three": (0.7, -0.7, 0.35),
}
dist = size * 1.9
look_z = center[2]

def point_at(obj, target):
    d = mathutils.Vector(target) - obj.location
    obj.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()

for name, d in views.items():
    dv = mathutils.Vector(d).normalized()
    cam.location = mathutils.Vector((center[0], center[1], look_z)) + dv * dist
    point_at(cam, (center[0], center[1], look_z))
    for l in (key, fill, rim):
        point_at(l, (center[0], center[1], look_z))
    scene.render.filepath = os.path.join(out_dir, f"{tag}_{name}.png")
    bpy.ops.render.render(write_still=True)

print("RENDER DONE")
