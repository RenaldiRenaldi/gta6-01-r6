import * as T from '../vendor/three.module.min.js';
export {T};

export const clamp = (n,min,max) => Math.max(min,Math.min(max,n));
export const distance = (a,b) => Math.hypot(a.x-b.x,a.z-b.z);
export const bearing = (a,b) => Math.atan2(b.x-a.x,b.z-a.z);
export const wrap = a => Math.atan2(Math.sin(a),Math.cos(a));
export function random(seed) {
  return () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
}

const box = new T.BoxGeometry(), sphere = new T.SphereGeometry(1,16,10);
// Shared materials keep the procedural city inside a bounded draw-state palette.
const metal = new Map();
export function material(color, roughness=.66, emission=0, metallic=0) {
  const key = [color,roughness,emission,metallic].join();
  if (!metal.has(key)) metal.set(key,new T.MeshStandardMaterial({
    color,roughness,metalness:metallic,emissive:color,emissiveIntensity:emission
  }));
  return metal.get(key);
}
export function model(parent,x=0,y=0,z=0) {
  const group = new T.Group();
  group.position.set(x,y,z);
  parent.add(group);
  return group;
}
export function boxAt(parent,mat,x,y,z,w,h,d) {
  return shape(parent,box,mat,x,y,z,w,h,d);
}
export function orb(parent,mat,x,y,z,w,h,d) {
  return shape(parent,sphere,mat,x,y,z,w,h,d);
}
export function shape(parent,geo,mat,x,y,z,w=1,h=1,d=1) {
  const mesh = new T.Mesh(geo,mat);
  mesh.position.set(x,y,z);
  mesh.scale.set(w,h,d);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}
export function slab(parent,mat,ax,ay,az,bx,by,bz,width,depth=width) {
  const start = new T.Vector3(ax,ay,az), end = new T.Vector3(bx,by,bz);
  const center = start.clone().lerp(end,.5);
  const mesh = boxAt(parent,mat,center.x,center.y,center.z,width,start.distanceTo(end),depth);
  mesh.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),end.sub(start).normalize());
  return mesh;
}

// Architecture is instanced; actors retain their independent movable joints.
export function batch(source,target) {
  source.updateMatrixWorld(true);
  const groups = new Map();
  source.traverse(node => {
    if (!node.isMesh) return;
    const key = [node.geometry.id,node.material.id,node.castShadow,node.receiveShadow].join();
    if (!groups.has(key)) groups.set(key,[]);
    groups.get(key).push(node);
  });
  for (const meshes of groups.values()) {
    const first = meshes[0];
    const instance = new T.InstancedMesh(first.geometry,first.material,meshes.length);
    meshes.forEach((mesh,i) => instance.setMatrixAt(i,mesh.matrixWorld));
    instance.castShadow = first.castShadow;
    instance.receiveShadow = first.receiveShadow;
    instance.computeBoundingSphere();
    target.add(instance);
  }
}
