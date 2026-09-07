"""
Unified Enemy Fleet Generation Pipeline for Blender 5.3+
Procedurally generates, textures, rigs, animates, and renders 4 unified enemy vessels:
1. Vessel_Frigate_01 (Escort & Skirmisher)
2. Vessel_Destroyer_01 (Direct Fire Fleet Anchor)
3. Vessel_Carrier_01 (Mobile Fleet Bastion & Spawner)
4. Vessel_Station_01 (Orbital Defense & Logistics Citadel)
"""

import bpy
import bmesh
import math
import os
from mathutils import Vector, Euler, Matrix

# ==============================================================================
# CONFIGURATION & FILE PATHS
# ==============================================================================
OUTPUT_DIR = r"c:\New puzzle game"
ARTIFACTS_DIR = r"C:\Users\daryl\.gemini\antigravity\brain\a6f4cfd0-c6fc-42f5-9a91-6f8523514848"
BLEND_FILE = os.path.join(OUTPUT_DIR, "Enemy_Fleet_Updated.blend")
GLB_FILE = os.path.join(OUTPUT_DIR, "Enemy_Fleet_Updated.glb")

def purge_scene():
    """Wipes all existing objects, materials, and collections for a clean build."""
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    
    for coll in bpy.data.collections:
        bpy.data.collections.remove(coll)
    for mat in bpy.data.materials:
        bpy.data.materials.remove(mat)
    for mesh in bpy.data.meshes:
        bpy.data.meshes.remove(mesh)
    for cam in bpy.data.cameras:
        bpy.data.cameras.remove(cam)
    for light in bpy.data.lights:
        bpy.data.lights.remove(light)

# ==============================================================================
# SHADER & PBR MATERIAL LIBRARY
# ==============================================================================
MAT_IDX_HULL = 0
MAT_IDX_ACCENT = 1
MAT_IDX_EMISSIVE = 2
MAT_IDX_MACHINERY = 3
MAT_IDX_GLASS = 4
MAT_IDX_AVIONICS = 5

def create_materials():
    materials = {}
    
    def get_principled_bsdf(mat):
        mat.use_nodes = True
        nodes = mat.node_tree.nodes
        for node in nodes:
            if node.type == 'BSDF_PRINCIPLED':
                return node
        return nodes.new(type='ShaderNodeBsdfPrincipled')

    # 0. Dark Brushed Titanium Hull
    mat_hull = bpy.data.materials.new(name="MAT_Fleet_Hull")
    bsdf = get_principled_bsdf(mat_hull)
    bsdf.inputs['Base Color'].default_value = (0.08, 0.09, 0.11, 1.0)
    bsdf.inputs['Metallic'].default_value = 0.92
    bsdf.inputs['Roughness'].default_value = 0.28
    if 'Anisotropic' in bsdf.inputs:
        bsdf.inputs['Anisotropic'].default_value = 0.45
    materials["HULL"] = mat_hull

    # 1. Military Crimson Anodized Accent (#B21818)
    mat_accent = bpy.data.materials.new(name="MAT_Fleet_Accent")
    bsdf = get_principled_bsdf(mat_accent)
    bsdf.inputs['Base Color'].default_value = (0.85, 0.05, 0.08, 1.0)
    bsdf.inputs['Metallic'].default_value = 0.65
    bsdf.inputs['Roughness'].default_value = 0.20
    if 'Coat Weight' in bsdf.inputs:
        bsdf.inputs['Coat Weight'].default_value = 0.6
    elif 'Clearcoat' in bsdf.inputs:
        bsdf.inputs['Clearcoat'].default_value = 0.6
    materials["ACCENT"] = mat_accent

    # 2. High-Intensity Unified Cyan Emissive (#00F3FF)
    mat_emissive = bpy.data.materials.new(name="MAT_Fleet_Emissive")
    bsdf = get_principled_bsdf(mat_emissive)
    cyan_color = (0.0, 0.95, 1.0, 1.0)
    bsdf.inputs['Base Color'].default_value = cyan_color
    bsdf.inputs['Emission Color'].default_value = cyan_color
    if 'Emission Strength' in bsdf.inputs:
        bsdf.inputs['Emission Strength'].default_value = 12.0
    materials["EMISSIVE"] = mat_emissive

    # 3. Exposed Tungsten Machinery
    mat_machinery = bpy.data.materials.new(name="MAT_Fleet_Machinery")
    bsdf = get_principled_bsdf(mat_machinery)
    bsdf.inputs['Base Color'].default_value = (0.18, 0.18, 0.20, 1.0)
    bsdf.inputs['Metallic'].default_value = 0.95
    bsdf.inputs['Roughness'].default_value = 0.35
    materials["MACHINERY"] = mat_machinery

    # 4. Polarized Cockpit Glass
    mat_glass = bpy.data.materials.new(name="MAT_Fleet_Glass")
    bsdf = get_principled_bsdf(mat_glass)
    bsdf.inputs['Base Color'].default_value = (0.02, 0.08, 0.12, 1.0)
    bsdf.inputs['Metallic'].default_value = 0.1
    bsdf.inputs['Roughness'].default_value = 0.05
    bsdf.inputs['Emission Color'].default_value = (0.0, 0.7, 0.9, 1.0)
    if 'Emission Strength' in bsdf.inputs:
        bsdf.inputs['Emission Strength'].default_value = 1.8
    if 'Transmission Weight' in bsdf.inputs:
        bsdf.inputs['Transmission Weight'].default_value = 0.65
    elif 'Transmission' in bsdf.inputs:
        bsdf.inputs['Transmission'].default_value = 0.65
    bsdf.inputs['IOR'].default_value = 1.54
    materials["GLASS"] = mat_glass

    # 5. Avionics Emerald HUD / Beacon
    mat_avionics = bpy.data.materials.new(name="MAT_Fleet_Avionics")
    bsdf = get_principled_bsdf(mat_avionics)
    bsdf.inputs['Base Color'].default_value = (0.0, 0.9, 0.3, 1.0)
    bsdf.inputs['Emission Color'].default_value = (0.0, 1.0, 0.35, 1.0)
    if 'Emission Strength' in bsdf.inputs:
        bsdf.inputs['Emission Strength'].default_value = 5.0
    materials["AVIONICS"] = mat_avionics

    return materials

def assign_materials_to_obj(obj, materials):
    """Binds the standardized fleet material palette in strict index order."""
    for mat_key in ["HULL", "ACCENT", "EMISSIVE", "MACHINERY", "GLASS", "AVIONICS"]:
        obj.data.materials.append(materials[mat_key])

# ==============================================================================
# BMESH PRIMITIVE & MATERIAL HELPERS
# ==============================================================================
def set_mat_for_verts(verts, mat_idx):
    """Sets material_index for all faces composed strictly of the given vertices."""
    vert_set = set(verts)
    for v in verts:
        for f in v.link_faces:
            if all(fv in vert_set for fv in f.verts):
                f.material_index = mat_idx

def create_box(bm, loc, size, mat_idx=0):
    res = bmesh.ops.create_cube(bm, size=1.0)
    mat = Matrix.Translation(loc) @ Matrix.Diagonal((*size, 1.0))
    bmesh.ops.transform(bm, matrix=mat, verts=res['verts'])
    set_mat_for_verts(res['verts'], mat_idx)
    return res

