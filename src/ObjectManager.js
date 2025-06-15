import * as THREE from 'three';
import { CatalogManager } from './CatalogManager.js'; // 새로 만든 CatalogManager를 import

export class ObjectManager {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.uiManager = null;
        this.workspace = null;
        this.placedObjects = [];
        this.raycaster = new THREE.Raycaster();
        this.pointer = new THREE.Vector2();
        this.plane = new THREE.Plane();
        this.selectedObject = null;
        this.isDragging = false;
        this.catalogManager = null;
    }

    init(workspace, uiManager, catalogManager) {
        this.workspace = workspace;
        this.scene = workspace.scene;
        this.camera = workspace.camera;
        this.uiManager = uiManager;
        this.CatalogManager = catalogManager; // CatalogManager 인스턴스를 저장합니다.
    }
    
    // UIManager의 카탈로그 아이템 클릭 시 호출됩니다.
    addNewObject() {
        const deskInfo = this.workspace.currentLayout.deskInfo;
        if (!deskInfo) { 
            alert("Create a desk first!"); 
            return; 
        }

        // CatalogManager에서 현재 선택된 아이템 정보를 가져옵니다.
        const selectedItemInfo = this.CatalogManager.getSelectedItemInfo();
        if (!selectedItemInfo) {
            alert("Please select an item from the catalog first.");
            return;
        }
        
        // 새 오브젝트의 초기 위치를 책상 중앙 + 아이템 높이의 절반으로 설정합니다.
        const position = new THREE.Vector3(
            0, 
            deskInfo.meshGroup.position.y + 0.01 + (selectedItemInfo.size.h / 2), 
            0
        );
        
        // 선택된 아이템의 정보(크기, 색상 등)를 사용하여 오브젝트를 생성합니다.
        this.createObject({ 
            position, 
            size: selectedItemInfo.size,
            color: selectedItemInfo.color,
        });
    }

    createObject({ position, size = { w: 0.05, h: 0.05, d: 0.05 }, color = 0x4a86e8, rotation = { x: 0, y: 0, z: 0 }, scale = { x: 1, y: 1, z: 1 } }) {
        const geometry = new THREE.BoxGeometry(size.w, size.h, size.d);
        const material = new THREE.MeshStandardMaterial({ color });
        const object = new THREE.Mesh(geometry, material);
        object.position.copy(position);
        object.rotation.set(rotation.x, rotation.y, rotation.z);
        object.scale.set(scale.x, scale.y, scale.z);
        this.scene.add(object);
        this.placedObjects.push(object);
        return object;
    }
    
    applyLayout(layoutData) {
        layoutData.objects?.forEach(objData => this.createObject(objData));
    }

    rotateObject(object, angle) {
        if (object) object.rotation.y += angle;
    }

    scaleObjectTo(object, newWidth, newHeight, newDepth) {
        if (!object) return;
        const baseGeo = object.geometry.parameters;
        const scaleX = newWidth / baseGeo.width;
        const scaleY = newHeight / baseGeo.height;
        const scaleZ = newDepth / baseGeo.depth;
        object.scale.set(scaleX, scaleY, scaleZ);
        const deskY = this.workspace.currentLayout.deskInfo.meshGroup.position.y + 0.01;
        object.position.y = deskY + (newHeight / 2);
        this.uiManager.updateHandlesPosition();
    }

    deleteObject(objectToDelete) {
        if (!objectToDelete) return;
        if (this.selectedObject === objectToDelete) this.deselectObject();
        this.placedObjects = this.placedObjects.filter(obj => obj.uuid !== objectToDelete.uuid);
        this.scene.remove(objectToDelete);
        if (objectToDelete.geometry) objectToDelete.geometry.dispose();
        if (objectToDelete.material) objectToDelete.material.dispose();
    }

    clearAllObjects() {
        if (this.selectedObject) this.deselectObject();
        this.placedObjects.forEach(obj => { this.scene.remove(obj); obj.geometry.dispose(); obj.material.dispose(); });
        this.placedObjects = [];
    }

    getObjectsData() {
        return this.placedObjects.map(obj => ({
            position: obj.position.clone(),
            rotation: { x: obj.rotation.x, y: obj.rotation.y, z: obj.rotation.z },
            scale: { x: obj.scale.x, y: obj.scale.y, z: obj.scale.z },
            size: { w: obj.geometry.parameters.width, h: obj.geometry.parameters.height, d: obj.geometry.parameters.depth },
            color: obj.material.color.getHex()
        }));
    }

    deselectObject() {
        if (this.selectedObject) this.selectedObject.material.emissive.set(0x000000);
        this.selectedObject = null;
        this.uiManager.setTargetObject(null);
        this.uiManager.hideScaleModal();
    }
    
    handlePointerDown(event, viewControls) {
        if (event.target.id !== 'webgl-canvas') return;
        this.pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
        this.raycaster.setFromCamera(this.pointer, this.camera);
        const intersects = this.raycaster.intersectObjects(this.placedObjects);
        if (intersects.length > 0) {
            const newSelection = intersects[0].object;
            if (this.selectedObject !== newSelection) this.deselectObject();
            this.selectedObject = newSelection;
            this.isDragging = true;
            viewControls.enabled = false;
            this.selectedObject.material.emissive.set(0x666600);
            this.plane.setFromNormalAndCoplanarPoint(new THREE.Vector3(0, 1, 0), intersects[0].point);
            this.uiManager.setTargetObject(this.selectedObject);
        } else {
            this.deselectObject();
        }
    }

    handlePointerMove(event) {
        if (!this.isDragging || !this.selectedObject) return;
        
        this.pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
        this.raycaster.setFromCamera(this.pointer, this.camera);
        
        const intersectPoint = new THREE.Vector3();
        if (this.raycaster.ray.intersectPlane(this.plane, intersectPoint)) {
            const targetPosition = intersectPoint;
            const deskInfo = this.workspace.currentLayout.deskInfo;

            if (deskInfo) {
                // --- 경계 제한 로직 최종 수정 ---
                // 1. 오브젝트의 회전/크기 조절이 적용된 바운딩 박스를 계산합니다.
                const objectBox = new THREE.Box3().setFromObject(this.selectedObject);
                const objectSize = new THREE.Vector3();
                objectBox.getSize(objectSize);
                
                const objectHalfWidth = objectSize.x / 2;
                const objectHalfDepth = objectSize.z / 2;
                const margin = 0.05; // 5cm 여유 공간

                // 2. 책상의 월드 좌표 기준 경계를 계산합니다.
                //    책상의 중심이 (0, 0.7, 0)에 있다고 가정합니다.
                const deskMinX = -(deskInfo.width / 2) + margin + objectHalfWidth-0.1;
                const deskMaxX =  (deskInfo.width / 2) + margin - objectHalfWidth;
                const deskMinZ = -(deskInfo.depth / 2) + margin + objectHalfDepth-0.1;
                const deskMaxZ =  (deskInfo.depth / 2) + margin - objectHalfDepth;

                // 3. clamp 함수로 목표 위치를 책상 경계 내로 제한합니다.
                targetPosition.x = THREE.MathUtils.clamp(targetPosition.x, deskMinX, deskMaxX);
                targetPosition.z = THREE.MathUtils.clamp(targetPosition.z, deskMinZ, deskMaxZ);
            }
            
            // 최종적으로 계산된 위치로 오브젝트를 이동시킵니다.
            this.selectedObject.position.set(targetPosition.x, this.selectedObject.position.y, targetPosition.z);
        }
    }

    handlePointerUp(viewControls) {
        this.isDragging = false;
        if (viewControls) viewControls.enabled = true;
    }
}