
const fs = require('fs');
const crypto = require('crypto');
const gen = require('random-seed');
const program = require('commander');

var FILE, OUTPUT, INFOSIZE, INFOSTART;

Buffer.prototype.to_byte_array = function () {
  return Array.prototype.slice.call(this, 0);
}

class suite {
  constructor(auth) {
    this.hash = crypto.createHash("sha256").update(auth).digest();
    this.seed = gen.create(this.hash);
  }
  get _padding() {
    let val = this.seed.random();
    return (val * Math.pow(10, val.toString().length)) % 255;
  }

  shift_up(byte) {
    let val = this._padding;
    for (val; val > 0; val--) {
      if (byte === 255) {byte = 0}
      else {byte++};
    };
    return byte;
  }
  shift_down(byte) {
    let val = this._padding;
    for (val; val > 0; val--) {
      if (byte === 0) {byte = 255}
      else {byte--};
    };
    return byte;
  }

  encrypt(buffer, output) {
    let response = fs.createWriteStream(output);
    let req = buffer.to_byte_array();
    for (let slice in req) {
      response.write( new Buffer([ this.shift_up(req[slice]) ]) );
    };
    response.end();
  }
  decrypt(buffer, output) {
    let response = fs.createWriteStream(output);
    let req = buffer.to_byte_array();
    for (let slice in req) {
      response.write( new Buffer([ this.shift_down(req[slice]) ]) );
    };
    response.end();
  }
}

program
  .version('2.0.0')
  .option("-a, --authentication [val]", "define authentication key used to encrypt/decrypt")
  .option("-D, --delete", "delete input file on exit")


program
  .command("encrypt <file> <output>")
  .action((file, output) => {
    let generated_hash = crypto.createHash("sha256").update(crypto.randomBytes(256).toString("hex")).digest("hex");
    let s = new suite(program.authentication || generated_hash);
    let buffer = fs.readFileSync(file);
    let timestamp = Date.now();

    process.on('exit', (code) => {
      console.log(
        `\n   ${file} -> ${output}\n`    +
        `   ${buffer.length} bytes\n`  +
        `   finished in ${Date.now() - timestamp}ms`
      );
      if (!program.authentication) {console.log(`   authentication: ${generated_hash}`);}
      else {console.log(`   authentication: user-generated`);}

      if (program.delete) {fs.unlink(file);}
    });
    s.encrypt(buffer, output);
  });

program
  .command("decrypt <file> <output>")
  .action((file, output) => {
    let generated_hash = crypto.createHash("sha256").update(file).digest("hex");
    let s = new suite(program.authentication || generated_hash);
    let buffer = fs.readFileSync(file);
    let timestamp = Date.now();

    process.on('exit', (code) => {
      console.log(
        `\n   ${file} -> ${output}\n`    +
        `   ${buffer.length} bytes\n`  +
        `   finished in ${Date.now() - timestamp}ms`
      );
      if (program.delete) {fs.unlink(file);}
    });
    s.decrypt(buffer, output);
  });

program
  .command("i <decrypted> <original>")
  .description("output buffer compare bool")
  .action((decrypted, original) => {
    let d = fs.readFileSync(decrypted);
    let o = fs.readFileSync(original);
    if (Buffer.compare(d, o) === 0) {console.log(true);}
    else {console.log(false);}
  });

program.parse(process.argv);
