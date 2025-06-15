// 모든 매니저와 서비스 파일에서 '클래스'를 import 합니다.
import { WorkspaceManager } from './WorkspaceManager.js';
import { UIManager } from './UiManager.js';
import { ObjectManager } from './ObjectManager.js';
import { CatalogManager } from './CatalogManager.js'; // CatalogManager 추가
import { GoogleAuthService } from './GoogleAuthService.js';
import { GoogleDriveService } from './GoogleDriveService.js';

// MainApp 클래스: 앱의 전체적인 생명주기를 관리합니다.
class MainApp {
    constructor() {
        // constructor에서는 모든 클래스의 인스턴스를 'new'로 생성합니다.
        this.workspace = new WorkspaceManager();
        this.objectManager = new ObjectManager();
        this.uiManager = new UIManager();
        this.catalogManager = new CatalogManager(); // CatalogManager 인스턴스 생성
        this.authService = new GoogleAuthService();
        this.driveService = new GoogleDriveService();
    }

    init() {
        // init 메서드에서 각 모듈을 초기화하면서 필요한 인스턴스를 전달(주입)합니다.
        
        // 1. 3D 환경과 관련된 매니저들을 먼저 초기화합니다.
        this.workspace.init();
        
        // 2. 서비스들을 초기화합니다. DriveService는 AuthService에 의존합니다.
        this.driveService.init(this.authService);
        
        // 3. ObjectManager와 UIManager를 초기화하고, 필요한 모든 의존성을 주입합니다.
        //    (이제 CatalogManager도 알 필요가 있으므로 전달합니다. 지금은 필요 없지만 확장성을 위해)
        this.objectManager.init(this.workspace, this.uiManager, this.catalogManager);
        this.uiManager.init(this.workspace, this.objectManager, this.authService, this.driveService, this.catalogManager);
        
        // 4. Google 인증 서비스의 상태 변경 콜백을 설정합니다.
        this.authService.init(this.handleAuthChange.bind(this));

        // 5. 이벤트 리스너를 설정합니다.
        this.setupEventListeners();
        
        // 6. 애니메이션 루프를 시작합니다.
        this.startAnimationLoop();
    }

    // GoogleAuthService의 상태 변경 시 호출될 콜백 함수입니다.
    handleAuthChange(isSignedIn) {
        this.uiManager.updateAuthStatus(isSignedIn);
    }

    // 전역 이벤트 리스너들을 설정합니다.
    setupEventListeners() {
        window.addEventListener('resize', () => this.workspace._onWindowResize());
        
        this.workspace.renderer.domElement.addEventListener('pointerdown', (event) => {
            this.objectManager.handlePointerDown(event, this.workspace.viewControls);
        });
        window.addEventListener('pointermove', (event) => {
            this.objectManager.handlePointerMove(event);
            this.uiManager.handleWindowPointerMove(event);
        });
        window.addEventListener('pointerup', () => {
            this.objectManager.handlePointerUp(this.workspace.viewControls);
            this.uiManager.handleWindowPointerUp();
        });
    }

    // 3D 렌더링을 위한 애니메이션 루프를 시작합니다.
    startAnimationLoop() {
        const animate = () => {
            requestAnimationFrame(animate);
            this.workspace.renderer.render(this.workspace.scene, this.workspace.camera);
            this.uiManager.update();
        };
        animate();
    }
}

// HTML 문서의 모든 리소스(이미지, 스크립트 등)가 로드된 후에 앱을 시작합니다.
window.onload = () => {
    const app = new MainApp();
    app.init();
};