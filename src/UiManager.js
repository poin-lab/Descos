import * as THREE from 'three';
import { GoogleAuthService } from './GoogleAuthService.js';
import { GoogleDriveService } from './GoogleDriveService.js';


export class UIManager {
    constructor() {
        this.workspace = null;
        this.objectManager = null;
        this.authService = null;
        this.driveService = null;
        this.uiElements = {};
        this.selectedObject = null;
        this.isRotating = false;
        this.isScaling = false;
        this.previousPointerX = 0;
        this.catalogManager = null;
    }

    init(workspace, objectManager, authService, driveService, catalogManager) {
        this.workspace = workspace;
        this.objectManager = objectManager;
        this.authService = authService;
        this.driveService = driveService;
        this.catalogManager = catalogManager; // CatalogManager 인스턴스를 저장합니다.
        this.uiElements = {
            authButton: document.getElementById('auth-button'),
            signoutButton: document.getElementById('signout-button'),
            userInfo: document.getElementById('user-info'),
            listFilesButton: document.getElementById('list-files-button'),
            saveLayoutButton: document.getElementById('save-layout-button'),
            modal: document.getElementById('file-modal'),
            fileListContainer: document.getElementById('file-list-container'),
            modalCloseButton: document.getElementById('modal-close-button'),
            toggleButton: document.getElementById('toggle-button'),
            newDeskButton: document.getElementById('new-desk-button'),
            catalogToggleBtn: document.getElementById('catalog-toggle-btn'),
            catalogPanel: document.getElementById('catalog-panel'),
            addObjectButton: document.getElementById('add-object-button'),
            exportImageBtn: document.getElementById('export-image-btn'),
            contextMenu: document.getElementById('context-menu'),
            scaleObjectBtn: document.getElementById('scale-object-btn'),
            deleteObjectBtn: document.getElementById('delete-object-btn'),
            rotateHandle: document.getElementById('rotate-handle'),
            scaleModal: document.getElementById('scale-modal'),
            scaleWInput: document.getElementById('scale-w-input'),
            scaleHInput: document.getElementById('scale-h-input'),
            scaleDInput: document.getElementById('scale-d-input'),
            scaleApplyBtn: document.getElementById('scale-apply-btn'),
        };
        this._setupEventListeners();
        this.renderCatalog();
    }

    renderCatalog() {
        const items = this.catalogManager.getItems();
        this.uiElements.catalogPanel.innerHTML = items.map(item => `
            <div class="catalog-item" data-item-id="${item.id}">
                <div class="catalog-item-icon" style="background-color: #${new THREE.Color(item.color).getHexString()}"></div>
                <span class="catalog-item-name">${item.name}</span>
            </div>
        `).join('');
    }

    update() {
        if (this.selectedObject) {
            this.updateHandlesPosition();
            if (this.uiElements.scaleModal.style.display === 'flex') {
                this.updateScaleModalPosition();
            }
        }
    }

    updateHandlesPosition() {
        if (!this.selectedObject || !this.workspace?.camera) return;
        const objectPosition = new THREE.Vector3();
        const box = new THREE.Box3().setFromObject(this.selectedObject);
        box.getCenter(objectPosition);
        objectPosition.y = box.max.y;
        objectPosition.project(this.workspace.camera);
        const x = (objectPosition.x * 0.5 + 0.5) * window.innerWidth;
        const y = (objectPosition.y * -0.5 + 0.5) * window.innerHeight;
        this.uiElements.contextMenu.style.left = `${x}px`;
        this.uiElements.contextMenu.style.top = `${y - 20}px`;
        this.uiElements.contextMenu.style.transform = 'translateX(-50%)';
        this.uiElements.rotateHandle.style.left = `${x + 25}px`;
        this.uiElements.rotateHandle.style.top = `${y}px`;
        this.uiElements.rotateHandle.style.transform = 'translateY(-50%)';
    }

