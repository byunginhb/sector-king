import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import path from 'path'
import fs from 'fs'
import * as schema from '../drizzle/schema'

const DB_PATH = path.join(process.cwd(), 'data', 'hegemony.db')

// Seed data based on project.md HEGEMONY_MAP_DATA
const CATEGORIES = [
  { id: 'computing', name: '컴퓨터', nameEn: 'Computing', order: 1 },
  { id: 'internet', name: '인터넷', nameEn: 'Internet', order: 2 },
  { id: 'mobile', name: '모바일', nameEn: 'Mobile', order: 3 },
  { id: 'media', name: '미디어', nameEn: 'Media', order: 4 },
  { id: 'ai', name: 'AI', nameEn: 'AI', order: 5 },
  { id: 'future_tech', name: '미래기술', nameEn: 'Future Tech', order: 6 },
  { id: 'fintech', name: '핀테크', nameEn: 'Fintech', order: 7 },
  { id: 'healthcare', name: '헬스케어', nameEn: 'Healthcare', order: 8 },
  { id: 'entertainment', name: '엔터테인먼트', nameEn: 'Entertainment', order: 9 },
  { id: 'semiconductor', name: '반도체', nameEn: 'Semiconductor', order: 10 },
  { id: 'cloud', name: '클라우드', nameEn: 'Cloud', order: 11 },
  { id: 'cybersecurity', name: '사이버보안', nameEn: 'Cybersecurity', order: 12 },
  { id: 'ev_energy', name: '전기차/에너지', nameEn: 'EV & Energy', order: 13 },
]

