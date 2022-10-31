const fs = require('fs');
const fsPromise = require('fs/promises');

const path = './tmps/test.txt';
const path2 = './tmps/test2.txt';

function readSyncFile(){
  console.log(fs.readFileSync(path, {encoding: 'utf-8'}));
}

async function readAsyncFile(){
  // fs.readFile(path, {encoding: 'utf-8'}, (err, data)=>{
  //   if(err) throw err;
  //   console.log(data);
  // });

  const pr = await fsPromise.readFile(path, {encoding: 'utf-8'});
  // pr.then(data=>console.log(data)).catch(err=>{throw err});
  console.log(pr);
  console.log("END line!");
}

//a: append data to the file
//r+: modify data of the file
//w: replace a new data
const opts = {
  flag: 'a'
}
function writeSyncFile(){
  fs.writeFileSync(path, 'This is a test data\n', opts);
  console.log('writeSyncFile done!');
}

async function writeAsyncFile(){
  fs.writeFile(path, 'write async file\n', opts, (err) => {
    if(err) throw err;
    console.log('writeSyncFile done!')
  });
  await fsPromise.writeFile(path, 'w\n', opts)
  console.log('writeSyncFile line END!');
}

function stream(){
  // const readStream = fs.createReadStream(path, 'utf-8', {flags: 'a'});
  const writeStream = fs.createWriteStream(path2, {flags: 'a'});
  writeStream.on('close', ()=>{
    console.log('writeStream closed');
  })
  // readStream.pipe(writeStream);

  writeStream.write('Hello world 2', (err)=>{
    if(err) throw err;
    console.log('wrote a chunk');
  })


}

const writeStream = fs.createWriteStream(path2, {flags: 'a'});
const write = (data) => new Promise((res, rej) => {
  console.log(`$inside writing... `);
  writeStream.write(data, (err)=>{
    if(err) rej(err);
    res();
  })
})




// writeSyncFile();
// writeAsyncFile();
// readSyncFile();
// readAsyncFile();
// stream();
async function main(){
  for(let i = 0; i < 10; i++){
    console.log(`${i} before `);
    await write(`${i}. hello world\n`);
    console.log(`${i} after `);
  }
}

main();