import React, { Suspense, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';

// ——————————————————————————————————————————————————————————
const MOVE_SPEED   = 0.1;
const ROTATE_SPEED = 0.005;

export const VisionPage = () => {
  const [error,   setError]   = useState(null);

  return (
    <div className="relative w-full h-screen overflow-hidden">
      <Canvas
        shadows
        camera={{ fov: 75, position: [0, 2, 5], near: 0.1, far: 1000 }}
        onCreated={({ gl }) => {
          gl.shadowMap.enabled  = true;
          gl.shadowMap.type     = THREE.PCFSoftShadowMap;
          gl.physicallyCorrectLights = true;
          gl.toneMapping             = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure     = 1.0;
          gl.outputEncoding          = THREE.sRGBEncoding;

          gl.domElement.style.userSelect    = 'none';
          gl.domElement.style.webkitUserDrag = 'none';
        }}
      >
        <Suspense fallback={<Html center>Loading 3D Environment…</Html>}>
          <EnhancedLighting />
          <CityModel onError={(e) => { console.error(e); setError('Failed to load model');}} />
          <CameraController />
        </Suspense>
      </Canvas>

      {error}
    </div>
  );
};

/* ————————————————— Scene helpers ————————————————— */
const CityModel = ({ onLoaded, onError }) => {
  const { gl } = useThree();

  // Configure GLTFLoader with Draco + Meshopt decoders
  const gltf = useLoader(GLTFLoader, `${process.env.PUBLIC_URL}/City/city_draco.glb`, (loader) => {
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
    loader.setDRACOLoader(dracoLoader);
    loader.setMeshoptDecoder(MeshoptDecoder);
  });

  useEffect(() => {
    if (!gltf) return;

    // Post-process the loaded model exactly as before
    gltf.scene.scale.set(3, 3, 3);
    gltf.scene.traverse((obj) => {
      if (obj.isMesh) {
        obj.castShadow = true;
        obj.receiveShadow = true;

        // Material tweaks
        obj.material.metalness = 0.0;
        obj.material.roughness = 1.0;
        obj.material.needsUpdate = true;

        // Texture settings — DO NOT CHANGE (design choice)
        if (obj.material && obj.material.map) {
          const map = obj.material.map;
          map.generateMipmaps = true;
          map.minFilter      = THREE.LinearMipMapLinearFilter;
          map.magFilter      = THREE.LinearFilter;
          map.anisotropy     = gl.capabilities.getMaxAnisotropy();
          map.needsUpdate    = true;
        }
      }
    });

    gl.shadowMap.needsUpdate = true;
    onLoaded && onLoaded();
  }, [gltf, gl, onLoaded]);

  // Render the model
  return gltf ? <primitive object={gltf.scene} /> : null;
};

const CameraController = () => {
  const { camera, gl } = useThree();
  const keysPressed = useRef({});
  const yawRef   = useRef(0);
  const pitchRef = useRef(0);
  const isDragging = useRef(false);
  const prevPos    = useRef({ x: 0, y: 0 });

  // ——— Input handlers ———
  useEffect(() => {
    const canvas = gl.domElement;

    const onMouseDown = (e) => {
      e.preventDefault();
      isDragging.current = true;
      prevPos.current.x = e.clientX;
      prevPos.current.y = e.clientY;
      canvas.style.cursor = 'grabbing';
    };

    const onMouseUp = () => {
      isDragging.current = false;
      canvas.style.cursor = 'grab';
    };

    const onMouseMove = (e) => {
      if (!isDragging.current) return;
      const dx = e.clientX - prevPos.current.x;
      const dy = e.clientY - prevPos.current.y;
      yawRef.current   -= dx * ROTATE_SPEED;
      pitchRef.current -= dy * ROTATE_SPEED;
      pitchRef.current = THREE.MathUtils.clamp(pitchRef.current, -Math.PI / 2, Math.PI / 2);
      prevPos.current.x = e.clientX;
      prevPos.current.y = e.clientY;
    };

    const onKeyDown = (e) => { keysPressed.current[e.code.toLowerCase()] = true; };
    const onKeyUp   = (e) => { keysPressed.current[e.code.toLowerCase()] = false; };
    const onContextMenu = (e) => e.preventDefault();

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup',   onKeyUp);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup',   onMouseUp);
    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('contextmenu', onContextMenu);
    canvas.style.cursor = 'grab';

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup',   onKeyUp);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup',   onMouseUp);
      canvas.removeEventListener('mousedown', onMouseDown);
      canvas.removeEventListener('contextmenu', onContextMenu);
    };
  }, [gl]);

  // ——— Per-frame camera updates ———
  const forward = useRef(new THREE.Vector3());
  const right   = useRef(new THREE.Vector3());

  useFrame(() => {
    // Orientation
    camera.quaternion.setFromEuler(new THREE.Euler(pitchRef.current, yawRef.current, 0, 'YXZ'));

    // Direction vectors (ignore pitch for ground-plane movement)
    forward.current.set(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), yawRef.current);
    right.current.set(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), yawRef.current);

    if (keysPressed.current['keyw']) camera.position.addScaledVector(forward.current,  MOVE_SPEED);
    if (keysPressed.current['keys']) camera.position.addScaledVector(forward.current, -MOVE_SPEED);
    if (keysPressed.current['keya']) camera.position.addScaledVector(right.current,   -MOVE_SPEED);
    if (keysPressed.current['keyd']) camera.position.addScaledVector(right.current,    MOVE_SPEED);

    // Constrain to ground-plane bounds
    camera.position.x = THREE.MathUtils.clamp(camera.position.x, -50, 50);
    camera.position.z = THREE.MathUtils.clamp(camera.position.z, -50, 50);
  });

  return null;
};

