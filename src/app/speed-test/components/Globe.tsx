"use client";

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface GlobeProps {
  coordinates?: { lat: number; lng: number } | null;
  isLocationLoading?: boolean;
}

const LON_TEXTURE_OFFSET_DEG = 0; // Adjust if texture alignment off
const DRAG_DAMP = 0.005;          // Drag sensitivity
const RETURN_SPEED = 0.05;        // Slerp speed returning
const TARGET_LOCK_EPS = 0.002;    // Quaternion closeness threshold

export const Globe: React.FC<GlobeProps> = ({ coordinates, isLocationLoading = false }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const frameRef = useRef<number | undefined>(undefined);
  const sphereRef = useRef<THREE.Mesh | null>(null);
  const targetQuatRef = useRef<THREE.Quaternion | null>(null);

  const animatingToTargetRef = useRef(false);   // Initial fly-to animation
  const reachedTargetRef = useRef(false);       // Is sitting on target
  const returningRef = useRef(false);           // Returning after user interaction

  // Drag interaction refs
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const dragStartQuatRef = useRef<THREE.Quaternion | null>(null);

  const markerRef = useRef<THREE.Mesh | null>(null);

  // Build quaternion to face target lat/lng toward camera (0,0,1)
  const computeTargetQuaternion = (lat: number, lng: number) => {
    const latRad = THREE.MathUtils.degToRad(lat);
    const lonRad = THREE.MathUtils.degToRad(lng + LON_TEXTURE_OFFSET_DEG);
    
    // Point on sphere (Y up)
    const x = Math.cos(latRad) * Math.cos(lonRad);
    const y = Math.sin(latRad);
    const z = Math.cos(latRad) * Math.sin(lonRad);
    const point = new THREE.Vector3(x, y, z).normalize();
    const front = new THREE.Vector3(0, 0, 1);
    const q = new THREE.Quaternion().setFromUnitVectors(point, front);
    return q;
  };

  const updateMarkerPosition = (lat: number, lng: number) => {
    if (!markerRef.current) return;
    const latRad = THREE.MathUtils.degToRad(lat);
    const lonRad = THREE.MathUtils.degToRad(lng + LON_TEXTURE_OFFSET_DEG);
    const r = 1.01;
    markerRef.current.position.set(
      r * Math.cos(latRad) * Math.cos(lonRad),
      r * Math.sin(latRad),
      r * Math.cos(latRad) * Math.sin(lonRad)
    );
  };

  useEffect(() => {
    if (!containerRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#0b0f17');

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.z = 3;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    containerRef.current.appendChild(renderer.domElement);

    const sphereGeometry = new THREE.SphereGeometry(1, 64, 64);
    const textureLoader = new THREE.TextureLoader();
    const earthTexture = textureLoader.load('/earth-blue-marble.jpg');
    const bumpTexture = textureLoader.load('/earth-topology.png');

    const material = new THREE.MeshStandardMaterial({
      map: earthTexture,
      bumpMap: bumpTexture,
      bumpScale: 0.05,
      roughness: 0.9,
      metalness: 0.05,
    });

    const sphere = new THREE.Mesh(sphereGeometry, material);
    sphereRef.current = sphere;
    scene.add(sphere);

    // Atmosphere
    const atmosphere = new THREE.Mesh(
      new THREE.SphereGeometry(1.05, 48, 48),
      new THREE.MeshBasicMaterial({ 
        color: '#3aa4ff', 
        side: THREE.BackSide, 
        transparent: true, 
        opacity: 0.3 
      })
    );
    scene.add(atmosphere);

    // Marker (small red dot at exact location) - ADD AS CHILD OF SPHERE
    const marker = new THREE.Mesh(
      new THREE.SphereGeometry(0.03, 16, 16), // Slightly larger for visibility
      new THREE.MeshBasicMaterial({ 
        color: '#ff0000', // Bright red
        transparent: false,
        depthTest: true
      })
    );
    marker.visible = false;
    markerRef.current = marker;
    sphere.add(marker); // Add to sphere instead of scene so it rotates with the globe

    // Lights
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(5, 3, 5);
    scene.add(dirLight);

    const ambient = new THREE.AmbientLight(0x335577, 0.5);
    scene.add(ambient);

    // Interaction handlers
    const onPointerDown = (e: PointerEvent) => {
      if (!sphereRef.current) return;
      // Only allow drag after initial target reached
      if (!reachedTargetRef.current) return;
      isDraggingRef.current = true;
      returningRef.current = false;
      dragStartRef.current = { x: e.clientX, y: e.clientY };
      dragStartQuatRef.current = sphereRef.current.quaternion.clone();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isDraggingRef.current || !sphereRef.current || !dragStartQuatRef.current) return;
      
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;

      // Rotate around Y for horizontal drag (fixed direction), around X for vertical drag
      const qx = new THREE.Quaternion().setFromAxisAngle(
        new THREE.Vector3(0, 1, 0),
        dx * DRAG_DAMP // Removed the negative sign to fix inversion
      );
      const qy = new THREE.Quaternion().setFromAxisAngle(
        new THREE.Vector3(1, 0, 0),
        dy * DRAG_DAMP
      );

      // Apply relative to start quaternion
      const q = dragStartQuatRef.current.clone();
      q.premultiply(qx);
      q.premultiply(qy);
      sphereRef.current.quaternion.copy(q);
    };

    const onPointerUp = (e: PointerEvent) => {
      if (!isDraggingRef.current) return;
      isDraggingRef.current = false;
      returningRef.current = true; // Start return animation
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    };

    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointermove', onPointerMove);
    renderer.domElement.addEventListener('pointerup', onPointerUp);
    renderer.domElement.addEventListener('pointerleave', onPointerUp);

    const onResize = () => {
      if (!containerRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    window.addEventListener('resize', onResize);

    const animate = () => {
      frameRef.current = requestAnimationFrame(animate);

      if (sphereRef.current) {
        // Free spin while loading or before target computed
        if (isLocationLoading || !targetQuatRef.current) {
          sphereRef.current.rotation.y += 0.003;
        } else if (animatingToTargetRef.current) {
          // Initial fly to target
          sphereRef.current.quaternion.slerp(targetQuatRef.current, 0.04);
          if (sphereRef.current.quaternion.angleTo(targetQuatRef.current) < TARGET_LOCK_EPS) {
            sphereRef.current.quaternion.copy(targetQuatRef.current);
            animatingToTargetRef.current = false;
            reachedTargetRef.current = true;
          }
        } else if (isDraggingRef.current) {
          // User manipulating - do nothing additional
        } else if (returningRef.current && targetQuatRef.current) {
          // Returning after drag
          sphereRef.current.quaternion.slerp(targetQuatRef.current, RETURN_SPEED);
          if (sphereRef.current.quaternion.angleTo(targetQuatRef.current) < TARGET_LOCK_EPS) {
            sphereRef.current.quaternion.copy(targetQuatRef.current);
            returningRef.current = false;
            reachedTargetRef.current = true;
          }
        } else {
          // Sitting still at target
        }
      }

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      window.removeEventListener('resize', onResize);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      renderer.domElement.removeEventListener('pointerleave', onPointerUp);

      sphereGeometry.dispose();
      material.dispose();
      atmosphere.geometry.dispose();
      (atmosphere.material as THREE.Material).dispose();

      if (material.map) material.map.dispose();
      if (material.bumpMap) material.bumpMap.dispose();
      renderer.dispose();

      if (containerRef.current?.contains(renderer.domElement)) {
        containerRef.current.removeChild(renderer.domElement);
      }
    };
  }, [isLocationLoading]);

  // React to new coordinates
  useEffect(() => {
    if (coordinates && sphereRef.current && !isLocationLoading) {
      targetQuatRef.current = computeTargetQuaternion(coordinates.lat, coordinates.lng);
      animatingToTargetRef.current = true;
      reachedTargetRef.current = false;
      returningRef.current = false;
      
      if (markerRef.current) {
        markerRef.current.visible = true;
        updateMarkerPosition(coordinates.lat, coordinates.lng);
      }
    } else if (isLocationLoading && markerRef.current) {
      // Hide marker while loading
      markerRef.current.visible = false;
      targetQuatRef.current = null;
    }
  }, [coordinates, isLocationLoading]);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        maxWidth: '320px',
        aspectRatio: '1 / 1',
        margin: '1rem auto',
        borderRadius: '50%',
        overflow: 'hidden',
        cursor: reachedTargetRef.current ? 'grab' : 'default',
        userSelect: 'none',
        touchAction: 'none',
        boxShadow: '0 0 24px -6px rgba(30,120,255,0.6)'
      }}
    />
  );
};

export default Globe;
