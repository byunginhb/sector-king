/**
 * 리포트 DOM → 멀티페이지 A4 PDF 다운로드 (클라이언트).
 *
 * jspdf + html2canvas-pro 는 무겁고 클라이언트 전용이라 동적 import 로 분리
 * (초기 번들 미포함). html2canvas 대신 -pro 를 쓰는 이유: Tailwind v4 의
 * oklch/color-mix 색을 파싱 못하는 원본과 달리 pro 포크는 지원.
 */
export async function downloadReportPdf(
  el: HTMLElement,
  filename: string
): Promise<void> {
  const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
    import('jspdf'),
    import('html2canvas-pro'),
  ])

  const canvas = await html2canvas(el, {
    scale: 2, // 선명도 보강
    backgroundColor: '#ffffff',
    useCORS: true,
    logging: false,
  })

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageW = pdf.internal.pageSize.getWidth()
  const pageH = pdf.internal.pageSize.getHeight()
  const imgH = (canvas.height * pageW) / canvas.width
  // JPEG(0.92) — 긴 리포트 전체 캡처의 PNG 는 수십 MB 라 파일이 비대해진다. JPEG 로 대폭 축소.
  const img = canvas.toDataURL('image/jpeg', 0.92)

  let heightLeft = imgH
  let position = 0
  pdf.addImage(img, 'JPEG', 0, position, pageW, imgH)
  heightLeft -= pageH
  while (heightLeft > 0) {
    position -= pageH
    pdf.addPage()
    pdf.addImage(img, 'JPEG', 0, position, pageW, imgH)
    heightLeft -= pageH
  }
  pdf.save(filename)
}