const SECTORS = [
  // Computing
  { id: 'os', categoryId: 'computing', name: '컴퓨터 O.S.', nameEn: 'Computer OS', order: 1 },
  { id: 'cpu', categoryId: 'computing', name: 'CPU', nameEn: 'CPU', order: 2 },
  { id: 'ddr', categoryId: 'computing', name: 'DDR', nameEn: 'DDR Memory', order: 3 },

  // Internet
  { id: 'search', categoryId: 'internet', name: '검색', nameEn: 'Search', order: 1 },
  { id: 'online_ads', categoryId: 'internet', name: '온라인 광고 플랫폼', nameEn: 'Online Ads', order: 2 },
  { id: 'ecommerce', categoryId: 'internet', name: '온라인 커머스', nameEn: 'E-Commerce', order: 3 },

  // Mobile
  { id: 'mobile_os', categoryId: 'mobile', name: '모바일 O.S. & 마켓', nameEn: 'Mobile OS', order: 1 },
  { id: 'mobile_device', categoryId: 'mobile', name: '모바일 디바이스', nameEn: 'Mobile Devices', order: 2 },
  { id: 'ap', categoryId: 'mobile', name: 'A.P. (Application Processor)', nameEn: 'Application Processor', order: 3 },

  // Media
  { id: 'social_media', categoryId: 'media', name: '소셜미디어', nameEn: 'Social Media', order: 1 },
  { id: 'online_video', categoryId: 'media', name: '온라인 비디오', nameEn: 'Online Video', order: 2 },

  // AI
  { id: 'data_center', categoryId: 'ai', name: '데이터 센터', nameEn: 'Data Center', order: 1 },
  { id: 'ai_model', categoryId: 'ai', name: 'A.I. 모델', nameEn: 'AI Models', order: 2 },
  { id: 'gpu', categoryId: 'ai', name: 'GPU', nameEn: 'GPU', order: 3 },
  { id: 'asic', categoryId: 'ai', name: 'ASIC', nameEn: 'ASIC', order: 4 },
  { id: 'hbm', categoryId: 'ai', name: 'HBM', nameEn: 'High Bandwidth Memory', order: 5 },
  { id: 'blockchain', categoryId: 'ai', name: '블록체인', nameEn: 'Blockchain', order: 6 },
  { id: 'robot', categoryId: 'ai', name: '로봇', nameEn: 'Robotics', order: 7 },

  // Future Tech
  { id: 'autonomous', categoryId: 'future_tech', name: '자율주행', nameEn: 'Autonomous Driving', order: 1 },
  { id: 'quantum', categoryId: 'future_tech', name: '양자컴퓨터', nameEn: 'Quantum Computing', order: 2 },
  { id: 'space', categoryId: 'future_tech', name: '우주', nameEn: 'Space', order: 3 },

  // Fintech
  { id: 'payments', categoryId: 'fintech', name: '결제', nameEn: 'Payments', order: 1 },
  { id: 'digital_banking', categoryId: 'fintech', name: '디지털뱅킹', nameEn: 'Digital Banking', order: 2 },
  { id: 'crypto_exchange', categoryId: 'fintech', name: '암호화폐 거래소', nameEn: 'Crypto Exchange', order: 3 },
  { id: 'insurance_tech', categoryId: 'fintech', name: '보험테크', nameEn: 'InsurTech', order: 4 },

  // Healthcare
  { id: 'pharma', categoryId: 'healthcare', name: '제약', nameEn: 'Pharmaceuticals', order: 1 },
  { id: 'biotech', categoryId: 'healthcare', name: '바이오테크', nameEn: 'Biotech', order: 2 },
  { id: 'medical_devices', categoryId: 'healthcare', name: '의료기기', nameEn: 'Medical Devices', order: 3 },
  { id: 'digital_health', categoryId: 'healthcare', name: '디지털헬스', nameEn: 'Digital Health', order: 4 },

  // Entertainment
  { id: 'gaming', categoryId: 'entertainment', name: '게임', nameEn: 'Gaming', order: 1 },
  { id: 'streaming', categoryId: 'entertainment', name: '스트리밍', nameEn: 'Streaming', order: 2 },
  { id: 'vr_ar', categoryId: 'entertainment', name: 'VR/AR', nameEn: 'VR/AR', order: 3 },
  { id: 'esports', categoryId: 'entertainment', name: 'e스포츠', nameEn: 'eSports', order: 4 },

  // Semiconductor
  { id: 'foundry', categoryId: 'semiconductor', name: '파운드리', nameEn: 'Foundry', order: 1 },
  { id: 'memory', categoryId: 'semiconductor', name: '메모리', nameEn: 'Memory', order: 2 },
  { id: 'equipment', categoryId: 'semiconductor', name: '장비', nameEn: 'Equipment', order: 3 },
  { id: 'materials', categoryId: 'semiconductor', name: '소재', nameEn: 'Materials', order: 4 },

  // Cloud
  { id: 'iaas', categoryId: 'cloud', name: 'IaaS', nameEn: 'IaaS', order: 1 },
  { id: 'saas', categoryId: 'cloud', name: 'SaaS', nameEn: 'SaaS', order: 2 },
  { id: 'data_platform', categoryId: 'cloud', name: '데이터 플랫폼', nameEn: 'Data Platform', order: 3 },

  // Cybersecurity
  { id: 'endpoint', categoryId: 'cybersecurity', name: '엔드포인트 보안', nameEn: 'Endpoint', order: 1 },
  { id: 'network_security', categoryId: 'cybersecurity', name: '네트워크 보안', nameEn: 'Network', order: 2 },
  { id: 'identity', categoryId: 'cybersecurity', name: 'ID 관리', nameEn: 'Identity', order: 3 },

  // EV & Energy
  { id: 'ev', categoryId: 'ev_energy', name: '전기차', nameEn: 'EV', order: 1 },
  { id: 'battery', categoryId: 'ev_energy', name: '배터리', nameEn: 'Battery', order: 2 },
  { id: 'charging', categoryId: 'ev_energy', name: '충전 인프라', nameEn: 'Charging', order: 3 },
  { id: 'renewable', categoryId: 'ev_energy', name: '재생에너지', nameEn: 'Renewable', order: 4 },
]

