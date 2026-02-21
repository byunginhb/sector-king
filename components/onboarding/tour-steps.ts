import type { DriveStep } from 'driver.js'

export type PageId =
  | 'dashboard'
  | 'hegemony-map'
  | 'money-flow'
  | 'price-changes'
  | 'statistics'

export const tourSteps: Record<PageId, DriveStep[]> = {
  dashboard: [
    {
      element: '[data-tour="industry-card"]',
      popover: {
        title: '산업 카드',
        description:
          '산업을 클릭하면 해당 산업의 패권 지도, 자금 흐름 등 상세 분석을 볼 수 있습니다.',
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: '[data-tour="company-stats-card"]',
      popover: {
        title: '시가총액 순위',
        description:
          '전체 산업에서 시가총액이 가장 큰 기업들의 실시간 순위입니다.',
        side: 'top',
        align: 'start',
      },
    },
    {
      element: '[data-tour="price-changes-card"]',
      popover: {
        title: '가격 변화 요약',
        description:
          '최근 가격이 가장 많이 오른/내린 기업을 한눈에 확인하세요.',
        side: 'top',
        align: 'start',
      },
    },
  ],

  'hegemony-map': [
    {
      element: '[data-tour="nav-links"]',
      popover: {
        title: '페이지 이동',
        description:
          '자금흐름, 등락율 페이지로 이동할 수 있습니다.',
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: '[data-tour="category-card"]',
      popover: {
        title: '카테고리',
        description:
          '산업은 여러 카테고리로 나뉘고, 각 카테고리 안에 세부 섹터가 있습니다.',
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: '[data-tour="company-badge"]',
      popover: {
        title: '기업 뱃지',
        description:
          '클릭하면 패권 점수(규모/성장/수익성/시장평가)와 상세 정보를 볼 수 있습니다. 순위가 높을수록 진한 색상입니다.',
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: '[data-tour="company-stats"]',
      popover: {
        title: '기업 순위',
        description:
          '시가총액 기준 상위 기업의 실시간 순위와 등락을 확인하세요.',
        side: 'left',
        align: 'start',
      },
    },
    {
      element: '[data-tour="date-selector"]',
      popover: {
        title: '날짜 선택',
        description:
          '과거 날짜를 선택하면 그 시점의 패권 지도를 볼 수 있습니다.',
        side: 'bottom',
        align: 'end',
      },
    },
  ],

  'money-flow': [
    {
      element: '[data-tour="period-selector"]',
      popover: {
        title: '기간 선택',
        description:
          '1일~30일 기간을 선택하여 분석 기간을 조절하세요.',
        side: 'bottom',
        align: 'end',
      },
    },
    {
      element: '[data-tour="inflow-section"]',
      popover: {
        title: '자금 유입 섹터',
        description:
          '빨간 카드는 시가총액이 증가한 섹터입니다. 카드를 클릭하면 개별 기업의 성과를 볼 수 있어요.',
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: '[data-tour="outflow-section"]',
      popover: {
        title: '자금 유출 섹터',
        description:
          '파란 카드는 시가총액이 감소한 섹터입니다. MFI(Money Flow Index)가 50 미만이면 매도 우위를 나타냅니다.',
        side: 'top',
        align: 'start',
      },
    },
    {
      element: '[data-tour="flow-summary"]',
      popover: {
        title: '자금 요약',
        description:
          '총 유입, 총 유출, 순 유입 금액을 한눈에 확인할 수 있습니다.',
        side: 'top',
        align: 'start',
      },
    },
    {
      element: '[data-tour="sector-trend"]',
      popover: {
        title: '섹터 추이',
        description:
          '히트맵으로 기간별 섹터 변화율을 비교하고, 차트로 추세를 확인하세요.',
        side: 'top',
        align: 'start',
      },
    },
  ],

  'price-changes': [
    {
      element: '[data-tour="price-chart"]',
      popover: {
        title: '가격 변화율 차트',
        description:
          '상위 20개 기업의 추적 시작일 대비 가격 변화율을 한눈에 비교하세요.',
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: '[data-tour="price-trend"]',
      popover: {
        title: '등락율 추이',
        description:
          '시간에 따른 가격 변화 추이를 라인 차트로 확인할 수 있습니다.',
        side: 'top',
        align: 'start',
      },
    },
    {
      element: '[data-tour="sort-buttons"]',
      popover: {
        title: '정렬 옵션',
        description:
          '변화율, 시가총액, 이름으로 기업을 정렬할 수 있습니다. 같은 항목 재클릭 시 오름/내림차순이 전환됩니다.',
        side: 'bottom',
        align: 'start',
      },
    },
  ],

  statistics: [
    {
      element: '[data-tour="days-filter"]',
      popover: {
        title: '기간 필터',
        description:
          '7일, 30일, 전체 기간을 선택하여 통계 범위를 조절하세요.',
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: '[data-tour="charts-grid"]',
      popover: {
        title: '시각화 차트',
        description:
          '섹터 추이, 카테고리 비교, 성장률 Top/Bottom, 기업 추이 4개 차트를 제공합니다.',
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: '[data-tour="ranking-table"]',
      popover: {
        title: '기업 랭킹',
        description:
          '기업을 클릭하면 상세 정보를 볼 수 있습니다. 여러 섹터에 등장하는 기업일수록 영향력이 큽니다.',
        side: 'top',
        align: 'start',
      },
    },
  ],
}