def create_cone(bm, loc, rot_euler, r1, r2, depth, segs=8, mat_idx=0):
    res = bmesh.ops.create_cone(bm, cap_ends=True, segments=segs, radius1=r1, radius2=r2, depth=depth)
    rot_m = Matrix.Rotation(rot_euler[0], 4, 'X') @ Matrix.Rotation(rot_euler[1], 4, 'Y') @ Matrix.Rotation(rot_euler[2], 4, 'Z')
    mat = Matrix.Translation(loc) @ rot_m
    bmesh.ops.transform(bm, matrix=mat, verts=res['verts'])
    set_mat_for_verts(res['verts'], mat_idx)
    return res

def create_sphere(bm, loc, radius, u_segs=10, v_segs=8, mat_idx=0):
    res = bmesh.ops.create_uvsphere(bm, u_segments=u_segs, v_segments=v_segs, radius=radius)
    bmesh.ops.transform(bm, matrix=Matrix.Translation(loc), verts=res['verts'])
    set_mat_for_verts(res['verts'], mat_idx)
    return res

def apply_game_ready_modifiers(obj, bevel_width=0.1, bevel_segments=3):
    """Applies non-destructive edge beveling and smooth shading."""
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    
    try:
        bpy.ops.object.shade_smooth()
    except Exception:
        pass
    
    # Auto smooth / Smooth by angle
    if hasattr(obj.data, "use_auto_smooth"):
        obj.data.use_auto_smooth = True
        obj.data.auto_smooth_angle = math.radians(35.0)
    else:
        mod_smooth = obj.modifiers.new(name="SmoothByAngle", type='SMOOTH_BY_ANGLE' if 'SMOOTH_BY_ANGLE' in bpy.types.Modifier.bl_rna.properties['type'].enum_items else 'SUBSURF')
        if mod_smooth.type == 'SMOOTH_BY_ANGLE':
            mod_smooth.angle = math.radians(35.0)
        else:
            obj.modifiers.remove(mod_smooth)

    # Edge Bevel Modifier
    bev = obj.modifiers.new(name="Bevel_Chamfer", type='BEVEL')
    bev.limit_method = 'ANGLE'
    bev.angle_limit = math.radians(30.0)
    bev.segments = bevel_segments
    bev.width = bevel_width
    bev.use_clamp_overlap = True

def add_socket(parent_obj, socket_name, local_pos, local_rot=(0,0,0)):
    """Creates an Empty socket locator for gameplay FX attachment."""
    empty = bpy.data.objects.new(socket_name, None)
    empty.empty_display_type = 'ARROWS'
    empty.empty_display_size = 1.0
    empty.location = local_pos
    empty.rotation_euler = [math.radians(a) for a in local_rot]
    empty.parent = parent_obj
    bpy.context.scene.collection.objects.link(empty)
    return empty