    updateScaleModalPosition() {
        if (!this.selectedObject || !this.workspace?.camera) return;
        const objectPosition = new THREE.Vector3();
        const box = new THREE.Box3().setFromObject(this.selectedObject);
        box.getCenter(objectPosition);
        objectPosition.y = box.max.y;
        objectPosition.project(this.workspace.camera);
        const x = (objectPosition.x * 0.5 + 0.5) * window.innerWidth;
        const y = (objectPosition.y * -0.5 + 0.5) * window.innerHeight;
        this.uiElements.scaleModal.style.left = `${x}px`;
        this.uiElements.scaleModal.style.top = `${y - 65}px`;
        this.uiElements.scaleModal.style.transform = 'translateX(-50%)';
    }

    setTargetObject(object) {
        this.selectedObject = object;
        const display = object ? 'flex' : 'none';
        this.uiElements.contextMenu.style.display = display;
        this.uiElements.rotateHandle.style.display = display;
        if (object) {
            this.updateHandlesPosition();
        } else {
            this.hideScaleModal();
        }
    }

    showScaleModal() {
        if (!this.selectedObject) return;
        const geoParams = this.selectedObject.geometry.parameters;
        const currentScale = this.selectedObject.scale;
        this.uiElements.scaleWInput.value = Math.round(geoParams.width * currentScale.x * 100);
        this.uiElements.scaleHInput.value = Math.round(geoParams.height * currentScale.y * 100);
        this.uiElements.scaleDInput.value = Math.round(geoParams.depth * currentScale.z * 100);
        this.uiElements.scaleModal.style.display = 'flex';
        this.updateScaleModalPosition();
    }

    hideScaleModal() {
        this.uiElements.scaleModal.style.display = 'none';
    }
    
    async updateAuthStatus(isSignedIn) {
        const display = isSignedIn ? 'block' : 'none';
        const authDisplay = isSignedIn ? 'none' : 'block';
        this.uiElements.authButton.style.display = authDisplay;
        this.uiElements.signoutButton.style.display = display;
        this.uiElements.listFilesButton.style.display = display;
        this.uiElements.saveLayoutButton.style.display = display;
        this.uiElements.userInfo.textContent = isSignedIn ? `Logged in: ${await this.authService.getUserName() || 'User'}` : 'Not logged in';
    }

