var path = require('path');
var SourceNode = require('source-map').SourceNode;

function normalizeFileName(fileName) {
	return "/" + path.relative(process.cwd(), fileName);
}

function generate(fileName, code) {
    var node = new SourceNode(
        null, null, null
    );

    var normalizedFileName = normalizeFileName(fileName);
    var stringCode = code.toString();

    node.add(new SourceNode(
        1, 0, normalizedFileName, stringCode
    ));

    node.setSourceContent(normalizedFileName, stringCode);

    return node.toStringWithSourceMap({
        file: normalizedFileName
    });
}

module.exports = {
	normalizeFileName: normalizeFileName,
	generate: generate
};