const COMPANIES = [
  // US Stocks
  { ticker: 'AAPL', name: 'Apple Inc.', nameKo: '애플' },
  { ticker: 'MSFT', name: 'Microsoft Corporation', nameKo: '마이크로소프트' },
  { ticker: 'GOOGL', name: 'Alphabet Inc.', nameKo: '구글' },
  { ticker: 'AMZN', name: 'Amazon.com Inc.', nameKo: '아마존' },
  { ticker: 'META', name: 'Meta Platforms Inc.', nameKo: '메타' },
  { ticker: 'NVDA', name: 'NVIDIA Corporation', nameKo: '엔비디아' },
  { ticker: 'TSM', name: 'Taiwan Semiconductor', nameKo: 'TSMC' },
  { ticker: 'AMD', name: 'Advanced Micro Devices', nameKo: 'AMD' },
  { ticker: 'INTC', name: 'Intel Corporation', nameKo: '인텔' },
  { ticker: 'QCOM', name: 'Qualcomm Inc.', nameKo: '퀄컴' },
  { ticker: 'AVGO', name: 'Broadcom Inc.', nameKo: '브로드컴' },
  { ticker: 'NFLX', name: 'Netflix Inc.', nameKo: '넷플릭스' },
  { ticker: 'DIS', name: 'The Walt Disney Company', nameKo: '디즈니' },
  { ticker: 'WMT', name: 'Walmart Inc.', nameKo: '월마트' },
  { ticker: 'BABA', name: 'Alibaba Group', nameKo: '알리바바' },
  { ticker: 'TSLA', name: 'Tesla Inc.', nameKo: '테슬라' },
  { ticker: 'COIN', name: 'Coinbase Global', nameKo: '코인베이스' },
  { ticker: 'SNAP', name: 'Snap Inc.', nameKo: '스냅' },
  { ticker: 'IONQ', name: 'IonQ Inc.', nameKo: '아이온큐' },
  { ticker: 'RKLB', name: 'Rocket Lab USA', nameKo: '로켓랩' },
  { ticker: 'MU', name: 'Micron Technology', nameKo: '마이크론' },

  // Korean Stocks
  { ticker: '005930.KS', name: 'Samsung Electronics', nameKo: '삼성전자' },
  { ticker: '000660.KS', name: 'SK Hynix Inc.', nameKo: 'SK하이닉스' },
  { ticker: '005380.KS', name: 'Hyundai Motor Company', nameKo: '현대차' },

  // Other Markets
  { ticker: '1810.HK', name: 'Xiaomi Corporation', nameKo: '샤오미' },
  { ticker: '2454.TW', name: 'MediaTek Inc.', nameKo: '미디어텍' },

  // Fintech
  { ticker: 'V', name: 'Visa Inc.', nameKo: '비자' },
  { ticker: 'MA', name: 'Mastercard Inc.', nameKo: '마스터카드' },
  { ticker: 'PYPL', name: 'PayPal Holdings Inc.', nameKo: '페이팔' },
  { ticker: 'JPM', name: 'JPMorgan Chase & Co.', nameKo: 'JP모건' },
  { ticker: 'SQ', name: 'Block Inc.', nameKo: '블록' },
  { ticker: 'SOFI', name: 'SoFi Technologies Inc.', nameKo: '소파이' },
  { ticker: 'LMND', name: 'Lemonade Inc.', nameKo: '레모네이드' },
  { ticker: 'ROOT', name: 'Root Inc.', nameKo: '루트' },

  // Healthcare
  { ticker: 'LLY', name: 'Eli Lilly and Company', nameKo: '일라이 릴리' },
  { ticker: 'JNJ', name: 'Johnson & Johnson', nameKo: '존슨앤존슨' },
  { ticker: 'PFE', name: 'Pfizer Inc.', nameKo: '화이자' },
  { ticker: 'MRNA', name: 'Moderna Inc.', nameKo: '모더나' },
  { ticker: 'REGN', name: 'Regeneron Pharmaceuticals', nameKo: '리제네론' },
  { ticker: 'VRTX', name: 'Vertex Pharmaceuticals', nameKo: '버텍스' },
  { ticker: 'ABT', name: 'Abbott Laboratories', nameKo: '애보트' },
  { ticker: 'MDT', name: 'Medtronic plc', nameKo: '메드트로닉' },
  { ticker: 'ISRG', name: 'Intuitive Surgical Inc.', nameKo: '인튜이티브' },
  { ticker: 'VEEV', name: 'Veeva Systems Inc.', nameKo: '비바' },
  { ticker: 'TDOC', name: 'Teladoc Health Inc.', nameKo: '텔라닥' },

  // Entertainment
  { ticker: 'EA', name: 'Electronic Arts Inc.', nameKo: 'EA' },
  { ticker: 'SPOT', name: 'Spotify Technology S.A.', nameKo: '스포티파이' },
  { ticker: 'U', name: 'Unity Software Inc.', nameKo: '유니티' },
  { ticker: 'RBLX', name: 'Roblox Corporation', nameKo: '로블록스' },

  // Semiconductor
  { ticker: 'ASML', name: 'ASML Holding N.V.', nameKo: 'ASML' },
  { ticker: 'AMAT', name: 'Applied Materials Inc.', nameKo: '어플라이드 머티어리얼즈' },
  { ticker: 'LRCX', name: 'Lam Research Corporation', nameKo: '램리서치' },
  { ticker: '4063.T', name: 'Shin-Etsu Chemical Co.', nameKo: '신에츠화학' },

  // Cloud & SaaS
  { ticker: 'CRM', name: 'Salesforce Inc.', nameKo: '세일즈포스' },
  { ticker: 'NOW', name: 'ServiceNow Inc.', nameKo: '서비스나우' },
  { ticker: 'WDAY', name: 'Workday Inc.', nameKo: '워크데이' },
  { ticker: 'SNOW', name: 'Snowflake Inc.', nameKo: '스노우플레이크' },
  { ticker: 'MDB', name: 'MongoDB Inc.', nameKo: '몽고DB' },

  // Cybersecurity
  { ticker: 'CRWD', name: 'CrowdStrike Holdings Inc.', nameKo: '크라우드스트라이크' },
  { ticker: 'S', name: 'SentinelOne Inc.', nameKo: '센티넬원' },
  { ticker: 'PANW', name: 'Palo Alto Networks Inc.', nameKo: '팔로알토' },
  { ticker: 'FTNT', name: 'Fortinet Inc.', nameKo: '포티넷' },
  { ticker: 'CSCO', name: 'Cisco Systems Inc.', nameKo: '시스코' },
  { ticker: 'OKTA', name: 'Okta Inc.', nameKo: '옥타' },

  // EV & Energy
  { ticker: 'BYDDY', name: 'BYD Company Limited', nameKo: 'BYD' },
  { ticker: 'RIVN', name: 'Rivian Automotive Inc.', nameKo: '리비안' },
  { ticker: 'CATL', name: 'Contemporary Amperex Technology', nameKo: 'CATL' },
  { ticker: '373220.KS', name: 'LG Energy Solution', nameKo: 'LG에너지솔루션' },
  { ticker: '006400.KS', name: 'Samsung SDI Co.', nameKo: '삼성SDI' },
  { ticker: 'CHPT', name: 'ChargePoint Holdings Inc.', nameKo: '차지포인트' },
  { ticker: 'EVGO', name: 'EVgo Inc.', nameKo: 'EVgo' },
  { ticker: 'BLNK', name: 'Blink Charging Co.', nameKo: '블링크' },
  { ticker: 'NEE', name: 'NextEra Energy Inc.', nameKo: '넥스트에라' },
  { ticker: 'ENPH', name: 'Enphase Energy Inc.', nameKo: '엔페이즈' },
  { ticker: 'FSLR', name: 'First Solar Inc.', nameKo: '퍼스트솔라' },
]

