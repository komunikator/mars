var fs = require("fs");
var headerLength = 58;
exports.wavInfo = function (path) {
    var wave = {}; // создаём объект в который будем помещать все полученные данные
    // проверяется существование и размер файла (как минимум должен быть равен длине заголовка wav)
    if (fs.existsSync(path) && (fs.statSync(path).size >= headerLength))
    {
        var data = fs.readFileSync(path);
        wave.type = data.slice(0, 4).toString();
// получили тип - «RIFF»
        wave.size = data.slice(4, 8).readUInt32LE(0);
//Полученный размер файла всегда на 8 байт меньше чем тот, что говорит нам ОС.
        wave.wave_label = data.slice(8, 12).toString();
//Метка «wave»
        wave.fmt_label = data.slice(12, 16).toString();
//Метка «rmt »
        wave.extra_bytes_fmt = data.slice(16, 20).readUInt32LE(0);
// extra bytes fmt
        wave.compression = data.slice(20, 22).readUInt16LE(0);
//Compression code
        wave.number_of_channels = data.slice(22, 24).readUInt16LE(0);
//Number of channels
        wave.sample_rate = data.slice(24, 28).readUInt32LE(0);
//Sample rate
        wave.average_bytes_per_second = data.slice(28, 32).readUInt32LE(0) * 8 / 1000;
//Average bytes per second
// переводим в гораздо более родные и понятные кбит/с
        wave.block_align = data.slice(32, 34).readUInt16LE(0);
//Block align
        wave.significant_bits_per_sample = data.slice(34, 36).readUInt16LE(0);
//Significant bits per sample
        wave.extra_format_bytes = data.slice(36, 38).readUInt16LE(0);
//Extra format bytes
//end fmt
        wave.fact_label = data.slice(38, 42).toString();
//Метка «rmt »
        wave.extra_bytes_fact = data.slice(42, 46).readUInt32LE(0);
// extra bytes fact
        wave.extra_format_fact = data.slice(46, 50).readUInt32LE(0);
//Extra format bytes
//end fact
        wave.data_label = data.slice(50, 54).toString();
//Метка «data»
        wave.data_size = data.slice(54, 58).readUInt32LE(0);
        wave.data_position_ = 58;

    }
    return wave;
};

function wavHeader(path) {
    var RIFF = new Buffer('RIFF');
    var WAVE = new Buffer('WAVE');
    var fmt = new Buffer('fmt ');
    var fact = new Buffer('fact');
    var data = new Buffer('data');
    var MAX_WAV = 4294967295 - 100;
    var endianness = 'LE';
    var format = 7; // ITU G.711 µ-law
    var channels = 1;
    var sampleRate = 8000;
    var bitDepth = 8;
    var blockAlign = 1;
    // var headerLength = 58; // TODO: 58 is only for format 7 (ITU G.711 µ-law), any other
    // format will have a variable size...

    if (path) {
        var stats = fs.statSync(path);
        dataLength = stats.size;
    }
    ;
    var dataLength = dataLength;
    if (null == dataLength) {
        dataLength = MAX_WAV;
    }

    var fileSize = dataLength + headerLength;
    var header = new Buffer(headerLength);
    var offset = 0;
    // write the "RIFF" identifier
    RIFF.copy(header, offset);
    offset += RIFF.length;
    // write the file size minus the identifier and this 32-bit int
    header['writeUInt32' + endianness](fileSize - 8, offset);
    offset += 4;
    // write the "WAVE" identifier
    WAVE.copy(header, offset);
    offset += WAVE.length;
    // write the "fmt " sub-chunk identifier
    fmt.copy(header, offset);
    offset += fmt.length;
    // write the size of the "fmt " chunk
    header['writeUInt32' + endianness](18, offset);
    offset += 4;
    // write the audio format code
    header['writeUInt16' + endianness](format, offset);
    offset += 2;
    // write the number of channels
    header['writeUInt16' + endianness](channels, offset);
    offset += 2;
    // write the sample rate
    header['writeUInt32' + endianness](sampleRate, offset);
    offset += 4;
    // write the byte rate
    var byteRate = byteRate;
    if (null == byteRate) {
        byteRate = sampleRate * channels * bitDepth / 8;
    }
    header['writeUInt32' + endianness](byteRate, offset);
    offset += 4;
    // write the block align
    var blockAlign = blockAlign;
    if (null == blockAlign) {
        blockAlign = channels * bitDepth / 8;
    }
    header['writeUInt16' + endianness](blockAlign, offset);
    offset += 2;
    // write the bits per sample
    header['writeUInt16' + endianness](bitDepth, offset);
    offset += 2;
    // write the "fact" sub-chunk ID
    offset += 2;
    fact.copy(header, offset);
    offset += fact.length;
    // write the size of the "fact " chunk
    header['writeUInt32' + endianness](4, offset);
    offset += 4;
    // write the remaining length of the rest of the data
    //tell the media player how many samples long the file is
    header['writeUInt32' + endianness](dataLength, offset);
    offset += 4;
    // write the "data" sub-chunk ID
    data.copy(header, offset);
    offset += data.length;
    // write the remaining length of the rest of the data
    header['writeUInt32' + endianness](dataLength, offset);
    offset += 4;
    // save the "header" Buffer for the end, we emit the "header" event at the end
    // with the "size" values properly filled out. if this stream is being piped to
    // a file (or anything else seekable), then this correct header should be placed
    // at the very beginning of the file.

    // write the file length at the beginning of the header
    header['writeUInt32' + endianness](dataLength + headerLength - 8, 4);
    // write the data length at the end of the header
    header['writeUInt32' + endianness](dataLength, headerLength - 4);
    return header;
}

// write to file (note conversion to buffer!)

exports.checkFormat = function (path, codecs) {
    if (!(codecs && codecs.indexOf))
        codecs = [6, 7];//pcma, pcmu
    var info = exports.wavInfo(path);
    if (
            info.type === 'RIFF' &&
            info.wave_label === 'WAVE' &&
            info.fmt_label === 'fmt ' &&
            //info.compression === codec && //!!!!
            codecs.indexOf(info.compression) !== -1 &&
            info.number_of_channels === 1 &&
            info.sample_rate === 8000 &&
            info.significant_bits_per_sample === 8
            //info.fact_label === 'fact' // &&
            // info.data_label === 'data'
            //data_position_: 58
            )
        return(info.compression);
    else
        return(false);
};

exports.raw2wav = function (path, cb) {
    if (!fs.existsSync(path)) {
        if (cb)
            cb('file not found');
        return;
    }

    var i = 0;
    var wavName;
    while (fs.existsSync(wavName = path + (i === 0?'':'.' + i) + '.wav'))
        i++;

    var writer = new fs.createWriteStream(wavName);
    var reader = new fs.createReadStream(path);
    writer.once('open', function () {
        if (writer.write(wavHeader(path)))
            reader.pipe(writer);
    });
    if (cb) {
//writer.once('finish', cb);
        writer.once('error', function () {
            cb('error');
        });
        writer.once('close', function () {
            cb();
        });
    }
};
/*
 ;
 var path = "test.raw";
 //raw2wav(path);
 wavInfo("orig.wav", function(d) {
 console.log(d);
 });
 wavInfo("test.wav", function(d) {
 console.log(d);
 });
 */

