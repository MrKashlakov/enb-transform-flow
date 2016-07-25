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
 * 			function (params) { return { code: require('babel').transform(params.code).code }; },
 * 			function (params) { return { code: require('uglify-js').minify(params.code).code }; }
 * 		]
 * } ]
 * ```
 *
 * Можно использовать очередь для выполнения тасок в параллельных подпроцессах. Подходит для выполнения тяжелых синхронных трансформаций/
 * **Пример**
 * ```javascript
 * [ require('enb-transform-flow/techs/tarnsform-flow'), {
 *              sourceSuffixes: ['js'],
 *              target: '_?.js',
 *              transformators: [
 *                      function (params) {
 *                         var code = params.code;
 *                         var queue = params.queue;
 *
 *                         var compilerFilename = require('path').resolve(__dirname, './worker-tasks/babel-transformator');
 *                         return queue.push(compilerFilename, code, { 
 *                             externalHelpers: 'var',
 *                             ast: false,
 *                             blacklist: ['useStrict']
 *                         }).then(function (compiledObj) {
 *                             return {
 *                                code: compiledObj.code,
 *                                data: {
 *                                    map: compiledObj.map
 *                                }
 *                             };
 *                         });
 *                      },
 *                      function (params) {
 *                         var code = params.code;
 *                         var queue = params.queue;
 *
 *                        var compilerFilename = require('path').resolve(__dirname, './worker-tasks/uglifyjs-minifier');
 *                       return queue.push(compilerFilename, code, {
 *                               fromString: true
 *                       }).then(function (compiledObj) {
 *                            return {
 *                                code: compiledObj.code
 *                            };
 *                       });
 *                    }
 *              ]
 * } ]
 */

module.exports = require('enb/lib/build-flow').create()
		.name('transform-flow')
		.target('target', '?')
		.defineRequiredOption('target')
		.defineRequiredOption('sourceSuffixes')
		.defineRequiredOption('transformators')
		.defineOption('reducer')
		.useFileList([''])
		.builder(function (files) {
			var _this = this;
			var _ = require('lodash');
			var vow = require('vow');
			var vowFs = require('vow-fs');
			var sharedResources = this.node.getSharedResources();
			var fileCache = sharedResources.fileCache;
			var jobQueue = sharedResources.jobQueue;
			var EOL = require('os').EOL;
			var Buffer = require('buffer').Buffer;
			var target = this.node.resolvePath(this._target);

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
							var firstPromise = vow.resolve({
								code: codeFromFile
							});

							// Запускаем последовательое преоброазоваение каждым трансформатором
							var resultPromise = _.reduce(transformators, function (promise, transformator) {
								return promise.then(function (result) {
									var code = result.code;
									if (Buffer.isBuffer(code)) {
										code = code.toString();
									}

									return transformator({
										code: code,
										data: result.data,
										queue: jobQueue,
										filename: file.fullname
									});
								});
							}, firstPromise);

							// После выполнения всех трансформаций кладем результат в кэш
							return resultPromise.then(function (result) {
								var dataToCache = JSON.stringify(result);

								return fileCache.put(file.fullname, dataToCache).then(function () {
									result.filename = file.fullname;
									return result;
								});
							});
						});
					}

					// Из кэша приходит строка, которую нужно преобразовать в объект
					codeFromCache = JSON.parse(codeFromCache);

					codeFromCache.filename = file.fullname;
					return codeFromCache;
				});
			})).then(function (res) {
				// Если передана функция обработки результата, то используем ее
				if (_this._reducer) {
					return _this._reducer({
						result: res,
						target: target
					});
				}

				// Иначе, просто сливаем код
				return _.map(res, 'code').join(EOL);
			});
		})
		.createTech();