const SECTOR_COMPANIES = [
  // Computer OS
  { sectorId: 'os', ticker: 'MSFT', rank: 1, notes: null },
  { sectorId: 'os', ticker: 'AAPL', rank: 2, notes: null },

  // CPU
  { sectorId: 'cpu', ticker: 'INTC', rank: 1, notes: null },
  { sectorId: 'cpu', ticker: 'AMD', rank: 2, notes: null },
  { sectorId: 'cpu', ticker: 'AAPL', rank: 3, notes: '애플 등 ARM 기반' },

  // DDR
  { sectorId: 'ddr', ticker: '005930.KS', rank: 1, notes: null },
  { sectorId: 'ddr', ticker: '000660.KS', rank: 2, notes: null },
  { sectorId: 'ddr', ticker: 'MU', rank: 3, notes: null },

  // Search
  { sectorId: 'search', ticker: 'GOOGL', rank: 1, notes: null },

  // Online Ads
  { sectorId: 'online_ads', ticker: 'GOOGL', rank: 1, notes: null },
  { sectorId: 'online_ads', ticker: 'META', rank: 2, notes: null },
  { sectorId: 'online_ads', ticker: 'AMZN', rank: 3, notes: null },

  // E-commerce
  { sectorId: 'ecommerce', ticker: 'AMZN', rank: 1, notes: null },
  { sectorId: 'ecommerce', ticker: 'WMT', rank: 2, notes: null },
  { sectorId: 'ecommerce', ticker: 'BABA', rank: 3, notes: '알리바바, 테무 등' },

  // Mobile OS
  { sectorId: 'mobile_os', ticker: 'AAPL', rank: 1, notes: null },
  { sectorId: 'mobile_os', ticker: 'GOOGL', rank: 2, notes: null },

  // Mobile Device
  { sectorId: 'mobile_device', ticker: 'AAPL', rank: 1, notes: null },
  { sectorId: 'mobile_device', ticker: '005930.KS', rank: 2, notes: null },
  { sectorId: 'mobile_device', ticker: '1810.HK', rank: 3, notes: null },

  // AP
  { sectorId: 'ap', ticker: '2454.TW', rank: 1, notes: null },
  { sectorId: 'ap', ticker: 'QCOM', rank: 2, notes: null },
  { sectorId: 'ap', ticker: 'AAPL', rank: 3, notes: null },

  // Social Media
  { sectorId: 'social_media', ticker: 'META', rank: 1, notes: null },
  { sectorId: 'social_media', ticker: 'SNAP', rank: 2, notes: '틱톡 (비상장)' },

  // Online Video
  { sectorId: 'online_video', ticker: 'GOOGL', rank: 1, notes: null },
  { sectorId: 'online_video', ticker: 'NFLX', rank: 2, notes: null },
  { sectorId: 'online_video', ticker: 'DIS', rank: 3, notes: null },

  // Data Center
  { sectorId: 'data_center', ticker: 'AMZN', rank: 1, notes: null },
  { sectorId: 'data_center', ticker: 'MSFT', rank: 2, notes: null },
  { sectorId: 'data_center', ticker: 'GOOGL', rank: 3, notes: null },

  // AI Model
  { sectorId: 'ai_model', ticker: 'MSFT', rank: 1, notes: '오픈AI (비상장)' },
  { sectorId: 'ai_model', ticker: 'GOOGL', rank: 2, notes: null },
  { sectorId: 'ai_model', ticker: 'META', rank: 3, notes: '그 외 다수' },

  // GPU
  { sectorId: 'gpu', ticker: 'NVDA', rank: 1, notes: null },
  { sectorId: 'gpu', ticker: 'AMD', rank: 2, notes: null },
  { sectorId: 'gpu', ticker: 'TSM', rank: 3, notes: null },

  // ASIC
  { sectorId: 'asic', ticker: 'GOOGL', rank: 1, notes: '구글 등' },
  { sectorId: 'asic', ticker: 'AVGO', rank: 2, notes: '브로드컴 등' },
  { sectorId: 'asic', ticker: 'TSM', rank: 3, notes: null },

  // HBM
  { sectorId: 'hbm', ticker: '000660.KS', rank: 1, notes: null },
  { sectorId: 'hbm', ticker: '005930.KS', rank: 2, notes: null },
  { sectorId: 'hbm', ticker: 'MU', rank: 3, notes: null },

  // Blockchain
  { sectorId: 'blockchain', ticker: 'COIN', rank: 1, notes: null },

  // Robot
  { sectorId: 'robot', ticker: 'TSLA', rank: 1, notes: null },
  { sectorId: 'robot', ticker: 'NVDA', rank: 2, notes: null },
  { sectorId: 'robot', ticker: '005380.KS', rank: 3, notes: '현대차 등 보스톤 다이나믹스' },

  // Autonomous
  { sectorId: 'autonomous', ticker: 'TSLA', rank: 1, notes: null },
  { sectorId: 'autonomous', ticker: 'GOOGL', rank: 2, notes: null },
  { sectorId: 'autonomous', ticker: 'NVDA', rank: 3, notes: '엔비디아, BYD' },

  // Quantum
  { sectorId: 'quantum', ticker: 'IONQ', rank: 1, notes: '아이온큐, IBM 등' },
  { sectorId: 'quantum', ticker: 'MSFT', rank: 2, notes: null },
  { sectorId: 'quantum', ticker: 'GOOGL', rank: 3, notes: null },

  // Space
  { sectorId: 'space', ticker: 'RKLB', rank: 1, notes: '스페이스X (비상장)' },
  { sectorId: 'space', ticker: 'AMZN', rank: 2, notes: '블루 오리진 등' },

  // Payments
  { sectorId: 'payments', ticker: 'V', rank: 1, notes: null },
  { sectorId: 'payments', ticker: 'MA', rank: 2, notes: null },
  { sectorId: 'payments', ticker: 'PYPL', rank: 3, notes: null },

  // Digital Banking
  { sectorId: 'digital_banking', ticker: 'JPM', rank: 1, notes: null },
  { sectorId: 'digital_banking', ticker: 'SQ', rank: 2, notes: null },
  { sectorId: 'digital_banking', ticker: 'SOFI', rank: 3, notes: null },

  // Crypto Exchange
  { sectorId: 'crypto_exchange', ticker: 'COIN', rank: 1, notes: null },

  // InsurTech
  { sectorId: 'insurance_tech', ticker: 'LMND', rank: 1, notes: null },
  { sectorId: 'insurance_tech', ticker: 'ROOT', rank: 2, notes: null },

  // Pharma
  { sectorId: 'pharma', ticker: 'LLY', rank: 1, notes: null },
  { sectorId: 'pharma', ticker: 'JNJ', rank: 2, notes: null },
  { sectorId: 'pharma', ticker: 'PFE', rank: 3, notes: null },

  // Biotech
  { sectorId: 'biotech', ticker: 'MRNA', rank: 1, notes: null },
  { sectorId: 'biotech', ticker: 'REGN', rank: 2, notes: null },
  { sectorId: 'biotech', ticker: 'VRTX', rank: 3, notes: null },

  // Medical Devices
  { sectorId: 'medical_devices', ticker: 'ABT', rank: 1, notes: null },
  { sectorId: 'medical_devices', ticker: 'MDT', rank: 2, notes: null },
  { sectorId: 'medical_devices', ticker: 'ISRG', rank: 3, notes: null },

  // Digital Health
  { sectorId: 'digital_health', ticker: 'VEEV', rank: 1, notes: null },
  { sectorId: 'digital_health', ticker: 'TDOC', rank: 2, notes: null },

  // Gaming
  { sectorId: 'gaming', ticker: 'MSFT', rank: 1, notes: 'Xbox, Activision Blizzard' },
  { sectorId: 'gaming', ticker: 'EA', rank: 2, notes: null },
  { sectorId: 'gaming', ticker: 'RBLX', rank: 3, notes: null },

  // Streaming
  { sectorId: 'streaming', ticker: 'NFLX', rank: 1, notes: null },
  { sectorId: 'streaming', ticker: 'DIS', rank: 2, notes: 'Disney+' },
  { sectorId: 'streaming', ticker: 'SPOT', rank: 3, notes: null },

  // VR/AR
  { sectorId: 'vr_ar', ticker: 'META', rank: 1, notes: 'Quest' },
  { sectorId: 'vr_ar', ticker: 'AAPL', rank: 2, notes: 'Vision Pro' },
  { sectorId: 'vr_ar', ticker: 'U', rank: 3, notes: null },

  // eSports
  { sectorId: 'esports', ticker: 'RBLX', rank: 1, notes: null },

  // Foundry (반도체 파운드리)
  { sectorId: 'foundry', ticker: 'TSM', rank: 1, notes: null },
  { sectorId: 'foundry', ticker: '005930.KS', rank: 2, notes: null },
  { sectorId: 'foundry', ticker: 'INTC', rank: 3, notes: null },

  // Memory (반도체 메모리)
  { sectorId: 'memory', ticker: '005930.KS', rank: 1, notes: null },
  { sectorId: 'memory', ticker: '000660.KS', rank: 2, notes: null },
  { sectorId: 'memory', ticker: 'MU', rank: 3, notes: null },

  // Equipment (반도체 장비)
  { sectorId: 'equipment', ticker: 'ASML', rank: 1, notes: null },
  { sectorId: 'equipment', ticker: 'AMAT', rank: 2, notes: null },
  { sectorId: 'equipment', ticker: 'LRCX', rank: 3, notes: null },

  // Materials (반도체 소재)
  { sectorId: 'materials', ticker: '4063.T', rank: 1, notes: null },

  // IaaS (클라우드)
  { sectorId: 'iaas', ticker: 'AMZN', rank: 1, notes: 'AWS' },
  { sectorId: 'iaas', ticker: 'MSFT', rank: 2, notes: 'Azure' },
  { sectorId: 'iaas', ticker: 'GOOGL', rank: 3, notes: 'GCP' },

  // SaaS (클라우드)
  { sectorId: 'saas', ticker: 'CRM', rank: 1, notes: null },
  { sectorId: 'saas', ticker: 'NOW', rank: 2, notes: null },
  { sectorId: 'saas', ticker: 'WDAY', rank: 3, notes: null },

  // Data Platform (클라우드)
  { sectorId: 'data_platform', ticker: 'SNOW', rank: 1, notes: null },
  { sectorId: 'data_platform', ticker: 'MDB', rank: 2, notes: null },

  // Endpoint (사이버보안)
  { sectorId: 'endpoint', ticker: 'CRWD', rank: 1, notes: null },
  { sectorId: 'endpoint', ticker: 'S', rank: 2, notes: null },
  { sectorId: 'endpoint', ticker: 'MSFT', rank: 3, notes: 'Defender' },

  // Network Security (사이버보안)
  { sectorId: 'network_security', ticker: 'PANW', rank: 1, notes: null },
  { sectorId: 'network_security', ticker: 'FTNT', rank: 2, notes: null },
  { sectorId: 'network_security', ticker: 'CSCO', rank: 3, notes: null },

  // Identity (사이버보안)
  { sectorId: 'identity', ticker: 'OKTA', rank: 1, notes: null },
  { sectorId: 'identity', ticker: 'MSFT', rank: 2, notes: 'Entra ID' },

  // EV (전기차)
  { sectorId: 'ev', ticker: 'TSLA', rank: 1, notes: null },
  { sectorId: 'ev', ticker: 'BYDDY', rank: 2, notes: null },
  { sectorId: 'ev', ticker: 'RIVN', rank: 3, notes: null },

  // Battery (배터리)
  { sectorId: 'battery', ticker: 'CATL', rank: 1, notes: null },
  { sectorId: 'battery', ticker: '373220.KS', rank: 2, notes: null },
  { sectorId: 'battery', ticker: '006400.KS', rank: 3, notes: null },

  // Charging (충전 인프라)
  { sectorId: 'charging', ticker: 'CHPT', rank: 1, notes: null },
  { sectorId: 'charging', ticker: 'EVGO', rank: 2, notes: null },
  { sectorId: 'charging', ticker: 'BLNK', rank: 3, notes: null },

  // Renewable (재생에너지)
  { sectorId: 'renewable', ticker: 'NEE', rank: 1, notes: null },
  { sectorId: 'renewable', ticker: 'ENPH', rank: 2, notes: null },
  { sectorId: 'renewable', ticker: 'FSLR', rank: 3, notes: null },
]