# ==============================================================================
# VESSEL 1: FRIGATE (Escort & Skirmisher)
# Wedge profile (3.5:1 ratio), twin heavy cowlings, underslung spinal railgun, dual PDTs
# ==============================================================================
def build_vessel_frigate(collection, materials):
    mesh = bpy.data.meshes.new("Mesh_Vessel_Frigate_01")
    obj = bpy.data.objects.new("Vessel_Frigate_01", mesh)
    collection.objects.link(obj)

    bm = bmesh.new()

    # Main Knife Wedge Hull
    # Dimensions: Length ~48m, Width ~14m, Height ~11m
    verts = [
        # Nose chisel prow
        (0.0, 24.0, 0.0),       # 0: Sharp front tip
        (1.2, 21.0, 1.2),       # 1: Prow upper right
        (-1.2, 21.0, 1.2),      # 2: Prow upper left
        (0.8, 21.0, -1.5),      # 3: Prow keel right
        (-0.8, 21.0, -1.5),     # 4: Prow keel left

        # Midship wedge expansion
        (4.5, 4.0, 3.2),        # 5: Mid dorsal right
        (-4.5, 4.0, 3.2),       # 6: Mid dorsal left
        (6.0, 4.0, -0.5),       # 7: Mid chine right
        (-6.0, 4.0, -0.5),      # 8: Mid chine left
        (2.5, 4.0, -3.8),       # 9: Mid keel right
        (-2.5, 4.0, -3.8),      # 10: Mid keel left

        # Aft superstructure / Engine mounts
        (5.5, -20.0, 4.0),      # 11: Aft upper right
        (-5.5, -20.0, 4.0),     # 12: Aft upper left
        (7.0, -20.0, 0.0),      # 13: Aft chine right
        (-7.0, -20.0, 0.0),     # 14: Aft chine left
        (3.5, -20.0, -4.5),     # 15: Aft keel right
        (-3.5, -20.0, -4.5),    # 16: Aft keel left
    ]
    bm_verts = [bm.verts.new(v) for v in verts]

    hull_faces = [
        # Prow cap
        (bm_verts[0], bm_verts[1], bm_verts[2]),
        (bm_verts[0], bm_verts[3], bm_verts[1]),
        (bm_verts[0], bm_verts[2], bm_verts[4]),
        (bm_verts[0], bm_verts[4], bm_verts[3]),

        # Prow to mid dorsal
        (bm_verts[1], bm_verts[5], bm_verts[6], bm_verts[2]),
        # Prow to mid lateral upper
        (bm_verts[1], bm_verts[3], bm_verts[7], bm_verts[5]),
        (bm_verts[2], bm_verts[6], bm_verts[8], bm_verts[4]),
        # Prow to mid lateral lower
        (bm_verts[3], bm_verts[9], bm_verts[7]),
        (bm_verts[4], bm_verts[8], bm_verts[10]),
        (bm_verts[3], bm_verts[4], bm_verts[10], bm_verts[9]),

        # Mid to Aft dorsal
        (bm_verts[5], bm_verts[11], bm_verts[12], bm_verts[6]),
        # Mid to Aft lateral upper
        (bm_verts[5], bm_verts[7], bm_verts[13], bm_verts[11]),
        (bm_verts[6], bm_verts[12], bm_verts[14], bm_verts[8]),
        # Mid to Aft lateral lower
        (bm_verts[7], bm_verts[9], bm_verts[15], bm_verts[13]),
        (bm_verts[8], bm_verts[14], bm_verts[16], bm_verts[10]),
        # Keel bottom
        (bm_verts[9], bm_verts[10], bm_verts[16], bm_verts[15]),
        # Aft transom bulkhead
        (bm_verts[11], bm_verts[13], bm_verts[15], bm_verts[16], bm_verts[14], bm_verts[12]),
    ]
    for f in hull_faces:
        face = bm.faces.new(f)
        face.material_index = MAT_IDX_HULL

    # Military Crimson Armor Strakes on Wedge Flanks
    create_box(bm, (3.2, 10.0, 2.0), (0.6, 12.0, 0.4), MAT_IDX_ACCENT)
    create_box(bm, (-3.2, 10.0, 2.0), (0.6, 12.0, 0.4), MAT_IDX_ACCENT)

    # Forward-Swept Canard Wing Strakes (Port & Starboard)
    for sign in [1, -1]:
        w_root_f = bm.verts.new((sign * 5.0, 10.0, 0.5))
        w_root_r = bm.verts.new((sign * 6.5, -2.0, 0.5))
        w_tip_f  = bm.verts.new((sign * 11.5, 14.0, 1.2))
        w_tip_r  = bm.verts.new((sign * 10.0, 4.0, 1.0))
        wing_f = bm.faces.new((w_root_f, w_tip_f, w_tip_r, w_root_r))
        wing_f.material_index = MAT_IDX_ACCENT

        # Canard leading edge armor cap
        create_box(bm, (sign * 8.5, 8.0, 0.8), (0.4, 8.0, 0.5), MAT_IDX_MACHINERY)

    # Twin Prominent Engine Cowlings (Aft)
    for sign in [1, -1]:
        cx = sign * 3.8
        # Outer Cowling (Machinery/Hull)
        create_box(bm, (cx, -15.0, 0.2), (2.8, 14.0, 3.2), MAT_IDX_MACHINERY)
        # Cowling Crimson Stripe
        create_box(bm, (cx, -15.0, 1.85), (2.4, 10.0, 0.2), MAT_IDX_ACCENT)

        # Recessed Engine Nozzle (Machinery)
        create_cone(bm, (cx, -22.5, 0.2), (math.radians(-90), 0, 0), 1.2, 0.9, 2.2, 8, MAT_IDX_MACHINERY)
        # High-Intensity Cyan Engine Exhaust Core (#00F3FF)
        create_cone(bm, (cx, -23.2, 0.2), (math.radians(-90), 0, 0), 0.8, 0.3, 1.2, 8, MAT_IDX_EMISSIVE)

    # Underslung Spinal Railgun Barrel along the Keel
    create_box(bm, (0.0, 12.0, -3.2), (1.0, 24.0, 0.9), MAT_IDX_MACHINERY)
    # Glowing Cyan Railgun Magnetic Rail Core
    create_box(bm, (0.0, 14.0, -3.2), (0.3, 20.0, 0.3), MAT_IDX_EMISSIVE)

    # 2x Dorsal Point-Defense Autoreturrets (PDTs)
    for y_pdt in [8.0, -8.0]:
        create_cone(bm, (0.0, y_pdt, 3.6), (0, 0, 0), 1.2, 0.7, 0.8, 8, MAT_IDX_MACHINERY)
        # Dual Barrels
        create_box(bm, (-0.3, y_pdt + 1.6, 3.8), (0.15, 2.2, 0.15), MAT_IDX_MACHINERY)
        create_box(bm, (0.3, y_pdt + 1.6, 3.8), (0.15, 2.2, 0.15), MAT_IDX_MACHINERY)
        # Sensor Lens on PDT
        create_sphere(bm, (0.0, y_pdt + 0.5, 4.1), 0.25, 8, 6, MAT_IDX_EMISSIVE)

    # Centerline Torpedo Silo Tube (Bow)
    create_cone(bm, (0.0, 21.8, -0.6), (math.radians(90), 0, 0), 0.7, 0.5, 1.5, 6, MAT_IDX_MACHINERY)
    create_sphere(bm, (0.0, 22.4, -0.6), 0.35, 6, 6, MAT_IDX_EMISSIVE)

    bm.to_mesh(mesh)
    bm.free()

    assign_materials_to_obj(obj, materials)
    apply_game_ready_modifiers(obj, bevel_width=0.1, bevel_segments=3)

    # Sockets
    add_socket(obj, "SOCKET_Frigate_Engine_L", (-3.8, -23.5, 0.2), (0, 180, 0))
    add_socket(obj, "SOCKET_Frigate_Engine_R", (3.8, -23.5, 0.2), (0, 180, 0))
    add_socket(obj, "SOCKET_Frigate_Railgun_Muzzle", (0.0, 24.2, -3.2), (0, 0, 0))
    add_socket(obj, "SOCKET_Frigate_Torpedo_Tube", (0.0, 22.5, -0.6), (0, 0, 0))
    add_socket(obj, "SOCKET_Frigate_PDT_Fore", (0.0, 8.0, 4.2), (0, 0, 0))
    add_socket(obj, "SOCKET_Frigate_PDT_Aft", (0.0, -8.0, 4.2), (0, 0, 0))

    return obj

