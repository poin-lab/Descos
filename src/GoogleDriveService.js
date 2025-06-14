// src/services/GoogleDriveService.js

// 다른 모듈(GoogleAuthService)에서 isSignedIn 함수를 가져와 사용합니다.
import { authService } from './GoogleAuthService.js';

// 앱이 사용할 전용 폴더의 이름을 상수로 정의합니다.
const APP_FOLDER_NAME = 'DescoApp';
// 찾거나 생성한 폴더의 ID를 저장할 변수입니다. 한 번 찾으면 다시 검색하지 않도록 캐싱 역할을 합니다.
let appFolderId = null;

// GoogleDriveService 클래스는 Google Drive 파일 생성, 읽기, 목록 조회 등 모든 API 호출을 담당합니다.
class GoogleDriveService {
    // _findOrCreateAppFolder: "DescoApp" 폴더를 찾거나, 없으면 새로 생성하고 ID를 반환하는 비공개 헬퍼 메서드
    async _findOrCreateAppFolder() {
        // 이미 폴더 ID를 알고 있다면, 즉시 반환하여 불필요한 API 호출을 줄입니다.
        if (appFolderId) return appFolderId;
        // 로그인이 되어 있지 않으면, 오류를 발생시켜 작업을 중단합니다.
        if (!authService.isSignedIn()) throw new Error("Not signed in.");
        
        try {
            // 1. "DescoApp" 이름의 폴더가 있는지 검색합니다.
            const response = await gapi.client.drive.files.list({
                q: `name='${APP_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
                fields: 'files(id)', // 필요한 정보(id)만 요청하여 효율성을 높입니다.
                spaces: 'drive',
            });
            
            const files = response.result.files;
            if (files && files.length > 0) {
                // 2. 폴더가 존재하면: ID를 appFolderId 변수에 저장하고 반환합니다.
                appFolderId = files[0].id;
                return appFolderId;
            } else {
                // 3. 폴더가 없으면: 새로 생성합니다.
                const fileMetadata = { name: APP_FOLDER_NAME, mimeType: 'application/vnd.google-apps.folder' };
                const createResponse = await gapi.client.drive.files.create({ resource: fileMetadata, fields: 'id' });
                appFolderId = createResponse.result.id;
                return appFolderId;
            }
        } catch (err) {
            // 폴더를 찾거나 생성하는 과정에서 오류가 발생하면, 오류를 던져 호출한 쪽에서 처리하도록 합니다.
            throw new Error(`Could not access app folder: ${err.result?.error?.message}`);
        }
    }

    // listFiles: "DescoApp" 폴더 안의 파일 목록을 가져오는 메서드
    async listFiles() {
        const folderId = await this._findOrCreateAppFolder(); // 먼저 폴더 ID를 확보합니다.
        const response = await gapi.client.drive.files.list({
            // 쿼리(q): 'folderId'를 부모로 가지고 있고, 휴지통에 없는 파일만 검색합니다.
            q: `'${folderId}' in parents and trashed=false`,
            fields: "files(id, name, modifiedTime, mimeType)", // 목록에 표시할 파일 정보들을 요청합니다.
            orderBy: 'modifiedTime desc' // 최근 수정된 파일이 위로 오도록 정렬합니다.
        });
        // 결과에서 폴더 자체는 제외하고 파일만 반환합니다.
        return (response.result.files || []).filter(file => file.mimeType !== 'application/vnd.google-apps.folder');
    }

    // loadFileContent: 특정 파일 ID를 사용하여 파일의 실제 내용을 가져오는 메서드
    async loadFileContent(fileId) {
        try {
            const response = await gapi.client.drive.files.get({
                fileId: fileId,
                alt: 'media' // 'media' 파라미터는 파일의 메타데이터가 아닌 내용(body)을 요청한다는 의미입니다.
            });
            return response.result; // JSON 형식의 파일 내용은 객체로 파싱되어 반환됩니다.
        } catch (err) {
            throw new Error(`Could not load file: ${err.result?.error?.message}`);
        }
    }

    // saveFile: 파일을 생성하거나 기존 파일을 업데이트하는 메서드
    async saveFile(fileName, content) {
        const folderId = await this._findOrCreateAppFolder(); // 먼저 폴더 ID를 확보합니다.
        const fileContent = JSON.stringify(content, null, 2); // 저장할 객체를 보기 좋은 형태의 문자열로 변환합니다.
        
        // 1. 같은 이름의 파일이 이미 "DescoApp" 폴더에 있는지 검색합니다.
        const searchResponse = await gapi.client.drive.files.list({
            q: `name='${fileName}' and '${folderId}' in parents and trashed=false`,
            fields: 'files(id)'
        });
        
        let fileId = (searchResponse.result.files && searchResponse.result.files.length > 0) ? searchResponse.result.files[0].id : null;

        if (fileId) {
            // --- 파일이 존재하면: 내용만 업데이트(PATCH)합니다 ---
            return await gapi.client.request({
                path: `/upload/drive/v3/files/${fileId}`,
                method: 'PATCH',
                params: { uploadType: 'media' }, // 'media'는 파일 내용만 업로드한다는 의미입니다.
                headers: { 'Content-Type': 'application/json' },
                body: fileContent
            });
        } else {
            // --- 파일이 없으면: 2단계 방식으로 새로 생성합니다 ---
            // 1단계: 올바른 이름과 부모 폴더로 빈 파일(껍데기)을 먼저 생성합니다.
            const metadata = { name: fileName, mimeType: 'application/json', parents: [folderId] };
            const createResponse = await gapi.client.drive.files.create({
                resource: metadata,
                fields: 'id, name' // 생성된 파일의 ID와 이름을 응답으로 받습니다.
            });

            // 2단계: 1단계에서 받은 새 파일의 ID를 사용하여 파일 내용을 업데이트(업로드)합니다.
            return await gapi.client.request({
                path: `/upload/drive/v3/files/${createResponse.result.id}`,
                method: 'PATCH',
                params: { uploadType: 'media' },
                headers: { 'Content-Type': 'application/json' },
                body: fileContent
            });
        }
    }
}

// 싱글턴 패턴: 앱 전체에서 단 하나의 GoogleDriveService 인스턴스만 사용하도록 함
export const driveService = new GoogleDriveService();