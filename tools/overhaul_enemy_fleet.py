"""
================================================================================
MONOLITHIC BRUTALIST EMPIRE // ENEMY FLEET OVERHAUL AUTOMATION SCRIPT
================================================================================
Target Environment: Blender 3.x / 4.x
Role: Expert Technical 3D Artist & Game Animator

Theme Specifications:
- Theme: Monolithic Brutalist Empire (heavy, imposing, authoritarian dreadnoughts)
- Geometry: Massive geometric shapes, heavy rectangles, flying wedges, aggressive sharp angles, oversized visible weapons.
- Materials: Heavy matte ablative armor (dark cast iron / concrete, roughness ~0.95, zero gloss, high roughness).
- Colors: Slate grey (#282a2e) & charcoal (#191b1d), stark blood-red faction stripes (#8b0000).
- Emissives: Harsh, blinding crimson red (#ff0022, high emission strength).
- Animations: Smooth Bezier transitions + asynchronous antigravity idle hover drift.

Usage:
1. Open your .blend file in Blender.
2. Switch to the 'Scripting' workspace.
3. Open or paste this script and click 'Run Script' (Alt+P).
   OR run from terminal: blender my_scene.blend --background --python overhaul_enemy_fleet.py
================================================================================
"""

import bpy
import math
import random

# ------------------------------------------------------------------------------
# Configuration & Theme Constants
# ------------------------------------------------------------------------------
COLLECTION_NAME = "Enemy_Fleet_Updated"

# Palette definitions (sRGB converted to linear RGB for Blender Principled BSDF)
COLOR_CHARCOAL_CAST_IRON = (0.015, 0.017, 0.020, 1.0)  # #191b1d
COLOR_SLATE_GREY_CONCRETE = (0.035, 0.038, 0.042, 1.0) # #282a2e
COLOR_BLOOD_RED_FACTION = (0.280, 0.005, 0.012, 1.0)   # #8b0000
COLOR_BLINDING_CRIMSON = (1.000, 0.005, 0.025, 1.0)    # #ff0022
COLOR_DARK_MECHANICAL = (0.008, 0.009, 0.010, 1.0)     # #121314

EMISSIVE_STRENGTH = 15.0

# Keywords used to identify enemy craft meshes in the scene
ENEMY_KEYWORDS = [
    "enemy", "drone", "fighter", "stealth", "corvette", "ecm", "cruiser",
    "capital", "battleship", "carrier", "dreadnought", "mothership",
    "boss", "vorn", "turret", "cannon", "torpedo", "flank", "interceptor"
]


# ------------------------------------------------------------------------------
# Step 1: Scene Audit & Thematic Grouping
# ------------------------------------------------------------------------------
def step_1_scene_audit_and_grouping():
    print("\n[STEP 1] Performing Scene Audit & Collection Grouping...")

    # Ensure target collection exists
    if COLLECTION_NAME in bpy.data.collections:
        target_col = bpy.data.collections[COLLECTION_NAME]
    else:
        target_col = bpy.data.collections.new(COLLECTION_NAME)
        bpy.context.scene.collection.children.link(target_col)

    enemy_objects = []

    for obj in bpy.context.scene.objects:
        if obj.type != 'MESH':
            continue
        
        name_lower = obj.name.lower()
        is_enemy = any(k in name_lower for k in ENEMY_KEYWORDS)
        
        # If user has objects selected, treat selected meshes as fleet candidates
        if is_enemy or obj.select_get():
            enemy_objects.append(obj)
            
            # Link to target collection if not already present
            if obj.name not in target_col.objects:
                target_col.objects.link(obj)

    print(f"  -> Identified {len(enemy_objects)} enemy craft / weapon meshes.")
    print(f"  -> Successfully organized into collection '{COLLECTION_NAME}'.")
    return enemy_objects


