/**
 * enb-transform-flow
 * ==================
 * 
 * Позволяет преобразовать исходный код с помощью произвольного набора преобразователей
 *
 * **Опции**
 * 
 * * *String* **target** - Результирующий таргет. По умолчанию - ?.transform
 * * *String* **source** - Исходный таргет. Обязательная опция.
 * * *Function[]* **tranformators** - Набор преобразователей исходного кода
 *
 * **Пример**
 * ```javascript
 * [ require('enb-transform-flow/techs/tarnsform-flow'), {
 * 		source: '?.js',
 * 		target: '_?.js',
 * 		transformators: [
 * 			function (source) { return require('babel').transform(source).code; },
 * 			function (source) { return require('uglify-js').minify(source).code; }
 * 		]
 * } ]
 * ```
 */

var buildFlow = require('enb/lib/build-flow');
module.exports = buildFlow.create().name('transform-flow')
		.target('target', '?.transform')
		.defineRequiredOption('target')
		.defineRequiredOption('source')
		.defineRequiredOption('transformators')
		.useSourceFileName('source')
		.builder(function (source) {
			var _ = require('lodash');

			return _.reduce(this._transormators, function (result, transformator) {
				return transformator(result);
			}, source);
		});