# 3D models

The 3D viewer (Feature 5) works **without any file here**: when
`buoyant_jet.glb` is absent it renders a procedural buoyant-jet scene
(glass tank + temperature-coloured particle plume) defined in
`../../viewer3d.js`.

To use your own model instead, drop a binary glTF named exactly:

```
buoyant_jet.glb
```

into this folder. The viewer auto-detects it (HEAD request), loads it with
`GLTFLoader`, auto-centres and scales it to fit, and enables shadows.

Tips for a good GLB:

- Keep it under ~5 MB so it loads fast on mobile.
- Apply real-world-ish scale; the viewer reframes it anyway.
- Export from Blender / ParaView (glTF 2.0) or convert a `.obj`/`.stl`
  with `obj2gltf` / `gltf-pipeline`.