# ------------------------------------------------------------------------------
# Step 2: Geometry & Edge Smoothing (Bevel Modifier + Smooth Normals)
# ------------------------------------------------------------------------------
def step_2_geometry_and_edge_smoothing(objects):
    print("\n[STEP 2] Applying Edge Bevel Chamfers & Auto-Smooth Normals...")

    for obj in objects:
        if obj.type != 'MESH':
            continue

        bpy.context.view_layer.objects.active = obj
        mesh = obj.data

        # 1. Edge Bevel Modifier (3 segments, 30 deg limit)
        bevel_mod = None
        for mod in obj.modifiers:
            if mod.type == 'BEVEL' and mod.name == "Brutalist_Edge_Chamfer":
                bevel_mod = mod
                break
        
        if not bevel_mod:
            bevel_mod = obj.modifiers.new(name="Brutalist_Edge_Chamfer", type='BEVEL')

        # Configure bevel for non-destructive game-ready topology
        bevel_mod.limit_method = 'ANGLE'
        bevel_mod.angle_limit = math.radians(30.0)
        bevel_mod.segments = 3
        bevel_mod.width = 0.035  # Tight industrial chamfer
        bevel_mod.profile = 0.5   # Round edge
        bevel_mod.use_clamp_overlap = True
        
        if hasattr(bevel_mod, 'harden_normals'):
            bevel_mod.harden_normals = True

        # 2. Smooth Shading with Sharp Mechanical Angles (Auto-smooth)
        for poly in mesh.polygons:
            poly.use_smooth = True
        if hasattr(mesh, "use_auto_smooth"):
            mesh.use_auto_smooth = True
            mesh.auto_smooth_angle = math.radians(35.0)

    print("  -> Applied 3-segment 30° Bevel Modifiers and Auto-Smooth to all fleet meshes.")


# ------------------------------------------------------------------------------
# Step 3: Realistic Materials & Textures (Monolithic Brutalist PBR)
# ------------------------------------------------------------------------------
def create_or_get_material(name):
    if name in bpy.data.materials:
        return bpy.data.materials[name]
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    return mat


