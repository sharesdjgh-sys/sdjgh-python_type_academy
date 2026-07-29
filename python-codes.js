// ===============================
// Python Type Academy - 파일 기반 코드 관리 시스템 v3.0
// ===============================

// 코드 카테고리 설명
const CategoryDescriptions = {
    basic: '기본 문법',
    variables: '변수 사용',
    strings: '문자열 처리',
    arithmetic: '수치 연산',
    data_structures: '자료구조',
    conditionals: '조건문',
    loops: '반복문',
    functions: '함수',
    error_handling: '예외 처리',
    oop: '객체지향 프로그래밍',
    functional: '함수형 프로그래밍',
    generators: '제너레이터',
    decorators: '데코레이터',
    context_managers: '컨텍스트 매니저',
    practical: '실무 활용',
    games: '게임 개발',
    web: '웹 개발',
    data_science: '데이터 사이언스',
    api: 'API 개발',
    file_io: '파일 입출력',
    algorithms: '알고리즘',
    data_analysis: '데이터 분석',
    scientific_computing: '과학 계산',
    machine_learning: '머신러닝',
    data_cleaning: '데이터 정제',
    data_visualization: '데이터 시각화'
};

// 난이도별 설명
const DifficultyDescriptions = {
    beginner: {
        short: '기본 문법을 빠르게 익히는 짧은 코드',
        medium: '여러 문법을 조합한 중간 길이 코드',
        long: '실전에서 사용할 수 있는 완성된 프로그램'
    },
    intermediate: {
        short: '조건문, 반복문, 함수의 기본 사용법',
        medium: '다양한 문법을 활용한 실용적 코드',
        long: '실제 프로젝트에서 사용할 수 있는 시스템'
    },
    advanced: {
        short: '데이터 도구의 핵심 사용법',
        medium: '분석과 모델링을 연결한 실전 코드',
        long: '시각화를 포함한 완성형 데이터 프로젝트'
    }
};

// ===============================
// 파일 기반 코드 관리를 위한 변수들
// ===============================
let codesMetadata = null;
const codeCache = new Map();

// ===============================
// 파일 기반 코드 관리 클래스
// ===============================

// 메타데이터 로드 함수
async function loadMetadata() {
    if (codesMetadata) {
        console.log('📋 메타데이터 캐시에서 반환');
        return codesMetadata;
    }

    try {
        console.log('📁 메타데이터 파일 로드 중...');
        console.log('📍 현재 URL:', window.location.href);
        console.log('📍 요청 URL: python-codes/codes-metadata.json');
        
        const response = await fetch('python-codes/codes-metadata.json');
        
        console.log('📡 Response 상태:', response.status, response.statusText);
        console.log('📡 Response URL:', response.url);
        
        if (!response.ok) {
            throw new Error(`메타데이터 로드 실패: ${response.status} ${response.statusText}`);
        }

        const text = await response.text();
        console.log('📄 Raw response length:', text.length);
        console.log('📄 First 100 chars:', text.substring(0, 100));
        
        codesMetadata = JSON.parse(text);
        console.log('✅ 메타데이터 로드 완료:', Object.keys(codesMetadata));
        console.log('📊 구조:', {
            beginner: codesMetadata.beginner ? Object.keys(codesMetadata.beginner) : 'undefined',
            intermediate: codesMetadata.intermediate ? Object.keys(codesMetadata.intermediate) : 'undefined',
            advanced: codesMetadata.advanced ? Object.keys(codesMetadata.advanced) : 'undefined'
        });
        
        return codesMetadata;
    } catch (error) {
        console.error('❌ 메타데이터 로드 실패:', error);
        console.error('❌ Error stack:', error.stack);
        
        // 실패한 빈 데이터를 캐시하지 않아 다음 요청에서 다시 시도할 수 있게 합니다.
        codesMetadata = null;
        throw error;
    }
}

// 파이썬 코드 파일 읽기 함수
async function loadCodeFromFile(filePath) {
    try {
        // 캐시 확인
        if (codeCache.has(filePath)) {
            return codeCache.get(filePath);
        }

        console.log(`📄 코드 파일 로드 중: ${filePath}`);
        const response = await fetch(`python-codes/${filePath}`);
        
        if (!response.ok) {
            throw new Error(`코드 파일 로드 실패: ${response.status} ${response.statusText}`);
        }

        const code = await response.text();
        const normalizedCode = code.trim();
        
        // 화면 표시와 캐시 반환 결과가 항상 같도록 정규화된 코드를 저장
        codeCache.set(filePath, normalizedCode);

        return normalizedCode;
    } catch (error) {
        console.error(`❌ 코드 파일 로드 실패 (${filePath}):`, error);
        throw error;
    }
}

// 메타데이터와 코드를 결합한 완전한 코드 객체 생성
async function createCompleteCodeObject(metadataItem) {
    try {
        const code = await loadCodeFromFile(metadataItem.file);
        return {
            ...metadataItem,
            code: code
        };
    } catch (error) {
        console.error('❌ 완전한 코드 객체 생성 실패:', error);
        throw error;
    }
}

