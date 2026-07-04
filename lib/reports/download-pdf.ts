/**
 * 리포트 DOM → 여백 있는 멀티페이지 A4 PDF (클라이언트).
 *
 * `[data-pdf-block]` 요소 단위로 캡처해 배치한다. 블록이 남은 페이지에 안 들어가면
 * 통째로 다음 페이지로 넘겨 "섹션이 중간에 잘리는" 문제를 막는다. 페이지마다 여백(margin)을
 * 줘 가독성 확보. jspdf + html2canvas-pro 는 무겁고 클라 전용이라 동적 import.
 */
export async function downloadReportPdf(
  el: HTMLElement,
  filename: string
): Promise<void> {
  const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
    import('jspdf'),
    import('html2canvas-pro'),
  ])

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageW = pdf.internal.pageSize.getWidth()
  const pageH = pdf.internal.pageSize.getHeight()
  const margin = 12 // mm — 좌우/상하 여백
  const usableW = pageW - margin * 2
  const usableH = pageH - margin * 2
  const gap = 5 // 블록 간 간격(mm)

  const blocks = Array.from(el.querySelectorAll<HTMLElement>('[data-pdf-block]'))
  const targets = blocks.length ? blocks : [el]

  const render = async (node: HTMLElement) => {
    const canvas = await html2canvas(node, {
      scale: 2,
      backgroundColor: '#ffffff',
      useCORS: true,
      logging: false,
      // 사이트가 다크 테마여도 PDF는 라이트(어두운 글자·흰 배경)로 강제 — 대비 확보.
      onclone: (doc) => doc.documentElement.classList.remove('dark'),
    })
    const imgH = (canvas.height * usableW) / canvas.width
    return { data: canvas.toDataURL('image/jpeg', 0.92), imgH }
  }

  let cursorY = margin
  let firstOnPage = true

  for (const block of targets) {
    const { data, imgH } = await render(block)

    if (imgH <= usableH) {
      // 블록이 한 페이지에 들어감 — 남은 공간 부족하면 다음 페이지로 (중간 절단 없음)
      if (!firstOnPage && cursorY + imgH > pageH - margin) {
        pdf.addPage()
        cursorY = margin
        firstOnPage = true
      }
      pdf.addImage(data, 'JPEG', margin, cursorY, usableW, imgH)
      cursorY += imgH + gap
      firstOnPage = false
    } else {
      // 한 페이지보다 큰 블록(대형 차트 등) — 새 페이지에서 시작해 페이지 단위로 분할
      if (!firstOnPage) {
        pdf.addPage()
        cursorY = margin
      }
      let heightLeft = imgH
      let top = margin
      pdf.addImage(data, 'JPEG', margin, top, usableW, imgH)
      heightLeft -= usableH
      while (heightLeft > 0) {
        pdf.addPage()
        top = margin - (imgH - heightLeft)
        pdf.addImage(data, 'JPEG', margin, top, usableW, imgH)
        heightLeft -= usableH
      }
      // 다음 블록은 새 페이지에서
      pdf.addPage()
      cursorY = margin
      firstOnPage = true
    }
  }

  pdf.save(filename)
}
