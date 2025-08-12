"use client";

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

export const Globe: React.FC = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const frameRef = useRef<number>();

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

    const sphereGeometry = new THREE.SphereGeometry(1, 48, 48);

    // Load earth texture
    const textureLoader = new THREE.TextureLoader();
    const earthTexture = textureLoader.load('/earth-blue-marble.jpg');
    const bumpTexture = textureLoader.load('/earth-topology.png');
    
    // Apply texture to material
    const material = new THREE.MeshStandardMaterial({
      map: earthTexture,
      bumpMap: bumpTexture,
      bumpScale: 0.05,
      roughness: 0.8,
      metalness: 0.1,
    });

    const sphere = new THREE.Mesh(sphereGeometry, material);
    scene.add(sphere);

    // Subtle glowing atmosphere
    const atmosphereMat = new THREE.MeshBasicMaterial({
      color: '#3aa4ff',
      side: THREE.BackSide
    });
    const atmosphere = new THREE.Mesh(
      new THREE.SphereGeometry(1.05, 48, 48),
      atmosphereMat
    );
    scene.add(atmosphere);

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
      sphere.rotation.y += 0.002;
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      window.removeEventListener('resize', onResize);
      
      // Dispose of geometries, materials, and textures
      sphereGeometry.dispose();
      material.dispose();
      atmosphereMat.dispose();
      
      // Dispose of textures
      if (material.map) material.map.dispose();
      if (material.bumpMap) material.bumpMap.dispose();
      
      renderer.dispose();
      
      if (containerRef.current?.contains(renderer.domElement)) {
        containerRef.current.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        maxWidth: '300px',
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