# ==============================================================================
# VESSEL 2: DESTROYER (Direct Fire Fleet Anchor)
# Hexagonal faceted slab hull, brutalist chisel prow, recessed spinal accelerator trench, 4 heavy turrets
# ==============================================================================
def build_vessel_destroyer(collection, materials):
    mesh = bpy.data.meshes.new("Mesh_Vessel_Destroyer_01")
    obj = bpy.data.objects.new("Vessel_Destroyer_01", mesh)
    collection.objects.link(obj)

    bm = bmesh.new()

    # Brutalist Hexagonal Slab Hull (Length ~82m, Beam ~34m, Draft ~18m)
    verts = [
        # Heavy Chisel Prow Tip
        (0.0, 42.0, 0.0),       # 0
        (4.0, 36.0, 3.5),       # 1: Prow upper right
        (-4.0, 36.0, 3.5),      # 2: Prow upper left
        (6.0, 36.0, -4.0),      # 3: Prow lower right
        (-6.0, 36.0, -4.0),     # 4: Prow lower left

        # Forward Armor Break
        (10.0, 15.0, 6.0),      # 5: Foredeck upper right
        (-10.0, 15.0, 6.0),     # 6: Foredeck upper left
        (15.0, 15.0, 0.0),      # 7: Sponson mid right
        (-15.0, 15.0, 0.0),     # 8: Sponson mid left
        (9.0, 15.0, -6.5),      # 9: Keel right
        (-9.0, 15.0, -6.5),     # 10: Keel left

        # Main Midship Citadel
        (12.0, -15.0, 7.5),     # 11: Citadel upper right
        (-12.0, -15.0, 7.5),    # 12: Citadel upper left
        (17.0, -15.0, 1.0),     # 13: Citadel flank right
        (-17.0, -15.0, 1.0),    # 14: Citadel flank left
        (10.0, -15.0, -7.0),    # 15: Keel aft right
        (-10.0, -15.0, -7.0),   # 16: Keel aft left

        # Aft Stern & Engine Block
        (10.0, -40.0, 7.0),     # 17: Aft upper right
        (-10.0, -40.0, 7.0),    # 18: Aft upper left
        (14.0, -40.0, 0.5),     # 19: Aft flank right
        (-14.0, -40.0, 0.5),    # 20: Aft flank left
        (8.0, -40.0, -6.0),     # 21: Aft keel right
        (-8.0, -40.0, -6.0),    # 22: Aft keel left
    ]
    bm_verts = [bm.verts.new(v) for v in verts]

    hull_faces = [
        # Chisel prow faces
        (bm_verts[0], bm_verts[1], bm_verts[2]),
        (bm_verts[0], bm_verts[3], bm_verts[1]),
        (bm_verts[0], bm_verts[2], bm_verts[4]),
        (bm_verts[0], bm_verts[4], bm_verts[3]),

        # Prow to Foredeck
        (bm_verts[1], bm_verts[5], bm_verts[6], bm_verts[2]),
        (bm_verts[1], bm_verts[3], bm_verts[7], bm_verts[5]),
        (bm_verts[2], bm_verts[6], bm_verts[8], bm_verts[4]),
        (bm_verts[3], bm_verts[9], bm_verts[7]),
        (bm_verts[4], bm_verts[8], bm_verts[10]),
        (bm_verts[3], bm_verts[4], bm_verts[10], bm_verts[9]),

        # Foredeck to Citadel
        (bm_verts[5], bm_verts[11], bm_verts[12], bm_verts[6]),
        (bm_verts[5], bm_verts[7], bm_verts[13], bm_verts[11]),
        (bm_verts[6], bm_verts[12], bm_verts[14], bm_verts[8]),
        (bm_verts[7], bm_verts[9], bm_verts[15], bm_verts[13]),
        (bm_verts[8], bm_verts[14], bm_verts[16], bm_verts[10]),
        (bm_verts[9], bm_verts[10], bm_verts[16], bm_verts[15]),

        # Citadel to Stern
        (bm_verts[11], bm_verts[17], bm_verts[18], bm_verts[12]),
        (bm_verts[11], bm_verts[13], bm_verts[19], bm_verts[17]),
        (bm_verts[12], bm_verts[18], bm_verts[20], bm_verts[14]),
        (bm_verts[13], bm_verts[15], bm_verts[21], bm_verts[19]),
        (bm_verts[14], bm_verts[20], bm_verts[22], bm_verts[16]),
        (bm_verts[15], bm_verts[16], bm_verts[22], bm_verts[21]),

        # Stern Transom
        (bm_verts[17], bm_verts[19], bm_verts[21], bm_verts[22], bm_verts[20], bm_verts[18]),
    ]
    for f in hull_faces:
        face = bm.faces.new(f)
        face.material_index = MAT_IDX_HULL

    # Military Crimson Heavy Armor Prow Chevrons
    create_box(bm, (4.5, 30.0, 4.2), (1.5, 8.0, 0.4), MAT_IDX_ACCENT)
    create_box(bm, (-4.5, 30.0, 4.2), (1.5, 8.0, 0.4), MAT_IDX_ACCENT)

    # Recessed Spinal Accelerator Trench (Machinery Base)
    create_box(bm, (0.0, 16.0, 6.2), (2.8, 38.0, 1.4), MAT_IDX_MACHINERY)

    # High-Intensity Cyan Railgun Magnetic Conduit running through Trench
    create_box(bm, (0.0, 16.0, 6.1), (0.8, 36.0, 0.4), MAT_IDX_EMISSIVE)

    # 12 Heavy Tungsten Magnetic Accelerator Coil Ribs arching over Trench
    for i in range(12):
        ry = 32.0 - (i * 3.0)
        create_box(bm, (0.0, ry, 6.8), (3.2, 0.8, 1.6), MAT_IDX_MACHINERY)

    # Superstructure Bridge Tower (Armored Command Deck)
    create_box(bm, (0.0, -18.0, 10.0), (7.5, 14.0, 4.5), MAT_IDX_HULL)
    # Bridge Tower Crimson Chevrons
    create_box(bm, (3.9, -18.0, 10.0), (0.2, 12.0, 1.2), MAT_IDX_ACCENT)
    create_box(bm, (-3.9, -18.0, 10.0), (0.2, 12.0, 1.2), MAT_IDX_ACCENT)

    # Cockpit / Bridge Polarized Glass Visor Bar (Glass / Emissive Backlight)
    create_box(bm, (0.0, -10.8, 11.2), (6.2, 0.8, 1.3), MAT_IDX_GLASS)

    # 4x Heavy Dual-Barrel Kinetic Railgun Turrets
    turret_positions = [
        (0.0, 22.0, 6.5, 0.0),       # Foredeck
        (0.0, -6.0, 9.2, 0.0),        # Superfiring Bridge
        (14.0, 0.0, 1.2, -45.0),      # Starboard Sponson
        (-14.0, 0.0, 1.2, 45.0),      # Port Sponson
    ]
    for tx, ty, tz, trot in turret_positions:
        rot_r = (0, 0, math.radians(trot))
        # Turret Base (Machinery)
        create_cone(bm, (tx, ty, tz), rot_r, 2.4, 1.8, 1.4, 8, MAT_IDX_MACHINERY)
        # Turret Accent Stripe
        create_cone(bm, (tx, ty, tz + 0.6), rot_r, 1.9, 1.5, 0.3, 8, MAT_IDX_ACCENT)

        # Dual Heavy Rail Barrels
        rot_mat = Matrix.Rotation(math.radians(trot), 4, 'Z')
        for bx in [-0.7, 0.7]:
            b_loc = Vector((tx, ty, tz + 0.3)) + rot_mat @ Vector((bx, 4.5, 0.0))
            create_box(bm, b_loc, (0.4, 7.5, 0.4), MAT_IDX_MACHINERY)
            # Glowing Railgun Emitter Tip
            tip_loc = Vector((tx, ty, tz + 0.3)) + rot_mat @ Vector((bx, 8.4, 0.0))
            create_sphere(bm, tip_loc, 0.25, 6, 6, MAT_IDX_EMISSIVE)

    # Dual Aft Heavy Hexagonal Engine Blocks
    for sign in [1, -1]:
        ex = sign * 6.5
        create_box(bm, (ex, -34.0, 0.5), (6.0, 16.0, 5.5), MAT_IDX_MACHINERY)
        create_box(bm, (ex, -34.0, 3.4), (5.2, 12.0, 0.3), MAT_IDX_ACCENT)

        # Recessed Hex Nozzles (3 per engine bank) with Glowing Cyan Plumes
        for nz_z in [-1.3, 1.3]:
            create_cone(bm, (ex, -42.5, 0.5 + nz_z), (math.radians(-90), 0, 0), 1.4, 1.0, 3.5, 6, MAT_IDX_MACHINERY)
            create_cone(bm, (ex, -43.8, 0.5 + nz_z), (math.radians(-90), 0, 0), 0.9, 0.4, 2.0, 6, MAT_IDX_EMISSIVE)

    bm.to_mesh(mesh)
    bm.free()

    assign_materials_to_obj(obj, materials)
    apply_game_ready_modifiers(obj, bevel_width=0.12, bevel_segments=3)

    # Sockets
    add_socket(obj, "SOCKET_Destroyer_Engine_L", (-6.5, -44.5, 0.5), (0, 180, 0))
    add_socket(obj, "SOCKET_Destroyer_Engine_R", (6.5, -44.5, 0.5), (0, 180, 0))
    add_socket(obj, "SOCKET_Destroyer_Spinal_Trench", (0.0, 36.0, 6.2), (0, 0, 0))
    add_socket(obj, "SOCKET_Destroyer_Turret_Fore", (0.0, 22.0, 7.8), (0, 0, 0))
    add_socket(obj, "SOCKET_Destroyer_Turret_Bridge", (0.0, -6.0, 10.5), (0, 0, 0))
    add_socket(obj, "SOCKET_Destroyer_Turret_Sponson_R", (14.0, 0.0, 2.5), (0, 0, -45))
    add_socket(obj, "SOCKET_Destroyer_Turret_Sponson_L", (-14.0, 0.0, 2.5), (0, 0, 45))

    return obj

