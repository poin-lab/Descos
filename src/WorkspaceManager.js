// src/managers/WorkspaceManager.js
import * as THREE from 'three';
import { OrbitControls } from 'three/OrbitControls.js';

class WorkspaceManager {
    // constructor: 클래스 인스턴스가 생성될 때 호출되는 초기화 함수
    constructor() {
        // 3D 장면을 구성하는 핵심 객체들을 클래스의 속성으로 초기화합니다.
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        // 3D 씬에 추가될 주요 그룹 및 객체들도 속성으로 관리합니다.
        this.deskGroup = null; // 책상 상판, 격자 등 모든 책상 요소를 담을 그룹
        this.deskTop = null;   // 책상 상판 Mesh
        this.gridHelper = null; // 격자 Group
        this.object = null;    // 책상 위 오브젝트 Mesh
    }

    // init: 3D 환경의 모든 설정을 시작하는 메인 메서드
    init() {
        // 1. Scene 생성: 3D 공간을 만듭니다.
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x333333); // 배경색을 어두운 회색으로 설정
        
        // 2. Camera 생성: 3D 공간을 바라볼 시점을 설정합니다.
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(0.8, 1.0, 0.8); // 카메라의 초기 위치 설정
        this.camera.lookAt(0, 0.7, 0); // 카메라가 책상 중심 높이를 바라보도록 설정

