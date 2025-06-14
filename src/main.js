// src/main.js
import { authService } from './GoogleAuthService.js';
import { uiManager } from './UiManager.js';
import { workspace } from './WorkspaceManager.js';

window.onload = () => {
    workspace.init();
    uiManager.init();
    authService.init((isSignedIn) => {
        uiManager.updateAuthStatus(isSignedIn);
    });
};