# ==============================================================================
# VESSEL 3: CARRIER (Mobile Fleet Bastion & Spawner)
# Catamaran double-boom flight deck, hollowed flight bays, launch tubes, offset island
# ==============================================================================
def build_vessel_carrier(collection, materials):
    mesh = bpy.data.meshes.new("Mesh_Vessel_Carrier_01")
    obj = bpy.data.objects.new("Vessel_Carrier_01", mesh)
    collection.objects.link(obj)

    bm = bmesh.new()

    # Twin Catamaran Flight Booms (Port & Starboard)
    boom_spacing = 18.0

    for sign in [1, -1]:
        bx = sign * boom_spacing

        # Upper Flight Deck Slab (Titanium Hull)
        create_box(bm, (bx, 0.0, 4.5), (13.0, 105.0, 2.2), MAT_IDX_HULL)
        # Angled Flight Deck Bow Prow (Ski-jump ramp)
        create_box(bm, (bx, 53.0, 5.0), (12.0, 6.0, 1.2), MAT_IDX_ACCENT)

        # Lower Keel Slab (Titanium Hull)
        create_box(bm, (bx, 0.0, -4.5), (13.0, 105.0, 2.2), MAT_IDX_HULL)

        # Outer Armored Sidewall (Titanium Hull)
        create_box(bm, (bx + (sign * 5.6), 0.0, 0.0), (1.8, 105.0, 7.0), MAT_IDX_HULL)
        # Exterior Crimson Armor Stripe along Sidewall
        create_box(bm, (bx + (sign * 6.6), 0.0, 0.0), (0.2, 92.0, 2.4), MAT_IDX_ACCENT)

        # Open Hollow Through-Deck Flight Hangar Bay (Visible Interior)
        # Hangar Runway Floor (Illuminated Cyan Guidance Strip)
        create_box(bm, (bx, 0.0, -3.3), (5.0, 102.0, 0.2), MAT_IDX_EMISSIVE)
        # Overhead Hangar Ceiling Lighting Strip
        create_box(bm, (bx, 0.0, 3.3), (2.0, 100.0, 0.2), MAT_IDX_EMISSIVE)
        # Top Flight Deck Runway Centerline Strip
        create_box(bm, (bx, 0.0, 5.65), (2.2, 92.0, 0.15), MAT_IDX_EMISSIVE)
        create_box(bm, (bx + (sign * 3.5), 0.0, 5.65), (1.2, 85.0, 0.15), MAT_IDX_ACCENT)

        # Internal Structural Rib Bulkheads along Hangar
        for ry in [-30.0, -10.0, 10.0, 30.0]:
            create_box(bm, (bx, ry, 0.0), (11.0, 1.2, 7.0), MAT_IDX_MACHINERY)

        # Vented Drone Launch Tubes (2 per boom)
        for ly in [28.0, 12.0]:
            create_cone(bm, (bx + (sign * 6.8), ly, 0.0), (0, math.radians(sign * 90), 0), 1.8, 1.4, 4.0, 6, MAT_IDX_MACHINERY)
            create_sphere(bm, (bx + (sign * 8.8), ly, 0.0), 0.8, 8, 6, MAT_IDX_EMISSIVE)

        # Aft Main Thruster Cluster (2 massive nozzles per boom)
        for nz_x in [-2.5, 2.5]:
            create_cone(bm, (bx + nz_x, -53.5, 0.0), (math.radians(-90), 0, 0), 2.4, 1.7, 5.0, 8, MAT_IDX_MACHINERY)
            create_cone(bm, (bx + nz_x, -55.2, 0.0), (math.radians(-90), 0, 0), 1.5, 0.6, 2.5, 8, MAT_IDX_EMISSIVE)

    # Heavy Central Armored Cross-Truss Bridge connecting both booms
    create_box(bm, (0.0, -10.0, -0.5), (boom_spacing * 2.0, 48.0, 6.5), MAT_IDX_HULL)
    create_box(bm, (0.0, -10.0, 2.9), (boom_spacing * 1.6, 40.0, 0.4), MAT_IDX_ACCENT)

    # Forward Central Armor Prow Spine
    create_box(bm, (0.0, 28.0, 1.5), (14.0, 32.0, 5.0), MAT_IDX_MACHINERY)
    create_box(bm, (0.0, 38.0, 1.5), (8.0, 12.0, 3.5), MAT_IDX_HULL)

    # Offset Starboard Command Island Tower
    island_x = boom_spacing + 5.5
    create_box(bm, (island_x, -12.0, 11.5), (6.0, 22.0, 9.0), MAT_IDX_HULL)
    create_box(bm, (island_x + 3.1, -12.0, 11.5), (0.2, 18.0, 1.5), MAT_IDX_ACCENT)

    # Command Bridge Visor Glass
    create_box(bm, (island_x, -0.8, 14.5), (5.2, 0.8, 1.5), MAT_IDX_GLASS)
    create_box(bm, (island_x, -0.7, 14.5), (4.5, 0.2, 1.0), MAT_IDX_EMISSIVE)

    # Sensor Radome Sphere on Island
    create_sphere(bm, (island_x, -6.0, 17.0), 2.5, 10, 8, MAT_IDX_MACHINERY)
    create_box(bm, (island_x, -18.0, 18.0), (0.6, 0.6, 8.0), MAT_IDX_MACHINERY)

    # Heavy Shield Generator Dome on Port Deck (Pulsing Cyan Ring)
    create_sphere(bm, (-boom_spacing, -15.0, 7.5), 3.2, 10, 8, MAT_IDX_MACHINERY)
    create_cone(bm, (-boom_spacing, -15.0, 10.2), (0, 0, 0), 2.2, 1.8, 0.5, 8, MAT_IDX_EMISSIVE)

    # 360-Degree Point-Defense Grid (PDG) Turrets (6 around perimeter)
    pdg_positions = [
        (boom_spacing, 42.0, 6.2),
        (-boom_spacing, 42.0, 6.2),
        (boom_spacing, -35.0, 6.2),
        (-boom_spacing, -35.0, 6.2),
        (0.0, 44.0, 4.2),
        (0.0, -32.0, 3.2),
    ]
    for px, py, pz in pdg_positions:
        create_cone(bm, (px, py, pz), (0, 0, 0), 1.4, 0.9, 0.8, 6, MAT_IDX_MACHINERY)
        create_sphere(bm, (px, py, pz + 0.6), 0.35, 6, 6, MAT_IDX_EMISSIVE)

    bm.to_mesh(mesh)
    bm.free()

    assign_materials_to_obj(obj, materials)
    apply_game_ready_modifiers(obj, bevel_width=0.15, bevel_segments=3)

    # Sockets
    add_socket(obj, "SOCKET_Carrier_Hangar_Port_Launch", (-boom_spacing, 52.0, 0.0), (0, 0, 0))
    add_socket(obj, "SOCKET_Carrier_Hangar_Port_Recov", (-boom_spacing, -52.0, 0.0), (0, 180, 0))
    add_socket(obj, "SOCKET_Carrier_Hangar_Stbd_Launch", (boom_spacing, 52.0, 0.0), (0, 0, 0))
    add_socket(obj, "SOCKET_Carrier_Hangar_Stbd_Recov", (boom_spacing, -52.0, 0.0), (0, 180, 0))
    add_socket(obj, "SOCKET_Carrier_Engine_Port", (-boom_spacing, -56.0, 0.0), (0, 180, 0))
    add_socket(obj, "SOCKET_Carrier_Engine_Stbd", (boom_spacing, -56.0, 0.0), (0, 180, 0))
    add_socket(obj, "SOCKET_Carrier_Shield_Gen", (-boom_spacing, -15.0, 11.0), (0, 0, 0))

    return obj