    _setupEventListeners() {
        this.uiElements.authButton.addEventListener('click', () => this.authService.signIn());
        this.uiElements.signoutButton.addEventListener('click', () => this.authService.signOut());
        this.uiElements.listFilesButton.addEventListener('click', () => this.showFileList());
        this.uiElements.saveLayoutButton.addEventListener('click', () => this.saveLayout());
        
        document.getElementById('file-modal-content').addEventListener('click', (e) => {
            if (e.target.id === 'modal-close-button') this.hideFileList();
            const fileItem = e.target.closest('.file-item');
            if (fileItem) this.loadFile(fileItem.dataset.fileId);
        });
        
        this.uiElements.toggleButton.addEventListener('click', () => this.workspace.toggleGridView());
        this.uiElements.newDeskButton.addEventListener('click', () => {
            const width = parseFloat(document.getElementById('desk-width').value) / 100;
            const depth = parseFloat(document.getElementById('desk-depth').value) / 100;
            if (width > 0 && depth > 0) {
                this.workspace.clearLayout();
                this.objectManager.clearAllObjects();
                this.workspace.createNewLayout(width, depth);
            }
        });

        this.uiElements.catalogToggleBtn.addEventListener('click', () => {
            const panel = this.uiElements.catalogPanel;
            panel.style.display = (panel.style.display === 'block') ? 'none' : 'block';
        });

        this.uiElements.catalogPanel.addEventListener('click', (e) => {
            const itemElement = e.target.closest('.catalog-item');
            if (itemElement) {
                const itemId = itemElement.dataset.itemId;
                this.catalogManager.setSelectedItemId(itemId);
                document.querySelectorAll('.catalog-item').forEach(el => el.classList.remove('selected'));
                itemElement.classList.add('selected');
            }
        });
        
        this.uiElements.addObjectButton.addEventListener('click', () => this.objectManager.addNewObject());
        this.uiElements.exportImageBtn.addEventListener('click', () => this.workspace.exportAsImage());

        this.uiElements.deleteObjectBtn.addEventListener('click', () => {
            if (this.selectedObject && confirm("Are you sure?")) this.objectManager.deleteObject(this.selectedObject);
        });
        
        this.uiElements.scaleObjectBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (this.selectedObject) this.showScaleModal();
        });

        this.uiElements.scaleApplyBtn.addEventListener('click', () => {
            const width = parseFloat(this.uiElements.scaleWInput.value);
            const height = parseFloat(this.uiElements.scaleHInput.value);
            const depth = parseFloat(this.uiElements.scaleDInput.value);
            if ([width, height, depth].every(val => !isNaN(val) && val > 0)) {
                this.objectManager.scaleObjectTo(this.selectedObject, width / 100, height / 100, depth / 100);
                this.hideScaleModal();
            } else {
                alert("Invalid input. Please enter positive numbers.");
            }
        });

        this.uiElements.rotateHandle.addEventListener('pointerdown', (e) => {
            e.stopPropagation();
            if (this.selectedObject) {
                this.isRotating = true;
                this.previousPointerX = e.clientX;
                this.workspace.viewControls.enabled = false;
            }
        });
    }

    handleWindowPointerMove(event) {
        if (!this.selectedObject || !this.isRotating) return;
        const deltaX = event.clientX - this.previousPointerX;
        if (this.isRotating) this.objectManager.rotateObject(this.selectedObject, -deltaX * 0.02);
        this.previousPointerX = event.clientX;
    }

    handleWindowPointerUp() {
        if (this.isRotating) {
            this.isRotating = false;
            this.workspace.viewControls.enabled = true;
        }
    }

    async showFileList() {
        if (!this.authService.isSignedIn()) return;
        this.uiElements.modal.style.display = 'flex';
        this.uiElements.fileListContainer.innerHTML = '<p>Loading...</p>';
        try {
            const files = await this.driveService.listFiles();
            this._updateFileListUI(files);
        } catch (err) { this.uiElements.fileListContainer.innerHTML = `<p style="color: red;">Error: ${err.message}</p>`; }
    }

    hideFileList() {
        this.uiElements.modal.style.display = 'none';
    }

    _updateFileListUI(files) {
        this.uiElements.fileListContainer.innerHTML = files.length === 0
            ? '<p>No layout files found.</p>'
            : files.map(file => `
                <div class="file-item" data-file-id="${file.id}">
                    <span class="file-name">${file.name}</span>
                    <span class="file-modified-time">${new Date(file.modifiedTime).toLocaleString()}</span>
                </div>`).join('');
    }

    async loadFile(fileId) {
        try {
            this.hideFileList();
            const layoutData = await this.driveService.loadFileContent(fileId);
            this.workspace.clearLayout();
            this.objectManager.clearAllObjects();
            this.workspace.applyLayout(layoutData);
            this.objectManager.applyLayout(layoutData);
        } catch (err) { alert(`Failed to load file: ${err.message}`); }
    }

    async saveLayout() {
        if (!this.authService.isSignedIn()) return;
        let fileName = prompt("Enter file name:", "MyLayout.json");
        if (!fileName) return;
        if (!fileName.toLowerCase().endsWith('.json')) fileName += '.json';
        
        const deskData = this.workspace.getCurrentLayoutData();
        if (!deskData) { alert("Nothing to save."); return; }
        const objectsData = this.objectManager.getObjectsData();
        const layoutData = { ...deskData, objects: objectsData };

        try {
            await this.driveService.saveFile(fileName, layoutData);
            alert(`'${fileName}' saved successfully!`);
        } catch (err) { alert(`Error saving file: ${err.message}`); }
    }
}