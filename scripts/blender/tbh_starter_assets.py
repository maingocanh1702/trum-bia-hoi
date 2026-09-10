"""Original geometry, executed through Blender MCP. No downloaded models.

Art dimensions/camera/shading are production settings, not game economy values.
Call setup(), build_world(), build_coin(), then render_asset(id) through MCP.
"""
import bpy
import math
import re
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
RAW = ROOT / 'assets/_raw/blender/starter-mcp'
IDS = ('table-lv1-empty', 'table-lv2-empty', 'chair-plastic', 'icon-coin')
TOKENS = dict(re.findall(r'\| `([^`]+)` \| `(#[0-9a-fA-F]{6})`', (ROOT / 'docs/design-tokens.md').read_text()))


def rgb(token, shade=1):
    h = TOKENS[token].lstrip('#')
    srgb = [min(1, int(h[i:i+2], 16) / 255 * shade) for i in (0, 2, 4)]
    return tuple(v / 12.92 if v <= .04045 else ((v + .055) / 1.055) ** 2.4 for v in srgb) + (1,)


def material(token):
    m = bpy.data.materials.new('TBH_' + token)
    m.use_nodes = True
    n, links = m.node_tree.nodes, m.node_tree.links
    n.clear()
    diffuse = n.new('ShaderNodeBsdfDiffuse')
    shader_rgb = n.new('ShaderNodeShaderToRGB')
    ramp = n.new('ShaderNodeValToRGB')
    ramp.color_ramp.interpolation = 'CONSTANT'
    for e, position, shade in zip(ramp.color_ramp.elements, (0, .38), (.65, 1)):
        e.position, e.color = position, rgb(token, shade)
    ramp.color_ramp.elements.new(.8).color = rgb(token, 1.18)
    emission, out = n.new('ShaderNodeEmission'), n.new('ShaderNodeOutputMaterial')
    links.new(diffuse.outputs[0], shader_rgb.inputs[0])
    links.new(shader_rgb.outputs[0], ramp.inputs[0])
    links.new(ramp.outputs[0], emission.inputs[0])
    links.new(emission.outputs[0], out.inputs['Surface'])
    return m


def setup():
    assert not bpy.data.scenes.get('TBH_Starter_MCP'), 'Studio already exists; inspect before rebuilding'
    RAW.mkdir(parents=True, exist_ok=True)
    s = bpy.data.scenes.new('TBH_Starter_MCP')
    bpy.context.window.scene = s
    s.render.engine = 'BLENDER_EEVEE_NEXT'
    s.eevee.taa_render_samples = 16
    s.render.resolution_x = s.render.resolution_y = 512
    s.render.resolution_percentage = 100
    s.render.film_transparent = True
    s.render.image_settings.file_format = 'PNG'
    s.render.image_settings.color_mode = 'RGBA'
    s.view_settings.view_transform = 'Standard'
    s.view_settings.look = 'None'
    s.world = bpy.data.worlds.new('TBH_Transparent_World')
    s.world.color = (.25, .25, .25)
    for name, position, target, scale in [
        ('TBH_WORLD', (3, -4, 4), (0, 0, .35), 1.9),
        ('TBH_ICON', (1.6, -5, 2.1), (0, 0, .4), 1.18),
    ]:
        data = bpy.data.cameras.new(name)
        obj = bpy.data.objects.new(name, data)
        s.collection.objects.link(obj)
        obj.location = position
        obj.rotation_euler = (Vector(target) - obj.location).to_track_quat('-Z', 'Y').to_euler()
        data.type, data.ortho_scale = 'ORTHO', scale
    sun = bpy.data.lights.new('TBH_Key', 'SUN')
    sun.energy, sun.angle = 2, 0
    obj = bpy.data.objects.new('TBH_Key', sun)
    s.collection.objects.link(obj)
    obj.rotation_euler = tuple(math.radians(v) for v in (50, 0, -40))
    for name in IDS:
        s.collection.children.link(bpy.data.collections.new(name))
    print('Studio ready:', s.name)