# ==============================================================================
# VESSEL 4: SPACE STATION (Orbital Defense & Logistics Citadel)
# Central docking spine, rotating centrifugal habitat torus ring, solar radiators, mooring gantries
# ==============================================================================
def build_vessel_station(collection, materials):
    mesh_core = bpy.data.meshes.new("Mesh_Vessel_Station_01")
    obj_station = bpy.data.objects.new("Vessel_Station_01", mesh_core)
    collection.objects.link(obj_station)

    bm_core = bmesh.new()

    # 1. Central Hexagonal Docking Spine (Height: ~95m, Radius: ~6m)
    create_cone(bm_core, (0.0, 0.0, 0.0), (0, 0, 0), 6.5, 5.0, 95.0, 6, MAT_IDX_HULL)

    # 2. Upper & Lower Mooring Modules / Docking Spines
    for sz in [42.0, -42.0]:
        create_cone(bm_core, (0.0, 0.0, sz), (0, 0, 0), 8.5, 3.5, 10.0, 8, MAT_IDX_MACHINERY)
        # Glowing Docking Alignment Rings
        create_cone(bm_core, (0.0, 0.0, sz + (2.5 if sz > 0 else -2.5)), (0, 0, 0), 6.0, 5.2, 1.2, 8, MAT_IDX_EMISSIVE)

    # 3. Four Capital Ship Mooring Gantries (Radial +X, -X, +Y, -Y at z=12m)
    for angle_deg in [0, 90, 180, 270]:
        rot_rad = math.radians(angle_deg)
        rot_m = Matrix.Rotation(rot_rad, 4, 'Z')

        # Gantry extension arm (extends out 55m)
        g_loc = rot_m @ Vector((32.0, 0.0, 12.0))
        create_box(bm_core, g_loc, (45.0, 3.5, 4.0), MAT_IDX_MACHINERY)

        # Mooring Clamp Head at tip
        cl_loc = rot_m @ Vector((56.0, 0.0, 12.0))
        create_box(bm_core, cl_loc, (6.0, 8.0, 8.0), MAT_IDX_HULL)
        # Crimson identification bands on gantry
        create_box(bm_core, cl_loc + Vector((0, 0, 4.1)), (5.0, 7.0, 0.3), MAT_IDX_ACCENT)

        # Heavy Orbital Beam Defense Turret with Cyan Emitter
        tr_loc = rot_m @ Vector((56.0, 0.0, 17.0))
        create_cone(bm_core, tr_loc, (0, 0, rot_rad), 2.2, 1.4, 2.5, 6, MAT_IDX_MACHINERY)
        create_sphere(bm_core, tr_loc + Vector((0, 0, 1.5)), 0.6, 6, 6, MAT_IDX_EMISSIVE)

    # 4. Solar Radiator Array Panels (Upper Z at 45 degree diagonals)
    for angle_deg in [45, 135, 225, 315]:
        rot_rad = math.radians(angle_deg)
        rot_m = Matrix.Rotation(rot_rad, 4, 'Z')
        pn_loc = rot_m @ Vector((28.0, 0.0, 32.0))
        create_box(bm_core, pn_loc, (32.0, 0.4, 18.0), MAT_IDX_MACHINERY)
        # Solar Panel Active Photovoltaic Face
        create_box(bm_core, pn_loc + rot_m @ Vector((0, 0.25, 0)), (30.0, 0.1, 16.0), MAT_IDX_GLASS)

    bm_core.to_mesh(mesh_core)
    bm_core.free()

    assign_materials_to_obj(obj_station, materials)
    apply_game_ready_modifiers(obj_station, bevel_width=0.15, bevel_segments=3)

    # --------------------------------------------------------------------------
    # Rotating Centrifugal Habitat Torus Ring (Child Object parented to Station)
    # --------------------------------------------------------------------------
    mesh_ring = bpy.data.meshes.new("Mesh_Station_Habitat_Ring")
    obj_ring = bpy.data.objects.new("Station_Habitat_Ring", mesh_ring)
    collection.objects.link(obj_ring)
    obj_ring.parent = obj_station

    bm_ring = bmesh.new()

    # Torus Ring (Major radius: 42m, Minor radius: 4.2m)
    num_torus_seg = 32
    num_cross_seg = 8
    major_r = 42.0
    minor_r = 4.2

    ring_verts = []
    for i in range(num_torus_seg):
        theta = 2.0 * math.pi * i / num_torus_seg
        cos_t = math.cos(theta)
        sin_t = math.sin(theta)
        cx = major_r * cos_t
        cy = major_r * sin_t

        col_verts = []
        for j in range(num_cross_seg):
            phi = 2.0 * math.pi * j / num_cross_seg
            px = cx + minor_r * math.cos(phi) * cos_t
            py = cy + minor_r * math.cos(phi) * sin_t
            pz = minor_r * math.sin(phi)
            v = bm_ring.verts.new((px, py, pz))
            col_verts.append(v)
        ring_verts.append(col_verts)

    for i in range(num_torus_seg):
        next_i = (i + 1) % num_torus_seg
        for j in range(num_cross_seg):
            next_j = (j + 1) % num_cross_seg
            v1 = ring_verts[i][j]
            v2 = ring_verts[next_i][j]
            v3 = ring_verts[next_i][next_j]
            v4 = ring_verts[i][next_j]
            face = bm_ring.faces.new((v1, v2, v3, v4))
            # Alternate habitat windows with glowing emissive Cyan/Emerald
            face.material_index = MAT_IDX_EMISSIVE if (i % 3 == 0 and (j == 0 or j == 1)) else MAT_IDX_HULL

    # 4 Radial Structural Truss Spokes connecting Torus Ring to Hub
    for angle_deg in [0, 90, 180, 270]:
        rot_rad = math.radians(angle_deg)
        rot_m = Matrix.Rotation(rot_rad, 4, 'Z')
        sp_loc = rot_m @ Vector((21.0, 0.0, 0.0))
        create_box(bm_ring, sp_loc, (38.0, 3.2, 3.2), MAT_IDX_MACHINERY)

        # Pressurized Spherical Habitat Dome on spoke midpoint
        dm_loc = rot_m @ Vector((28.0, 0.0, 2.5))
        create_sphere(bm_ring, dm_loc, 3.5, 10, 8, MAT_IDX_HULL)
        # Observation Window Crown on Dome
        create_cone(bm_ring, dm_loc + Vector((0, 0, 3.2)), (0, 0, 0), 1.8, 0.8, 0.6, 8, MAT_IDX_GLASS)

    bm_ring.to_mesh(mesh_ring)
    bm_ring.free()

    assign_materials_to_obj(obj_ring, materials)
    apply_game_ready_modifiers(obj_ring, bevel_width=0.12, bevel_segments=3)

    # Sockets on Station
    add_socket(obj_station, "SOCKET_Station_Dock_North", (0.0, 0.0, 48.0), (0, 0, 0))
    add_socket(obj_station, "SOCKET_Station_Dock_South", (0.0, 0.0, -48.0), (0, 180, 0))
    add_socket(obj_station, "SOCKET_Station_BeamCannon_1", (56.0, 0.0, 19.5), (0, 0, 0))
    add_socket(obj_station, "SOCKET_Station_BeamCannon_2", (-56.0, 0.0, 19.5), (0, 0, 180))
    add_socket(obj_station, "SOCKET_Station_BeamCannon_3", (0.0, 56.0, 19.5), (0, 0, 90))
    add_socket(obj_station, "SOCKET_Station_BeamCannon_4", (0.0, -56.0, 19.5), (0, 0, -90))

    return obj_station, obj_ring

