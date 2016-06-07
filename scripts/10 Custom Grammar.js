exports.src = {
    mark: 'main',
    sttOn: {
        opt: {model: 'onthefly', customGrammar: ["привет", "карбюратор", "синхрофазотрон"],
            keys: {'\\*': {goto: 'main'}},
        }
    }
}