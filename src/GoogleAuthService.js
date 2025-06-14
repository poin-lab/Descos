// src/google-auth.js

// API 키와 클라이언트 ID를 여기에 입력합니다.
const CLIENT_ID = '72256628269-4pkhhcjlcv378rtkdnkfa4pfas4v61ph.apps.googleusercontent.com';
const API_KEY = 'AIzaSyBwEVt_Ar8ckUxdZ2rTo7skmyOJZ-IhV4A';
const SCOPES = 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.profile';


// GoogleAuthService 클래스는 Google 로그인/로그아웃, 토큰 관리 등 모든 인증 로직을 담당합니다.
class GoogleAuthService {
    // constructor: 클래스 인스턴스가 생성될 때 가장 먼저 호출됩니다.
    constructor() {
        // 클래스의 속성들을 초기화합니다.
        this.tokenClient = null; // Google 인증 토큰을 관리할 클라이언트 객체
        this.onStatusChangeCallback = () => {}; // 로그인 상태가 변경될 때 호출할 외부 콜백 함수
        this.isGapiInitialized = false; // Google API(gapi) 라이브러리 초기화 완료 여부
        this.isGisInitialized = false;  // Google Identity Services(gis) 라이브러리 초기화 완료 여부
        
        // 인스턴스가 생성되자마자 필요한 Google 스크립트들의 로드를 시작합니다.
        this._loadScripts();
    }

    // init: 외부(main.js)에서 이 서비스를 초기화할 때 호출하는 메서드
    // 로그인 상태가 변경될 때마다 알려줄 콜백 함수를 등록하는 역할을 합니다.
    init(callback) {
        this.onStatusChangeCallback = callback;
    }

    // _loadScripts: Google의 외부 JavaScript 라이브러리들을 동적으로 생성하여 페이지에 추가합니다.
    _loadScripts() {
        // 1. GAPI (Google API) 라이브러리 로드
        const gapiScript = document.createElement('script');
        gapiScript.src = 'https://apis.google.com/js/api.js';
        // 스크립트 로드가 완료되면 _initializeGapiClient 메서드를 호출합니다.
        gapiScript.onload = () => gapi.load('client', () => this._initializeGapiClient());
        document.body.appendChild(gapiScript);

        // 2. GIS (Google Identity Services) 라이브러리 로드
        const gisScript = document.createElement('script');
        gisScript.src = 'https://accounts.google.com/gsi/client';
        // 스크립트 로드가 완료되면 _initializeGisClient 메서드를 호출합니다.
        gisScript.onload = () => this._initializeGisClient();
        document.body.appendChild(gisScript);
    }

    // _initializeGapiClient: GAPI 라이브러리를 초기화하는 비공개 헬퍼 메서드
    async _initializeGapiClient() {
        // 우리 앱의 API 키와 사용할 API(여기서는 drive v3)를 지정하여 초기화합니다.
        await gapi.client.init({
            apiKey: API_KEY,
            discoveryDocs: [
                "https://www.googleapis.com/discovery/v1/apis/drive/v3/rest",
                "https://www.googleapis.com/discovery/v1/apis/people/v1/rest" // People API 추가
            ]
        });
        this.isGapiInitialized = true; // gapi 초기화 완료 플래그 설정
        // 만약 gis도 이미 초기화되었다면, 로그인 상태 변경 콜백을 호출합니다.
        if (this.isGisInitialized) this.onStatusChangeCallback(this.isSignedIn());
    }

    // _initializeGisClient: GIS 라이브러리를 초기화하는 비공개 헬퍼 메서드
    _initializeGisClient() {
        // 우리 앱의 클라이언트 ID와 요청할 권한(SCOPES)을 지정하여 토큰 클라이언트를 생성합니다.
        this.tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: CLIENT_ID,
            scope: SCOPES,
            // 인증 토큰을 성공적으로 받아오면 이 콜백 함수가 실행됩니다.
            callback: (tokenResponse) => {
                if (tokenResponse.error) console.error("Token Error:", tokenResponse);
                // 토큰 상태가 변경되었으므로, 외부 콜백을 호출하여 UI를 업데이트하도록 알립니다.
                this.onStatusChangeCallback(this.isSignedIn());
            },
        });
        this.isGisInitialized = true; // gis 초기화 완료 플래그 설정
        // 만약 gapi도 이미 초기화되었다면, 로그인 상태 변경 콜백을 호출합니다.
        if (this.isGapiInitialized) this.onStatusChangeCallback(this.isSignedIn());
    }

    // signIn: 로그인을 시작하는 공개 메서드
    signIn() {
        if (!this.tokenClient) return; // 아직 초기화되지 않았으면 아무것도 하지 않음
        // 토큰이 없으면(첫 로그인) 동의 화면을 띄우고, 있으면 조용히 토큰만 갱신합니다.
        this.tokenClient.requestAccessToken({ prompt: this.isSignedIn() ? '' : 'consent' });
    }

    // signOut: 로그아웃을 처리하는 공개 메서드
    signOut() {
        const token = gapi.client.getToken();
        if (token) {
            // 현재 발급된 토큰을 무효화하도록 Google에 요청합니다.
            google.accounts.oauth2.revoke(token.access_token, () => {
                gapi.client.setToken(''); // gapi 라이브러리에서도 토큰을 비웁니다.
                // 로그아웃 되었으므로, 외부 콜백을 호출하여 UI를 업데이트하도록 알립니다.
                this.onStatusChangeCallback(this.isSignedIn());
            });
        }
    }

    // isSignedIn: 현재 로그인 상태인지 여부를 반환하는 공개 메서드
    isSignedIn() {
        // gapi 클라이언트에 유효한 토큰이 저장되어 있는지 여부로 판단합니다.
        return gapi.client?.getToken() !== null;
    }


    async getUserName() {
        // 로그인이 되어있지 않거나, gapi 클라이언트가 준비되지 않았으면 null 반환
        if (!this.isSignedIn() || !gapi.client.people) {
            return null;
        }
        try {
            const response = await gapi.client.people.people.get({
                resourceName: 'people/me',
                personFields: 'names', // 요청할 필드: 이름
            });
            // 이름 정보가 있으면 표시 이름(displayName)을 반환, 없으면 null 반환
            return response.result.names?.[0]?.displayName || null;
        } catch (err) {
            console.error("Error fetching user name:", err);
            return null;
        }
    }

}

// 싱글턴(Singleton) 패턴: 앱 전체에서 단 하나의 GoogleAuthService 인스턴스만 생성하고 공유하도록 함
export const authService = new GoogleAuthService();