# ==============================================================================
# ANIMATION RIGGING PIPELINE (BEZIER ANTIGRAV DRIFT & CENTRIFUGAL ROTATION)
# ==============================================================================
def get_all_fcurves(obj):
    """Safely retrieves fcurves across Blender 3.x, 4.x, and 5.x layered action systems."""
    fcurves = []
    if not obj.animation_data or not obj.animation_data.action:
        return fcurves
    act = obj.animation_data.action
    if hasattr(act, 'fcurves'):
        return list(act.fcurves)
    if hasattr(act, 'layers'):
        for layer in act.layers:
            for strip in getattr(layer, 'strips', []):
                for cb in getattr(strip, 'channelbags', []):
                    fcurves.extend(list(cb.fcurves))
    return fcurves

def apply_smooth_antigrav_animation(obj, phase_offset=0.0, z_amp=0.35, rot_amp=1.5):
    """Bakes smooth organic Bezier idle drift (Z-bobbing & Pitch/Roll stabilization)."""
    obj.animation_data_clear()
    obj.animation_data_create()
    
    total_frames = 120
    base_z = obj.location.z
    base_rx = obj.rotation_euler.x
    base_ry = obj.rotation_euler.y

    for f in [1, 30, 60, 90, 121]:
        norm_f = ((f - 1) + phase_offset) / total_frames
        angle = 2.0 * math.pi * norm_f

        # Subtle Z-axis bobbing
        z_val = base_z + (math.sin(angle) * z_amp)
        obj.location.z = z_val
        obj.keyframe_insert(data_path="location", index=2, frame=f)

        # Subtle Pitch & Roll oscillation
        rx_val = base_rx + math.radians(math.sin(angle) * rot_amp)
        ry_val = base_ry + math.radians(math.cos(angle * 1.5) * (rot_amp * 0.7))
        obj.rotation_euler.x = rx_val
        obj.rotation_euler.y = ry_val
        obj.keyframe_insert(data_path="rotation_euler", index=0, frame=f)
        obj.keyframe_insert(data_path="rotation_euler", index=1, frame=f)

    # Set interpolation to BEZIER for seamless cyclic looping
    for fcurve in get_all_fcurves(obj):
        for kp in fcurve.keyframe_points:
            kp.interpolation = 'BEZIER'
            try:
                kp.handle_left_type = 'AUTO'
                kp.handle_right_type = 'AUTO'
            except Exception:
                pass

def apply_station_rotation(obj_ring):
    """Bakes continuous 360-degree artificial gravity rotation on habitat ring."""
    obj_ring.animation_data_clear()
    obj_ring.animation_data_create()

    obj_ring.rotation_euler.z = 0.0
    obj_ring.keyframe_insert(data_path="rotation_euler", index=2, frame=1)

    obj_ring.rotation_euler.z = math.radians(360.0)
    obj_ring.keyframe_insert(data_path="rotation_euler", index=2, frame=241)

    for fcurve in get_all_fcurves(obj_ring):
        if fcurve.data_path == "rotation_euler" and fcurve.array_index == 2:
            # Linear extrapolation for perfectly smooth infinite spin
            for kp in fcurve.keyframe_points:
                kp.interpolation = 'LINEAR'
            try:
                fcurve.extrapolation = 'LINEAR'
            except Exception:
                pass

# ==============================================================================
# CINEMATIC LIGHTING & MULTI-ANGLE CAMERAS (WITH TRACK-TO CONSTRAINTS)
# ==============================================================================
def setup_lighting_and_cameras(targets):
    # Ambient Deep Space World
    world = bpy.context.scene.world
    if not world:
        world = bpy.data.worlds.new("World_Space")
        bpy.context.scene.world = world
    world.use_nodes = True
    bg_node = world.node_tree.nodes.get("Background")
    if bg_node:
        bg_node.inputs['Color'].default_value = (0.015, 0.02, 0.035, 1.0)
        bg_node.inputs['Strength'].default_value = 0.45

    # Key Star Sun Light (illuminates ship prows and dorsal decks)
    sun_data = bpy.data.lights.new(name="Sun_Distant_Star", type='SUN')
    sun_data.energy = 14.0
    sun_data.color = (1.0, 0.98, 0.94)
    sun_obj = bpy.data.objects.new("Sun_Distant_Star", sun_data)
    # Pointing downwards and diagonally towards front decks
    sun_obj.rotation_euler = (math.radians(-48.0), math.radians(28.0), math.radians(-38.0))
    bpy.context.scene.collection.objects.link(sun_obj)

    # Cool Planetary Upward Bounce Light
    rim_data = bpy.data.lights.new(name="Light_Planet_Rim", type='SUN')
    rim_data.energy = 5.0
    rim_data.color = (0.05, 0.8, 1.0)
    rim_obj = bpy.data.objects.new("Light_Planet_Rim", rim_data)
    rim_obj.rotation_euler = (math.radians(55.0), math.radians(-25.0), math.radians(140.0))
    bpy.context.scene.collection.objects.link(rim_obj)

    # Broad Fill Area Light
    fill_data = bpy.data.lights.new(name="Light_Fleet_Fill", type='AREA')
    fill_data.energy = 3500.0
    fill_data.size = 180.0
    fill_data.color = (0.85, 0.92, 1.0)
    fill_obj = bpy.data.objects.new("Light_Fleet_Fill", fill_data)
    fill_obj.location = (20.0, 110.0, 50.0)
    fill_obj.rotation_euler = (math.radians(45.0), 0.0, math.radians(180.0))
    bpy.context.scene.collection.objects.link(fill_obj)

    # --------------------------------------------------------------------------
    # 3 Cinematic Camera Setups with TrackTo
    # --------------------------------------------------------------------------
    cameras = {}

    def setup_tracked_camera(name, location, target_obj, lens=35.0):
        cam_data = bpy.data.cameras.new(name)
        cam_data.lens = lens
        cam_data.clip_start = 0.5
        cam_data.clip_end = 5000.0
        cam_obj = bpy.data.objects.new(name, cam_data)
        cam_obj.location = location
        bpy.context.scene.collection.objects.link(cam_obj)

        track = cam_obj.constraints.new(type='TRACK_TO')
        track.target = target_obj
        track.track_axis = 'TRACK_NEGATIVE_Z'
        track.up_axis = 'UP_Y'
        return cam_obj

    # 1. Wide Armada Formation Panorama (3/4 Front Hero Angle)
    empty_fleet = bpy.data.objects.new("TARGET_Fleet_Center", None)
    empty_fleet.location = (0.0, -15.0, 15.0)
    bpy.context.scene.collection.objects.link(empty_fleet)
    cam_armada = setup_tracked_camera("Cam_Armada_Panorama", (65.0, 175.0, 75.0), empty_fleet, lens=28.0)
    cameras["ARMADA"] = cam_armada

    # 2. Carrier Catamaran Flight Deck Close-Up (Hero Front-Port Bow)
    empty_carrier = bpy.data.objects.new("TARGET_Carrier_Bow", None)
    empty_carrier.location = (65.0, 12.0, 2.0)
    bpy.context.scene.collection.objects.link(empty_carrier)
    cam_carrier = setup_tracked_camera("Cam_Carrier_Hangar", (32.0, 68.0, 14.0), empty_carrier, lens=36.0)
    cameras["CARRIER"] = cam_carrier

    # 3. Space Station Rotating Habitat Ring Close-Up
    cam_station = setup_tracked_camera("Cam_Station_Ring", (-135.0, -235.0, 110.0), targets["STATION"], lens=38.0)
    cameras["STATION"] = cam_station

    return cameras

