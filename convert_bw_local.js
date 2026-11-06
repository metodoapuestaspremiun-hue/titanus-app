const sharp = require('./node_modules/sharp');
const fs = require('fs');

const files = ['action-membership.jpg', 'action-bar.jpg', 'action-coach.jpg', 'coach-1.jpg', 'coach-2.jpg', 'coach-3.jpg'];

async function processBW() {
  for (const f of files) {
    const src = 'public/branding-ui/' + f;
    const buf = fs.readFileSync(src);
    const bwBuf = await sharp(buf)
      .grayscale()
      .modulate({ brightness: 0.9, contrast: 1.25 })
      .jpeg({ quality: 85 })
      .toBuffer();
    fs.writeFileSync(src, bwBuf);
    console.log(f, 'converted to B&W ✅');
  }

  let out = '// Auto-generated inline fallback UI images in B&W\n';
  files.forEach(f => {
    const b = fs.readFileSync('public/branding-ui/' + f);
    const key = f.replace(/[-.]/g, '_');
    out += `export const ${key} = "data:image/jpeg;base64,${b.toString('base64')}";\n`;
  });
  fs.writeFileSync('lib/brandingImages.ts', out);
  console.log('lib/brandingImages.ts updated with B&W images ✅');
}

processBW().catch(console.error);

