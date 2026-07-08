"use client"

import { Suspense, useEffect, useRef } from "react"
import { Canvas, useThree, useFrame } from "@react-three/fiber"
import { OrbitControls, ContactShadows, Html } from "@react-three/drei"
import * as THREE from "three"

// ─── Responsive Camera ───────────────────────────────────────────────────────
// Recalculates FOV whenever the Canvas dimensions change.
// Wide viewports (≥ 768 px) use 45° for a composed, editorial framing.
// Narrow viewports widen to 70° so furniture fills the mobile screen.
function AdaptiveCamera() {
  const { camera, size } = useThree()

  useEffect(() => {
    if (!(camera instanceof THREE.PerspectiveCamera)) return
    camera.fov = size.width < 768 ? 70 : 45
    camera.updateProjectionMatrix()
  }, [camera, size.width])

  return null
}

// ─── Studio Lighting Rig ─────────────────────────────────────────────────────
function StudioLights() {
  return (
    <>
      {/* Ambient fill — lifts shadow blacks without washing out */}
      <ambientLight intensity={0.5} />

      {/* Primary key — sharp, 2K shadow-casting directional */}
      <directionalLight
        position={[10, 15, 10]}
        intensity={1.2}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-near={0.5}
        shadow-camera-far={60}
        shadow-camera-left={-8}
        shadow-camera-right={8}
        shadow-camera-top={8}
        shadow-camera-bottom={-8}
        shadow-bias={-0.0002}
      />

      {/* Warm fill — rear backdrop simulates studio softbox */}
      <pointLight position={[-6, 4, -8]} intensity={0.45} color="#fff4e0" />

      {/* Cool rim — separates left edge from background */}
      <pointLight position={[-8, 6, 4]} intensity={0.3} color="#dce8ff" />
    </>
  )
}

// ─── Placeholder Model ───────────────────────────────────────────────────────
// Rendered when no product GLTF is passed as children.
// Slow idle rotation previews the lighting rig and acts as a slot indicator.
function PlaceholderModel() {
  const groupRef = useRef<THREE.Group>(null!)

  useFrame((_, delta) => {
    groupRef.current.rotation.y += delta * 0.2
  })

  return (
    <group ref={groupRef} position={[0, 0.5, 0]}>
      {/* Thin display plinth */}
      <mesh receiveShadow position={[0, -0.54, 0]}>
        <boxGeometry args={[1.8, 0.06, 1.8]} />
        <meshStandardMaterial color="#e8e4df" roughness={0.7} metalness={0.02} />
      </mesh>

      {/* Primary block — occupies the product slot */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[0.9, 1.0, 0.9]} />
        <meshStandardMaterial color="#cdc8c0" roughness={0.32} metalness={0.15} />
      </mesh>

      {/* Decorative inset cap */}
      <mesh castShadow position={[0, 0.54, 0]}>
        <boxGeometry args={[0.6, 0.08, 0.6]} />
        <meshStandardMaterial color="#b5aea5" roughness={0.2} metalness={0.3} />
      </mesh>
    </group>
  )
}

// ─── In-Scene Asset Loader ───────────────────────────────────────────────────
// Rendered by the inner Suspense during GLTF / texture loading.
// Uses Drei Html to portal a branded spinner into the regular DOM.
function SceneLoader() {
  return (
    <Html center>
      <div
        className="flex flex-col items-center gap-3 pointer-events-none select-none"
        style={{ fontFamily: "var(--font-editorial, 'Cormorant Garamond', Georgia, serif)" }}
      >
        <div className="w-5 h-5 rounded-full border border-stone-300 border-t-stone-500 animate-spin" />
        <span className="text-[9px] tracking-[0.38em] uppercase text-stone-600 whitespace-nowrap">
          Loading
        </span>
      </div>
    </Html>
  )
}

// ─── Pre-Canvas Fallback ─────────────────────────────────────────────────────
// Shown by the outer Suspense while the Canvas module itself is resolving.
function CanvasFallback() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-[#faf9f7]">
      <div className="w-6 h-6 rounded-full border border-stone-200 border-t-stone-600 animate-spin" />
      <p
        className="text-[9px] tracking-[0.42em] uppercase text-stone-600"
        style={{ fontFamily: "var(--font-editorial, 'Cormorant Garamond', Georgia, serif)" }}
      >
        Preparing Studio
      </p>
    </div>
  )
}

// ─── Scene Root ──────────────────────────────────────────────────────────────
// Runs inside the Canvas context — has access to R3F hooks (useThree, useFrame).
interface SceneRootProps {
  autoRotate: boolean
  children?: React.ReactNode
}

function SceneRoot({ autoRotate, children }: SceneRootProps) {
  return (
    <>
      <AdaptiveCamera />
      <StudioLights />

      {/* Fluid orbit + zoom; vertical angle locked at PI/2 to stay above floor */}
      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.05}
        autoRotate={autoRotate}
        autoRotateSpeed={0.6}
        maxPolarAngle={Math.PI / 2}
        minDistance={2}
        maxDistance={14}
        enablePan={false}
      />

      {/* Inner Suspense — catches useGLTF / useTexture suspensions */}
      <Suspense fallback={<SceneLoader />}>
        {children ?? <PlaceholderModel />}
      </Suspense>

      {/* Soft contact shadow baked onto the floor plane */}
      <ContactShadows
        position={[0, -0.01, 0]}
        opacity={0.42}
        width={7}
        height={7}
        blur={2.5}
        far={4}
        resolution={512}
        color="#1c160f"
      />

      {/* Studio floor — large neutral plane that receives hard shadows */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, -0.02, 0]}>
        <planeGeometry args={[40, 40]} />
        <meshStandardMaterial color="#f4f1ee" roughness={1} metalness={0} />
      </mesh>
    </>
  )
}

// ─── Public API ──────────────────────────────────────────────────────────────
export interface ProductCanvasProps {
  /** Slowly orbit the camera around the model when the user is idle. Default: true */
  autoRotate?: boolean
  /** Extra Tailwind / CSS classes applied to the container div */
  className?: string
  /**
   * Pass a `<primitive object={gltf.scene} />` or any R3F mesh as children
   * to replace the built-in placeholder model.
   */
  children?: React.ReactNode
}

export default function ProductCanvas({
  autoRotate = true,
  className = "",
  children,
}: ProductCanvasProps) {
  return (
    <div className={`relative w-full h-full ${className}`}>
      <Suspense fallback={<CanvasFallback />}>
        <Canvas
          shadows
          dpr={[1, 2]}
          camera={{ fov: 45, near: 0.1, far: 1000, position: [0, 2, 6] }}
          gl={{
            antialias: true,
            alpha: false,
            powerPreference: "high-performance",
          }}
          style={{ background: "transparent" }}
        >
          <SceneRoot autoRotate={autoRotate}>{children}</SceneRoot>
        </Canvas>
      </Suspense>
    </div>
  )
}
