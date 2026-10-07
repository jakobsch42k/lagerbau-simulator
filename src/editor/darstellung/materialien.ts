import * as THREE from 'three';

// Geteilte Materialien. Die Szene gibt sie nie frei; nur die Geometrie gehört einem Objekt.
export const HOLZ = new THREE.MeshLambertMaterial({ color: 0x8b5a2b });
export const MARKIERT = new THREE.MeshLambertMaterial({ color: 0xd9480f });
export const SEIL = new THREE.MeshLambertMaterial({ color: 0xe8d9a0 });
export const START = new THREE.MeshLambertMaterial({ color: 0x2f6f3e });
export const STAMM = new THREE.MeshLambertMaterial({ color: 0x6b4226 });
export const KRONE = new THREE.MeshLambertMaterial({ color: 0x3f7d3a });
export const HARING = new THREE.MeshLambertMaterial({ color: 0x4a4a4a });
export const UNSICHTBAR = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });
export const PLATZ = new THREE.LineDashedMaterial({ color: 0x1d2733, dashSize: 0.2, gapSize: 0.1 });
// Beidseitig, damit man die Plane auch von unten sieht; polygonOffset verhindert Flimmern einer Bodenplane auf dem Boden.
export const PLANE = new THREE.MeshLambertMaterial({ color: 0x7d7a4f, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
export const PLANE_MARKIERT = new THREE.MeshLambertMaterial({ color: 0xd9480f, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
// Auswahl einer Beschriftung: eine flache, halbdurchsichtige Fläche unter dem Text (Spec E3).
export const BESCHRIFTUNG_MARKIERT = new THREE.MeshBasicMaterial({ color: 0xd9480f, transparent: true, opacity: 0.35, depthWrite: false, side: THREE.DoubleSide });
// Auswahl einer Zone: orange, halbdurchsichtig, wie die Zone selbst flach und ohne Tiefenschreiben (Spec E3).
export const ZONE_MARKIERT = new THREE.MeshBasicMaterial({
  color: 0xd9480f,
  transparent: true,
  opacity: 0.55,
  depthWrite: false,
  side: THREE.DoubleSide,
  polygonOffset: true,
  polygonOffsetFactor: -1,
  polygonOffsetUnits: -1,
});
// Auswahl einer Grenze: die unsichtbare Klickfläche wird sichtbar.
export const KLICKBAND_MARKIERT = new THREE.MeshBasicMaterial({ color: 0xd9480f, transparent: true, opacity: 0.45, depthWrite: false, side: THREE.DoubleSide });