# ==============================================================================
# MAIN PIPELINE EXECUTION
# ==============================================================================
def main():
    print("=================================================================")
    print("STARTING UNIFIED ENEMY FLEET GENERATION PIPELINE")
    print("=================================================================")

    # 1. Clean slate
    purge_scene()

    # 2. Master Collection
    fleet_coll = bpy.data.collections.new("Enemy_Fleet_Updated")
    bpy.context.scene.collection.children.link(fleet_coll)

    # 3. Materials
    materials = create_materials()

    # 4. Procedural Asset Modeling
    print("-> Modeling Vessel_Frigate_01...")
    frigate = build_vessel_frigate(fleet_coll, materials)

    print("-> Modeling Vessel_Destroyer_01...")
    destroyer = build_vessel_destroyer(fleet_coll, materials)

    print("-> Modeling Vessel_Carrier_01...")
    carrier = build_vessel_carrier(fleet_coll, materials)

    print("-> Modeling Vessel_Station_01...")
    station_core, station_ring = build_vessel_station(fleet_coll, materials)

    # 5. Center of Mass Origins & Transform Application
    vessels = [frigate, destroyer, carrier, station_core, station_ring]
    for v in vessels:
        bpy.context.view_layer.objects.active = v
        v.select_set(True)
        bpy.ops.object.origin_set(type='ORIGIN_CENTER_OF_VOLUME', center='MEDIAN')
        v.select_set(False)

    # 6. Tactical Fleet Formation Positioning
    # Frigate: Fast skirmisher escort on port forward flank
    frigate.location = (-55.0, 15.0, 0.0)
    # Destroyer: Anchor center direct-fire vanguard
    destroyer.location = (0.0, 0.0, 0.0)
    # Carrier: Spawner bastion on starboard flank
    carrier.location = (65.0, -15.0, 0.0)
    # Space Station: Grand orbital citadel in high orbit behind the fleet
    station_core.location = (-30.0, -120.0, 45.0)

    # 7. Animation Rigging
    print("-> Rigging Antigravity Idle Animations...")
    apply_smooth_antigrav_animation(frigate, phase_offset=0, z_amp=0.4, rot_amp=1.8)
    apply_smooth_antigrav_animation(destroyer, phase_offset=30, z_amp=0.25, rot_amp=1.2)
    apply_smooth_antigrav_animation(carrier, phase_offset=65, z_amp=0.2, rot_amp=0.9)
    apply_station_rotation(station_ring)

    # 8. Setup Lighting & Cameras
    print("-> Setting up Cinematic Space Lighting & Cameras...")
    targets = {
        "FRIGATE": frigate,
        "DESTROYER": destroyer,
        "CARRIER": carrier,
        "STATION": station_core
    }
    cameras = setup_lighting_and_cameras(targets)

    # 9. Verify Polycounts
    print("-----------------------------------------------------------------")
    print("POLYCOUNT AUDIT:")
    for v in [frigate, destroyer, carrier, station_core, station_ring]:
        tris = sum(len(p.vertices) - 2 for p in v.data.polygons)
        verts = len(v.data.vertices)
        print(f"  * {v.name:25s}: {len(v.data.polygons):5d} Polys | {tris:5d} Tris | {verts:5d} Verts")
    print("-----------------------------------------------------------------")

    # 10. Save Native Blend File
    print(f"-> Saving .blend scene to: {BLEND_FILE}")
    bpy.ops.wm.save_as_mainfile(filepath=BLEND_FILE)

    # 11. Export glTF / GLB for Three.js WebGL Engine
    print(f"-> Exporting Game-Ready glTF/GLB to: {GLB_FILE}")
    try:
        bpy.ops.export_scene.gltf(
            filepath=GLB_FILE,
            export_format='GLB',
            export_apply=True,
            export_animations=True,
            export_attributes=True
        )
    except Exception as e:
        print(f"glTF export fallback notice: {e}")
        bpy.ops.export_scene.gltf(
            filepath=GLB_FILE,
            export_format='GLB',
            export_apply=True,
            export_animations=True
        )

    # 12. Render Verification Cameras
    bpy.context.scene.render.engine = 'BLENDER_EEVEE_NEXT' if 'BLENDER_EEVEE_NEXT' in bpy.context.scene.render.bl_rna.properties['engine'].enum_items else 'BLENDER_EEVEE'
    bpy.context.scene.render.resolution_x = 1920
    bpy.context.scene.render.resolution_y = 1080
    bpy.context.scene.render.resolution_percentage = 100

    render_tasks = [
        ("ARMADA", "enemy_fleet_armada_panorama.png"),
        ("CARRIER", "enemy_carrier_hangar_detail.png"),
        ("STATION", "enemy_station_rotating_ring.png"),
    ]

    for cam_key, filename in render_tasks:
        cam_obj = cameras[cam_key]
        bpy.context.scene.camera = cam_obj
        
        # Local output and Artifacts output
        local_path = os.path.join(OUTPUT_DIR, filename)
        artifact_path = os.path.join(ARTIFACTS_DIR, filename)

        bpy.context.scene.render.filepath = local_path
        print(f"-> Rendering {cam_key} to: {local_path}...")
        bpy.ops.render.render(write_still=True)

        # Copy to artifacts directory
        if os.path.exists(local_path):
            import shutil
            shutil.copyfile(local_path, artifact_path)
            print(f"   -> Copied to artifact: {artifact_path}")

    print("=================================================================")
    print("UNIFIED ENEMY FLEET GENERATION COMPLETE!")
    print("=================================================================")

if __name__ == "__main__":
    main()
