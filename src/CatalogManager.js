// 카탈로그에 표시될 아이템 목록 데이터입니다.
// 이 배열에 새로운 아이템 객체를 추가하기만 하면 카탈로그가 자동으로 확장됩니다.
const CATALOG_ITEMS = [
    {
        id: 'default-cube',
        name: 'Cube',
        type: 'box', // 모양 유형 (나중에 다른 모양 추가 시 사용 가능)
        size: { w: 0.05, h: 0.05, d: 0.05 }, // 기본 크기 (m 단위)
        color: 0x4a86e8, // 기본 색상 (파란색)
    },
    {
        id: 'monitor-27inch',
        name: 'Monitor',
        type: 'box',
        size: { w: 0.60, h: 0.35, d: 0.05 },
        color: 0x222222, // 어두운 회색
    },
    {
        id: 'book-vertical',
        name: 'Book',
        type: 'box',
        size: { w: 0.05, h: 0.22, d: 0.15 },
        color: 0xdddddd, // 밝은 회색
    },
    {
        id: 'mouse-pad',
        name: 'Mouse Pad',
        type: 'box',
        size: { w: 0.25, h: 0.005, d: 0.20 }, // 매우 얇게
        color: 0x333333,
    }
];

// CatalogManager 클래스는 카탈로그 데이터와 상태를 관리합니다.
export class CatalogManager {
    constructor() {
        this.items = CATALOG_ITEMS;
        this.selectedItemId = null; // 현재 선택된 아이템의 ID
    }

    // 카탈로그의 모든 아이템 목록을 반환합니다.
    getItems() {
        return this.items;
    }

    // 특정 ID에 해당하는 아이템 정보를 찾아 반환합니다.
    getItemInfo(itemId) {
        return this.items.find(item => item.id === itemId);
    }

    // 사용자가 선택한 아이템의 ID를 클래스 내부에 저장합니다.
    setSelectedItemId(itemId) {
        this.selectedItemId = itemId;
    }

    // 현재 선택된 아이템의 전체 정보를 반환합니다. 선택된 아이템이 없으면 null을 반환합니다.
    getSelectedItemInfo() {
        if (!this.selectedItemId) return null;
        return this.getItemInfo(this.selectedItemId);
    }
}