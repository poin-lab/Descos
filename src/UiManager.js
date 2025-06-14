// src/managers/UIManager.js
import { authService } from './GoogleAuthService.js';
import { driveService } from './GoogleDriveService.js';
import { workspace } from './WorkspaceManager.js';

class UIManager {
    constructor() {
        this.uiElements = {
            authButton: document.getElementById('auth-button'),
            signoutButton: document.getElementById('signout-button'),
            userInfo: document.getElementById('user-info'),
            listFilesButton: document.getElementById('list-files-button'),
            modal: document.getElementById('file-modal'),
            fileListContainer: document.getElementById('file-list-container'),
            toggleButton: document.getElementById('toggle-button'),
            newDeskButton: document.getElementById('new-desk-button'),
            modalCloseButton: document.getElementById('modal-close-button'),
            saveLayoutButton: document.getElementById('save-layout-button'),
        };
    }

    init() {
        this._setupEventListeners();
    }

    // --- UI 상태 업데이트 ---
    // async 키워드를 추가하여 내부에서 await를 사용할 수 있도록 합니다.
    async updateAuthStatus(isSignedIn) {
        const display = isSignedIn ? { auth: 'none', others: 'block' } : { auth: 'block', others: 'none' };
        this.uiElements.authButton.style.display = display.auth;
        this.uiElements.signoutButton.style.display = display.others;
        this.uiElements.listFilesButton.style.display = display.others;
        this.uiElements.saveLayoutButton.style.display = display.others;

        if (isSignedIn) {
            // authService에서 사용자 이름을 비동기적으로 가져옵니다.
            const userName = await authService.getUserName();
            // 이름이 있으면 "Logged in: [이름]" 으로, 없으면 그냥 "Logged in"으로 표시합니다.
            this.uiElements.userInfo.textContent = `Logged in: ${userName || 'User'}`;
        } else {
            this.uiElements.userInfo.textContent = 'Not logged in';
        }
    }

    // --- 이벤트 리스너 설정 ---
    _setupEventListeners() {
        this.uiElements.authButton.addEventListener('click', () => authService.signIn());
        this.uiElements.signoutButton.addEventListener('click', () => authService.signOut());
        this.uiElements.listFilesButton.addEventListener('click', () => this.showFileList());
        this.uiElements.modalCloseButton.addEventListener('click', () => this.hideFileList());
        this.uiElements.toggleButton.addEventListener('click', () => workspace.toggleDeskView());
        this.uiElements.newDeskButton.addEventListener('click', () => {
            const width = parseFloat(document.getElementById('desk-width').value) / 100;
            const depth = parseFloat(document.getElementById('desk-depth').value) / 100;
            if (width > 0 && depth > 0) {
                workspace.clearScene();
                workspace.createNewDesk(width, depth);
                workspace.createObject();
            }
        });
        this.uiElements.saveLayoutButton.addEventListener('click', () => this.saveLayout());
        this.uiElements.fileListContainer.addEventListener('click', (event) => {
            const fileItem = event.target.closest('.file-item');
            if (fileItem) this.loadFile(fileItem.dataset.fileId);
        });
    }

    // --- 파일 관련 UI 메서드 ---
    async showFileList() {
        if (!authService.isSignedIn()) return;
        this.uiElements.modal.style.display = 'flex';
        this.uiElements.fileListContainer.innerHTML = '<p>Loading...</p>';
        try {
            const files = await driveService.listFiles();
            this._updateFileListUI(files);
        } catch (err) { this.uiElements.fileListContainer.innerHTML = `<p style="color: red;">${err.message}</p>`; }
    }

    hideFileList() {
        this.uiElements.modal.style.display = 'none';
    }

    _updateFileListUI(files) {
        this.uiElements.fileListContainer.innerHTML = '';
        if (!files || files.length === 0) {
            this.uiElements.fileListContainer.innerHTML = '<p>No layout files found.</p>';
            return;
        }
        const fileItemsHtml = files.map(file => `
            <div class="file-item" data-file-id="${file.id}">
                <span class="file-name">${file.name}</span>
                <span class="file-modified-time">${new Date(file.modifiedTime).toLocaleString()}</span>
            </div>`);
        this.uiElements.fileListContainer.innerHTML = fileItemsHtml.join('');
    }

    async loadFile(fileId) {
        try {
            const layoutData = await driveService.loadFileContent(fileId);
            workspace.applyLayout(layoutData);
            this.hideFileList();
        } catch (err) { alert(`Failed to load file: ${err.message}`); }
    }

    async saveLayout() {
        if (!authService.isSignedIn()) return;
        let fileName = prompt("Enter file name:", "MyLayout.json");
        if (!fileName) return;
        if (!fileName.toLowerCase().endsWith('.json')) fileName += '.json';
        const layoutData = workspace.getCurrentLayoutData();
        if (!layoutData) { alert("Nothing to save."); return; }
        try {
            const savedFile = await driveService.saveFile(fileName, layoutData);
            alert(`'${savedFile.name}' saved successfully!`);
            this.showFileList();
        } catch (err) { alert(`Error saving file: ${err.message}`); }
    }
}

export const uiManager = new UIManager();