        // 3. Renderer 생성: 3D 장면을 실제 화면(canvas)에 그리는 역할을 합니다.
        const canvas = document.getElementById('webgl-canvas');
        this.renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);

        // 4. Controls 생성: 마우스로 카메라(뷰)를 조작할 수 있게 합니다.
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.target.set(0, 0.7, 0); // 컨트롤의 회전 중심점을 책상 높이로 설정
        this.controls.enableDamping = false; // 카메라 미끄러짐 효과 비활성화

        // 5. 부가 기능 초기화
        this._addLights(); // 장면에 조명 추가
        this.createNewDesk(1.2, 0.6); // 기본 크기(120x60cm)의 책상 생성
        this.createObject(); // 기본 오브젝트 1개 생성

        // 6. 이벤트 리스너 및 애니메이션 시작
        window.addEventListener('resize', () => this._onWindowResize());
        this._animate();
    }

    // _addLights: 장면에 빛을 추가하는 비공개 헬퍼 메서드
    _addLights() {
        // AmbientLight: 그림자 없이 전체적으로 은은하게 빛을 추가합니다.
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
        this.scene.add(ambientLight);
        // DirectionalLight: 특정 방향에서 오는 빛(태양광과 유사)을 추가하여 입체감을 줍니다.
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
        directionalLight.position.set(5, 10, 7.5);
        this.scene.add(directionalLight);
    }

    // _onWindowResize: 브라우저 창 크기가 변경될 때 호출되는 비공개 헬퍼 메서드
    _onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight; // 카메라의 가로세로 비율을 업데이트
        this.camera.updateProjectionMatrix(); // 카메라의 변경사항을 적용
        this.renderer.setSize(window.innerWidth, window.innerHeight); // 렌더러의 크기를 업데이트
    }

    // _animate: 매 프레임마다 3D 장면을 다시 그리는 비공개 헬퍼 메서드 (렌더링 루프)
    _animate() {
        requestAnimationFrame(() => this._animate()); // 다음 프레임에 이 함수를 다시 호출하도록 예약
        this.controls.update(); // OrbitControls 상태 업데이트
        this.renderer.render(this.scene, this.camera); // scene을 camera의 시점에서 렌더링
    }

    // clearScene: 씬에 있는 책상과 오브젝트를 모두 제거하는 메서드
    clearScene() {
        if (this.deskGroup) this.scene.remove(this.deskGroup);
        if (this.object) this.scene.remove(this.object);
        // 참조를 null로 만들어 가비지 컬렉션(메모리 정리)을 돕습니다.
        this.deskGroup = null; this.deskTop = null; this.gridHelper = null; this.object = null;
    }

    // toggleDeskView: 책상 상판과 격자의 보이기/숨기기 상태를 전환하는 메서드
    toggleDeskView() {
        if (this.deskTop && this.gridHelper) {
            this.deskTop.visible = !this.deskTop.visible;
            this.gridHelper.visible = !this.gridHelper.visible;
        }
    }

    // createNewDesk: 사용자가 지정한 크기로 새로운 책상을 생성하는 메서드
    createNewDesk(width, depth) {
        // 책상의 모든 요소를 담을 그룹(컨테이너)을 생성합니다.
        this.deskGroup = new THREE.Group();
        
        // 책상 상판(Mesh)을 생성하여 그룹에 추가합니다.
        this.deskTop = new THREE.Mesh(new THREE.BoxGeometry(width, 0.02, depth), new THREE.MeshStandardMaterial({ color: 0x8B4513 }));
        this.deskGroup.add(this.deskTop);

        // 격자(Line 들의 그룹)를 생성하여 그룹에 추가합니다.
        this.gridHelper = new THREE.Group();
        const gridLineMaterial = new THREE.LineBasicMaterial({ color: 0x666666 });
        const majorGridLineMaterial = new THREE.LineBasicMaterial({ color: 0xcccccc });
        const halfW = width / 2, halfD = depth / 2;
        const wCm = Math.round(width * 100), dCm = Math.round(depth * 100);
        const hWCm = wCm / 2, hDCm = dCm / 2;
        const gridYPosition = 0.01; // 상판과 겹치지 않도록 살짝 위에 그립니다.

        // 가로 방향 격자선들을 생성
        for (let i = -hDCm; i <= hDCm; i++) {
            const isMajorLine = (i % 10 === 0); // 10cm마다 강조선인지 확인
            const zPos = i / 100.0;
            const points = [new THREE.Vector3(-halfW, gridYPosition, zPos), new THREE.Vector3(halfW, gridYPosition, zPos)];
            const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), isMajorLine ? majorGridLineMaterial : gridLineMaterial);
            this.gridHelper.add(line);
        }
        // 세로 방향 격자선들을 생성
        for (let i = -hWCm; i <= hWCm; i++) {
            const isMajorLine = (i % 10 === 0);
            const xPos = i / 100.0;
            const points = [new THREE.Vector3(xPos, gridYPosition, -halfD), new THREE.Vector3(xPos, gridYPosition, halfD)];
            const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), isMajorLine ? majorGridLineMaterial : gridLineMaterial);
            this.gridHelper.add(line);
        }
        this.gridHelper.visible = false; // 격자는 처음에는 보이지 않게 설정
        this.deskGroup.add(this.gridHelper); // 완성된 격자를 책상 그룹에 추가

        // 책상 그룹 전체의 위치를 Y축으로 0.7m(70cm)만큼 올립니다.
        this.deskGroup.position.y = 0.7;
        // 최종적으로 완성된 책상 그룹을 씬에 추가합니다.
        this.scene.add(this.deskGroup);
    }

    // createObject: 책상 위에 기본 오브젝트(파란 상자)를 생성하는 메서드
    createObject() {
        if (!this.deskGroup) return; // 책상이 없으면 생성하지 않음
        this.object = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.05), new THREE.MeshStandardMaterial({ color: 0x4a86e8 }));
        // 오브젝트의 높이를 책상 상판 바로 위로 계산하여 설정합니다.
        this.object.position.y = this.deskGroup.position.y + 0.01 + 0.025; // 책상 높이 + 상판두께/2 + 오브젝트크기/2
        this.scene.add(this.object);
    }

    // applyLayout: 불러온 파일 데이터로 씬을 복원하는 메서드
    applyLayout(layoutData) {
        if (!layoutData?.desk || !layoutData.objects) { alert("Invalid layout data."); return; }
        
        this.clearScene(); // 현재 씬을 모두 지웁니다.
        
        const { width, depth } = layoutData.desk;
        if (width > 0 && depth > 0) {
            this.createNewDesk(width, depth); // 저장된 크기로 책상을 다시 만듭니다.
        } else { 
            alert("Invalid desk size in data."); return; 
        }

        // 저장된 오브젝트 정보를 바탕으로 오브젝트들을 다시 배치합니다.
        layoutData.objects.forEach(objData => {
            this.createObject();
            if (this.object && objData.position) {
                this.object.position.copy(objData.position); // 저장된 위치(Vector3)를 복사
            }
        });

        // UI의 입력창 값도 불러온 데이터로 동기화합니다.
        document.getElementById('desk-width').value = width * 100;
        document.getElementById('desk-depth').value = depth * 100;
        alert("Layout loaded successfully!");
    }

    // getCurrentLayoutData: 현재 씬의 정보를 파일로 저장하기 위해 데이터 객체로 반환하는 메서드
    getCurrentLayoutData() {
        if (!this.deskGroup || !this.object) return null; // 저장할 내용이 없으면 null 반환
        return {
            desk: {
                width: this.deskTop.geometry.parameters.width,
                depth: this.deskTop.geometry.parameters.depth
            },
            objects: [
                {
                    id: 'main-object',
                    position: this.object.position.clone() // .clone()으로 위치 값을 복사하여 원본이 변경되지 않도록 함
                }
            ]
        };
    }
}

// 싱글턴 패턴: 앱 전체에서 단 하나의 WorkspaceManager 인스턴스만 사용하도록 함
export const workspace = new WorkspaceManager();