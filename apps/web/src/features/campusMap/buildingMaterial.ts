import { Color, MeshLambertMaterial } from "three";

/** Window/floor detail costs no textures, extra meshes, or additional draw calls. */
export function createBuildingMaterial() {
  const material = new MeshLambertMaterial({ vertexColors: true });
  const selected = { value: -1 };
  const hovered = { value: -1 };
  const selectionColor = { value: new Color("#8c3195") };

  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, {
      campusSelected: selected,
      campusHovered: hovered,
      campusSelectionColor: selectionColor,
    });
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        `#include <common>
        attribute vec4 facade;
        attribute float facadeStyle;
        attribute float buildingId;
        varying vec4 vFacade;
        varying float vFacadeStyle;
        varying float vBuildingId;
      `,
      )
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
        vFacade = facade;
        vFacadeStyle = facadeStyle;
        vBuildingId = buildingId;
      `,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
        uniform float campusSelected;
        uniform float campusHovered;
        uniform vec3 campusSelectionColor;
        varying vec4 vFacade;
        varying float vFacadeStyle;
        varying float vBuildingId;

        float campusBand(float value, float low, float high, float aa) {
          return smoothstep(low - aa, low + aa, value)
            * (1.0 - smoothstep(high - aa, high + aa, value));
        }
      `,
      )
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>
        // Derivatives run outside divergent branches. Subpixel windows fade
        // out instead of shimmering during touch gestures or at low DPR.
        vec2 footprint = max(fwidth(vFacade.xy), vec2(0.001));
        float distanceToCamera = length(vViewPosition);
        if (vFacadeStyle > 0.5 && distanceToCamera < 520.0) {
          vec2 cell = fract(vFacade.xy);
          float visibility = (1.0 - smoothstep(180.0, 520.0, distanceToCamera))
            * (1.0 - smoothstep(0.18, 0.6, max(footprint.x, footprint.y)));
          float band = campusBand(cell.y, 0.28, 0.82, footprint.y);
          float columns = campusBand(cell.x, 0.16, 0.84, footprint.x);
          float windows = band * columns;
          if (vFacadeStyle > 1.5) {
            windows = band * (0.85 + 0.15 * columns);
          }
          if (vFacadeStyle > 2.5 && vFacadeStyle < 3.5) {
            windows = campusBand(cell.y, 0.08, 0.92, footprint.y)
              * (0.87 + 0.13 * columns);
          }
          vec3 wallColor = diffuseColor.rgb;
          float across = vFacade.x / max(vFacade.z, 0.001);
          float up = vFacade.y / max(vFacade.w, 0.001);
          if (vFacadeStyle > 3.5 && vFacadeStyle < 4.5) {
            float portal = step(0.2, across) * step(across, 0.8) * step(up, 0.56);
            float glazing = step(0.25, across) * step(across, 0.75) * step(up, 0.48);
            wallColor = mix(wallColor, vec3(0.43, 0.22, 0.15), portal);
            windows = mix(windows, 0.85 * band, glazing);
          }
          if (vFacadeStyle > 4.5) {
            float paleBay = 1.0 - step(0.23, across) * step(across, 0.92);
            wallColor = mix(wallColor, vec3(0.67, 0.63, 0.52), paleBay * 0.65);
          }
          vec3 glass = mix(vec3(0.10, 0.17, 0.19), vec3(0.27, 0.38, 0.40), cell.y);
          vec3 detailed = mix(wallColor, glass, windows * 0.78);
          // Floor slabs, a quiet plinth, and a pale roof edge provide depth.
          float slab = campusBand(cell.y, 0.90, 0.99, footprint.y);
          detailed = mix(detailed, wallColor * 1.12, slab * 0.6);
          detailed *= mix(0.78, 1.0, smoothstep(0.0, 0.4, vFacade.y));
          diffuseColor.rgb = mix(diffuseColor.rgb, detailed, visibility);
        }
        float selection = 1.0 - step(0.25, abs(vBuildingId - campusSelected));
        float hover = 1.0 - step(0.25, abs(vBuildingId - campusHovered));
        float tint = vFacade.w > 0.0 ? 0.28 : 0.52;
        diffuseColor.rgb = mix(diffuseColor.rgb, campusSelectionColor, max(selection * tint, hover * 0.16));
      `,
      );
  };
  material.customProgramCacheKey = () => "campus-facades-v1";
  return { material, selected, hovered };
}
