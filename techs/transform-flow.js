/**
 * enb-transform-flow
 * ==================
 * 
 * Позволяет преобразовать исходный код с помощью произвольного набора преобразователей
 *
 * **Опции**
 * 
 * * *String* **target** - Результирующий таргет. По умолчанию - ?.transform
 * * *String* **sourceSuffixes** - Набор расширений файлов для перобразования.
 * * *Function[] | Function* **transformators** - Набор преобразователей исходного кода
 *
 * **Пример**
 * ```javascript
 * [ require('enb-transform-flow/techs/tarnsform-flow'), {
 * 		sourceSuffixes: ['js'],
 * 		target: '_?.js',
 * 		transformators: [
 * 			function (source) { return require('babel').transform(source).code; },
 * 			function (source) { return require('uglify-js').minify(source).code; }
 * 		]
 * } ]
 * ```
 *
 * **Пример с очередями**
 * Можно использовать очередь для выполнения задач в параллельных подпроцессах. Подходит для выполнения тяжелых синхронных трансформаций.
 * ```javascript
 * [ require('enb-transform-flow/techs/tarnsform-flow'), {
 * 		sourceSuffixes: ['js'],
 * 		target: '_?.js',
 * 		transformators: [
 * 			function (code, queue) {
 * 				var compilerFilename = require('path').resolve(__dirname, './worker-tasks/babel-transformator');
 * 					return queue.push(compilerFilename, code, { 
 * 						externalHelpers: 'var',
 * 						ast: false,
 * 						blacklist: ['useStrict']
 * 					}).then(function (compiledObj) {
 * 						return compiledObj.code;
 * 					});
 * 			},
 * 			function (code, queue) {
 * 				var compilerFilename = require('path').resolve(__dirname, './worker-tasks/uglifyjs-minifier');
 * 					return queue.push(compilerFilename, code, {
 * 						fromString: true
 * 					}).then(function (compiledObj) {
 * 						return compiledObj.code;
 * 					});
 * 				}
 * 		]
 * } ]
 * ```
 */

var Buffer = require('buffer').Buffer;
var _ = require('lodash');
var vow = require('vow');
var vowFs = require('vow-fs');
var EOL = require('os').EOL;

module.exports = require('enb/lib/build-flow').create()
		.name('transform-flow')
		.target('target', '?')
		.defineRequiredOption('target')
		.defineRequiredOption('sourceSuffixes')
		.defineRequiredOption('transformators')
		.useFileList([''])
		.builder(function (files) {
			var _this = this;
			var sharedResources = this.node.getSharedResources();
			var fileCache = sharedResources.fileCache;
			var jobQueue = sharedResources.jobQueue;

			// Обрабатываем каждый исходный файл
			return vow.all(files.map(function (file) {

				// Загружаем данные из кэша
				return fileCache.get(file.fullname, file.mtime).then(function (codeFromCache) {

					// Если кэш пуст, то читаем исходный файл
					if (codeFromCache === null) {
						return vowFs.read(file.fullname).then(function (codeFromFile) {
							// Явно приводим трансформаторы к массиву
							var transformators = [].concat(_this._transformators);

							// Так как, трансформаторы могут быть промисами, то работаем через промисы
							var firstPromise = vow.resolve(codeFromFile);

							// Запускаем последовательое преоброазоваение каждым трансформатором
							var resultPromise = _.reduce(transformators, function (promise, transformator) {
								return promise.then(function (result) {
									if (Buffer.isBuffer(result)) {
										result = result.toString();
									}
									return transformator(result, jobQueue);
								});
							}, firstPromise);

							// После выполнения всех трансформаций кладем результат в кэш
							return resultPromise.then(function (result) {
								return fileCache.put(file.fullname, result).then(function () {
									return result;
								});
							});
						});
					}

					return codeFromCache;
				});
			})).then(function (res) {
				return res.join(EOL);
			});
		})
		.createTech();
