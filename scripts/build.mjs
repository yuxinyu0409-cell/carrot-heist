import {mkdir, copyFile, cp} from 'node:fs/promises';
await mkdir('public', {recursive:true});
for (const file of ['index.html','campaign.css','presentation.css','presentation.js','campaign.js','game.js','campaign-ui.js','jump-study.html','jump-study.js']) await copyFile(file, `public/${file}`);
await cp('assets', 'public/assets', {recursive:true});
console.log('Static game built in public/');
