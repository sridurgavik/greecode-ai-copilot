const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

(async () => {
  try {
    // Launch a headless browser
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    
    // Get the absolute path to the HTML file
    const htmlPath = path.join(__dirname, 'user-manual.html');
    const fileUrl = `file://${htmlPath}`;
    
    // Load the HTML file
    await page.goto(fileUrl, { waitUntil: 'networkidle0' });
    
    // Generate PDF
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        right: '20mm',
        bottom: '20mm',
        left: '20mm'
      }
    });
    
    // Save the PDF
    fs.writeFileSync(path.join(__dirname, 'greecode-user-manual.pdf'), pdfBuffer);
    
    console.log('PDF generated successfully!');
    
    // Close the browser
    await browser.close();
  } catch (error) {
    console.error('Error generating PDF:', error);
  }
})();
