import jsPDF from "jspdf";
import html2canvas from "html2canvas";

interface CalculationData {
  productName: string;
  category: string;
  purchasePrice: number;
  deliveryCost: number;
  packagingCost: number;
  otherExpenses: number;
  commission: number;
  commissionPercent: number;
  logisticsCost: number;
  returnPercent: number;
  storageCost: number;
  sellingPrice: number;
  profit: number;
  salesProfitability: number;
  costProfitability: number;
  totalCosts: number;
  marginPercent: number;
}

export async function exportToPDF(data: CalculationData): Promise<void> {
  // Создаем HTML элемент для рендеринга
  const container = document.createElement("div");
  container.style.position = "absolute";
  container.style.left = "-9999px";
  container.style.width = "800px";
  container.style.padding = "40px";
  container.style.backgroundColor = "#ffffff";
  container.style.fontFamily = "Arial, sans-serif";
  container.style.color = "#000000";
  
  const formatMoney = (value: number) => 
    value.toLocaleString("ru-RU", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  container.innerHTML = `
    <div style="text-align: center; margin-bottom: 30px;">
      <h1 style="color: #8b5cf6; font-size: 24px; margin: 0 0 10px 0;">Расчет маржи WB</h1>
      <p style="color: #666; font-size: 12px; margin: 0;">Дата: ${new Date().toLocaleDateString("ru-RU")}</p>
    </div>
    
    <div style="margin-bottom: 20px;">
      <p style="margin: 5px 0;"><strong>Товар:</strong> ${data.productName}</p>
      <p style="margin: 5px 0;"><strong>Категория:</strong> ${data.category}</p>
    </div>
    
    <h2 style="color: #8b5cf6; font-size: 18px; margin: 20px 0 10px 0;">Затраты</h2>
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
      <tr>
        <td style="padding: 5px 0;">Закупка</td>
        <td style="text-align: right; padding: 5px 0;">${formatMoney(data.purchasePrice)} ₽</td>
      </tr>
      <tr>
        <td style="padding: 5px 0;">Доставка до вас</td>
        <td style="text-align: right; padding: 5px 0;">${formatMoney(data.deliveryCost)} ₽</td>
      </tr>
      <tr>
        <td style="padding: 5px 0;">Упаковка и доставка до склада WB</td>
        <td style="text-align: right; padding: 5px 0;">${formatMoney(data.packagingCost)} ₽</td>
      </tr>
      <tr>
        <td style="padding: 5px 0;">Прочие расходы</td>
        <td style="text-align: right; padding: 5px 0;">${formatMoney(data.otherExpenses)} ₽</td>
      </tr>
      <tr>
        <td style="padding: 5px 0;">Комиссия WB (${data.commissionPercent}%)</td>
        <td style="text-align: right; padding: 5px 0;">${formatMoney(data.commission)} ₽</td>
      </tr>
      <tr>
        <td style="padding: 5px 0;">Логистика</td>
        <td style="text-align: right; padding: 5px 0;">${formatMoney(data.logisticsCost)} ₽</td>
      </tr>
      <tr>
        <td style="padding: 5px 0;">Возвраты (${data.returnPercent}%)</td>
        <td style="text-align: right; padding: 5px 0;">${formatMoney((data.sellingPrice * data.returnPercent) / 100)} ₽</td>
      </tr>
      <tr>
        <td style="padding: 5px 0;">Хранение</td>
        <td style="text-align: right; padding: 5px 0;">${formatMoney(data.storageCost)} ₽</td>
      </tr>
      <tr style="border-top: 2px solid #ccc;">
        <td style="padding: 10px 0 5px 0; font-weight: bold;">Итого затрат</td>
        <td style="text-align: right; padding: 10px 0 5px 0; font-weight: bold;">${formatMoney(data.totalCosts)} ₽</td>
      </tr>
    </table>
    
    <h2 style="color: #8b5cf6; font-size: 18px; margin: 20px 0 10px 0;">Результаты расчета</h2>
    <table style="width: 100%; border-collapse: collapse;">
      <tr>
        <td style="padding: 5px 0;">Цена продажи</td>
        <td style="text-align: right; padding: 5px 0;">${formatMoney(data.sellingPrice)} ₽</td>
      </tr>
      <tr>
        <td style="padding: 5px 0; font-weight: bold; color: ${data.profit >= 0 ? "#22c55e" : "#ef4444"};">
          Прибыль
        </td>
        <td style="text-align: right; padding: 5px 0; font-weight: bold; color: ${data.profit >= 0 ? "#22c55e" : "#ef4444"};">
          ${data.profit >= 0 ? "+" : ""}${formatMoney(data.profit)} ₽
        </td>
      </tr>
      <tr>
        <td style="padding: 5px 0;">Рентабельность продаж</td>
        <td style="text-align: right; padding: 5px 0;">${data.salesProfitability.toFixed(2)}%</td>
      </tr>
      <tr>
        <td style="padding: 5px 0;">Рентабельность затрат</td>
        <td style="text-align: right; padding: 5px 0;">${data.costProfitability.toFixed(2)}%</td>
      </tr>
      <tr>
        <td style="padding: 5px 0;">Маржа</td>
        <td style="text-align: right; padding: 5px 0;">${data.marginPercent.toFixed(2)}%</td>
      </tr>
    </table>
  `;

  document.body.appendChild(container);

  try {
    // Рендерим HTML в canvas
    const canvas = await html2canvas(container, {
      scale: 2,
      backgroundColor: "#ffffff",
      useCORS: true,
    });

    // Удаляем временный элемент
    document.body.removeChild(container);

    // Создаем PDF
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;
    const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
    const imgScaledWidth = imgWidth * ratio;
    const imgScaledHeight = imgHeight * ratio;
    const xOffset = (pdfWidth - imgScaledWidth) / 2;
    const yOffset = 0;

    pdf.addImage(imgData, "PNG", xOffset, yOffset, imgScaledWidth, imgScaledHeight);

    // Сохраняем PDF
    const sanitizedName = data.productName.replace(/[^a-zа-я0-9]/gi, "-");
    const fileName = `wb-margin-${sanitizedName}-${Date.now()}.pdf`;
    pdf.save(fileName);
  } catch (error) {
    document.body.removeChild(container);
    throw error;
  }
}