async function seed() {
  // Ensure data directory exists
  const dataDir = path.dirname(DB_PATH)
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true })
  }

  // Create or open database
  const sqlite = new Database(DB_PATH)
  sqlite.pragma('journal_mode = WAL')

  // Create tables
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      name_en TEXT,
      "order" INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sectors (
      id TEXT PRIMARY KEY,
      category_id TEXT REFERENCES categories(id),
      name TEXT NOT NULL,
      name_en TEXT,
      "order" INTEGER NOT NULL,
      description TEXT
    );

    CREATE TABLE IF NOT EXISTS companies (
      ticker TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      name_ko TEXT,
      logo_url TEXT
    );

    CREATE TABLE IF NOT EXISTS sector_companies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sector_id TEXT REFERENCES sectors(id),
      ticker TEXT REFERENCES companies(ticker),
      rank INTEGER NOT NULL CHECK (rank >= 1 AND rank <= 5),
      notes TEXT,
      UNIQUE(sector_id, ticker)
    );

    CREATE TABLE IF NOT EXISTS daily_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticker TEXT REFERENCES companies(ticker),
      date TEXT NOT NULL,
      market_cap INTEGER,
      price REAL,
      price_change REAL,
      week_52_high REAL,
      week_52_low REAL,
      volume INTEGER,
      avg_volume INTEGER,
      pe_ratio REAL,
      peg_ratio REAL,
      updated_at TEXT DEFAULT (datetime('now')),
      UNIQUE(ticker, date)
    );

    CREATE TABLE IF NOT EXISTS company_profiles (
      ticker TEXT PRIMARY KEY REFERENCES companies(ticker),
      sector TEXT,
      industry TEXT,
      country TEXT,
      employees INTEGER,
      revenue INTEGER,
      net_income INTEGER,
      description TEXT,
      website TEXT,
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_snapshots_ticker_date ON daily_snapshots(ticker, date DESC);
    CREATE INDEX IF NOT EXISTS idx_sector_companies_sector ON sector_companies(sector_id);
  `)

  const db = drizzle(sqlite, { schema })

  // Clear existing data
  sqlite.exec(`
    DELETE FROM sector_companies;
    DELETE FROM daily_snapshots;
    DELETE FROM company_profiles;
    DELETE FROM companies;
    DELETE FROM sectors;
    DELETE FROM categories;
  `)

  // Insert categories
  for (const cat of CATEGORIES) {
    await db.insert(schema.categories).values(cat)
  }
  console.log(`Inserted ${CATEGORIES.length} categories`)

  // Insert sectors
  for (const sector of SECTORS) {
    await db.insert(schema.sectors).values(sector)
  }
  console.log(`Inserted ${SECTORS.length} sectors`)

  // Insert companies
  for (const company of COMPANIES) {
    await db.insert(schema.companies).values(company)
  }
  console.log(`Inserted ${COMPANIES.length} companies`)

  // Insert sector-company mappings
  for (const sc of SECTOR_COMPANIES) {
    await db.insert(schema.sectorCompanies).values(sc)
  }
  console.log(`Inserted ${SECTOR_COMPANIES.length} sector-company mappings`)

  // Insert sample daily snapshots with mock data
  const today = new Date().toISOString().split('T')[0]
  const mockSnapshots = COMPANIES.map((company) => ({
    ticker: company.ticker,
    date: today,
    marketCap: Math.floor(Math.random() * 3000000000000) + 100000000000, // 100B - 3T
    price: Math.floor(Math.random() * 500) + 50,
    priceChange: (Math.random() * 10 - 5).toFixed(2),
    week52High: Math.floor(Math.random() * 600) + 100,
    week52Low: Math.floor(Math.random() * 100) + 20,
    volume: Math.floor(Math.random() * 100000000),
    avgVolume: Math.floor(Math.random() * 50000000),
    peRatio: (Math.random() * 50 + 10).toFixed(2),
    pegRatio: (Math.random() * 3).toFixed(2),
    updatedAt: new Date().toISOString(),
  }))

  for (const snapshot of mockSnapshots) {
    await db.insert(schema.dailySnapshots).values({
      ...snapshot,
      priceChange: parseFloat(snapshot.priceChange),
      peRatio: parseFloat(snapshot.peRatio),
      pegRatio: parseFloat(snapshot.pegRatio),
    })
  }
  console.log(`Inserted ${mockSnapshots.length} daily snapshots (mock data)`)

  sqlite.close()
  console.log('\nSeed completed successfully!')
}

seed().catch(console.error)
