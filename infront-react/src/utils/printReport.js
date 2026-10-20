/**
 * 生成 PDF 工具
 * 修复：多打空白页 + 内容被截断
 */
import html2pdf from "html2pdf.js";

export const generatePDF = (element, filename = "report") => {
  if (!element) {
    console.error("元素不存在，无法生成 PDF");
    return;
  }

  const opt = {
    // 👈 边距改为 0，由模板内部 padding 控制
    margin: 0,
    filename: `${filename}_${new Date().getTime()}.pdf`,
    image: { type: "jpeg", quality: 0.98 },
    html2canvas: {
      scale: 2,
      useCORS: true,
      letterRendering: true,
      backgroundColor: "#ffffff",
      // 👈 让 html2canvas 计算完整宽度
      width: element.scrollWidth,
      windowWidth: element.scrollWidth,
    },
    jsPDF: {
      unit: "mm",
      format: "a4",
      orientation: "portrait",
    },
    // 👈 关键：只保留 css 模式，去掉 avoid-all，防止空页
    pagebreak: { mode: ["css", "legacy"] },
  };

  html2pdf().set(opt).from(element).save();
};
