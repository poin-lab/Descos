import * as THREE from 'three';
import { OrbitControls } from 'three/OrbitControls.js';

export class WorkspaceManager {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.viewControls = null;
        this.currentLayout = { deskInfo: null };
    }

    init() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x333333);
        
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(0.8, 1.2, 0.8);
        this.camera.lookAt(0, 0.7, 0);

        const canvas = document.getElementById('webgl-canvas');
        this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);

        this.viewControls = new OrbitControls(this.camera, this.renderer.domElement);
        this.viewControls.target.set(0, 0.7, 0);
        this.viewControls.enableDamping = false;
        
        this._addLights();
        this.createNewLayout(1.2, 0.6);
    }

    _addLights() {
        this.scene.add(new THREE.AmbientLight(0xffffff, 0.8));
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
        directionalLight.position.set(5, 10, 7.5);
        this.scene.add(directionalLight);
    }
    
    _onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    clearLayout() {
        if (this.currentLayout.deskInfo) {
            this.scene.remove(this.currentLayout.deskInfo.meshGroup);
        }
        this.currentLayout.deskInfo = null;
    }
    
    toggleGridView() {
        const { deskTop, gridHelper } = this.currentLayout?.deskInfo || {};
        if (deskTop && gridHelper) {
            deskTop.visible = !deskTop.visible;
            gridHelper.visible = !gridHelper.visible;
        }
    }

    createNewLayout(width, depth) {
        const deskGroup = new THREE.Group();
        const deskTop = new THREE.Mesh(new THREE.BoxGeometry(width, 0.02, depth), new THREE.MeshStandardMaterial({ color: 0x8B4513 }));
        deskGroup.add(deskTop);
        const gridHelper = this._createGrid(width, depth);
        gridHelper.visible = false;
        deskGroup.add(gridHelper);
        deskGroup.position.y = 0.7;
        this.scene.add(deskGroup);
        this.currentLayout.deskInfo = { meshGroup: deskGroup, deskTop, gridHelper, width, depth };
    }

    _createGrid(width, depth) {
        const gridGroup = new THREE.Group();
        const gridLineMaterial = new THREE.LineBasicMaterial({ color: 0x666666 });
        const majorGridLineMaterial = new THREE.LineBasicMaterial({ color: 0xcccccc });
        const halfW = width / 2, halfD = depth / 2;
        const wCm = Math.round(width * 100), dCm = Math.round(depth * 100);
        const gridYPos = 0.011;

        for (let i = -dCm / 2; i <= dCm / 2; i++) {
            if (i % 1 !== 0) continue;
            const isMajor = (i % 10 === 0);
            const z = i / 100.0;
            const points = [new THREE.Vector3(-halfW, gridYPos, z), new THREE.Vector3(halfW, gridYPos, z)];
            gridGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), isMajor ? majorGridLineMaterial : gridLineMaterial));
        }
        for (let i = -wCm / 2; i <= wCm / 2; i++) {
            if (i % 1 !== 0) continue;
            const isMajor = i % 10 === 0;
            const x = i / 100.0;
            const points = [new THREE.Vector3(x, gridYPos, -halfD), new THREE.Vector3(x, gridYPos, halfD)];
            gridGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), isMajor ? majorGridLineMaterial : gridLineMaterial));
        }
        return gridGroup;
    }
    
    applyLayout(layoutData) {
        if (!layoutData?.desk) return;
        this.clearLayout();
        const { width, depth } = layoutData.desk;
        this.createNewLayout(width, depth);
        document.getElementById('desk-width').value = width * 100;
        document.getElementById('desk-depth').value = depth * 100;
    }

    getCurrentLayoutData() {
        if (!this.currentLayout.deskInfo) return null;
        return {
            desk: {
                width: this.currentLayout.deskInfo.width,
                depth: this.currentLayout.deskInfo.depth
            }
        };
    }

    // --- 새로운 메서드 추가: 이미지 내보내기 ---
    exportAsImage() {
        try {
            // 렌더링을 한 번 더 수행하여 최신 상태를 보장합니다.
            this.renderer.render(this.scene, this.camera);

            // 현재 렌더러의 캔버스에서 이미지 데이터를 Base64 형식의 URL로 추출합니다.
            const dataURL = this.renderer.domElement.toDataURL('image/png');

            // 다운로드를 위한 임시 <a> 태그(링크)를 생성합니다.
            const link = document.createElement('a');
            
            // 링크의 다운로드 파일 이름을 설정합니다.
            link.download = 'desco_layout.png';
            
            // 링크의 주소(href)에 이미지 데이터를 설정합니다.
            link.href = dataURL;
            
            // 생성된 링크를 프로그래밍적으로 클릭하여 다운로드를 실행합니다.
            link.click();

        } catch (error) {
            console.error("Could not export image:", error);
            alert("Sorry, could not export the image.");
        }
    }
}