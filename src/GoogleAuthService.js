// src/google-auth.js

// API 키와 클라이언트 ID를 여기에 입력합니다.
const CLIENT_ID = '72256628269-4pkhhcjlcv378rtkdnkfa4pfas4v61ph.apps.googleusercontent.com';
const API_KEY = 'AIzaSyBwEVt_Ar8ckUxdZ2rTo7skmyOJZ-IhV4A';
const SCOPES = 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.profile';


// src/services/GoogleAuthService.js

// 이 파일 상단에 CLIENT_ID, API_KEY, SCOPES 상수가 선언되어 있다고 가정합니다.
// const CLIENT_ID = '...';
// const API_KEY = '...';
// const SCOPES = '...';

// 클래스 이름은 대문자로 시작하는 것이 표준입니다.
export class GoogleAuthService {
    // constructor: 클래스 인스턴스가 생성될 때 호출됩니다.
    constructor() {
        // 클래스의 속성들을 초기화합니다.
        this.tokenClient = null;
        this.onStatusChangeCallback = () => {};
        this.isGapiInitialized = false;
        this.isGisInitialized = false;
    }

    // init: 외부(main.js)에서 이 서비스를 초기화할 때 호출하는 메서드
    init(callback) {
        this.onStatusChangeCallback = callback;
        this._loadScripts();
    }

    // _loadScripts: Google의 외부 JavaScript 라이브러리들을 동적으로 생성하여 페이지에 추가합니다.
    _loadScripts() {
        const gapiScript = document.createElement('script');
        gapiScript.src = 'https://apis.google.com/js/api.js';
        gapiScript.async = true;
        gapiScript.defer = true;
        gapiScript.onload = () => gapi.load('client', () => this._initializeGapiClient());
        document.body.appendChild(gapiScript);

        const gisScript = document.createElement('script');
        gisScript.src = 'https://accounts.google.com/gsi/client';
        gisScript.async = true;
        gisScript.defer = true;
        gisScript.onload = () => this._initializeGisClient();
        document.body.appendChild(gisScript);
    }

    // _initializeGapiClient: GAPI 라이브러리를 초기화하는 비공개 헬퍼 메서드
    async _initializeGapiClient() {
        await gapi.client.init({
            apiKey: API_KEY,
            discoveryDocs: [
                "https://www.googleapis.com/discovery/v1/apis/drive/v3/rest",
                "https://www.googleapis.com/discovery/v1/apis/people/v1/rest"
            ]
        });
        this.isGapiInitialized = true;
        if (this.isGisInitialized) this.onStatusChangeCallback(this.isSignedIn());
    }

    // _initializeGisClient: GIS 라이브러리를 초기화하는 비공개 헬퍼 메서드
    _initializeGisClient() {
        this.tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: CLIENT_ID,
            scope: SCOPES,
            callback: (tokenResponse) => {
                if (tokenResponse.error) console.error("Token Error:", tokenResponse);
                this.onStatusChangeCallback(this.isSignedIn());
            },
        });
        this.isGisInitialized = true;
        if (this.isGapiInitialized) this.onStatusChangeCallback(this.isSignedIn());
    }

    // signIn: 로그인을 시작하는 공개 메서드
    signIn() {
        if (!this.tokenClient) return;
        this.tokenClient.requestAccessToken({ prompt: this.isSignedIn() ? '' : 'consent' });
    }

    // signOut: 로그아웃을 처리하는 공개 메서드
    signOut() {
        const token = gapi.client.getToken();
        if (token) {
            google.accounts.oauth2.revoke(token.access_token, () => {
                gapi.client.setToken('');
                this.onStatusChangeCallback(this.isSignedIn());
            });
        }
    }

    // isSignedIn: 현재 로그인 상태인지 여부를 반환하는 공개 메서드
    isSignedIn() {
        return !!(gapi.client && gapi.client.getToken());
    }

    // getUserName: 로그인된 사용자의 이름을 가져오는 공개 메서드
    async getUserName() {
        if (!this.isSignedIn() || !gapi.client.people) return null;
        try {
            const response = await gapi.client.people.people.get({
                resourceName: 'people/me',
                personFields: 'names',
            });
            return response.result.names?.[0]?.displayName || null;
        } catch (err) {
            console.error("Error fetching user name:", err);
            return null;
        }
    }
}