def own(obj, group, mat):
    for c in list(obj.users_collection):
        c.objects.unlink(obj)
    bpy.data.collections[group].objects.link(obj)
    obj.name = group + '_' + obj.name
    obj.data.materials.append(mat)
    return obj


def box(group, mat, position, size, bevel=.02):
    bpy.ops.mesh.primitive_cube_add(size=1, location=position)
    obj = own(bpy.context.object, group, mat)
    obj.scale = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel:
        mod = obj.modifiers.new('Moulded corners', 'BEVEL')
        mod.width, mod.segments = bevel, 2
    return obj


def furniture(group, token, width, height, plastic):
    mat = material(token)
    box(group, mat, (0, 0, height - .04), (width, width, .08), .035)
    inset = width * .35
    for x in (-inset, inset):
        for y in (-inset, inset):
            leg = box(group, mat, (x, y, (height - .08) / 2), (.075, .075, height - .08), .014)
            if plastic:
                leg.rotation_euler = (math.copysign(.06, y), -math.copysign(.06, x), 0)
    for sign in (-1, 1):
        box(group, mat, (0, sign * inset, height - .135), (inset * 2 + .06, .035, .15 if plastic else .07), .012)
        box(group, mat, (sign * inset, 0, height - .135), (.035, inset * 2 + .06, .15 if plastic else .07), .012)
    if plastic:
        box(group, mat, (0, 0, height + .002), (width * .78, width * .78, .009), .025)


def build_world():
    furniture('table-lv1-empty', 'info', .95, .62, True)
    furniture('table-lv2-empty', 'inox', .95, .62, False)
    furniture('chair-plastic', 'stoolRed', .49, .32, True)
    print('Three original furniture models built')


def build_coin():
    group, mat = 'icon-coin', material('coinGold')
    bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=.4, depth=.08, location=(0, 0, .4), rotation=(math.pi/2, 0, 0))
    own(bpy.context.object, group, mat)
    bpy.ops.mesh.primitive_torus_add(major_segments=32, minor_segments=6, location=(0, -.055, .4), rotation=(math.pi/2, 0, 0), major_radius=.337, minor_radius=.023)
    own(bpy.context.object, group, mat)
    vertices = []
    for y in (-.054, -.085):
        for i in range(10):
            a, radius = math.pi/2 + i * math.pi/5, .215 if i % 2 == 0 else .098
            vertices.append((math.cos(a) * radius, y, .4 + math.sin(a) * radius))
    faces = [tuple(range(9, -1, -1)), tuple(range(10, 20))]
    faces += [(i, (i+1)%10, (i+1)%10+10, i+10) for i in range(10)]
    mesh = bpy.data.meshes.new('Embossed star')
    mesh.from_pydata(vertices, [], faces)
    obj = bpy.data.objects.new('Embossed star', mesh)
    bpy.data.collections[group].objects.link(obj)
    star_mat = material('coinGold')
    for e in star_mat.node_tree.nodes.get('Color Ramp').color_ramp.elements:
        e.color = rgb('coinGold', .65)
    mesh.materials.append(star_mat)
    print('Original coin icon model built')


def render_asset(name):
    assert name in IDS
    s = bpy.data.scenes['TBH_Starter_MCP']
    for group in IDS:
        bpy.data.collections[group].hide_render = group != name
    s.camera = bpy.data.objects['TBH_ICON' if name == 'icon-coin' else 'TBH_WORLD']
    s.render.filepath = str(RAW / (name + '.png'))
    bpy.ops.render.render(write_still=True, scene=s.name)
    print('Rendered via Blender MCP:', s.render.filepath)


def save_source():
    s = bpy.data.scenes['TBH_Starter_MCP']
    bpy.data.libraries.write(str(RAW / 'tbh-starter-mcp.blend'), {s}, fake_user=True, compress=True)
    print('Reusable Blender source saved:', RAW / 'tbh-starter-mcp.blend')
