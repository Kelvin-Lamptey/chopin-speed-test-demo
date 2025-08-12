"use client";

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface GlobeProps {
  coordinates?: { lat: number; lng: number } | null;
  isLocationLoading?: boolean;
}

const LON_TEXTURE_OFFSET_DEG = 0; // Adjust if texture not centered

export const Globe: React.FC<GlobeProps> = ({ coordinates, isLocationLoading = false }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const frameRef = useRef<number | undefined>(undefined);
  const sphereRef = useRef<THREE.Mesh | null>(null);
  const targetQuatRef = useRef<THREE.Quaternion | null>(null);
  const animatingToTargetRef = useRef(false);
  const markerRef = useRef<THREE.Mesh | null>(null);

  // Build a quaternion that rotates the globe so (lat,lng) faces the camera
  const computeTargetQuaternion = (lat: number, lng: number) => {
    const latRad = THREE.MathUtils.degToRad(lat);
    const lonRad = THREE.MathUtils.degToRad(lng + LON_TEXTURE_OFFSET_DEG);

    // Point on unit sphere for given geo coordinate
    const x = Math.cos(latRad) * Math.cos(lonRad);
    const y = Math.sin(latRad);
    const z = Math.cos(latRad) * Math.sin(lonRad);
    const n = new THREE.Vector3(x, y, z).normalize();

    // We want n to face camera direction (0,0,1)
    const front = new THREE.Vector3(0, 0, 1);
    const q = new THREE.Quaternion().setFromUnitVectors(n, front);

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

    // Marker (small red dot)
    const marker = new THREE.Mesh(
      new THREE.SphereGeometry(0.025, 16, 16),
      new THREE.MeshBasicMaterial({ color: '#ff4040' })
    );
    marker.visible = false;
    markerRef.current = marker;
    scene.add(marker);

    // Lights
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(5, 3, 5);
    scene.add(dirLight);

    const ambient = new THREE.AmbientLight(0x335577, 0.5);
    scene.add(ambient);

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
        if (isLocationLoading || !targetQuatRef.current) {
          // Free spin while loading / no target yet
          sphereRef.current.rotation.y += 0.0025;
          animatingToTargetRef.current = false;
        } else {
          if (animatingToTargetRef.current) {
            // Slerp toward target quaternion
            sphereRef.current.quaternion.slerp(targetQuatRef.current, 0.04);

            // Close enough to stop?
            if (sphereRef.current.quaternion.angleTo(targetQuatRef.current) < 0.002) {
              sphereRef.current.quaternion.copy(targetQuatRef.current);
              animatingToTargetRef.current = false;
            }
          }
          // If not animating and we have a target, stay still (paused state)
        }
      }

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      window.removeEventListener('resize', onResize);

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
        boxShadow: '0 0 24px -6px rgba(30,120,255,0.6)'
      }}
    />
  );
};

export default Globe;
