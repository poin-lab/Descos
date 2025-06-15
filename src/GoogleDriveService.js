// 다른 서비스를 직접 import하지 않습니다. main.js가 연결해줍니다.
// import { authService } from './GoogleAuthService.js';

const APP_FOLDER_NAME = 'DescoApp';
let appFolderId = null;

// 클래스 자체를 export 합니다.
export class GoogleDriveService {
    constructor() {
        this.authService = null; // 생성자에서는 null로 초기화
    }

    // init 메서드를 통해 외부에서 authService 인스턴스를 주입받습니다.
    init(authService) {
        this.authService = authService;
    }

    // _findOrCreateAppFolder: "DescoApp" 폴더를 찾거나, 없으면 새로 생성하고 ID를 반환합니다.
    async _findOrCreateAppFolder() {
        if (appFolderId) return appFolderId;
        // 주입받은 this.authService를 사용합니다.
        if (!this.authService.isSignedIn()) throw new Error("Not signed in.");
        
        try {
            const response = await gapi.client.drive.files.list({
                q: `name='${APP_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
                fields: 'files(id)',
                spaces: 'drive',
            });
            
            const files = response.result.files;
            if (files && files.length > 0) {
                appFolderId = files[0].id;
                return appFolderId;
            } else {
                const fileMetadata = { name: APP_FOLDER_NAME, mimeType: 'application/vnd.google-apps.folder' };
                const createResponse = await gapi.client.drive.files.create({ resource: fileMetadata, fields: 'id' });
                appFolderId = createResponse.result.id;
                return appFolderId;
            }
        } catch (err) {
            console.error("Folder access error:", err);
            throw new Error(`Could not access app folder: ${err.result?.error?.message}`);
        }
    }

    // listFiles: "DescoApp" 폴더 안의 파일 목록을 가져옵니다.
    async listFiles() {
        const folderId = await this._findOrCreateAppFolder();
        const response = await gapi.client.drive.files.list({
            q: `'${folderId}' in parents and trashed=false and mimeType='application/json'`,
            fields: "files(id, name, modifiedTime)",
            orderBy: 'modifiedTime desc'
        });
        return response.result.files || [];
    }

    // loadFileContent: 특정 파일의 내용을 가져옵니다.
    async loadFileContent(fileId) {
        try {
            const response = await gapi.client.drive.files.get({
                fileId: fileId,
                alt: 'media'
            });
            return response.result;
        } catch (err) {
            console.error("File load error:", err);
            throw new Error(`Could not load file: ${err.result?.error?.message}`);
        }
    }

    // saveFile: 파일을 생성하거나 업데이트합니다.
    async saveFile(fileName, content) {
        const folderId = await this._findOrCreateAppFolder();
        const fileContent = JSON.stringify(content, null, 2);
        
        const searchResponse = await gapi.client.drive.files.list({
            q: `name='${fileName}' and '${folderId}' in parents and trashed=false`,
            fields: 'files(id)'
        });
        
        let fileId = searchResponse.result.files?.[0]?.id;
        
        const metadata = { name: fileName, mimeType: 'application/json' };
        if (!fileId) {
             metadata.parents = [folderId];
        }

        const boundary = '-------314159265358979323846';
        const delimiter = "\r\n--" + boundary + "\r\n";
        const close_delim = "\r\n--" + boundary + "--";
        
        const multipartRequestBody =
            delimiter + 'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
            JSON.stringify(metadata) +
            delimiter + 'Content-Type: application/json\r\n\r\n' +
            fileContent +
            close_delim;

        const request = gapi.client.request({
            path: `/upload/drive/v3/files${fileId ? `/${fileId}` : ''}`,
            method: fileId ? 'PATCH' : 'POST',
            params: { uploadType: 'multipart' },
            headers: { 'Content-Type': 'multipart/related; boundary="' + boundary + '"' },
            body: multipartRequestBody
        });
        
        try {
            return await request;
        } catch (err) {
            console.error("File save error:", err);
            throw new Error(`Error saving file: ${err.result?.error?.message}`);
        }
    }
}