class CodeManager {
    constructor() {
        console.log('🔧 CodeManager 초기화 완료 (파일 기반 방식)');
    }

    // 랜덤 코드 가져오기
    async getRandomCode(difficulty, length, excludeId = null) {
        try {
            const metadata = await loadMetadata();
            const codeList = metadata[difficulty]?.[length];
            
            if (!codeList || codeList.length === 0) {
                throw new Error(`잘못된 난이도 또는 길이: ${difficulty}/${length}`);
            }

            const availableCodes = excludeId 
                ? codeList.filter(item => item.id !== excludeId)
                : codeList;

            if (availableCodes.length === 0) {
                throw new Error('사용 가능한 코드가 없습니다.');
            }

            const randomIndex = Math.floor(Math.random() * availableCodes.length);
            const selectedMetadata = availableCodes[randomIndex];
            
            return await createCompleteCodeObject(selectedMetadata);
        } catch (error) {
            console.error('❌ getRandomCode 실패:', error);
            throw error;
        }
    }

    // 카테고리별 랜덤 코드 가져오기
    async getRandomCodeByCategory(difficulty, length, category, excludeId = null) {
        try {
            const metadata = await loadMetadata();
            const codeList = metadata[difficulty]?.[length];
            
            if (!codeList) {
                throw new Error(`잘못된 난이도 또는 길이: ${difficulty}/${length}`);
            }

            const filteredCodes = codeList.filter(item => 
                item.category === category && 
                (excludeId ? item.id !== excludeId : true)
            );

            if (filteredCodes.length === 0) {
                throw new Error(`${category} 카테고리에 사용 가능한 코드가 없습니다.`);
            }

            const randomIndex = Math.floor(Math.random() * filteredCodes.length);
            const selectedMetadata = filteredCodes[randomIndex];
            
            return await createCompleteCodeObject(selectedMetadata);
        } catch (error) {
            console.error('❌ getRandomCodeByCategory 실패:', error);
            throw error;
        }
    }

    // 같은 레벨의 랜덤 코드 가져오기
    async getRandomCodeBySameLevel(difficulty, length, levelGroup, excludeId = null) {
        try {
            const metadata = await loadMetadata();
            const codeList = metadata[difficulty]?.[length];
            
            if (!codeList) {
                throw new Error(`잘못된 난이도 또는 길이: ${difficulty}/${length}`);
            }

            const filteredCodes = codeList.filter(item => 
                item.levelGroup === levelGroup && 
                (excludeId ? item.id !== excludeId : true)
            );

            if (filteredCodes.length === 0) {
                throw new Error(`레벨 ${levelGroup}에 사용 가능한 코드가 없습니다.`);
            }

            const randomIndex = Math.floor(Math.random() * filteredCodes.length);
            const selectedMetadata = filteredCodes[randomIndex];
            
            return await createCompleteCodeObject(selectedMetadata);
        } catch (error) {
            console.error('❌ getRandomCodeBySameLevel 실패:', error);
            throw error;
        }
    }

    // ID로 코드 찾기
    async findCodeById(codeId) {
        try {
            const metadata = await loadMetadata();
            
            for (const difficulty in metadata) {
                for (const length in metadata[difficulty]) {
                    const codeList = metadata[difficulty][length];
                    const foundItem = codeList.find(item => item.id === codeId);
                    if (foundItem) {
                        return await createCompleteCodeObject(foundItem);
                    }
                }
            }
            
            throw new Error(`코드 ID를 찾을 수 없습니다: ${codeId}`);
        } catch (error) {
            console.error('❌ findCodeById 실패:', error);
            throw error;
        }
    }

    // 전체 코드 개수 가져오기
    async getTotalCodeCount(difficulty) {
        try {
            const metadata = await loadMetadata();
            const difficultyData = metadata[difficulty];
            
            if (!difficultyData) {
                return 0;
            }

            let totalCount = 0;
            for (const length in difficultyData) {
                totalCount += difficultyData[length].length;
            }
            
            return totalCount;
        } catch (error) {
            console.error('❌ getTotalCodeCount 실패:', error);
            return 0;
        }
    }

    // 완료된 코드 개수 가져오기
    async getCompletedCodeCount(difficulty, progress) {
        try {
            const totalCount = await this.getTotalCodeCount(difficulty);
            const progressObj = JSON.parse(progress || '{}');
            const completedCount = Object.keys(progressObj).filter(key => 
                key.startsWith(difficulty.charAt(0))
            ).length;
            
            return Math.min(completedCount, totalCount);
        } catch (error) {
            console.error('❌ getCompletedCodeCount 실패:', error);
            return 0;
        }
    }