def step_3_setup_brutalist_materials(objects):
    print("\n[STEP 3] Generating Monolithic Brutalist PBR Shader Networks...")

    # 1. Primary Ablative Armor: Dark Cast Iron / Matte Concrete
    mat_primary = create_or_get_material("MAT_Brutalist_CastIron_Armor")
    nodes_p = mat_primary.node_tree.nodes
    nodes_p.clear()
    
    node_out_p = nodes_p.new(type='ShaderNodeOutputMaterial')
    node_bsdf_p = nodes_p.new(type='ShaderNodeBsdfPrincipled')
    node_tex_noise = nodes_p.new(type='ShaderNodeTexNoise')
    node_bump = nodes_p.new(type='ShaderNodeBump')
    
    # Procedural surface pitting / cast metal porosity
    node_tex_noise.inputs['Scale'].default_value = 85.0
    node_tex_noise.inputs['Detail'].default_value = 8.0
    node_tex_noise.inputs['Roughness'].default_value = 0.8
    
    node_bump.inputs['Strength'].default_value = 0.04
    node_bump.inputs['Distance'].default_value = 0.1
    mat_primary.node_tree.links.new(node_tex_noise.outputs['Fac'], node_bump.inputs['Height'])
    mat_primary.node_tree.links.new(node_bump.outputs['Normal'], node_bsdf_p.inputs['Normal'])
    
    # Heavy matte ablative armor (very high roughness, zero gloss)
    node_bsdf_p.inputs['Base Color'].default_value = COLOR_CHARCOAL_CAST_IRON
    node_bsdf_p.inputs['Roughness'].default_value = 0.95  # Zero gloss
    node_bsdf_p.inputs['Metallic'].default_value = 0.82   # Dark cast iron
    if 'Specular IOR Level' in node_bsdf_p.inputs:
        node_bsdf_p.inputs['Specular IOR Level'].default_value = 0.08
    elif 'Specular' in node_bsdf_p.inputs:
        node_bsdf_p.inputs['Specular'].default_value = 0.08
        
    mat_primary.node_tree.links.new(node_bsdf_p.outputs['BSDF'], node_out_p.inputs['Surface'])

    # 2. Secondary Ablative Hull Plating: Slate Concrete Slab
    mat_secondary = create_or_get_material("MAT_Brutalist_Slate_Slab")
    nodes_s = mat_secondary.node_tree.nodes
    nodes_s.clear()
    node_out_s = nodes_s.new(type='ShaderNodeOutputMaterial')
    node_bsdf_s = nodes_s.new(type='ShaderNodeBsdfPrincipled')
    node_bsdf_s.inputs['Base Color'].default_value = COLOR_SLATE_GREY_CONCRETE
    node_bsdf_s.inputs['Roughness'].default_value = 0.94
    node_bsdf_s.inputs['Metallic'].default_value = 0.75
    mat_secondary.node_tree.links.new(node_bsdf_s.outputs['BSDF'], node_out_s.inputs['Surface'])

    # 3. Stark Blood-Red Faction Heraldry Stripes
    mat_faction = create_or_get_material("MAT_Brutalist_BloodRed_Stripe")
    nodes_f = mat_faction.node_tree.nodes
    nodes_f.clear()
    node_out_f = nodes_f.new(type='ShaderNodeOutputMaterial')
    node_bsdf_f = nodes_f.new(type='ShaderNodeBsdfPrincipled')
    node_bsdf_f.inputs['Base Color'].default_value = COLOR_BLOOD_RED_FACTION
    node_bsdf_f.inputs['Roughness'].default_value = 0.88
    node_bsdf_f.inputs['Metallic'].default_value = 0.50
    mat_faction.node_tree.links.new(node_bsdf_f.outputs['BSDF'], node_out_f.inputs['Surface'])

    # 4. Harsh Blinding Crimson Emissives (Thruster bells, weapon coils, sensor slits)
    mat_emissive = create_or_get_material("MAT_Brutalist_BlindingCrimson_Emissive")
    nodes_e = mat_emissive.node_tree.nodes
    nodes_e.clear()
    node_out_e = nodes_e.new(type='ShaderNodeOutputMaterial')
    node_bsdf_e = nodes_e.new(type='ShaderNodeBsdfPrincipled')
    node_bsdf_e.inputs['Base Color'].default_value = (0.04, 0.0, 0.0, 1.0)
    
    # Blinding crimson red emission
    if 'Emission Color' in node_bsdf_e.inputs:
        node_bsdf_e.inputs['Emission Color'].default_value = COLOR_BLINDING_CRIMSON
        node_bsdf_e.inputs['Emission Strength'].default_value = EMISSIVE_STRENGTH
    elif 'Emission' in node_bsdf_e.inputs:
        node_bsdf_e.inputs['Emission'].default_value = COLOR_BLINDING_CRIMSON
        if 'Emission Strength' in node_bsdf_e.inputs:
            node_bsdf_e.inputs['Emission Strength'].default_value = EMISSIVE_STRENGTH

    mat_emissive.node_tree.links.new(node_bsdf_e.outputs['BSDF'], node_out_e.inputs['Surface'])

    # Assign standardized materials to fleet meshes
    for obj in objects:
        if obj.type != 'MESH':
            continue
        
        name_lower = obj.name.lower()
        if any(k in name_lower for k in ['glow', 'engine', 'thruster', 'sensor', 'core', 'plasma', 'visor']):
            assigned_mat = mat_emissive
        elif any(k in name_lower for k in ['stripe', 'decal', 'faction', 'crest', 'insignia', 'chevron']):
            assigned_mat = mat_faction
        elif any(k in name_lower for k in ['slab', 'plate', 'shield', 'flank', 'deck']):
            assigned_mat = mat_secondary
        else:
            assigned_mat = mat_primary

        if not obj.data.materials:
            obj.data.materials.append(assigned_mat)
        else:
            obj.data.materials[0] = assigned_mat

    print("  -> Standardized PBR cast-iron, slate concrete, blood-red heraldry, and crimson emissives.")


# ------------------------------------------------------------------------------
# Step 4: Game-Ready Functionality & Operation (Transforms & Origins)
# ------------------------------------------------------------------------------
def step_4_gameready_transforms_and_pivots(objects):
    print("\n[STEP 4] Normalizing Transforms & Setting Center-of-Mass Pivots...")

    bpy.ops.object.select_all(action='DESELECT')

    for obj in objects:
        obj.select_set(True)
        bpy.context.view_layer.objects.active = obj

        # 1. Apply Object Transforms (Scale & Rotation)
        bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)

        # 2. Set Object Origin to Center of Mass (Volume / Bounding Box)
        try:
            bpy.ops.object.origin_set(type='ORIGIN_CENTER_OF_VOLUME', center='MEDIAN')
        except Exception:
            bpy.ops.object.origin_set(type='ORIGIN_CENTER_OF_MASS', center='BOUNDS')

        obj.select_set(False)

    print("  -> Applied Rotation/Scale transforms and set origins to Center of Mass.")


