// Filter coefficients

//697 Hz
//770 Hz
//852 Hz
//941 Hz
//1209 Hz
//1336 Hz
//1477 Hz
//1633 Hz

var dtmfKeys = [
    ['1', '2', '3', 'A'],
    ['4', '5', '6', 'B'],
    ['7', '8', '9', 'C'],
    ['*', '0', '#', 'D']
],
        lFreq = [697, 770, 852, 941],
        hFreq = [1209, 1336, 1477, 1633],
        sampleRate = 8000,
        lastKey = null,
        lastPause = 0,
        silence = 0,
//        lastSeq = '',
        silenceCount = 0,
        //minLevel = 2200, //trust level
//        minLevel = 3200, //trust level
        minFreqLevel = 650000, //900000, //new trust level
        minAbsLevel = 12000, //22000,
//        minPause = 40, //buffer size
        minTimeOut = 10, //20,//10
        fCoeff = {};

lFreq.forEach(function (el, i) {
    fCoeff[el] = 2 * Math.cos(2 * Math.PI * el / sampleRate);
});

hFreq.forEach(function (el, i) {
    fCoeff[el] = 2 * Math.cos(2 * Math.PI * el / sampleRate);
});

function getFreqIndx(array) {
    var maxValue;
    var maxValueIndx;
    var sum = 0;
    for (var i = 0; i < array.length; i++)
        sum += array[i];

    for (var i = 0; i < array.length; i++) {
        if (!maxValue || array[i] > maxValue) {
            maxValue = array[i];
            if (array[i] > minFreqLevel && array[i] > sum - array[i]) //is trust value
            {
                maxValueIndx = i; /*console.log(array[i])*/
            }
        }
    }
    return maxValueIndx;
}

var bufferLen = 320;//160;
var data = [],
        filterLen = bufferLen * 1;

exports.decode = function (buf, cb) {
    for (ii = 0; ii < buf.length; ii++) {
        data.push(buf.readInt8(ii));
        //require('fs').appendFile("data.dat",el+"\n");
    }
    ;
    if (data.length >= bufferLen) {
        filter(data, cb);
        data = [];
    }
};

function getAbsMax(data) {
    data = data || [];
    if (!data.length)
        return null;
    var max_ = data[0], cur_;
    for (var i = 0; i < data.length; i++) {
        cur_ = Math.abs(data[i]);
        if (cur_ > max_)
            max_ = cur_;
    }
    ;
    return max_;
}

exports.filter = function (data, cb) {
    var l_i, h_i, key;
    var kl = [], kh = [];
    if (getAbsMax(data) > minAbsLevel) {
        lFreq.forEach(function (f, i) {
            kl[i] = Goertzel(data, f);
        });
        //console.log(kl);
        l_i = getFreqIndx(kl);
    }
    //console.log('l_i:' + l_i);
    if (l_i !== undefined) {
        hFreq.forEach(function (f, i) {
            kh[i] = Goertzel(data, f);
        });
        //console.log(kh);
        h_i = getFreqIndx(kh);
        //console.log('h_i:' + h_i);
    }
    ;
    key = null;

    if (l_i !== undefined && h_i !== undefined)
        key = dtmfKeys[l_i][h_i];

    if (
            (key !== lastKey) &&
            (lastKey === null && key !== null) &&
            (lastPause > minTimeOut && silence > minTimeOut)
            )
    {
        //       lastSeq += key;
        //console.log('dtmf inband detected:' + key + ' lastPause:' + lastPause + ' lastKey:' + lastKey + ' silence:' + silence);
        //console.log(key);
        //console.log(kl[l_i]);
        //console.log(kh[h_i]);
        if (cb)
            cb({key: key});
        //console.log(getAbsMax(data));
        lastPause = 0;
    }

    lastPause++;

    if (lastKey == null && key == null)
        silence++;
    else
        silence = 0;
    /*
     if (lastPause > minPause && lastSeq !== '')
     {
     //		console.log('Number detected:' + lastSeq);
     //
     //now seq event move to global listener
     ////if (cb && lastSeq.length > 1) 
     ////    cb({seq: lastSeq});
     lastSeq = '';
     }
     */
    lastKey = key;
    //cb(1);
};

function Goertzel(data, freq)
{
    var
            _qkn = 0,
            _qkn1 = 0,
            _qkn2,
            _mk = fCoeff[freq];
    var n = data.length;
    for (var i = 0; i < n; ++i) {
        _qkn2 = _qkn1;
        _qkn1 = _qkn;
        _qkn = data[i] + _mk * _qkn1 - _qkn2;
    }

    return Math.sqrt(_qkn * _qkn + _qkn1 * _qkn1 - _mk * _qkn * _qkn1);
}