const EnhancedLighting = () => {
  const { scene, gl } = useThree();
  useEffect(() => {
    const pmremGen = addEnhancedLighting(scene, gl);
    return () => pmremGen.dispose();
  }, [scene, gl]);
  return null;
};

/* ————————————————— Lights util ————————————————— */
function addEnhancedLighting(scene, renderer) {
  // PMREM generator for environment reflections
  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  pmremGenerator.compileEquirectangularShader();

  // Simple environment scene containing only the sun disc
  const envScene = new THREE.Scene();
  const skyColor = new THREE.Color(0x87ceeb);
  const groundColor = new THREE.Color(0x8b7355);

  // Create visible sun inside the environment scene
  const sunPosition = new THREE.Vector3(50, 100, 50).normalize().multiplyScalar(400);
  const sunMesh = new THREE.Mesh(
    new THREE.SphereGeometry(20, 32, 32),
    new THREE.MeshStandardMaterial({ color: 0xffffee, emissive: 0xffffee, emissiveIntensity: 3 })
  );
  sunMesh.position.copy(sunPosition);
  envScene.add(sunMesh);

  // Generate environment texture from envScene
  const envRT = pmremGenerator.fromScene(envScene);
  scene.environment = envRT.texture;

  // Clean up temporary objects
  envScene.clear();
  sunMesh.geometry.dispose();
  sunMesh.material.dispose();

  /* ——— Real-time lights ——— */
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
  scene.add(ambientLight);

  const hemiLight = new THREE.HemisphereLight(skyColor, groundColor, 0.3);
  hemiLight.position.set(0, 50, 0);
  scene.add(hemiLight);

  const sunLight = new THREE.DirectionalLight(0xffffff, 0.8);
  sunLight.position.copy(sunPosition.clone().normalize().multiplyScalar(100));
  sunLight.castShadow = true;

  sunLight.shadow.mapSize.set(2048, 2048);
  sunLight.shadow.camera.near = 0.5;
  sunLight.shadow.camera.far = 500;
  const shadowSize = 150;
  sunLight.shadow.camera.left = -shadowSize;
  sunLight.shadow.camera.right = shadowSize;
  sunLight.shadow.camera.top = shadowSize;
  sunLight.shadow.camera.bottom = -shadowSize;
  sunLight.shadow.bias = -0.0003;
  sunLight.shadow.normalBias = 0.015;

  scene.add(sunLight);

  // Expose sun data for other components (if needed)
  scene.userData.sunPosition = sunPosition;
  scene.userData.sunLight    = sunLight;

  return pmremGenerator;
}