    // 코드 검색
    async searchCodes(query, difficulty = null) {
        try {
            const metadata = await loadMetadata();
            const results = [];
            const searchLower = query.toLowerCase();
            
            for (const diff in metadata) {
                if (difficulty && diff !== difficulty) continue;
                
                for (const length in metadata[diff]) {
                    const codeList = metadata[diff][length];
                    for (const item of codeList) {
                        if (item.title.toLowerCase().includes(searchLower) || 
                            item.description.toLowerCase().includes(searchLower)) {
                            results.push({
                                ...item,
                                difficulty: diff,
                                length: length
                            });
                        }
                    }
                }
            }
            
            return results;
        } catch (error) {
            console.error('❌ searchCodes 실패:', error);
            return [];
        }
    }

    // 시스템 현황
    async getSystemStatus() {
        try {
            const metadata = await loadMetadata();
            let totalCodes = 0;
            
            for (const difficulty in metadata) {
                for (const length in metadata[difficulty]) {
                    totalCodes += metadata[difficulty][length].length;
                }
            }

            return {
                totalCodes,
                loadingMethod: 'file-based',
                cachedFiles: codeCache.size,
                memoryUsage: 'dynamic',
                status: 'OK'
            };
        } catch (error) {
            return {
                status: 'ERROR',
                error: error.message
            };
        }
    }
}

// ===============================
// 글로벌 인스턴스 및 객체 생성
// ===============================
const codeManager = new CodeManager();

// 전역 객체로 노출 (script.js에서 참조)
window.codeManager = codeManager;
window.DifficultyDescriptions = DifficultyDescriptions;
window.CategoryDescriptions = CategoryDescriptions;

// 안전한 접근 함수들을 전역으로 노출
window.ensureCodeSystemInitialized = ensureCodeSystemInitialized;
window.loadMetadata = loadMetadata;

// 초기화 상태 확인 함수
window.isCodeSystemReady = () => isCodeSystemInitialized;

// ===============================
// 기존 함수들 (하위 호환성 유지) - 안전한 초기화 포함
// ===============================
async function getRandomCode(difficulty, length, excludeId = null) {
    await ensureCodeSystemInitialized();
    return await codeManager.getRandomCode(difficulty, length, excludeId);
}

async function getRandomCodeByCategory(difficulty, length, category, excludeId = null) {
    await ensureCodeSystemInitialized();
    return await codeManager.getRandomCodeByCategory(difficulty, length, category, excludeId);
}

async function getRandomCodeBySameLevel(difficulty, length, levelGroup, excludeId = null) {
    await ensureCodeSystemInitialized();
    return await codeManager.getRandomCodeBySameLevel(difficulty, length, levelGroup, excludeId);
}

async function findCodeById(codeId) {
    await ensureCodeSystemInitialized();
    return await codeManager.findCodeById(codeId);
}

async function getTotalCodeCount(difficulty) {
    await ensureCodeSystemInitialized();
    return await codeManager.getTotalCodeCount(difficulty);
}

async function getCompletedCodeCount(difficulty, progress) {
    await ensureCodeSystemInitialized();
    return await codeManager.getCompletedCodeCount(difficulty, progress);
}

async function searchCodes(query, difficulty = null) {
    await ensureCodeSystemInitialized();
    return await codeManager.searchCodes(query, difficulty);
}

// ===============================
// 초기화 함수 (파일 기반 시스템)
// ===============================
async function initializeCodeSystem() {
    console.log('🚀 Python Type Academy 파일 기반 코드 시스템 초기화 중...');
    
    try {
        // 메타데이터 미리 로드
        await loadMetadata();
        const status = await codeManager.getSystemStatus();
        console.log('✅ 파일 기반 코드 시스템 초기화 완료:', status);
        return status;
    } catch (error) {
        console.error('❌ 코드 시스템 초기화 실패:', error);
        throw error;
    }
}

// 초기화 상태 관리
let isCodeSystemInitialized = false;
let initializationPromise = null;

// 안전한 초기화 함수
async function ensureCodeSystemInitialized() {
    if (isCodeSystemInitialized) {
        return true;
    }
    
    if (initializationPromise) {
        await initializationPromise;
        return isCodeSystemInitialized;
    }
    
    initializationPromise = initializeCodeSystem()
        .then(() => {
            isCodeSystemInitialized = true;
            console.log('✅ 코드 시스템 초기화 완료 확인');
            return true;
        })
        .catch((error) => {
            console.error('❌ 코드 시스템 초기화 실패:', error);
            isCodeSystemInitialized = false;
            initializationPromise = null;
            return false;
        });
    
    return await initializationPromise;
}

// 페이지 로드시 자동 초기화
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🔄 DOM 로드 완료, 코드 시스템 초기화 시작');
    await ensureCodeSystemInitialized();
});

// 즉시 초기화도 시도 (이미 DOM이 로드된 경우)
if (document.readyState === 'loading') {
    console.log('📋 DOM 로딩 중...');
} else {
    console.log('🔄 DOM 이미 로드됨, 즉시 초기화 시작');
    ensureCodeSystemInitialized();
}

console.log('📚 Python Type Academy 파일 기반 코드 시스템 v3.0 로드됨');