# ------------------------------------------------------------------------------
# Step 5: Animation Smoothing & Realistic Antigravity Idle Hover
# ------------------------------------------------------------------------------
def step_5_animation_smoothing_and_idle_hover(objects):
    print("\n[STEP 5] Smoothing F-Curves to Bezier & Adding Antigravity Idle Drift...")

    for idx, obj in enumerate(objects):
        # 1. Smooth existing keyframe actions to Bezier interpolation
        if obj.animation_data and obj.animation_data.action:
            for fcurve in obj.animation_data.action.fcurves:
                for kf in fcurve.keyframe_points:
                    kf.interpolation = 'BEZIER'
                    kf.handle_left_type = 'AUTO_CLAMPED'
                    kf.handle_right_type = 'AUTO_CLAMPED'

        # 2. Add realistic procedural antigravity idle hover
        if not obj.animation_data:
            obj.animation_data_create()
        if not obj.animation_data.action:
            obj.animation_data.action = bpy.data.actions.new(name=f"{obj.name}_IdleHover")

        action = obj.animation_data.action
        
        # Ensure base keyframe exists at frame 1
        obj.keyframe_insert(data_path="location", frame=1)
        obj.keyframe_insert(data_path="rotation_euler", frame=1)

        phase_seed = random.uniform(0.0, 500.0) + (idx * 42.7)

        # Procedural noise modifier to Z-Location (Vertical hover bobbing)
        z_curve = next((c for c in action.fcurves if c.data_path == "location" and c.array_index == 2), None)
        if z_curve:
            for m in list(z_curve.modifiers):
                if m.type == 'NOISE':
                    z_curve.modifiers.remove(m)
            noise_z = z_curve.modifiers.new(type='NOISE')
            noise_z.scale = 48.0
            noise_z.strength = 0.12
            noise_z.phase = phase_seed
            noise_z.blend_type = 'ADD'

        # Procedural noise modifier to X-Rotation (Pitch stabilization)
        rot_x_curve = next((c for c in action.fcurves if c.data_path == "rotation_euler" and c.array_index == 0), None)
        if rot_x_curve:
            for m in list(rot_x_curve.modifiers):
                if m.type == 'NOISE':
                    rot_x_curve.modifiers.remove(m)
            noise_pitch = rot_x_curve.modifiers.new(type='NOISE')
            noise_pitch.scale = 65.0
            noise_pitch.strength = math.radians(1.4)
            noise_pitch.phase = phase_seed + 15.0
            noise_pitch.blend_type = 'ADD'

        # Procedural noise modifier to Y-Rotation (Roll stabilization)
        rot_y_curve = next((c for c in action.fcurves if c.data_path == "rotation_euler" and c.array_index == 1), None)
        if rot_y_curve:
            for m in list(rot_y_curve.modifiers):
                if m.type == 'NOISE':
                    rot_y_curve.modifiers.remove(m)
            noise_roll = rot_y_curve.modifiers.new(type='NOISE')
            noise_roll.scale = 75.0
            noise_roll.strength = math.radians(2.0)
            noise_roll.phase = phase_seed + 35.0
            noise_roll.blend_type = 'ADD'

    print("  -> Applied Bezier auto-clamped easing and asynchronous antigravity idle drift.")


# ------------------------------------------------------------------------------
# Step 6: Verification & Game Export Helper
# ------------------------------------------------------------------------------
def step_6_export_helpers():
    print("\n[STEP 6] Export Helpers Configured:")
    print("  -> To export to GLB: bpy.ops.export_scene.gltf(filepath='enemy_fleet_brutalist.glb', export_format='GLB', use_selection=True)")
    print("  -> To export to FBX: bpy.ops.export_scene.fbx(filepath='enemy_fleet_brutalist.fbx', use_selection=True, apply_unit_scale=True, bake_anim=True)")


# ------------------------------------------------------------------------------
# Main Entry Point
# ------------------------------------------------------------------------------
def run_full_fleet_overhaul():
    print("================================================================================")
    print("STARTING MONOLITHIC BRUTALIST EMPIRE ENEMY FLEET OVERHAUL")
    print("================================================================================")
    fleet_objects = step_1_scene_audit_and_grouping()
    if not fleet_objects:
        print("[WARNING] No matching enemy mesh objects found. Ensure meshes are selected or named with enemy keywords.")
        return
    step_2_geometry_and_edge_smoothing(fleet_objects)
    step_3_setup_brutalist_materials(fleet_objects)
    step_4_gameready_transforms_and_pivots(fleet_objects)
    step_5_animation_smoothing_and_idle_hover(fleet_objects)
    step_6_export_helpers()
    print("\n================================================================================")
    print("OVERHAUL COMPLETE: Enemy Fleet successfully transformed into Monolithic Brutalism!")
    print("================================================================================\n")


if __name__ == "__main__":
    run_full_fleet_overhaul()

