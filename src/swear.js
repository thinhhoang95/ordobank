import puppeteer from 'puppeteer';
import fs from 'fs';

export const getSwearCertificatePdf = async (swear1, swear2) => {
    try {
        // Open the file swearprint.html and replace the placeholder with the account name
        let html = fs.readFileSync(__dirname + '/swearprint.html', 'utf8');
        html = html.replace('$$SWEAR1$$', swear1)
        html = html.replace('$$SWEAR2$$', swear2)
        fs.writeFileSync(__dirname + '/swearprint_temp.html', html);
        const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
        const page = await browser.newPage();
        await page.goto('file://'+ __dirname +'/swearprint_temp.html');
        const pdf = await page.pdf({ format: 'A4', margin: { top: '40px', right: '20px', bottom: '40px', left: '20px'}});
        await browser.close();
        // delete the temporary file
        fs.unlinkSync(__dirname + '/swearprint_temp.html');
        return pdf;
    } catch (e) {
        console.log(e)
    }
}